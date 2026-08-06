import numpy as np

PARAM_NAMES = ["rain_gain", "et_coefficient", "drainage_rate", "field_capacity", "wilting_point"]

PARAM_BOUNDS = {
    "rain_gain": (0.05, 1.0),
    "et_coefficient": (0.01, 2.0),
    "drainage_rate": (0.0, 1.0),
    "field_capacity": (20.0, 95.0),
    "wilting_point": (1.0, 20.0),
}


def moisture_stress(vwc, field_capacity, wilting_point):
    span = max(field_capacity - wilting_point, 1e-6)
    return np.clip((vwc - wilting_point) / span, 0.0, 1.0)


def simulate_series(precip, net_radiation, params, initial_vwc, saturation, irrigation=None):
    n = len(precip)
    precip = list(precip)
    net_radiation = list(net_radiation)
    irrigation = [0.0] * n if irrigation is None else list(irrigation)

    rain_gain = params["rain_gain"]
    et_coefficient = params["et_coefficient"]
    drainage_rate = params["drainage_rate"]
    field_capacity = params["field_capacity"]
    wilting_point = params["wilting_point"]
    span = max(field_capacity - wilting_point, 1e-6)

    vwc = [0.0] * n
    current = float(initial_vwc)

    for t in range(n):
        stress = (current - wilting_point) / span
        if stress < 0.0:
            stress = 0.0
        elif stress > 1.0:
            stress = 1.0

        rn = net_radiation[t]
        et_actual = et_coefficient * (rn if rn > 0.0 else 0.0) * stress
        raw = current + rain_gain * (precip[t] + irrigation[t]) - et_actual

        if raw > field_capacity:
            raw = field_capacity + (raw - field_capacity) * (1.0 - drainage_rate)

        if raw < wilting_point:
            raw = wilting_point
        elif raw > saturation:
            raw = saturation

        current = raw
        vwc[t] = current

    return np.array(vwc)
