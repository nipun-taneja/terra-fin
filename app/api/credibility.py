"""
Credibility API router for farmer identity and risk verification stubs.
"""
from typing import Optional, List
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class CredibilityRequest(BaseModel):
    """Request schema for checking farmer credibility."""
    farmer_name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = None
    farm_id: Optional[str] = None


class CredibilityResponse(BaseModel):
    """Response schema for farmer credibility check."""
    credible: bool
    score: float  # 0..1
    flags: List[str]


@router.post("/api/credibility/check", response_model=CredibilityResponse)
def check_credibility(req: CredibilityRequest) -> CredibilityResponse:
    """
    Check if a farmer is credible using CRS checks.
    
    Hackathon stub:
    - Returns deterministic results for demo stability.
    """
    name_key = (req.farmer_name or "").strip().lower()

    # Simple stable rule for demo (you can change anytime)
    if "test" in name_key or "demo" in name_key:
        return CredibilityResponse(credible=True, score=0.92, flags=[])

    # Default: "credible with minor flags"
    return CredibilityResponse(
        credible=True,
        score=0.78,
        flags=["limited_history_found"]
    )
