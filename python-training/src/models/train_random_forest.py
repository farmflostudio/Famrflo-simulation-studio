import sys
import time
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import build_datasets, to_xy

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"


def train():
    train_df, val_df, feature_columns, _ = build_datasets()
    X_train, y_train = to_xy(train_df, feature_columns)
    X_val, y_val = to_xy(val_df, feature_columns)

    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=13,
        min_samples_leaf=10,
        # vwc_lag1 is such a strong single predictor that every split picks it regardless of
        # depth/leaf size, driving its impurity importance to ~99.5% (near-pure persistence).
        # max_features caps how many candidate features each split can consider, so a meaningful
        # fraction of splits are forced onto the weather/static features instead.
        max_features=0.5,
        n_jobs=-1,
        random_state=42,
    )

    start = time.time()
    model.fit(X_train, y_train)
    train_seconds = time.time() - start

    predictions = model.predict(X_val)
    metrics = {
        "model": "random_forest",
        "rmse": float(mean_squared_error(y_val, predictions) ** 0.5),
        "mae": float(mean_absolute_error(y_val, predictions)),
        "r2": float(r2_score(y_val, predictions)),
        "train_seconds": train_seconds,
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / "random_forest.joblib"
    joblib.dump(model, model_path, compress=3)
    metrics["size_mb"] = model_path.stat().st_size / (1024 * 1024)

    return metrics, feature_columns


if __name__ == "__main__":
    metrics, _ = train()
    print(metrics)
