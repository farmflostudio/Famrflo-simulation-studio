import math
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from water_balance import PARAM_NAMES, simulate_series

from features import SEQUENCE_LENGTH
from model_store import get_store
from weather import get_weather


def _calendar_features(date):
    day_of_year = pd.Timestamp(date).dayofyear
    return {
        "doy_sin": math.sin(2 * math.pi * day_of_year / 365.25),
        "doy_cos": math.cos(2 * math.pi * day_of_year / 365.25),
    }


def _one_hot(categories, soil_type, land_cover):
    row = {}
    for value in categories["soil_type"]:
        row[f"soil_type__{value}"] = 1.0 if value == soil_type else 0.0
    for value in categories["land_cover"]:
        row[f"land_cover__{value}"] = 1.0 if value == land_cover else 0.0
    return row


def _build_state(latitude, longitude, soil_type, land_cover, target_date):
    store = get_store()
    site = store.nearest_site(latitude, longitude, soil_type)
    params = {name: float(site[name]) for name in PARAM_NAMES}
    saturation = float(site["saturation"])
    resolved_soil_type = soil_type or site["soil_type"]

    target = pd.Timestamp(target_date)
    window_start = (target - timedelta(days=SEQUENCE_LENGTH + 1)).strftime("%Y-%m-%d")
    window_end = target.strftime("%Y-%m-%d")

    weather_df = get_weather(latitude, longitude, window_start, window_end)
    if len(weather_df) < SEQUENCE_LENGTH + 1:
        raise ValueError("Not enough recent weather data to build a prediction window")

    precip = weather_df["precip"].fillna(0.0).to_numpy()
    net_radiation = weather_df["net_radiation"].fillna(0.0).to_numpy()
    start_vwc = (params["field_capacity"] + params["wilting_point"]) / 2
    simulated_vwc = simulate_series(precip, net_radiation, params, start_vwc, saturation)

    categories = store.categories
    rows = []
    for i in range(1, len(weather_df)):
        row = {
            "precip": float(weather_df["precip"].iloc[i]),
            "air_temp": float(weather_df["air_temp"].iloc[i]),
            "relative_humidity": float(weather_df["relative_humidity"].iloc[i]),
            "net_radiation": float(weather_df["net_radiation"].iloc[i]),
            "latitude": latitude,
            "longitude": longitude,
            "vwc_lag1": float(simulated_vwc[i - 1]),
        }
        row.update(_calendar_features(weather_df["date"].iloc[i]))
        row.update(_one_hot(categories, resolved_soil_type, land_cover))
        rows.append(row)

    feature_df = pd.DataFrame(rows)[store.feature_columns]
    return feature_df, site


def predict(latitude, longitude, soil_type, land_cover, target_date=None):
    target_date = target_date or datetime.utcnow().strftime("%Y-%m-%d")
    feature_df, site = _build_state(latitude, longitude, soil_type, land_cover, target_date)

    tabular_row = feature_df.iloc[[-1]].to_numpy(dtype=np.float32)
    sequence = feature_df.to_numpy(dtype=np.float32)[np.newaxis, :, :]

    store = get_store()
    predictions = {
        "random_forest": float(store.random_forest.predict(tabular_row)[0]),
        "xgboost": float(store.xgboost.predict(tabular_row)[0]),
        # model.predict() carries large per-call Python/retracing overhead meant for batched
        # workloads; predict_on_batch() skips that overhead and is ~40x faster for single-sample
        # inference, which is what pushed p95 latency past the 200ms target (see tests/test_prediction_latency.py).
        "lstm": float(store.lstm.predict_on_batch(sequence)[0][0]),
    }

    return {
        "targetDate": target_date,
        "referenceSite": site["site_id"],
        "soilType": soil_type or site["soil_type"],
        "predictions": predictions,
        "defaultModel": store.default_model,
        "defaultPrediction": predictions[store.default_model],
    }
