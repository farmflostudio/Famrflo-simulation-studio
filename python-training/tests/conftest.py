import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

for rel in ["service", "src/simulation", "src/models", "src/data_access"]:
    path = str(ROOT / rel)
    if path not in sys.path:
        sys.path.insert(0, path)


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "live: hits a real external service (Gemini, Open-Meteo). Deselected by default; "
        "run explicitly with `pytest -m live`.",
    )


def pytest_collection_modifyitems(config, items):
    # `-m live` already restricts the run to live-marked tests via pytest's own marker
    # filtering; here we additionally skip them whenever that marker expression was NOT
    # requested, so `pytest` with no args never makes real network/API calls.
    if "live" in (config.option.markexpr or "").split():
        return

    skip_live = pytest.mark.skip(reason="live test - hits a real external service; run with `pytest -m live`")
    for item in items:
        if "live" in item.keywords:
            item.add_marker(skip_live)
