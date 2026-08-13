import numpy as np
import pandas as pd
import pytest

import calibrate
import generate_synthetic
import water_balance
from water_balance import PARAM_BOUNDS, PARAM_NAMES


# ---------------------------------------------------------------------------
# water_balance.py
# ---------------------------------------------------------------------------


def test_moisture_stress_clips_to_0_1_and_ramps_linearly_between():
    vwc = np.array([-100.0, 0.0, 50.0, 100.0, 1000.0])
    result = water_balance.moisture_stress(vwc, field_capacity=80.0, wilting_point=20.0)

    assert result.shape == vwc.shape
    assert (result >= 0.0).all()
    assert (result <= 1.0).all()
    assert result[0] == 0.0
    assert result[1] == 0.0
    assert result[2] == pytest.approx(0.5)
    assert result[3] == 1.0
    assert result[4] == 1.0


def test_moisture_stress_handles_degenerate_span_without_division_by_zero():
    result = water_balance.moisture_stress(np.array([10.0, 30.0]), field_capacity=20.0, wilting_point=20.0)
    assert np.isfinite(result).all()


def test_simulate_series_stays_constant_with_no_precip_or_radiation():
    params = dict(rain_gain=0.5, et_coefficient=0.5, drainage_rate=0.1, field_capacity=80.0, wilting_point=20.0)
    precip = np.zeros(10)
    net_radiation = np.zeros(10)

    result = water_balance.simulate_series(precip, net_radiation, params, initial_vwc=50.0, saturation=95.0)

    assert result.shape == (10,)
    assert not np.isnan(result).any()
    assert np.allclose(result, 50.0)


def test_simulate_series_never_exceeds_saturation_even_with_torrential_rain():
    params = dict(rain_gain=1.0, et_coefficient=0.0, drainage_rate=0.5, field_capacity=50.0, wilting_point=10.0)
    precip = np.full(5, 1000.0)
    net_radiation = np.zeros(5)

    result = water_balance.simulate_series(precip, net_radiation, params, initial_vwc=20.0, saturation=60.0)

    assert (result <= 60.0).all()
    assert np.allclose(result, 60.0)


def test_simulate_series_never_drops_below_wilting_point():
    params = dict(rain_gain=0.0, et_coefficient=2.0, drainage_rate=0.0, field_capacity=80.0, wilting_point=20.0)
    precip = np.zeros(10)
    net_radiation = np.full(10, 50.0)

    result = water_balance.simulate_series(precip, net_radiation, params, initial_vwc=25.0, saturation=95.0)

    assert (result >= 20.0).all()
    assert not np.isnan(result).any()


def test_simulate_series_negative_radiation_contributes_no_evapotranspiration():
    params = dict(rain_gain=0.5, et_coefficient=1.0, drainage_rate=0.0, field_capacity=80.0, wilting_point=20.0)
    precip = np.zeros(3)
    net_radiation = np.array([-10.0, -5.0, -1.0])

    result = water_balance.simulate_series(precip, net_radiation, params, initial_vwc=50.0, saturation=95.0)

    assert np.allclose(result, 50.0)


# ---------------------------------------------------------------------------
# calibrate.py
# ---------------------------------------------------------------------------


def test_prepare_site_series_fills_precip_and_interpolates_radiation_but_keeps_observed_nans():
    df = pd.DataFrame(
        {
            "date": pd.date_range("2023-01-01", periods=5),
            "cosmos_precip": [1.0, np.nan, 2.0, np.nan, 3.0],
            "cosmos_rn": [10.0, np.nan, np.nan, 20.0, np.nan],
            "cosmos_vwc": [40.0, np.nan, 42.0, 43.0, np.nan],
        }
    )

    precip, net_radiation, observed = calibrate.prepare_site_series(df)

    assert not np.isnan(precip).any()
    assert precip[1] == 0.0

    assert not np.isnan(net_radiation).any()
    assert net_radiation[1] == pytest.approx(13.3333, abs=1e-3)
    assert net_radiation[2] == pytest.approx(16.6667, abs=1e-3)
    assert net_radiation[4] == pytest.approx(20.0)  # trailing NaN carried forward, not zero-filled

    # observed vwc is left untouched (including NaNs) so the caller's `valid` mask can exclude them
    assert np.isnan(observed[1])
    assert np.isnan(observed[4])
    assert observed[0] == 40.0


def _synthetic_site_df(n=40, seed=0):
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2023-01-01", periods=n)
    precip = rng.uniform(0.0, 5.0, n)
    net_radiation = rng.uniform(0.0, 15.0, n)
    vwc = 40.0 + rng.normal(0.0, 1.0, n)
    return pd.DataFrame(
        {"date": dates, "cosmos_precip": precip, "cosmos_rn": net_radiation, "cosmos_vwc": vwc}
    )


def test_calibrate_site_returns_none_when_fewer_than_30_valid_observations():
    df = _synthetic_site_df(n=20)
    result = calibrate.calibrate_site(df, "site_a", "clay")
    assert result is None


def test_calibrate_site_fits_within_bounds_and_respects_min_gap_constraint():
    df = _synthetic_site_df(n=40)

    result = calibrate.calibrate_site(df, "site_a", "clay")

    assert result is not None
    assert result["site_id"] == "site_a"
    assert result["soil_type"] == "clay"
    assert np.isfinite(result["rmse"])
    assert result["rmse"] >= 0.0
    assert np.isfinite(result["mae"])

    for name in PARAM_NAMES:
        low, high = PARAM_BOUNDS[name]
        assert low <= result[name] <= high

    assert result["field_capacity"] > result["wilting_point"] + 5


# ---------------------------------------------------------------------------
# generate_synthetic.py
# ---------------------------------------------------------------------------


class _ZeroNoiseRNG:
    """Fake RNG stub that always returns zero noise, so perturbation is deterministic."""

    def normal(self, loc, scale):
        return 0.0


def test_perturb_params_is_a_no_op_multiplier_when_noise_is_zero_and_gap_is_safe():
    base_params = {
        "rain_gain": 0.5,
        "et_coefficient": 1.0,
        "drainage_rate": 0.3,
        "field_capacity": 60.0,
        "wilting_point": 15.0,
    }

    perturbed = generate_synthetic.perturb_params(base_params, _ZeroNoiseRNG())

    assert perturbed == pytest.approx(base_params)


def test_perturb_params_corrects_violation_of_minimum_gap_strictly():
    # wilting_point near its own upper bound and field_capacity near its own lower
    # bound triggers the fc <= wp + 5 correction branch even with zero noise.
    base_params = {
        "rain_gain": 0.5,
        "et_coefficient": 1.0,
        "drainage_rate": 0.3,
        "field_capacity": 21.0,
        "wilting_point": 19.0,
    }

    perturbed = generate_synthetic.perturb_params(base_params, _ZeroNoiseRNG())

    assert perturbed["field_capacity"] > perturbed["wilting_point"] + 5


def test_perturb_params_never_produces_field_capacity_within_5_of_wilting_point():
    rng = np.random.default_rng(1)
    # start close to the wilting_point's own upper bound so the correction branch
    # triggers frequently across the random trials below.
    base_params = {
        "rain_gain": 0.5,
        "et_coefficient": 1.0,
        "drainage_rate": 0.3,
        "field_capacity": 22.0,
        "wilting_point": 18.0,
    }

    for _ in range(2000):
        perturbed = generate_synthetic.perturb_params(base_params, rng)
        assert perturbed["field_capacity"] > perturbed["wilting_point"] + 5
        for name in PARAM_NAMES:
            low, high = PARAM_BOUNDS[name]
            assert low <= perturbed[name] <= high


def test_perturb_params_stays_within_param_bounds_from_varied_starting_points():
    rng = np.random.default_rng(2)
    base_param_sets = [
        {"rain_gain": 0.05, "et_coefficient": 0.01, "drainage_rate": 0.0, "field_capacity": 20.0, "wilting_point": 1.0},
        {"rain_gain": 1.0, "et_coefficient": 2.0, "drainage_rate": 1.0, "field_capacity": 95.0, "wilting_point": 20.0},
        {"rain_gain": 0.4, "et_coefficient": 0.8, "drainage_rate": 0.4, "field_capacity": 55.0, "wilting_point": 12.0},
    ]

    for base_params in base_param_sets:
        for _ in range(200):
            perturbed = generate_synthetic.perturb_params(base_params, rng)
            for name in PARAM_NAMES:
                low, high = PARAM_BOUNDS[name]
                assert low <= perturbed[name] <= high


@pytest.fixture
def synthetic_output_path(monkeypatch, tmp_path):
    """Redirect generate_synthetic's OUTPUT_PATH so tests never overwrite real data/cache files."""
    output_path = tmp_path / "synthetic_dataset_test.csv"
    monkeypatch.setattr(generate_synthetic, "OUTPUT_PATH", output_path)
    return output_path


def test_generate_is_bit_for_bit_reproducible_for_a_fixed_seed(synthetic_output_path):
    if not generate_synthetic.DATASET_PATH.exists() or not generate_synthetic.PARAMS_PATH.exists():
        pytest.skip("real calibration/dataset cache files are not present in this environment")

    first = generate_synthetic.generate(seed=42)
    second = generate_synthetic.generate(seed=42)
    third = generate_synthetic.generate(seed=42)

    pd.testing.assert_frame_equal(first, second)
    pd.testing.assert_frame_equal(second, third)


def test_generate_produces_distinct_output_across_ten_seeds(synthetic_output_path):
    if not generate_synthetic.DATASET_PATH.exists() or not generate_synthetic.PARAMS_PATH.exists():
        pytest.skip("real calibration/dataset cache files are not present in this environment")

    seeds = range(10)
    results = [generate_synthetic.generate(seed=seed) for seed in seeds]

    vwc_signatures = [tuple(np.round(df["vwc"].to_numpy(), 6)) for df in results]
    assert len(set(vwc_signatures)) == len(vwc_signatures)
