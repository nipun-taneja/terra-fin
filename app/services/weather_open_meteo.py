from __future__ import annotations
import requests
from typing import Dict, Any, List

def fetch_daily_weather(lat: float, lon: float, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    # start_date/end_date: YYYY-MM-DD
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "timezone": "America/Los_Angeles",
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    tmax = daily.get("temperature_2m_max", [])
    tmin = daily.get("temperature_2m_min", [])
    prcp = daily.get("precipitation_sum", [])

    out = []
    for i, d in enumerate(dates):
        out.append({
            "date": d,
            "tmax_c": tmax[i] if i < len(tmax) else None,
            "tmin_c": tmin[i] if i < len(tmin) else None,
            "precip_mm": prcp[i] if i < len(prcp) else None,
            "source": "open_meteo",
        })
    return out
