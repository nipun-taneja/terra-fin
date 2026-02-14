from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from uuid import uuid4

from app.services.storage_csv import append_row
from app.services.units import area_to_hectares


FARMS_FIELDS = ["farm_id", "farm_name", "state", "created_at"]
FIELDS_FIELDS = [
    "field_id", "farm_id", "field_name",
    "centroid_lat", "centroid_lon", "boundary_geojson",
    "area_value", "area_unit", "area_ha"
]
FIELDS_SEASONS_FIELDS = ["season_id", "field_id", "year", "scenario", "crop_type", "notes"]
MGMT_EVENTS_FIELDS = [
    "event_id", "season_id", "event_type", "date",
    "amount", "unit", "product", "notes", "evidence_url"
]


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def create_farm(data_dir: str, farm_name: str, state: str, farm_id: Optional[str] = None) -> str:
    farm_id = farm_id or f"farm_{uuid4().hex[:10]}"
    row = {
        "farm_id": farm_id,
        "farm_name": farm_name,
        "state": state,
        "created_at": _now_iso(),
    }
    append_row(Path(data_dir) / "farms.csv", row, FARMS_FIELDS)
    return farm_id


def add_field(
    data_dir: str,
    farm_id: str,
    field_name: str,
    centroid_lat: float,
    centroid_lon: float,
    area_value: float,
    area_unit: str,
    boundary_geojson: str = "",
    field_id: Optional[str] = None,
) -> str:
    field_id = field_id or f"field_{uuid4().hex[:10]}"
    area_ha = area_to_hectares(area_value, area_unit)
    row = {
        "field_id": field_id,
        "farm_id": farm_id,
        "field_name": field_name,
        "centroid_lat": float(centroid_lat),
        "centroid_lon": float(centroid_lon),
        "boundary_geojson": boundary_geojson,
        "area_value": float(area_value),
        "area_unit": area_unit.strip().lower(),
        "area_ha": float(area_ha),
    }
    append_row(Path(data_dir) / "fields.csv", row, FIELDS_FIELDS)
    return field_id


def add_field_season(
    data_dir: str,
    field_id: str,
    year: int,
    scenario: str,
    crop_type: str,
    notes: str = "",
    season_id: Optional[str] = None,
) -> str:
    season_id = season_id or f"season_{uuid4().hex[:10]}"
    row = {
        "season_id": season_id,
        "field_id": field_id,
        "year": int(year),
        "scenario": scenario.strip().lower(),
        "crop_type": crop_type.strip().lower(),
        "notes": notes,
    }
    # NOTE: matches your filename: fields_seasons.csv
    append_row(Path(data_dir) / "fields_seasons.csv", row, FIELDS_SEASONS_FIELDS)
    return season_id


def add_management_event(
    data_dir: str,
    season_id: str,
    event_type: str,
    date: str,
    amount: Optional[float] = None,
    unit: str = "",
    product: str = "",
    notes: str = "",
    evidence_url: str = "",
    event_id: Optional[str] = None,
) -> str:
    event_id = event_id or f"evt_{uuid4().hex[:10]}"
    row = {
        "event_id": event_id,
        "season_id": season_id,
        "event_type": event_type.strip().lower(),
        "date": date,
        "amount": "" if amount is None else float(amount),
        "unit": unit,
        "product": product,
        "notes": notes,
        "evidence_url": evidence_url,
    }
    append_row(Path(data_dir) / "management_events.csv", row, MGMT_EVENTS_FIELDS)
    return event_id
