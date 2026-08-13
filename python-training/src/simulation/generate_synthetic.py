import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from water_balance import PARAM_BOUNDS, PARAM_NAMES, simulate_series

DATASET_PATH = Path(__file__).resolve().parents[2] / "data" / "cache" / "farmflo_uk_dataset.csv"
PARAMS_PATH = Path(__file__).resolve().parents[2] / "data" / "cache" / "calibrated_soil_params.csv"
OUTPUT_PATH = Path(__file__).resolve().parents[2] / "data" / "cache" / "synthetic_dataset.csv"

VARIANTS_PER_SITE = 6
PERTURBATION_STD = 0.15
MIN_FIELD_CAPACITY_WILTING_POINT_GAP = 5.0


def perturb_params(base_params, rng):
    perturbed = {}
    for name in PARAM_NAMES:
        low, high = PARAM_BOUNDS[name]
        value = base_params[name] * (1.0 + rng.normal(0.0, PERTURBATION_STD))
        perturbed[name] = float(np.clip(value, low, high))

    # calibrate.py's objective rejects any candidate with field_capacity <= wilting_point + 5,
    # so the corrected value must land strictly above that boundary, not exactly on it.
    min_gap = MIN_FIELD_CAPACITY_WILTING_POINT_GAP
    if perturbed["field_capacity"] <= perturbed["wilting_point"] + min_gap:
        high = PARAM_BOUNDS["field_capacity"][1]
        perturbed["field_capacity"] = min(high, perturbed["wilting_point"] + min_gap + 1e-6)
    return perturbed


def generate(seed=42):
    dataset = pd.read_csv(DATASET_PATH)
    calibration = pd.read_csv(PARAMS_PATH)
    rng = np.random.default_rng(seed)

    rows = []
    for _, calib_row in calibration.iterrows():
        site_id = calib_row["site_id"]
        site_df = dataset[dataset["site_id"] == site_id].sort_values("date").reset_index(drop=True)

        precip = site_df["cosmos_precip"].fillna(0.0).to_numpy()
        net_radiation = site_df["cosmos_rn"].interpolate(limit_direction="both").fillna(0.0).to_numpy()
        base_params = {name: calib_row[name] for name in PARAM_NAMES}
        saturation = calib_row["saturation"]

        for variant in range(VARIANTS_PER_SITE):
            params = base_params if variant == 0 else perturb_params(base_params, rng)
            initial_vwc = float(np.clip(calib_row["initial_vwc"], params["wilting_point"], saturation))

            simulated = simulate_series(precip, net_radiation, params, initial_vwc, saturation)

            variant_df = pd.DataFrame(
                {
                    "synthetic_farm_id": f"{site_id}_v{variant}",
                    "source_site_id": site_id,
                    "date": site_df["date"],
                    "vwc": simulated,
                    "precip": precip,
                    "net_radiation": net_radiation,
                    "air_temp": site_df["cosmos_ta"],
                    "relative_humidity": site_df["cosmos_rh"],
                    "latitude": site_df["latitude"],
                    "longitude": site_df["longitude"],
                    "land_cover": site_df["land_cover"],
                    "soil_type": site_df["soil_type"],
                    "rain_gain": params["rain_gain"],
                    "et_coefficient": params["et_coefficient"],
                    "drainage_rate": params["drainage_rate"],
                    "field_capacity": params["field_capacity"],
                    "wilting_point": params["wilting_point"],
                    "is_calibrated_baseline": variant == 0,
                }
            )
            rows.append(variant_df)

    synthetic = pd.concat(rows, ignore_index=True)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    synthetic.to_csv(OUTPUT_PATH, index=False)
    return synthetic


if __name__ == "__main__":
    df = generate()
    print(f"Rows: {len(df)}")
    print(f"Synthetic farms: {df['synthetic_farm_id'].nunique()}")
    print(f"Source sites: {df['source_site_id'].nunique()}")
    print(f"vwc range: {df['vwc'].min():.1f} to {df['vwc'].max():.1f}")
    print(f"Saved to: {OUTPUT_PATH}")
