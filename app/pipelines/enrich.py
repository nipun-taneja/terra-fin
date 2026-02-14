from __future__ import annotations

from app.services.storage_csv import read_rows, append_row
from app.services.weather_open_meteo import fetch_daily_weather

WEATHER_FIELDS = ["field_id", "date", "tmin_c", "tmax_c", "precip_mm", "source"]

def _get_float(row: dict, keys: list[str]) -> float:
    for k in keys:
        val = row.get(k)
        if val is None:
            continue
        s = str(val).strip()
        if s == "":
            continue
        return float(s)
    raise KeyError(f"Missing required column. Tried keys: {keys}. Found columns: {list(row.keys())}")

def enrich_weather(data_dir: str, start_date: str, end_date: str) -> None:
    fields = read_rows(f"{data_dir}/fields.csv")

    for fld in fields:
        field_id = (fld.get("field_id") or "").strip()
        if not field_id:
            # skip bad rows
            continue

        lat = _get_float(fld, ["centroid_lat", "lat", "latitude", "center_lat"])
        lon = _get_float(fld, ["centroid_lon", "lon", "longitude", "center_lon"])

        days = fetch_daily_weather(lat, lon, start_date, end_date)
        for day in days:
            row = {"field_id": field_id, **day}
            append_row(f"{data_dir}/weather_daily.csv", row, WEATHER_FIELDS)
