"""
Pydantic schemas for request and response validation.
"""
from typing import Any, Dict, List, Literal, Tuple
from pydantic import BaseModel, Field
from typing import Optional



# -------------------------
# Request schema (from frontend)
# -------------------------
class AnalyzeRequest(BaseModel):
    crop_type: Literal["maize"] = "maize"
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    farm_size_hectares: float = Field(..., gt=0)
    analysis_id: Optional[str] = Field(default=None, description="If provided, load Eng1 output JSON from data/analyses/<analysis_id>.json")



# -------------------------
# Core response schemas
# -------------------------
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
