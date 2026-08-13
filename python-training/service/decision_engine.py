"""Irrigation scheduling via constrained non-linear optimisation.

`_optimised_schedule` solves a single-shot constrained optimisation problem with SciPy's
SLSQP: given a weather forecast for the requested horizon, it picks the whole daily irrigation
vector at once that minimises total water applied subject to a soil-moisture floor constraint
for every day in the horizon.

This is NOT a receding-horizon Model Predictive Controller. A real MPC re-solves the
optimisation at every timestep as new observations arrive, applies only the first control
action, and discards the rest of the plan. Here the schedule is solved once for the full
horizon and returned in full, with no re-solve loop and no feedback from actual outcomes.
"""

import numpy as np
from scipy.optimize import linprog, minimize
from water_balance import PARAM_NAMES, moisture_stress, simulate_series

from model_store import get_store
from weather import get_forecast_weather

DEFAULT_HORIZON_DAYS = 7
MAX_DAILY_IRRIGATION_MM = 25.0
# Matches the "serious - needs irrigation soon" threshold already used by the frontend's
# moistureStatus() (StatusBadge.jsx). The engine minimises water while keeping stress at or
# above this line, rather than maintaining the "well watered" band at all times - mild dryness
# above this point is tolerated rather than irrigated away, matching real deficit-irrigation
# practice and keeping the comparison against the threshold based baseline apples-to-apples.
TARGET_STRESS_RATIO = 0.3

FIXED_INTERVAL_DAYS = 3
FIXED_INTERVAL_AMOUNT_MM = 15.0
THRESHOLD_STRESS_RATIO = 0.3
THRESHOLD_AMOUNT_MM = 15.0


def _plan_from_trajectory(dates, irrigation, vwc):
    return [
        {"date": str(date), "recommendedMm": round(float(mm), 2), "predictedVwc": round(float(v), 2)}
        for date, mm, v in zip(dates, irrigation, vwc)
    ]


def _summarize(strategy, dates, irrigation, vwc, wilting_point):
    irrigation = np.asarray(irrigation, dtype=float)
    vwc = np.asarray(vwc, dtype=float)
    return {
        "strategy": strategy,
        "plan": _plan_from_trajectory(dates, irrigation, vwc),
        "totalWaterMm": round(float(irrigation.sum()), 2),
        "irrigationDays": int(np.count_nonzero(irrigation > 0.01)),
        "minVwc": round(float(vwc.min()), 2),
        "daysBelowWiltingPoint": int(np.sum(vwc <= wilting_point + 1e-6)),
    }


def _optimised_schedule(dates, precip, net_radiation, params, initial_vwc, saturation):
    n = len(precip)
    wilting_point = params["wilting_point"]
    field_capacity = params["field_capacity"]
    target_vwc = wilting_point + TARGET_STRESS_RATIO * (field_capacity - wilting_point)

    def total_water(irrigation):
        return float(np.sum(irrigation))

    def moisture_floor(irrigation):
        vwc = simulate_series(precip, net_radiation, params, initial_vwc, saturation, irrigation=irrigation)
        return vwc - target_vwc

    result = minimize(
        total_water,
        x0=np.full(n, MAX_DAILY_IRRIGATION_MM / 2),
        method="SLSQP",
        bounds=[(0.0, MAX_DAILY_IRRIGATION_MM)] * n,
        constraints=[{"type": "ineq", "fun": moisture_floor}],
        options={"maxiter": 200, "ftol": 1e-6},
    )
    irrigation = np.clip(result.x, 0.0, MAX_DAILY_IRRIGATION_MM)
    vwc = simulate_series(precip, net_radiation, params, initial_vwc, saturation, irrigation=irrigation)
    return _summarize("optimised", dates, irrigation, vwc, wilting_point)


def _fixed_interval_schedule(
    dates, precip, net_radiation, params, initial_vwc, saturation,
    interval_days=FIXED_INTERVAL_DAYS, amount_mm=FIXED_INTERVAL_AMOUNT_MM,
):
    n = len(precip)
    irrigation = np.array([amount_mm if (t % interval_days == interval_days - 1) else 0.0 for t in range(n)])
    vwc = simulate_series(precip, net_radiation, params, initial_vwc, saturation, irrigation=irrigation)
    return _summarize("fixedInterval", dates, irrigation, vwc, params["wilting_point"])


def _threshold_schedule(
    dates, precip, net_radiation, params, initial_vwc, saturation,
    stress_ratio=THRESHOLD_STRESS_RATIO, amount_mm=THRESHOLD_AMOUNT_MM,
):
    n = len(precip)
    wilting_point = params["wilting_point"]
    field_capacity = params["field_capacity"]
    span = max(field_capacity - wilting_point, 1e-6)

    irrigation = np.zeros(n)
    vwc_series = np.zeros(n)
    current = float(initial_vwc)

    for t in range(n):
        stress = float(np.clip((current - wilting_point) / span, 0.0, 1.0))
        amount = amount_mm if stress < stress_ratio else 0.0
        irrigation[t] = amount
        current = float(
            simulate_series([precip[t]], [net_radiation[t]], params, current, saturation, irrigation=[amount])[0]
        )
        vwc_series[t] = current

    return _summarize("thresholdBased", dates, irrigation, vwc_series, wilting_point)


def _linear_programme_schedule(dates, precip, net_radiation, params, initial_vwc, saturation):
    n = len(precip)
    rain_gain = params["rain_gain"]
    wilting_point = params["wilting_point"]
    field_capacity = params["field_capacity"]

    precip_arr = np.asarray(precip, dtype=float)
    net_radiation_arr = np.asarray(net_radiation, dtype=float)

    baseline_vwc = simulate_series(precip_arr, net_radiation_arr, params, initial_vwc, saturation)
    stress_baseline = moisture_stress(baseline_vwc, field_capacity, wilting_point)
    et_baseline = params["et_coefficient"] * np.clip(net_radiation_arr, 0.0, None) * stress_baseline

    natural = rain_gain * precip_arr - et_baseline
    cum_natural = np.cumsum(natural)

    lower_tri = np.tril(np.ones((n, n)))
    a_ub = -rain_gain * lower_tri
    b_ub = initial_vwc + cum_natural - wilting_point

    result = linprog(
        c=np.ones(n),
        A_ub=a_ub,
        b_ub=b_ub,
        bounds=[(0.0, MAX_DAILY_IRRIGATION_MM)] * n,
        method="highs",
    )

    irrigation = np.clip(result.x, 0.0, MAX_DAILY_IRRIGATION_MM) if result.success else np.zeros(n)
    vwc = simulate_series(precip_arr, net_radiation_arr, params, initial_vwc, saturation, irrigation=irrigation)
    return _summarize("linearProgramme", dates, irrigation, vwc, wilting_point)


def build_schedule(latitude, longitude, soil_type=None, land_cover=None, horizon_days=DEFAULT_HORIZON_DAYS):
    store = get_store()
    site = store.nearest_site(latitude, longitude, soil_type)
    params = {name: float(site[name]) for name in PARAM_NAMES}
    saturation = float(site["saturation"])
    resolved_soil_type = soil_type or site["soil_type"]

    weather_df = get_forecast_weather(latitude, longitude, horizon_days)
    if weather_df.empty:
        raise ValueError("No forecast weather data available for the requested location")

    precip = weather_df["precip"].fillna(0.0).to_numpy()
    net_radiation = weather_df["net_radiation"].fillna(0.0).to_numpy()
    dates = weather_df["date"].tolist()

    initial_vwc = (params["field_capacity"] + params["wilting_point"]) / 2

    recommended = _optimised_schedule(dates, precip, net_radiation, params, initial_vwc, saturation)
    fixed_interval = _fixed_interval_schedule(dates, precip, net_radiation, params, initial_vwc, saturation)
    threshold_based = _threshold_schedule(dates, precip, net_radiation, params, initial_vwc, saturation)
    linear_programme = _linear_programme_schedule(dates, precip, net_radiation, params, initial_vwc, saturation)

    return {
        "referenceSite": site["site_id"],
        "soilType": resolved_soil_type,
        "landCover": land_cover,
        "horizonDays": len(dates),
        "fieldCapacity": params["field_capacity"],
        "wiltingPoint": params["wilting_point"],
        "recommended": recommended,
        "baselines": {
            "fixedInterval": fixed_interval,
            "thresholdBased": threshold_based,
            "linearProgramme": linear_programme,
        },
    }
