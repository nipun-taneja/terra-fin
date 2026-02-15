from __future__ import annotations

from fastapi import APIRouter, HTTPException  # type: ignore[import]
from ..services.eng1_loader import load_eng1_analysis  # type: ignore[import]
from ..models.farm_analysis_schemas import FarmEcho  # type: ignore[import]


from ..models.farm_analysis_schemas import (  # type: ignore[import]
    FarmAnalyzeRequest,
    FarmAnalyzeResponse,
    FieldReduction,
    OutputWindow,
    FullAnalysisResponse,
)
from ..pipelines.run_full import run_full_pipeline  # type: ignore[import]

# MVP MODE:
# We'll return a deterministic "mock estimator" response that matches Eng-1 output.
# Later, swap `run_estimator(req)` with:
# - CSV writing
# - calling Eng-1 estimator code
# - or loading Eng-1 output JSON file.


router = APIRouter()


def run_estimator(req: FarmAnalyzeRequest) -> FarmAnalyzeResponse:
    """
    MVP placeholder estimator:
    Computes a simple reduction proxy from baseline vs project differences.
    Returns Eng-1 shaped output: window echo + per-field reduction + total.
    """
    field_out = []
    total = 0.0

    for f in req.fields:
        # Simple proxy logic (hackathon-safe):
        # - Reduction from fewer tillage passes
        # - Reduction from lower fertilizer amount
        # - Irrigation change has small effect
        till_red = max(0, f.baseline.tillage_passes - f.project.tillage_passes) * 0.25
        fert_red = max(0.0, f.baseline.fertilizer_amount - f.project.fertilizer_amount) * 0.01
        irr_red = max(0, f.baseline.irrigation_events - f.project.irrigation_events) * 0.05

        # Scale with area (rough proxy). Keep units simple for MVP.
        # Acre baseline: ~1.0 scale; hectare: ~2.47 acre; sqm: tiny.
        if f.area_unit.value == "hectare":
            area_scale = f.area_value * 2.47105
        elif f.area_unit.value == "sqm":
            area_scale = f.area_value / 4046.86
        else:
            area_scale = f.area_value

        reduction_raw = (till_red + fert_red + irr_red) * area_scale
        reduction = float(round(float(reduction_raw), 2))  # type: ignore[call-overload]

        low = float(round(float(reduction * 0.84), 2))  # type: ignore[call-overload]
        high = float(round(float(reduction * 1.16), 2))  # type: ignore[call-overload]

        field_out.append(
            FieldReduction(
                field_name=f.field_name,
                reduction_tco2e=reduction,
                low=low,
                high=high,
            )
        )
        total += reduction

    return FarmAnalyzeResponse(**{
        "farm": FarmEcho(farm_name=req.farm.farm_name, state=req.farm.state),
        "analysis_window": OutputWindow(
            start_date=req.analysis_window.start_date,
            end_date=req.analysis_window.end_date,
        ),
        "total_reduction_tco2e": float(round(float(total), 2)),  # type: ignore[call-overload]
        "fields": field_out,
    })



@router.post("/api/farms/analyze", response_model=FarmAnalyzeResponse)
def analyze_farm(req: FarmAnalyzeRequest) -> FarmAnalyzeResponse:
    if len(req.fields) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 fields allowed for MVP.")

    # If Eng1 output exists, return it directly
    if req.analysis_id:
        eng1 = load_eng1_analysis(req.analysis_id)

        # Expect Eng1 output format:
        # { "analysis_window": {...}, "total_reduction_tco2e": ..., "fields": [...] }
        if "analysis_window" in eng1 and "fields" in eng1:
            payload = {
                "farm": {"farm_name": req.farm.farm_name, "state": req.farm.state},
                **eng1,
            }
            return FarmAnalyzeResponse.model_validate(payload)

        raise HTTPException(
            status_code=400,
            detail="Eng1 JSON found, but it does not match expected FarmAnalyzeResponse format.",
        )

    # Otherwise fallback to MVP estimator
    return run_estimator(req)


@router.post("/api/farms/analyze/full", response_model=FullAnalysisResponse)
def analyze_farm_full(req: FarmAnalyzeRequest) -> FullAnalysisResponse:
    """
    Full pipeline endpoint:
    Runs ingest → estimate → score → forecast → earnings → recommendations.
    Returns rich response with credit score, forecasts, earnings, and AI recommendations.
    """
    if len(req.fields) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 fields allowed for MVP.")

    try:
        return run_full_pipeline(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {e}")


# ------------------------------------------------------------------
# Analysis retrieval endpoints (storage backend via facade)
# ------------------------------------------------------------------
from app.services.storage import (  # type: ignore[import]
    list_analyses as _list_analyses,
    get_analysis as _get_analysis,
)


@router.get("/api/analyses")
def list_analyses(limit: int = 50):
    """List recent analyses (most recent first)."""
    try:
        return _list_analyses(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage error: {e}")


@router.get("/api/analyses/{analysis_id}")
def get_analysis(analysis_id: str):
    """Retrieve a specific past analysis by its ID."""
    try:
        doc = _get_analysis(analysis_id)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage error: {e}")
