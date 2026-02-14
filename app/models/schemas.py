"""
Pydantic schemas for request and response validation.

Contains both Eng2 (API request/response) schemas and Eng1 (domain model) dataclasses.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, Tuple
from pydantic import BaseModel, Field


# =============================================================================
# Eng2: API Request / Response Schemas (Pydantic)
# =============================================================================

class AnalyzeRequest(BaseModel):
    crop_type: Literal["maize"] = "maize"
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    farm_size_hectares: float = Field(..., gt=0)
    analysis_id: Optional[str] = Field(default=None, description="If provided, load Eng1 output JSON from data/analyses/<analysis_id>.json")


class SatelliteSummary(BaseModel):
    ndvi_mean: float = Field(..., ge=0.0, le=1.0)
    ndvi_trend: float = Field(..., ge=-1.0, le=1.0)
    cropland_confidence: float = Field(..., ge=0.0, le=1.0)


class AuditSummary(BaseModel):
    emissions_percentile_est: float = Field(..., ge=0.0, le=100.0)
    baseline_tco2e_y: float = Field(..., ge=0.0)


class RoadmapStep(BaseModel):
    title: str
    why: str
    actions: List[str]
    expected_reduction_pct: Tuple[float, float]  # [min, max]
    upfront_cost_usd: Tuple[int, int]            # [min, max]
    timeline: str


class ReductionSummary(BaseModel):
    annual_tco2e_saved: Tuple[float, float]      # [min, max]


class FinanceOffer(BaseModel):
    carbon_price_usd_per_t: float
    credit_value_usd_y: Tuple[float, float]      # [min, max]
    loan_offer_usd: Tuple[float, float]          # [min, max]
    repayment_note: str


class AnalyzeResponse(BaseModel):
    location: Dict[str, float]
    crop_type: Literal["maize"]
    satellite: SatelliteSummary
    audit: AuditSummary
    roadmap: List[RoadmapStep]
    reduction_summary: ReductionSummary
    finance: FinanceOffer


# =============================================================================
# Eng1: Domain Model Dataclasses
# =============================================================================

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
