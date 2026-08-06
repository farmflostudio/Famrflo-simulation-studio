import json
import math
import sys
from pathlib import Path

import joblib
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "simulation"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "models"))


class ModelStore:
    def __init__(self):
        self.feature_columns = json.loads((MODELS_DIR / "feature_columns.json").read_text())
        self.categories = json.loads((MODELS_DIR / "categories.json").read_text())
        self.default_model = json.loads((MODELS_DIR / "default_model.json").read_text())["default"]
        self.site_calibration = pd.read_csv(MODELS_DIR / "site_calibration.csv")

        self.random_forest = joblib.load(MODELS_DIR / "random_forest.joblib")
        self.xgboost = joblib.load(MODELS_DIR / "xgboost.joblib")

        from tensorflow import keras

        self.lstm = keras.models.load_model(MODELS_DIR / "lstm.keras")

    def nearest_site(self, latitude, longitude, soil_type=None):
        candidates = self.site_calibration
        if soil_type and soil_type in candidates["soil_type"].values:
            candidates = candidates[candidates["soil_type"] == soil_type]

        def distance(row):
            return math.dist((latitude, longitude), (row["latitude"], row["longitude"]))

        distances = candidates.apply(distance, axis=1)
        return candidates.loc[distances.idxmin()]


_store = None


def get_store():
    global _store
    if _store is None:
        _store = ModelStore()
    return _store
