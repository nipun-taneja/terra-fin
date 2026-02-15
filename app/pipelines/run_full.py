"""
Full pipeline orchestrator.
Takes a FarmAnalyzeRequest → runs ingest, estimate, score, forecast,
earnings, recommendations → returns FullAnalysisResponse.
"""
from __future__ import annotations

import shutil
import tempfile
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

from ..models.farm_analysis_schemas import (  # type: ignore[import]
    AppraiserInfo,
    CreditForecastEntry,
    EarningsForecastEntry,
    FarmAnalyzeRequest,
    FarmEcho,
    FieldResult,
    FullAnalysisResponse,
    LowMidHigh,
    OutputWindow,
    RecommendedMeasure,
    LowHigh,
)
from .ingest import (  # type: ignore[import]
    create_farm,
    add_field,
    add_field_season,
    add_management_event,
)
from .estimate import run_estimates  # type: ignore[import]
from ..services.storage_csv import read_rows  # type: ignore[import]
from ..core.score import compute_credit_score  # type: ignore[import]
from ..core.forecast import generate_credit_forecast  # type: ignore[import]
from ..core.earnings import estimate_earnings  # type: ignore[import]
from ..services.agent_gemini import get_recommendations  # type: ignore[import]

# MongoDB persistence (graceful — works even if MONGODB_URI is not set)
from typing import Any, cast

# MongoDB persistence (graceful — works even if MONGODB_URI is not set)
try:
    from ..services import storage  # type: ignore[import]
    _mongo_save = cast(Any, storage.save_analysis)
    _mongo_save_farm = cast(Any, storage.save_farm)
    _mongo_save_field = cast(Any, storage.save_field)
    _mongo_save_events = cast(Any, storage.save_events)
    _mongo_available = True
except Exception:
    _mongo_save = cast(Any, lambda *a, **k: "failed")
    _mongo_save_farm = cast(Any, lambda *a, **k: "failed")
    _mongo_save_field = cast(Any, lambda *a, **k: "failed")
    _mongo_save_events = cast(Any, lambda *a, **k: None)
    _mongo_available = False


# ---- helpers ----

def _ingest_request(data_dir: str, req: FarmAnalyzeRequest) -> None:
    """Write all farm/field/season/event CSVs from the request."""
    farm_id = create_farm(
        data_dir,
        farm_name=req.farm.farm_name,
        state=req.farm.state.value,
    )

    for f in req.fields:
        field_id = add_field(
            data_dir,
            farm_id=farm_id,
            field_name=f.field_name,
            centroid_lat=f.latitude,
            centroid_lon=f.longitude,
            area_value=f.area_value,
            area_unit=f.area_unit.value,
        )
        baseline_season_id = add_field_season(
            data_dir, field_id,
            year=int(req.analysis_window.start_date[:4]),
            scenario="baseline",
            crop_type=f.crop_type.value,
        )
        project_season_id = add_field_season(
            data_dir, field_id,
            year=int(req.analysis_window.start_date[:4]),
            scenario="project",
            crop_type=f.crop_type.value,
        )

        # Baseline management events
        for i in range(f.baseline.tillage_passes):
            add_management_event(data_dir, baseline_season_id, "tillage", f"2024-03-{1+i:02d}")
        add_management_event(
            data_dir, baseline_season_id, "fertilizer", "2024-03-15",
            amount=f.baseline.fertilizer_amount,
            unit=f.baseline.fertilizer_unit.value,
        )
        for i in range(f.baseline.irrigation_events):
            add_management_event(data_dir, baseline_season_id, "irrigation", f"2024-06-{1+i:02d}")

        # Project management events
        for i in range(f.project.tillage_passes):
            add_management_event(data_dir, project_season_id, "tillage", f"2024-03-{1+i:02d}")
        add_management_event(
            data_dir, project_season_id, "fertilizer", "2024-03-15",
            amount=f.project.fertilizer_amount,
            unit=f.project.fertilizer_unit.value,
        )
        for i in range(f.project.irrigation_events):
            add_management_event(data_dir, project_season_id, "irrigation", f"2024-06-{1+i:02d}")


def run_full_pipeline(req: FarmAnalyzeRequest) -> FullAnalysisResponse:
    """
    End-to-end pipeline:
    ingest → estimate → score → forecast → earnings → recommendations
    Uses a temp directory so concurrent requests don't interfere.
    """
    tmp_dir = tempfile.mkdtemp(prefix="terra30_")
    try:
        return _run_pipeline_in_dir(tmp_dir, req)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _run_pipeline_in_dir(data_dir: str, req: FarmAnalyzeRequest) -> FullAnalysisResponse:
    # ---- 1. Ingest ----
    _ingest_request(data_dir, req)

    # ---- 2. Estimate ----
    run_estimates(data_dir)

    # ---- 3. Read results ----
    est_rows = read_rows(Path(data_dir) / "estimates.csv")
    field_rows = read_rows(Path(data_dir) / "fields.csv")

    fields_map: Dict[str, Dict[str, Any]] = {
        (r.get("field_id") or "").strip(): r
        for r in field_rows
        if (r.get("field_id") or "").strip()
    }

    total_low: Any = 0.0
    total_mid: Any = 0.0
    total_high: Any = 0.0
    total_area_ha: Any = 0.0
    dq_sum: Any = 0.0
    n: int = 0
    per_field: List[FieldResult] = []

    # Build a lookup from field_name → original request field for input data
    input_fields_by_name = {fi.field_name: fi for fi in req.fields}

    for r in est_rows:
        fid = (r.get("field_id") or "").strip()
        if not fid:
            continue

        mid = float(r.get("estimated_tco2e") or 0.0)
        low = float(r.get("low_tco2e") or 0.0)
        high = float(r.get("high_tco2e") or 0.0)
        dq = float(r.get("data_quality_score") or 0.0)

        fld = fields_map.get(fid, {})  # type: ignore[union-attr]
        area_ha = float(fld.get("area_ha") or 0.0)  # type: ignore[union-attr]

        v_low = float(low)
        v_mid = float(mid)
        v_high = float(high)
        v_area = float(area_ha)
        v_dq = float(dq)

        total_low = total_low + v_low  # type: ignore
        total_mid = total_mid + v_mid  # type: ignore
        total_high = total_high + v_high  # type: ignore
        total_area_ha = total_area_ha + v_area  # type: ignore
        dq_sum = dq_sum + v_dq  # type: ignore
        n = n + 1  # type: ignore

        # Match to original request input for farmer data
        fname = fld.get("field_name", fid)
        orig = input_fields_by_name.get(fname)

        per_field.append(FieldResult(
            field_name=fname,
            crop_type=r.get("crop_type", ""),
            latitude=float(orig.latitude) if orig and orig.latitude is not None else None,
            longitude=float(orig.longitude) if orig and orig.longitude is not None else None,
            area_value=float(orig.area_value) if orig and orig.area_value is not None else None,
            area_unit=str(orig.area_unit.value) if orig and hasattr(orig.area_unit, "value") else str(orig.area_unit) if orig else None,
            baseline=orig.baseline.model_dump() if orig else None,
            project=orig.project.model_dump() if orig else None,
            annual_reduction_tco2e=LowMidHigh(**{"low": float(round(float(low), 3)), "mid": float(round(float(mid), 3)), "high": float(round(float(high), 3))}),  # type: ignore
            data_quality_score=float(round(float(dq), 3)),  # type: ignore
            assumptions=str(r.get("assumptions", "")),
        ))

    avg_dq = float(dq_sum) / float(max(n, 1))

    # ---- 4. Credit score ----
    if float(total_mid) > 0:
        high_val = float(total_high)
        low_val = float(total_low)
        mid_val = float(total_mid)
        numerator = float(high_val - low_val)
        denominator = float(2.0 * mid_val)
        uncertainty_pct = min(0.40, max(0.0, numerator / denominator))
    else:
        uncertainty_pct = 0.40

    additionality_flag = bool(total_mid > 0.25)
    verification_ready = True

    score_result = compute_credit_score(
        annual_reduction_tco2e_mid=float(total_mid),
        area_ha=float(max(total_area_ha, 1e-9)),
        data_quality_score=float(avg_dq),
        additionality_flag=additionality_flag,
        verification_ready=verification_ready,
        uncertainty_pct=float(uncertainty_pct),
    )

    # ---- 5. Credits forecast ----
    horizons = [6, 12, 24, 36]
    buffer_pool_pct = 0.10
    platform_fee_pct = 0.10

    forecast_raw = generate_credit_forecast(
        annual_low=total_low,
        annual_mid=total_mid,
        annual_high=total_high,
        horizons_months=horizons,
        buffer_pool_pct=buffer_pool_pct,
    )

    credits_forecast = [
        CreditForecastEntry(
            months=f["months"],
            credits_tco2e=LowMidHigh(
                low=f["credits_tco2e"]["low"],
                mid=f["credits_tco2e"]["mid"],
                high=f["credits_tco2e"]["high"],
            ),
        )
        for f in forecast_raw
    ]

    # ---- 6. Earnings forecast ----
    earnings_raw = estimate_earnings(
        forecast=forecast_raw,
        price_low=10,
        price_mid=25,
        price_high=40,
        platform_fee_pct=platform_fee_pct,
    )

    earnings_forecast = [
        EarningsForecastEntry(
            months=e["months"],
            net_earnings_usd=LowMidHigh(
                low=e["net_earnings_usd"]["low"],
                mid=e["net_earnings_usd"]["mid"],
                high=e["net_earnings_usd"]["high"],
            ),
        )
        for e in earnings_raw
    ]

    # ---- 7. AI recommendations ----
    agent_payload: Dict[str, Any] = {
        "summary": {
            "annual_reduction_tco2e": {"low": total_low, "mid": total_mid, "high": total_high},
            "carbon_credit_score_0_100": score_result["carbon_credit_score_0_100"],
            "area_ha": total_area_ha,
        },
        "fields": [
            {
                "field_name": pf.field_name,
                "crop_type": pf.crop_type,
                "annual_reduction_tco2e": {
                    "low": pf.annual_reduction_tco2e.low,
                    "mid": pf.annual_reduction_tco2e.mid,
                    "high": pf.annual_reduction_tco2e.high,
                },
            }
            for pf in per_field
        ],
        "constraints": {
            "max_upfront_cost_usd": 5000,
            "no_new_equipment": False,
        },
    }

    try:
        agent_out = get_recommendations(agent_payload)
    except Exception:
        agent_out = {}

    recommendations = [
        RecommendedMeasure(
            title=m.get("title", "(untitled)"),
            risk_level=m.get("risk_level", "medium"),
            why_it_helps=m.get("why_it_helps", ""),
            field_names=m.get("field_names", []),
            capital_required_usd=LowHigh(
                low=float(m.get("capital_required_usd", {}).get("low", 0)),
                high=float(m.get("capital_required_usd", {}).get("high", 0)),
            ),
            annual_opex_change_usd=LowHigh(
                low=float(m.get("annual_opex_change_usd", {}).get("low", 0)),
                high=float(m.get("annual_opex_change_usd", {}).get("high", 0)),
            ),
            timeline_months=LowHigh(
                low=float(m.get("timeline_months", {}).get("min", 1)),
                high=float(m.get("timeline_months", {}).get("max", 6)),
            ),
            expected_credit_uplift_tco2e_per_year=LowHigh(
                low=float(m.get("expected_credit_uplift_tco2e_per_year", {}).get("low", 0)),
                high=float(m.get("expected_credit_uplift_tco2e_per_year", {}).get("high", 0)),
            ),
            implementation_steps=m.get("implementation_steps", []),
            verification_evidence=m.get("verification_evidence", []),
        )
        for m in agent_out.get("recommended_measures", [])
    ]

    appraiser = AppraiserInfo(
        what_to_do_next=agent_out.get("what_to_do_next", []),
        evidence_checklist=agent_out.get("appraiser_evidence_checklist", []),
    )

    # ---- 8. Assemble response ----
    response = FullAnalysisResponse(
        farm=FarmEcho(farm_name=req.farm.farm_name, state=req.farm.state),
        analysis_window=OutputWindow(
            start_date=req.analysis_window.start_date,
            end_date=req.analysis_window.end_date,
        ),
        summary={
            "annual_reduction_tco2e_low": float(round(float(total_low), 3)),  # type: ignore
            "annual_reduction_tco2e_mid": float(round(float(total_mid), 3)),  # type: ignore
            "annual_reduction_tco2e_high": float(round(float(total_high), 3)),  # type: ignore
            "credit_score_0_100": float(score_result["carbon_credit_score_0_100"]),
            "score_breakdown": score_result["components"],
            "data_quality_score": float(round(float(avg_dq), 2)),  # type: ignore
            "area_ha": float(round(float(total_area_ha), 3)),  # type: ignore
            "buffer_pool_pct": float(buffer_pool_pct),
            "platform_fee_pct": float(platform_fee_pct),
        },
        credits_forecast=credits_forecast,
        earnings_forecast=earnings_forecast,
        per_field=per_field,
        recommendations=recommendations,
        appraiser=appraiser,
    )

    # ---- 9. Persist to MongoDB (best-effort) ----
    if _mongo_available and _mongo_save is not None:
        try:
            # 9a. Save farm
            farm_id = _mongo_save_farm(
                farm_name=req.farm.farm_name,
                state=req.farm.state.value,
            )

            # 9b. Save each field + its management events
            for fi in req.fields:
                area_ha = fi.area_value * (0.404686 if fi.area_unit.value == "acre" else 1.0)
                field_id = _mongo_save_field(
                    farm_id=farm_id,
                    field_name=fi.field_name,
                    latitude=fi.latitude,
                    longitude=fi.longitude,
                    area_value=fi.area_value,
                    area_unit=fi.area_unit.value,
                    area_ha=round(area_ha, 4),
                    crop_type=fi.crop_type.value,
                )
                _mongo_save_events(field_id, "baseline", [fi.baseline.model_dump()])
                _mongo_save_events(field_id, "project", [fi.project.model_dump()])

            # 9c. Save analysis result
            analysis_id = _mongo_save(
                farm_name=req.farm.farm_name,
                state=req.farm.state.value,
                analysis_window={
                    "start_date": req.analysis_window.start_date,
                    "end_date": req.analysis_window.end_date,
                },
                result=response.model_dump(),
            )
            # Inject the analysis_id into the summary so the frontend can reference it
            response.summary["analysis_id"] = analysis_id
        except Exception:
            pass  # Don't break the pipeline if MongoDB is unreachable

    return response
