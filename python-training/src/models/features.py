from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "cache"
REAL_DATASET_PATH = DATA_DIR / "farmflo_uk_dataset.csv"
SYNTHETIC_DATASET_PATH = DATA_DIR / "synthetic_dataset.csv"

WEATHER_FEATURES = ["precip", "air_temp", "relative_humidity", "net_radiation"]
STATIC_FEATURES = ["latitude", "longitude"]
CATEGORICAL_FEATURES = ["soil_type", "land_cover"]
LAG_FEATURE = "vwc_lag1"

VAL_FRACTION = 0.15
SEQUENCE_LENGTH = 14


def _add_calendar_features(df):
    dates = pd.to_datetime(df["date"])
    day_of_year = dates.dt.dayofyear
    df["doy_sin"] = np.sin(2 * np.pi * day_of_year / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * day_of_year / 365.25)
    return df


def _add_lag_feature(df, group_col):
    df = df.sort_values([group_col, "date"]).reset_index(drop=True)
    df[LAG_FEATURE] = df.groupby(group_col)["vwc"].shift(1)
    return df


def _load_real():
    df = pd.read_csv(REAL_DATASET_PATH)
    df = df.rename(
        columns={
            "cosmos_precip": "precip",
            "cosmos_ta": "air_temp",
            "cosmos_rh": "relative_humidity",
            "cosmos_rn": "net_radiation",
            "cosmos_vwc": "vwc",
        }
    )
    df["group_id"] = df["site_id"]
    df["date"] = pd.to_datetime(df["date"])
    return df


def _load_synthetic():
    df = pd.read_csv(SYNTHETIC_DATASET_PATH)
    df = df.rename(columns={"source_site_id": "site_id"})
    df["group_id"] = df["synthetic_farm_id"]
    df["date"] = pd.to_datetime(df["date"])
    return df


def _split_real_train_val(real_df):
    train_parts, val_parts, cutoffs = [], [], {}

    for site_id, site_df in real_df.groupby("site_id"):
        site_df = site_df.sort_values("date")
        cutoff_idx = int(len(site_df) * (1 - VAL_FRACTION))
        cutoff_date = site_df.iloc[cutoff_idx]["date"]
        cutoffs[site_id] = cutoff_date
        train_parts.append(site_df[site_df["date"] < cutoff_date])
        val_parts.append(site_df[site_df["date"] >= cutoff_date])

    return pd.concat(train_parts, ignore_index=True), pd.concat(val_parts, ignore_index=True), cutoffs


def _exclude_validation_overlap(synthetic_df, cutoffs):
    keep_mask = pd.Series(True, index=synthetic_df.index)
    for site_id, cutoff_date in cutoffs.items():
        overlap = (synthetic_df["site_id"] == site_id) & (synthetic_df["date"] >= cutoff_date)
        keep_mask &= ~overlap
    return synthetic_df[keep_mask].reset_index(drop=True)


def _one_hot_encode(df, categories):
    for column, values in categories.items():
        for value in values:
            df[f"{column}__{value}"] = (df[column] == value).astype(float)
    return df


def _feature_columns(categories):
    columns = WEATHER_FEATURES + STATIC_FEATURES + [LAG_FEATURE, "doy_sin", "doy_cos"]
    for column, values in categories.items():
        columns += [f"{column}__{value}" for value in values]
    return columns


def build_datasets():
    real_df = _load_real()
    synthetic_df = _load_synthetic()

    real_df = _add_lag_feature(real_df, "group_id")
    real_train, real_val, cutoffs = _split_real_train_val(real_df)

    synthetic_df = _exclude_validation_overlap(synthetic_df, cutoffs)
    synthetic_df = _add_lag_feature(synthetic_df, "group_id")

    for frame in (real_train, real_val, synthetic_df):
        _add_calendar_features(frame)

    categories = {
        column: sorted(pd.concat([real_train[column], synthetic_df[column]]).dropna().unique().tolist())
        for column in CATEGORICAL_FEATURES
    }

    real_train = _one_hot_encode(real_train, categories)
    real_val = _one_hot_encode(real_val, categories)
    synthetic_df = _one_hot_encode(synthetic_df, categories)

    feature_columns = _feature_columns(categories)

    train_df = pd.concat([synthetic_df, real_train], ignore_index=True)
    train_df = train_df.dropna(subset=feature_columns + ["vwc"]).reset_index(drop=True)
    val_df = real_val.dropna(subset=feature_columns + ["vwc"]).reset_index(drop=True)

    return train_df, val_df, feature_columns, categories


def to_xy(df, feature_columns):
    return df[feature_columns].to_numpy(dtype=np.float32), df["vwc"].to_numpy(dtype=np.float32)


def build_sequences(df, feature_columns, group_col="group_id", window=SEQUENCE_LENGTH):
    sequences, targets = [], []

    for _, group_df in df.groupby(group_col):
        group_df = group_df.sort_values("date")
        features = group_df[feature_columns].to_numpy(dtype=np.float32)
        target = group_df["vwc"].to_numpy(dtype=np.float32)

        for i in range(window, len(group_df)):
            sequences.append(features[i - window : i])
            targets.append(target[i])

    if not sequences:
        return np.empty((0, window, len(feature_columns)), dtype=np.float32), np.empty((0,), dtype=np.float32)

    return np.stack(sequences), np.array(targets, dtype=np.float32)
