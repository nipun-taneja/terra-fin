from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


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

