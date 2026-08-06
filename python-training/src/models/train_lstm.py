import sys
import time
from pathlib import Path

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import SEQUENCE_LENGTH, build_datasets, build_sequences

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"


def build_model(input_shape):
    from tensorflow import keras
    from tensorflow.keras import layers

    model = keras.Sequential(
        [
            layers.Input(shape=input_shape),
            layers.LSTM(32, return_sequences=False),
            layers.Dense(16, activation="relu"),
            layers.Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    return model


def train():
    from tensorflow import keras

    train_df, val_df, feature_columns, _ = build_datasets()

    X_train, y_train = build_sequences(train_df, feature_columns)
    X_val, y_val = build_sequences(val_df, feature_columns)

    model = build_model((SEQUENCE_LENGTH, len(feature_columns)))

    start = time.time()
    model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=30,
        batch_size=64,
        callbacks=[keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True)],
        verbose=0,
    )
    train_seconds = time.time() - start

    predictions = model.predict(X_val, verbose=0).flatten()
    metrics = {
        "model": "lstm",
        "rmse": float(mean_squared_error(y_val, predictions) ** 0.5),
        "mae": float(mean_absolute_error(y_val, predictions)),
        "r2": float(r2_score(y_val, predictions)),
        "train_seconds": train_seconds,
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / "lstm.keras"
    model.save(model_path)
    metrics["size_mb"] = model_path.stat().st_size / (1024 * 1024)

    return metrics, feature_columns


if __name__ == "__main__":
    metrics, _ = train()
    print(metrics)
