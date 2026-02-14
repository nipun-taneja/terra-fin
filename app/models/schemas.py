from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional


AreaUnit = Literal["acre", "hectare", "sqm"]
Scenario = Literal["baseline", "project"]
CropType = Literal["corn", "rice"]
EventType = Literal["tillage", "fertilizer", "irrigation", "planting", "harvest"]


@dataclass(frozen=True)
class Farm:
    farm_id: str
    farm_name: str
    state: str
    created_at: str  # ISO string


@dataclass(frozen=True)
class Field:
    field_id: str
    farm_id: str
    field_name: str
    centroid_lat: float
    centroid_lon: float
    boundary_geojson: str  # optional; may be empty
    area_value: float
    area_unit: AreaUnit
    area_ha: float  # normalized


@dataclass(frozen=True)
class FieldSeason:
    season_id: str
    field_id: str
    year: int
    scenario: Scenario
    crop_type: CropType
    notes: str = ""


@dataclass(frozen=True)
class ManagementEvent:
    event_id: str
    season_id: str
    event_type: EventType
    date: str  # YYYY-MM-DD
    amount: Optional[float] = None
    unit: str = ""
    product: str = ""
    notes: str = ""
    evidence_url: str = ""
