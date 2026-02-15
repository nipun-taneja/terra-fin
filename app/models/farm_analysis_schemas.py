from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field  # type: ignore[import]


# -----------------------------
# Enums
# -----------------------------
class USState(str, Enum):
    CA = "CA"
    TX = "TX"
    IA = "IA"
    IL = "IL"
    AR = "AR"
    LA = "LA"
    MS = "MS"
    MO = "MO"
    # Add more as needed


class AreaUnit(str, Enum):
    ACRE = "acre"
    HECTARE = "hectare"
    SQM = "sqm"


class FertilizerUnit(str, Enum):
    LB_N_PER_ACRE = "lb_N_per_acre"
    KG_N_PER_HA = "kg_N_per_ha"


class CropType(str, Enum):
    CORN = "corn"
    RICE = "rice"


# -----------------------------
# Input Schemas (Eng2)
# -----------------------------
class FarmInfo(BaseModel):
    farm_name: str = Field(..., min_length=1)
    state: USState


class AnalysisWindow(BaseModel):
    start_date: str  # keep string for MVP
    end_date: str
    timezone: str = "America/Los_Angeles"


class Practices(BaseModel):
    tillage_passes: int = Field(..., ge=0, le=50)
    fertilizer_amount: float = Field(..., ge=0)
    fertilizer_unit: FertilizerUnit
    irrigation_events: int = Field(..., ge=0, le=200)


class FieldInput(BaseModel):
    field_name: str = Field(..., min_length=1)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    area_value: float = Field(..., gt=0)
    area_unit: AreaUnit
    crop_type: CropType
    baseline: Practices
    project: Practices


class FarmAnalyzeRequest(BaseModel):
    analysis_id: str | None = None  # Optional: to load Eng1 output JSON
    farm: FarmInfo
    analysis_window: AnalysisWindow
    fields: List[FieldInput] = Field(..., min_items=1, max_items=4)



# -----------------------------
# Output Schemas (Eng1)
# -----------------------------
class OutputWindow(BaseModel):
    start_date: str
    end_date: str


class FieldReduction(BaseModel):
    field_name: str
    reduction_tco2e: float
    low: float
    high: float

class FarmEcho(BaseModel):
    farm_name: str
    state: USState


class FarmAnalyzeResponse(BaseModel):
    farm: FarmEcho
    analysis_window: OutputWindow
    total_reduction_tco2e: float
    fields: List[FieldReduction]


# -----------------------------
# Full Analysis Output (Eng1 pipeline)
# -----------------------------
class LowMidHigh(BaseModel):
    low: float
    mid: float
    high: float


class LowHigh(BaseModel):
    low: float
    high: float


class CreditForecastEntry(BaseModel):
    months: int
    credits_tco2e: LowMidHigh


class EarningsForecastEntry(BaseModel):
    months: int
    net_earnings_usd: LowMidHigh


class RecommendedMeasure(BaseModel):
    title: str
    risk_level: str = "medium"
    why_it_helps: str = ""
    field_names: List[str] = []
    capital_required_usd: LowHigh = LowHigh(**{"low": 0.0, "high": 0.0})
    annual_opex_change_usd: LowHigh = LowHigh(**{"low": 0.0, "high": 0.0})
    timeline_months: LowHigh = LowHigh(**{"low": 1.0, "high": 6.0})
    expected_credit_uplift_tco2e_per_year: LowHigh = LowHigh(**{"low": 0.0, "high": 0.0})
    implementation_steps: List[str] = []
    verification_evidence: List[str] = []


class FieldResult(BaseModel):
    field_name: str
    crop_type: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_value: Optional[float] = None
    area_unit: Optional[str] = None
    baseline: Optional[dict] = None
    project: Optional[dict] = None
    annual_reduction_tco2e: LowMidHigh
    data_quality_score: float = 0.0
    assumptions: str = ""


class ScoreBreakdown(BaseModel):
    data_completeness: float = 0.0
    reduction_potential: float = 0.0
    additionality: float = 0.0
    verification_readiness: float = 0.0
    uncertainty_penalty: float = 0.0


class AppraiserInfo(BaseModel):
    what_to_do_next: List[str] = []
    evidence_checklist: List[str] = []


class FullAnalysisResponse(BaseModel):
    farm: FarmEcho
    analysis_window: OutputWindow
    summary: dict  # {annual_reduction_tco2e, credit_score_0_100, data_quality_score_avg, assumptions}
    credits_forecast: List[CreditForecastEntry]
    earnings_forecast: List[EarningsForecastEntry]
    per_field: List[FieldResult]
    recommendations: List[RecommendedMeasure]
    appraiser: AppraiserInfo
