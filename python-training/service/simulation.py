from water_balance import PARAM_NAMES, simulate_series

from model_store import get_store
from weather import get_weather


def run_simulation(latitude, longitude, start_date, end_date, soil_type=None, initial_vwc=None):
    store = get_store()
    site = store.nearest_site(latitude, longitude, soil_type)
    params = {name: float(site[name]) for name in PARAM_NAMES}
    saturation = float(site["saturation"])

    weather_df = get_weather(latitude, longitude, start_date, end_date)
    if weather_df.empty:
        raise ValueError("No weather data available for the requested date range")

    precip = weather_df["precip"].fillna(0.0).to_numpy()
    net_radiation = weather_df["net_radiation"].fillna(0.0).to_numpy()

    start_vwc = initial_vwc if initial_vwc is not None else (params["field_capacity"] + params["wilting_point"]) / 2

    simulated = simulate_series(precip, net_radiation, params, start_vwc, saturation)

    return {
        "referenceSite": site["site_id"],
        "soilType": site["soil_type"],
        "params": params,
        "saturation": saturation,
        "series": [
            {"date": str(date), "vwc": float(vwc)}
            for date, vwc in zip(weather_df["date"], simulated)
        ],
    }
