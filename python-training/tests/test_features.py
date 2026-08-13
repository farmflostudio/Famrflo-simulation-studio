import numpy as np
import pandas as pd
import pytest

import features


def _make_categorical_df():
    return pd.DataFrame(
        {
            "soil_type": ["clay", "sand", "loam", "clay"],
            "land_cover": ["grass", "arable", "grass", "woodland"],
        }
    )


def test_one_hot_encode_creates_expected_columns_with_binary_values():
    df = _make_categorical_df()
    categories = {
        "soil_type": ["clay", "loam", "sand"],
        "land_cover": ["arable", "grass", "woodland"],
    }

    encoded = features._one_hot_encode(df.copy(), categories)

    expected_columns = [
        "soil_type__clay",
        "soil_type__loam",
        "soil_type__sand",
        "land_cover__arable",
        "land_cover__grass",
        "land_cover__woodland",
    ]
    for column in expected_columns:
        assert column in encoded.columns
        assert not encoded[column].isna().any()
        assert set(encoded[column].unique()) <= {0.0, 1.0}

    # exactly one "hot" column per category, per row
    soil_cols = [c for c in encoded.columns if c.startswith("soil_type__")]
    land_cols = [c for c in encoded.columns if c.startswith("land_cover__")]
    assert (encoded[soil_cols].sum(axis=1) == 1.0).all()
    assert (encoded[land_cols].sum(axis=1) == 1.0).all()

    # spot check row 0: clay / grass
    assert encoded.loc[0, "soil_type__clay"] == 1.0
    assert encoded.loc[0, "soil_type__sand"] == 0.0
    assert encoded.loc[0, "land_cover__grass"] == 1.0
    assert encoded.loc[0, "land_cover__arable"] == 0.0


def test_one_hot_encode_unseen_category_value_gets_all_zeros():
    df = pd.DataFrame({"soil_type": ["peat"], "land_cover": ["grass"]})
    categories = {"soil_type": ["clay", "sand"], "land_cover": ["grass"]}

    encoded = features._one_hot_encode(df.copy(), categories)

    assert encoded.loc[0, "soil_type__clay"] == 0.0
    assert encoded.loc[0, "soil_type__sand"] == 0.0
    assert encoded.loc[0, "land_cover__grass"] == 1.0


def _make_vwc_frame():
    dates_a = pd.date_range("2023-01-01", periods=4, freq="D")
    dates_b = pd.date_range("2023-01-01", periods=3, freq="D")
    return pd.DataFrame(
        {
            "group_id": ["A"] * 4 + ["B"] * 3,
            "date": list(dates_a) + list(dates_b),
            "vwc": [10.0, 12.0, 11.0, 13.0, 30.0, 32.0, 31.0],
        }
    )


def test_add_lag_feature_shifts_vwc_by_one_within_group():
    df = _make_vwc_frame()

    result = features._add_lag_feature(df, "group_id")

    group_a = result[result["group_id"] == "A"].reset_index(drop=True)
    group_b = result[result["group_id"] == "B"].reset_index(drop=True)

    # first observation per group has no prior day -> NaN lag, by design
    assert pd.isna(group_a.loc[0, "vwc_lag1"])
    assert pd.isna(group_b.loc[0, "vwc_lag1"])

    # subsequent rows are shifted by exactly one day, no cross-group leakage
    assert group_a.loc[1, "vwc_lag1"] == pytest.approx(10.0)
    assert group_a.loc[2, "vwc_lag1"] == pytest.approx(12.0)
    assert group_a.loc[3, "vwc_lag1"] == pytest.approx(11.0)
    assert group_b.loc[1, "vwc_lag1"] == pytest.approx(30.0)
    assert group_b.loc[2, "vwc_lag1"] == pytest.approx(32.0)

    # no NaNs anywhere except the one leading row per group
    non_leading = result.dropna(subset=["vwc_lag1"])
    assert len(non_leading) == len(result) - 2  # one leading NaN per group (A, B)
    assert not non_leading["vwc_lag1"].isna().any()


def test_add_lag_feature_sorts_out_of_order_input():
    df = _make_vwc_frame().sample(frac=1.0, random_state=0).reset_index(drop=True)

    result = features._add_lag_feature(df, "group_id")

    group_a = result[result["group_id"] == "A"].reset_index(drop=True)
    assert list(group_a["date"]) == sorted(group_a["date"])
    assert group_a.loc[1, "vwc_lag1"] == pytest.approx(10.0)


def test_add_calendar_features_produces_bounded_sin_cos_with_no_nans():
    dates = pd.to_datetime(["2023-01-01", "2023-04-01", "2023-07-15", "2023-12-31"])
    df = pd.DataFrame({"date": dates})

    result = features._add_calendar_features(df.copy())

    assert "doy_sin" in result.columns
    assert "doy_cos" in result.columns
    assert not result["doy_sin"].isna().any()
    assert not result["doy_cos"].isna().any()
    assert result["doy_sin"].between(-1.0, 1.0).all()
    assert result["doy_cos"].between(-1.0, 1.0).all()

    # unit circle identity holds for every row
    magnitude = result["doy_sin"] ** 2 + result["doy_cos"] ** 2
    assert magnitude.apply(lambda v: v == pytest.approx(1.0, abs=1e-6)).all()

    # day 1 of the year should sit very close to angle 0 (sin~0, cos~1)
    assert result.loc[0, "doy_sin"] == pytest.approx(np.sin(2 * np.pi * 1 / 365.25), abs=1e-9)
    assert result.loc[0, "doy_cos"] == pytest.approx(np.cos(2 * np.pi * 1 / 365.25), abs=1e-9)


def _make_sequence_frame(group_id, n_days, feature_columns, start="2023-01-01", vwc_start=20.0):
    dates = pd.date_range(start, periods=n_days, freq="D")
    data = {"group_id": [group_id] * n_days, "date": dates}
    for i, col in enumerate(feature_columns):
        data[col] = np.arange(n_days, dtype=np.float32) + i * 100.0
    data["vwc"] = vwc_start + np.arange(n_days, dtype=np.float32)
    return pd.DataFrame(data)


def test_build_sequences_produces_correctly_shaped_14_day_windows():
    feature_columns = ["f1", "f2", "f3"]
    window = features.SEQUENCE_LENGTH
    n_days = window + 5  # enough for 5 windows in this group

    df = _make_sequence_frame("A", n_days, feature_columns)

    sequences, targets = features.build_sequences(df, feature_columns, group_col="group_id", window=window)

    expected_count = n_days - window
    assert sequences.shape == (expected_count, window, len(feature_columns))
    assert targets.shape == (expected_count,)
    assert not np.isnan(sequences).any()
    assert not np.isnan(targets).any()

    # first sequence should be feature rows [0:window), target is row `window`'s vwc
    full_features = df[feature_columns].to_numpy(dtype=np.float32)
    full_target = df["vwc"].to_numpy(dtype=np.float32)
    np.testing.assert_array_equal(sequences[0], full_features[0:window])
    assert targets[0] == pytest.approx(full_target[window])


def test_build_sequences_excludes_groups_shorter_than_window():
    feature_columns = ["f1"]
    window = features.SEQUENCE_LENGTH

    short_group = _make_sequence_frame("short", window - 1, feature_columns)
    long_group = _make_sequence_frame("long", window + 2, feature_columns)
    df = pd.concat([short_group, long_group], ignore_index=True)

    sequences, targets = features.build_sequences(df, feature_columns, group_col="group_id", window=window)

    # only the long group can produce windows: (window+2) - window = 2
    assert sequences.shape == (2, window, len(feature_columns))
    assert targets.shape == (2,)


def test_build_sequences_returns_empty_arrays_with_correct_shape_when_no_group_is_long_enough():
    feature_columns = ["f1", "f2"]
    window = features.SEQUENCE_LENGTH

    df = _make_sequence_frame("A", window - 1, feature_columns)

    sequences, targets = features.build_sequences(df, feature_columns, group_col="group_id", window=window)

    assert sequences.shape == (0, window, len(feature_columns))
    assert targets.shape == (0,)
