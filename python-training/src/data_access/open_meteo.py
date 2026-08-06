from pathlib import Path

import pandas as pd
import requests

BASE_URL = "https://archive-api.open-meteo.com/v1/archive"
CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "cache" / "open_meteo"

DAILY_VARIABLES = [
    "temperature_2m_mean",
    "precipitation_sum",
    "relative_humidity_2m_mean",
    "shortwave_radiation_sum",
]


def fetch_daily(latitude, longitude, start, end, daily_variables=DAILY_VARIABLES):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start,
        "end_date": end,
        "daily": ",".join(daily_variables),
        "timezone": "UTC",
    }
    response = requests.get(BASE_URL, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()["daily"]

    df = pd.DataFrame(payload)
    df["time"] = pd.to_datetime(df["time"]).dt.date
    df = df.rename(columns={"time": "date"})
    df = df.rename(columns={v: f"om_{v.replace('_2m', '').replace('_mean', '').replace('_sum', '')}" for v in daily_variables})
    return df


def build_cache(site_id, latitude, longitude, start, end, force=False):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{site_id}.csv"

    if not force and cache_path.exists():
        return pd.read_csv(cache_path, parse_dates=["date"])

    print(f"Fetching Open Meteo data for {site_id}")
    df = fetch_daily(latitude, longitude, start, end)
    df["site_id"] = site_id
    df.to_csv(cache_path, index=False)
    return df


if __name__ == "__main__":
    sample = build_cache("ALIC1", 51.153551, -0.858232, "2023-01-01", "2023-01-31")
    print(sample.head())
