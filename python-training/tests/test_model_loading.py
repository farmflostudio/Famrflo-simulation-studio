from pathlib import Path

import numpy as np
import predict_sample

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"


def test_sample_input_and_feature_columns_exist():
    feature_columns, sample = predict_sample.load_sample()
    assert len(feature_columns) > 0
    assert "tabular_features" in sample
    assert "sequence_features" in sample
    assert "actual_vwc" in sample


def test_random_forest_prediction_is_finite_and_plausible():
    feature_columns, sample = predict_sample.load_sample()
    prediction = predict_sample.predict_tabular(MODELS_DIR / "random_forest.joblib", feature_columns, sample)
    assert np.isfinite(prediction)
    assert 0 <= prediction <= 100


def test_xgboost_prediction_is_finite_and_plausible():
    feature_columns, sample = predict_sample.load_sample()
    prediction = predict_sample.predict_tabular(MODELS_DIR / "xgboost.joblib", feature_columns, sample)
    assert np.isfinite(prediction)
    assert 0 <= prediction <= 100


def test_lstm_prediction_is_finite_and_plausible():
    _, sample = predict_sample.load_sample()
    prediction = predict_sample.predict_lstm(MODELS_DIR / "lstm.keras", sample)
    assert np.isfinite(prediction)
    assert 0 <= prediction <= 100


def test_random_forest_prediction_is_reasonably_close_to_the_observed_value():
    feature_columns, sample = predict_sample.load_sample()
    prediction = predict_sample.predict_tabular(MODELS_DIR / "random_forest.joblib", feature_columns, sample)
    assert abs(prediction - sample["actual_vwc"]) < 15
