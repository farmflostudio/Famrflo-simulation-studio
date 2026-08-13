import json
import time
from pathlib import Path

import numpy as np
import pytest

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
N_CALLS = 200
P95_TARGET_MS = 200.0


def _load_lstm_and_sample():
    from tensorflow import keras

    sample = json.loads((MODELS_DIR / "sample_input.json").read_text())
    x = np.array([sample["sequence_features"]], dtype=np.float32)
    model = keras.models.load_model(MODELS_DIR / "lstm.keras")
    return model, x


def _p95_latency_ms(fn, n=N_CALLS, warmup=5):
    for _ in range(warmup):
        fn()
    times = []
    for _ in range(n):
        start = time.perf_counter()
        fn()
        times.append((time.perf_counter() - start) * 1000.0)
    return float(np.percentile(times, 95))


def test_lstm_predict_on_batch_p95_latency_is_under_200ms():
    # service/prediction.py used model.predict(), whose per-call Python/tf.function
    # dispatch overhead put p95 at ~203ms over n=200 calls (measured before the fix
    # below). predict_on_batch() skips that overhead for single-sample inference.
    model, x = _load_lstm_and_sample()

    p95 = _p95_latency_ms(lambda: model.predict_on_batch(x))

    assert p95 < P95_TARGET_MS


def test_lstm_predict_on_batch_matches_predict_output():
    model, x = _load_lstm_and_sample()

    predict_output = model.predict(x, verbose=0)
    batch_output = model.predict_on_batch(x)

    assert float(batch_output[0][0]) == pytest.approx(float(predict_output[0][0]), rel=1e-4)
