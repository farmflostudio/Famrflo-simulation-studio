from water_balance import simulate_series
from decision_engine import (
    MAX_DAILY_IRRIGATION_MM,
    _fixed_interval_schedule,
    _linear_programme_schedule,
    _optimised_schedule,
    _threshold_schedule,
)

PARAMS = {
    "rain_gain": 0.2,
    "et_coefficient": 0.05,
    "drainage_rate": 0.3,
    "field_capacity": 40.0,
    "wilting_point": 10.0,
}
SATURATION = 45.0
DATES = [f"2026-08-{7 + i:02d}" for i in range(7)]


def _assert_valid_strategy_result(result):
    assert len(result["plan"]) == len(DATES)
    for entry in result["plan"]:
        assert 0.0 <= entry["recommendedMm"] <= MAX_DAILY_IRRIGATION_MM + 1e-6
    assert result["totalWaterMm"] >= 0.0
    assert result["irrigationDays"] == sum(1 for e in result["plan"] if e["recommendedMm"] > 0.01)


class TestMildDrySpell:
    """A gentle decline that never gets close to the wilting point - real risk is low."""

    precip = [0.0] * 7
    net_radiation = [25.0] * 7
    initial_vwc = 20.0

    def test_baseline_without_irrigation_stays_clear_of_wilting_point(self):
        baseline = simulate_series(self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        assert baseline.min() > PARAMS["wilting_point"] + 5

    def test_all_strategies_are_valid(self):
        for fn in (_optimised_schedule, _fixed_interval_schedule, _threshold_schedule, _linear_programme_schedule):
            result = fn(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
            _assert_valid_strategy_result(result)

    def test_optimised_engine_uses_less_water_than_the_naive_fixed_interval_baseline(self):
        optimised = _optimised_schedule(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        fixed = _fixed_interval_schedule(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        assert optimised["totalWaterMm"] < fixed["totalWaterMm"]


class TestSevereDrySpell:
    """Starts close to the wilting point under strong evapotranspiration - real risk is high."""

    precip = [0.0] * 7
    net_radiation = [30.0] * 7
    initial_vwc = 16.0
    severe_params = {**PARAMS, "et_coefficient": 0.6}

    def test_baseline_without_irrigation_approaches_the_wilting_point(self):
        baseline = simulate_series(self.precip, self.net_radiation, self.severe_params, self.initial_vwc, SATURATION)
        assert baseline.min() <= self.severe_params["wilting_point"] + 0.5

    def test_optimised_engine_irrigates_substantially_and_protects_moisture(self):
        result = _optimised_schedule(
            DATES, self.precip, self.net_radiation, self.severe_params, self.initial_vwc, SATURATION
        )
        _assert_valid_strategy_result(result)
        assert result["totalWaterMm"] > 50
        assert result["minVwc"] > self.severe_params["wilting_point"] + 5

    def test_optimised_engine_protects_moisture_better_than_the_naive_fixed_interval_baseline(self):
        optimised = _optimised_schedule(
            DATES, self.precip, self.net_radiation, self.severe_params, self.initial_vwc, SATURATION
        )
        fixed = _fixed_interval_schedule(
            DATES, self.precip, self.net_radiation, self.severe_params, self.initial_vwc, SATURATION
        )
        assert optimised["minVwc"] > fixed["minVwc"]


class TestWetWeek:
    precip = [15.0] * 7
    net_radiation = [5.0] * 7
    initial_vwc = 30.0

    def test_optimised_engine_applies_little_or_no_water_when_rain_is_abundant(self):
        result = _optimised_schedule(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        _assert_valid_strategy_result(result)
        assert result["totalWaterMm"] < 5.0

    def test_linear_programme_applies_little_or_no_water_when_rain_is_abundant(self):
        result = _linear_programme_schedule(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        _assert_valid_strategy_result(result)
        assert result["totalWaterMm"] < 5.0

    def test_fixed_interval_baseline_still_irrigates_regardless_of_rain(self):
        result = _fixed_interval_schedule(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        assert result["totalWaterMm"] > 0

    def test_optimised_uses_less_water_than_fixed_interval_when_rain_is_abundant(self):
        optimised = _optimised_schedule(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        fixed = _fixed_interval_schedule(DATES, self.precip, self.net_radiation, PARAMS, self.initial_vwc, SATURATION)
        assert optimised["totalWaterMm"] < fixed["totalWaterMm"]
