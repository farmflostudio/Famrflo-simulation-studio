from pathlib import Path

import pandas as pd
import requests

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "cache" / "nasa_power"

PARAMETERS = ["T2M", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN"]


def fetch_daily(latitude, longitude, start, end, parameters=PARAMETERS):
    params = {
        "parameters": ",".join(parameters),
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start.replace("-", ""),
        "end": end.replace("-", ""),
        "format": "JSON",
    }
    response = requests.get(BASE_URL, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()["properties"]["parameter"]

    df = pd.DataFrame(payload)
    df.index = pd.to_datetime(df.index, format="%Y%m%d").date
    df.index.name = "date"
    df = df.reset_index()
    df = df.replace(-999.0, pd.NA)
    df = df.rename(columns={p: f"power_{p.lower()}" for p in parameters})
    return df


def build_cache(site_id, latitude, longitude, start, end, force=False):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{site_id}.csv"

    if not force and cache_path.exists():
        return pd.read_csv(cache_path, parse_dates=["date"])

    print(f"Fetching NASA POWER data for {site_id}")
    df = fetch_daily(latitude, longitude, start, end)
    df["site_id"] = site_id
    df.to_csv(cache_path, index=False)
    return df


if __name__ == "__main__":
    sample = build_cache("ALIC1", 51.153551, -0.858232, "2023-01-01", "2023-01-31")
    print(sample.head())
