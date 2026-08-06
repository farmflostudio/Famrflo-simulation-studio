import sys
import time
from pathlib import Path

import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import build_datasets, to_xy

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"


def train():
    train_df, val_df, feature_columns, _ = build_datasets()
    X_train, y_train = to_xy(train_df, feature_columns)
    X_val, y_val = to_xy(val_df, feature_columns)

    model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        n_jobs=-1,
        random_state=42,
    )

    start = time.time()
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    train_seconds = time.time() - start

    predictions = model.predict(X_val)
    metrics = {
        "model": "xgboost",
        "rmse": float(mean_squared_error(y_val, predictions) ** 0.5),
        "mae": float(mean_absolute_error(y_val, predictions)),
        "r2": float(r2_score(y_val, predictions)),
        "train_seconds": train_seconds,
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / "xgboost.joblib"
    joblib.dump(model, model_path, compress=3)
    metrics["size_mb"] = model_path.stat().st_size / (1024 * 1024)

    return metrics, feature_columns


if __name__ == "__main__":
    metrics, _ = train()
    print(metrics)
