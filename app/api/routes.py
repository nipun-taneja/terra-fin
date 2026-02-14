"""
Main analysis router orchestrating satellite, baseline, and AI generation.
"""
from fastapi import APIRouter, HTTPException

from app.models.schemas import AnalyzeRequest, AnalyzeResponse, SatelliteSummary, RoadmapStep
from app.services.satellite_provider import get_satellite_summary
from app.services.baseline import estimate_maize_baseline_tco2e_y
from app.services.ai_provider import generate_maize_roadmap, aggregate_reduction_pct_range
from app.services.finance import compute_annual_savings_tco2e, compute_finance_offer
from app.services.eng1_loader import load_eng1_analysis

router = APIRouter()


def _roadmap_from_eng1(eng1: dict) -> list[RoadmapStep] | None:
    """
    If eng1 JSON already contains 3 suggestions that match our roadmap schema,
    convert them to RoadmapStep objects and return. Otherwise return None.
    """
    suggestions = eng1.get("suggestions")
    if not isinstance(suggestions, list) or len(suggestions) < 3:
        return None

    steps: list[RoadmapStep] = []
    for s in suggestions[:3]:
        try:
            steps.append(
                RoadmapStep(
                    title=str(s["title"]),
                    why=str(s.get("why", "")),
                    actions=[str(a) for a in s.get("actions", [])],
                    expected_reduction_pct=(float(s["expected_reduction_pct"][0]), float(s["expected_reduction_pct"][1])),
                    upfront_cost_usd=(int(s["upfront_cost_usd"][0]), int(s["upfront_cost_usd"][1])),
                    timeline=str(s.get("timeline", "TBD")),
                )
            )
        except Exception:
            return None

    return steps if len(steps) == 3 else None


def _annual_saved_from_eng1(eng1: dict) -> tuple[float, float] | None:
    """
    If eng1 JSON provides annual_tco2e_saved in any suggestion, use it.
    We’ll prefer the first suggestion that contains it (hackathon-simple).
    """
    suggestions = eng1.get("suggestions")
    if not isinstance(suggestions, list):
        return None

    for s in suggestions:
        if "annual_tco2e_saved" in s and isinstance(s["annual_tco2e_saved"], list) and len(s["annual_tco2e_saved"]) == 2:
            try:
                return (float(s["annual_tco2e_saved"][0]), float(s["annual_tco2e_saved"][1]))
            except Exception:
                continue
    return None


@router.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    if req.crop_type != "maize":
        raise HTTPException(status_code=400, detail="Only maize is supported in this demo.")

    eng1 = None
    if req.analysis_id:
        try:
            eng1 = load_eng1_analysis(req.analysis_id)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse Eng1 JSON: {e}")

    # 1) Satellite summary: prefer Eng1 if present, else our deterministic mock
    if eng1 and isinstance(eng1.get("satellite"), dict):
        sat_dict = eng1["satellite"]
        sat = SatelliteSummary(
            ndvi_mean=float(sat_dict.get("ndvi_mean", 0.6)),
            ndvi_trend=float(sat_dict.get("ndvi_trend", 0.0)),
            cropland_confidence=float(sat_dict.get("cropland_confidence", 0.8)),
        )
    else:
        sat = get_satellite_summary(req.lat, req.lon)

    # 2) Baseline emissions: prefer Eng1 baseline if present, else our estimate
    baseline_t = None
    if eng1 and isinstance(eng1.get("baseline"), dict) and "baseline_tco2e_y" in eng1["baseline"]:
        try:
            baseline_t = float(eng1["baseline"]["baseline_tco2e_y"])
        except Exception:
            baseline_t = None

    if baseline_t is None:
        baseline_t = estimate_maize_baseline_tco2e_y(req.farm_size_hectares, region="global")

    # 3) Roadmap: prefer Eng1 suggestions if present, else Gemini (fallback inside)
    roadmap = _roadmap_from_eng1(eng1) if eng1 else None
    if roadmap is None:
        roadmap = generate_maize_roadmap(
            lat=req.lat,
            lon=req.lon,
            farm_size_hectares=req.farm_size_hectares,
            satellite=sat,
            baseline_tco2e_y=baseline_t,
        )

    # 4) Reduction: prefer Eng1 annual saved if provided; else derive from % reduction
    saved_range = _annual_saved_from_eng1(eng1) if eng1 else None
    if saved_range is None:
        reduction_pct_range = aggregate_reduction_pct_range(roadmap)
        saved_range = compute_annual_savings_tco2e(baseline_t, reduction_pct_range)

    # 5) Finance offer
    carbon_price = 20.0
    credit_value_range, loan_offer_range = compute_finance_offer(
        annual_tco2e_saved_range=saved_range,
        carbon_price_usd_per_t=carbon_price,
        haircut=0.60,
    )

    # 6) Percentile estimate: prefer Eng1 if present, else heuristic
    emissions_percentile_est = None
    if eng1 and isinstance(eng1.get("baseline"), dict) and "emissions_percentile_est" in eng1["baseline"]:
        try:
            emissions_percentile_est = float(eng1["baseline"]["emissions_percentile_est"])
        except Exception:
            emissions_percentile_est = None

    if emissions_percentile_est is None:
        emissions_percentile_est = 70.0 - (sat.ndvi_trend * 200.0)
        emissions_percentile_est = max(5.0, min(95.0, emissions_percentile_est))

    return AnalyzeResponse(
        location={"lat": req.lat, "lon": req.lon},
        crop_type="maize",
        satellite=sat,
        audit={
            "emissions_percentile_est": round(float(emissions_percentile_est), 1),
            "baseline_tco2e_y": float(baseline_t),
        },
        roadmap=roadmap,
        reduction_summary={"annual_tco2e_saved": (float(saved_range[0]), float(saved_range[1]))},
        finance={
            "carbon_price_usd_per_t": carbon_price,
            "credit_value_usd_y": credit_value_range,
            "loan_offer_usd": loan_offer_range,
            "repayment_note": "Offer assumes forward sale of projected reductions with a risk haircut.",
        },
    )
