import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "data_access"))
import open_meteo

NET_RADIATION_FACTOR = 0.65


def get_weather(latitude, longitude, start_date, end_date):
    df = open_meteo.fetch_daily(latitude, longitude, start_date, end_date)
    df = df.rename(
        columns={
            "om_temperature": "air_temp",
            "om_precipitation": "precip",
            "om_relative_humidity": "relative_humidity",
        }
    )
    df["net_radiation"] = df["om_shortwave_radiation"] * NET_RADIATION_FACTOR
    return df[["date", "precip", "air_temp", "relative_humidity", "net_radiation"]]
