"""
AI roadmap generator using Google Gemini.
"""
import json
import os
from typing import List, Tuple, Dict, Any, cast

from dotenv import load_dotenv  # type: ignore[import]
from google import genai  # type: ignore[import]

from app.models.schemas import RoadmapStep, SatelliteSummary  # type: ignore[import]

# Load .env once (safe even if called multiple times)
load_dotenv()

# --- Hardcoded fallback roadmap (always works) ---
FALLBACK_ROADMAP: List[RoadmapStep] = [
    RoadmapStep(
        title="Optimize nitrogen application (right rate, right time)",
        why="Over-application of nitrogen increases nitrous oxide (N2O) emissions and wastes money.",
        actions=[
            "Do a soil test before fertilizing",
            "Split N applications instead of applying all at once",
            "Avoid applying before heavy rain events",
        ],
        expected_reduction_pct=(8.0, 18.0),
        upfront_cost_usd=(100, 600),
        timeline="0–3 months",
    ),
    RoadmapStep(
        title="Adopt reduced tillage / conservation tillage",
        why="Reduced tillage can lower fuel use and improve soil structure, supporting lower emissions over time.",
        actions=[
            "Switch to strip-till or reduced passes",
            "Track fuel use per hectare to verify savings",
            "Keep soil covered where feasible",
        ],
        expected_reduction_pct=(3.0, 10.0),
        upfront_cost_usd=(0, 1500),
        timeline="3–12 months",
    ),
    RoadmapStep(
        title="Add cover crops in the off-season (where practical)",
        why="Cover crops can improve soil health and reduce fertilizer needs in subsequent seasons.",
        actions=[
            "Start with one field as a pilot",
            "Choose a locally suitable cover mix",
            "Measure changes in fertilizer requirement next season",
        ],
        expected_reduction_pct=(2.0, 8.0),
        upfront_cost_usd=(200, 1200),
        timeline="Next season",
    ),
]


def _gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in .env")
    return genai.Client(api_key=api_key)


def _build_prompt(
    lat: float,
    lon: float,
    farm_size_hectares: float,
    satellite: SatelliteSummary,
    baseline_tco2e_y: float,
) -> str:
    # Keep prompt compact + structured for reliability.
    return f"""
You are Terra30's "Automated Agronomist" for MAIZE ONLY.
Goal: produce a realistic 3-step transition plan that moves the farm toward low-emission maize production,
prioritizing cost-effective steps suitable for small-to-medium farms.

Return ONLY valid JSON, matching this exact schema:
{{
  "roadmap": [
    {{
      "title": "string",
      "why": "string",
      "actions": ["string", "string", "string"],
      "expected_reduction_pct": [min, max],
      "upfront_cost_usd": [min, max],
      "timeline": "string"
    }},
    ... EXACTLY 3 items total ...
  ]
}}

Constraints:
- crop_type is maize (do NOT mention other crops).
- keep actions practical and implementable.
- expected_reduction_pct must be numbers, sensible ranges (0–40 each step).
- upfront_cost_usd must be integers, sensible ranges.
- timelines should be short phrases (e.g., "0–3 months", "3–12 months", "Next season").
- Use these common maize mitigation levers (choose best 3): nitrogen optimization, reduced tillage,
  cover crops, residue management (no burning), precision application (if feasible).

Farm context:
- location: lat={lat}, lon={lon}
- farm_size_hectares={farm_size_hectares}
- satellite: ndvi_mean={satellite.ndvi_mean}, ndvi_trend={satellite.ndvi_trend}, cropland_confidence={satellite.cropland_confidence}
- baseline emissions estimate: {baseline_tco2e_y} tCO2e/year

Now output JSON only.
""".strip()


def generate_maize_roadmap(
    lat: float,
    lon: float,
    farm_size_hectares: float,
    satellite: SatelliteSummary,
    baseline_tco2e_y: float,
) -> List[RoadmapStep]:
    """
    Returns 3 roadmap steps. Uses Gemini if available; falls back to hardcoded plan.
    """
    try:
        client = _gemini_client()
        prompt = _build_prompt(lat, lon, farm_size_hectares, satellite, baseline_tco2e_y)

        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "temperature": 0.4,
                "response_mime_type": "application/json",
            },
        )

        data = json.loads(resp.text)
        steps = data.get("roadmap")
        if not isinstance(steps, list) or len(steps) != 3:
            return FALLBACK_ROADMAP

        parsed: List[RoadmapStep] = []
        for s in steps:
            parsed.append(
                RoadmapStep(
                    title=str(s["title"]),
                    why=str(s["why"]),
                    actions=list(cast(Any, s).get("actions", []))[:5],  # type: ignore[index]
                    expected_reduction_pct=(float(s["expected_reduction_pct"][0]), float(s["expected_reduction_pct"][1])),
                    upfront_cost_usd=(int(s["upfront_cost_usd"][0]), int(s["upfront_cost_usd"][1])),
                    timeline=str(s["timeline"]),
                )
            )

        # Basic sanity: ensure 3 steps
        if len(parsed) != 3:
            return FALLBACK_ROADMAP

        return parsed

    except Exception:
        # Any failure: fallback to guarantee demo stability
        return FALLBACK_ROADMAP


def aggregate_reduction_pct_range(roadmap: List[RoadmapStep]) -> Tuple[float, float]:
    """
    Hackathon-friendly aggregation:
    - Don't compound; just sum mins and sum maxes, then clamp.
    """
    rmin = sum(step.expected_reduction_pct[0] for step in roadmap)
    rmax = sum(step.expected_reduction_pct[1] for step in roadmap)
    rmin = max(0.0, min(70.0, rmin))
    rmax = max(rmin, min(80.0, rmax))
    return (float(round(float(rmin), 1)), float(round(float(rmax), 1)))  # type: ignore[call-overload]
