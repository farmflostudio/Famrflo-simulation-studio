import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

import cosmos_uk
import nasa_power
import open_meteo

DATASET_PATH = Path(__file__).resolve().parents[2] / "data" / "cache" / "farmflo_uk_dataset.csv"

DEFAULT_SITE_COUNT = 10


def select_sites(locations, count=DEFAULT_SITE_COUNT):
    step = max(len(locations) // count, 1)
    return locations.iloc[::step].head(count)


def build(site_count=DEFAULT_SITE_COUNT, start="2018-01-01", force=False):
    end = pd.Timestamp.utcnow().strftime("%Y-%m-%d")

    locations, cosmos_data = cosmos_uk.build_cache(site_ids=None, start=start, end=end, force=force)
    sites = select_sites(locations, site_count)

    all_rows = []
    for _, site in sites.iterrows():
        site_id = site["site_id"]
        site_cosmos = cosmos_data[cosmos_data["site_id"] == site_id].copy()
        if site_cosmos.empty:
            continue

        site_dates = pd.to_datetime(site_cosmos["date"])
        site_start = site_dates.min().strftime("%Y-%m-%d")
        site_end = site_dates.max().strftime("%Y-%m-%d")

        power_df = nasa_power.build_cache(site_id, site["latitude"], site["longitude"], site_start, site_end, force=force)
        meteo_df = open_meteo.build_cache(site_id, site["latitude"], site["longitude"], site_start, site_end, force=force)

        site_cosmos["date"] = pd.to_datetime(site_cosmos["date"]).dt.date
        power_df["date"] = pd.to_datetime(power_df["date"]).dt.date
        meteo_df["date"] = pd.to_datetime(meteo_df["date"]).dt.date

        merged = site_cosmos.merge(power_df.drop(columns=["site_id"]), on="date", how="left")
        merged = merged.merge(meteo_df.drop(columns=["site_id"]), on="date", how="left")

        for col in ["latitude", "longitude", "altitude_m", "land_cover", "soil_type"]:
            merged[col] = site[col]

        all_rows.append(merged)

    dataset = pd.concat(all_rows, ignore_index=True)
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(DATASET_PATH, index=False)
    return dataset


if __name__ == "__main__":
    df = build()
    print(f"Rows: {len(df)}")
    print(f"Sites: {df['site_id'].nunique()}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Saved to: {DATASET_PATH}")
    print(df.head())
