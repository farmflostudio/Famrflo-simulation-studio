import io
import zipfile
from pathlib import Path

import pandas as pd
import requests

BASE_URL = "https://cosmos-api.ceh.ac.uk"
CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "cache" / "cosmos_uk"

PARAMETERS = ["cosmos_vwc", "precip", "ta", "rh", "rn"]


def fetch_locations():
    response = requests.get(f"{BASE_URL}/collections/1D/locations", timeout=30)
    response.raise_for_status()
    data = response.json()

    sites = []
    for feature in data["features"]:
        props = feature["properties"]
        lat, lon = feature["geometry"]["coordinates"]
        site_info = props.get("siteInfo", {})
        sites.append(
            {
                "site_id": feature["id"],
                "label": props.get("label"),
                "latitude": lat,
                "longitude": lon,
                "altitude_m": (site_info.get("altitude") or {}).get("value"),
                "land_cover": (site_info.get("land_cover") or {}).get("value"),
                "soil_type": (site_info.get("soil_type") or {}).get("value"),
                "active_from": props.get("datetime", "").split("/")[0],
            }
        )
    return pd.DataFrame(sites)


def fetch_site_data(site_id, start, end, parameters=PARAMETERS):
    params = {
        "parameter-name": ",".join(parameters),
        "datetime": f"{start}T00:00:00Z/{end}T00:00:00Z",
        "f": "csv",
    }
    response = requests.get(
        f"{BASE_URL}/collections/1D/locations/{site_id}", params=params, timeout=60
    )
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        csv_name = archive.namelist()[0]
        with archive.open(csv_name) as csv_file:
            lines = csv_file.read().decode("utf-8").splitlines()

    header_row = next(i for i, line in enumerate(lines) if line.startswith("parameter-id"))
    columns = ["date"] + lines[header_row].split(",")[1:]
    data_lines = lines[header_row + 3 :]

    rows = [line.split(",") for line in data_lines if line.strip()]
    df = pd.DataFrame(rows, columns=columns)
    df["date"] = pd.to_datetime(df["date"]).dt.date

    for col in columns[1:]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.rename(
        columns={col: (col if col.startswith("cosmos_") else f"cosmos_{col}") for col in columns[1:]}
    )
    df["site_id"] = site_id
    return df


def build_cache(site_ids=None, start="2015-01-01", end=None, force=False):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    end = end or pd.Timestamp.utcnow().strftime("%Y-%m-%d")

    locations_path = CACHE_DIR / "sites.csv"
    if force or not locations_path.exists():
        locations = fetch_locations()
        locations.to_csv(locations_path, index=False)
    else:
        locations = pd.read_csv(locations_path)

    if site_ids is None:
        site_ids = locations["site_id"].tolist()

    frames = []
    for site_id in site_ids:
        site_cache = CACHE_DIR / f"{site_id}.csv"
        if force or not site_cache.exists():
            print(f"Fetching COSMOS UK data for {site_id}")
            site_df = fetch_site_data(site_id, start, end)
            site_df.to_csv(site_cache, index=False)
        else:
            site_df = pd.read_csv(site_cache, parse_dates=["date"])
        frames.append(site_df)

    combined = pd.concat(frames, ignore_index=True)
    combined.to_csv(CACHE_DIR / "combined.csv", index=False)
    return locations, combined


if __name__ == "__main__":
    locations_df, combined_df = build_cache()
    print(f"Sites: {len(locations_df)}")
    print(f"Combined rows: {len(combined_df)}")
    print(combined_df.head())
