"""Live-service smoke tests for manual verification of rate limits, latency, and
malformed-output handling against the real Gemini API and the real Open-Meteo endpoint.

These hit the network and (for Gemini) a billed API key, so they are excluded from the
default test run by tests/conftest.py's pytest_collection_modifyitems hook. Run them
explicitly with:

    pytest -m live
"""

import os
from pathlib import Path
import time

import pytest
import requests
from dotenv import load_dotenv

pytestmark = pytest.mark.live

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
os.environ.setdefault("GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", ""))


class TestGeminiExplanationAgent:
    def test_explain_schedule_returns_a_real_gemini_explanation_within_a_sane_time_budget(self):
        from language_layer.explanation_agent import explain_schedule

        numbers = {"horizonDays": 7, "totalWaterMm": 40.96, "irrigationDays": 2}

        start = time.perf_counter()
        result = explain_schedule("Test Farm", "ALIC1", numbers)
        elapsed = time.perf_counter() - start

        assert result["source"] in {"gemini", "template"}
        assert isinstance(result["explanation"], str) and result["explanation"]
        assert result["guardrailPassed"] == (result["source"] == "gemini")
        assert elapsed < 30.0  # real API round trip; flag here if latency regresses

    def test_explain_schedule_handles_zero_irrigation_without_crashing(self):
        from language_layer.explanation_agent import explain_schedule

        numbers = {"horizonDays": 7, "totalWaterMm": 0.0, "irrigationDays": 0}
        result = explain_schedule(None, None, numbers)

        assert result["explanation"]
        assert result["source"] in {"gemini", "template"}

    def test_explain_schedule_falls_back_to_template_rather_than_crashing_on_bad_agent_config(self, monkeypatch):
        # Simulates a malformed/unreachable model response: any exception from the agent
        # must be swallowed and produce the deterministic template fallback, never propagate.
        import language_layer.explanation_agent as explanation_agent

        def _broken_run_once(agent, prompt):
            raise RuntimeError("simulated malformed response from the language model")

        monkeypatch.setattr(explanation_agent, "run_once", _broken_run_once)

        numbers = {"horizonDays": 5, "totalWaterMm": 22.5, "irrigationDays": 3}
        result = explanation_agent.explain_schedule("Test Farm", "ALIC1", numbers)

        assert result["source"] == "template"
        assert result["guardrailPassed"] is False
        assert "22.5" in result["explanation"] or "23" in result["explanation"] or "22" in result["explanation"]


class TestOpenMeteoForecastEndpoint:
    LATITUDE, LONGITUDE = 51.153551, -0.858232

    def test_fetch_forecast_daily_returns_real_data_with_expected_columns(self):
        import open_meteo

        start = time.perf_counter()
        df = open_meteo.fetch_forecast_daily(self.LATITUDE, self.LONGITUDE, 3)
        elapsed = time.perf_counter() - start

        assert len(df) == 3
        for column in ("date", "om_temperature", "om_precipitation", "om_relative_humidity", "om_shortwave_radiation"):
            assert column in df.columns
        assert elapsed < 15.0

    def test_fetch_daily_returns_real_historical_data_for_a_short_window(self):
        import open_meteo

        df = open_meteo.fetch_daily(self.LATITUDE, self.LONGITUDE, "2023-06-01", "2023-06-03")

        assert len(df) == 3
        assert df["om_precipitation"].notna().all()

    def test_fetch_forecast_daily_raises_cleanly_on_malformed_coordinates(self):
        import open_meteo

        with pytest.raises(requests.exceptions.HTTPError):
            open_meteo.fetch_forecast_daily(999.0, 999.0, 3)
