import json
from pathlib import Path

import joblib
import numpy as np

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"


def load_sample():
    feature_columns = json.loads((MODELS_DIR / "feature_columns.json").read_text())
    sample = json.loads((MODELS_DIR / "sample_input.json").read_text())
    return feature_columns, sample


def predict_tabular(model_path, feature_columns, sample):
    model = joblib.load(model_path)
    x = np.array([[sample["tabular_features"][col] for col in feature_columns]], dtype=np.float32)
    return float(model.predict(x)[0])


def predict_lstm(model_path, sample):
    from tensorflow import keras

    model = keras.models.load_model(model_path)
    x = np.array([sample["sequence_features"]], dtype=np.float32)
    return float(model.predict(x, verbose=0)[0][0])


def main():
    feature_columns, sample = load_sample()

    print(f"Sample site: {sample['site_id']}  date: {sample['date']}")
    print(f"Actual observed soil moisture: {sample['actual_vwc']:.2f}%")
    print()

    rf_prediction = predict_tabular(MODELS_DIR / "random_forest.joblib", feature_columns, sample)
    print(f"Random Forest prediction: {rf_prediction:.2f}%")

    xgb_prediction = predict_tabular(MODELS_DIR / "xgboost.joblib", feature_columns, sample)
    print(f"XGBoost prediction:       {xgb_prediction:.2f}%")

    lstm_prediction = predict_lstm(MODELS_DIR / "lstm.keras", sample)
    print(f"LSTM prediction:          {lstm_prediction:.2f}%")

    default_model = json.loads((MODELS_DIR / "default_model.json").read_text())["default"]
    print()
    print(f"Default model for the application: {default_model}")


if __name__ == "__main__":
    main()
