import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import differential_evolution

sys.path.insert(0, str(Path(__file__).resolve().parent))
from water_balance import PARAM_BOUNDS, PARAM_NAMES, simulate_series

DATASET_PATH = Path(__file__).resolve().parents[2] / "data" / "cache" / "farmflo_uk_dataset.csv"
OUTPUT_PATH = Path(__file__).resolve().parents[2] / "data" / "cache" / "calibrated_soil_params.csv"


def prepare_site_series(site_df):
    site_df = site_df.sort_values("date").reset_index(drop=True)
    precip = site_df["cosmos_precip"].fillna(0.0).to_numpy()
    net_radiation = site_df["cosmos_rn"].interpolate(limit_direction="both").fillna(0.0).to_numpy()
    observed = site_df["cosmos_vwc"].to_numpy()
    return precip, net_radiation, observed


def calibrate_site(site_df, site_id, soil_type):
    precip, net_radiation, observed = prepare_site_series(site_df)
    valid = ~np.isnan(observed)

    if valid.sum() < 30:
        return None

    initial_vwc = observed[valid][0]
    saturation = min(100.0, np.nanmax(observed) * 1.05)

    def objective(x):
        params = dict(zip(PARAM_NAMES, x))
        if params["field_capacity"] <= params["wilting_point"] + 5:
            return 1e6
        simulated = simulate_series(precip, net_radiation, params, initial_vwc, saturation)
        errors = simulated[valid] - observed[valid]
        return np.sqrt(np.mean(errors**2))

    bounds = [PARAM_BOUNDS[name] for name in PARAM_NAMES]
    result = differential_evolution(
        objective, bounds, maxiter=80, popsize=15, tol=1e-4, seed=42, polish=True
    )

    params = dict(zip(PARAM_NAMES, result.x))
    simulated = simulate_series(precip, net_radiation, params, initial_vwc, saturation)

    errors = simulated[valid] - observed[valid]
    rmse = float(np.sqrt(np.mean(errors**2)))
    mae = float(np.mean(np.abs(errors)))
    ss_res = float(np.sum(errors**2))
    ss_tot = float(np.sum((observed[valid] - observed[valid].mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")

    return {
        "site_id": site_id,
        "soil_type": soil_type,
        "saturation": saturation,
        "initial_vwc": initial_vwc,
        "rmse": rmse,
        "mae": mae,
        "r2": r2,
        "observed_mean": float(np.nanmean(observed)),
        "observed_std": float(np.nanstd(observed)),
        "simulated_mean": float(np.mean(simulated)),
        "simulated_std": float(np.std(simulated)),
        **params,
    }


def calibrate_all(dataset_path=DATASET_PATH, max_workers=None):
    df = pd.read_csv(dataset_path)
    site_groups = {site_id: site_df for site_id, site_df in df.groupby("site_id")}

    results = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(calibrate_site, site_df, site_id, site_df["soil_type"].iloc[0]): site_id
            for site_id, site_df in site_groups.items()
        }
        for future in as_completed(futures):
            site_id = futures[future]
            result = future.result()
            if result:
                results.append(result)
                print(f"{site_id}: RMSE={result['rmse']:.2f}  MAE={result['mae']:.2f}  R2={result['r2']:.3f}")
            else:
                print(f"{site_id}: skipped, insufficient observed data")

    results_df = pd.DataFrame(results).sort_values("site_id").reset_index(drop=True)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    results_df.to_csv(OUTPUT_PATH, index=False)
    return results_df


if __name__ == "__main__":
    results_df = calibrate_all()
    print()
    print("Overall calibration quality:")
    print(f"  Mean RMSE: {results_df['rmse'].mean():.2f}")
    print(f"  Mean MAE:  {results_df['mae'].mean():.2f}")
    print(f"  Mean R2:   {results_df['r2'].mean():.3f}")
    print(f"Saved to: {OUTPUT_PATH}")
