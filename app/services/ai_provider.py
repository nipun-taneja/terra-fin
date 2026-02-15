"""
AI roadmap generator with provider fallback.
Supported providers:
- ollama
- gemini
- openai
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Tuple, Dict, Any, cast, Optional
from urllib.request import Request, urlopen
from uuid import uuid4

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


def _llm_logs_enabled() -> bool:
    return os.getenv("LLM_DEBUG_LOGS", "true").strip().lower() in {"1", "true", "yes", "on"}


def _llm_logs_dir() -> Path:
    raw = os.getenv("LLM_LOG_DIR", "logs/llm")
    path = Path(raw)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _write_llm_log(payload: Dict[str, Any]) -> None:
    if not _llm_logs_enabled():
        return
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    provider = str(payload.get("provider", "llm")).strip().lower() or "llm"
    fname = f"{provider}-roadmap-{timestamp}-{uuid4().hex[:8]}.json"
    path = _llm_logs_dir() / fname
    try:
        path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
    except OSError:
        # Never fail request due to logging.
        pass


def _gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in .env")
    return genai.Client(api_key=api_key)


def _ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")


def _ollama_model() -> str:
    return os.getenv("OLLAMA_MODEL", "qwen2.5:3b")


def _ollama_timeout_seconds() -> int:
    raw = os.getenv("OLLAMA_TIMEOUT_SECONDS", "60").strip()
    try:
        return max(5, int(raw))
    except ValueError:
        return 60


def _primary_backend() -> str:
    return os.getenv("AI_BACKEND", "gemini").strip().lower()


def _fallback_backend() -> str:
    return os.getenv("AI_FALLBACK_BACKEND", "none").strip().lower()


def _openai_api_key() -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Missing OPENAI_API_KEY in .env")
    return api_key


def _openai_base_url() -> str:
    return os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")


def _openai_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()


def _openai_timeout_seconds() -> int:
    raw = os.getenv("OPENAI_TIMEOUT_SECONDS", "60").strip()
    try:
        return max(5, int(raw))
    except ValueError:
        return 60


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


def _parse_roadmap_data(data: Dict[str, Any]) -> List[RoadmapStep]:
    steps = data.get("roadmap")
    if not isinstance(steps, list) or len(steps) != 3:
        raise ValueError("invalid_roadmap_shape")

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
    if len(parsed) != 3:
        raise ValueError("parsed_steps_not_3")
    return parsed


def _generate_with_gemini(
    prompt: str,
    lat: float,
    lon: float,
    farm_size_hectares: float,
    satellite: SatelliteSummary,
    baseline_tco2e_y: float,
) -> List[RoadmapStep]:
    raw_text: Optional[str] = None
    parsed_json: Optional[Dict[str, Any]] = None
    client = _gemini_client()
    resp = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "temperature": 0.4,
            "response_mime_type": "application/json",
        },
    )
    raw_text = resp.text
    data = json.loads(raw_text)
    parsed_json = data if isinstance(data, dict) else {"_type": str(type(data))}
    parsed = _parse_roadmap_data(data)
    _write_llm_log({
        "provider": "gemini",
        "model": "gemini-2.0-flash",
        "status": "success",
        "input": {
            "lat": lat,
            "lon": lon,
            "farm_size_hectares": farm_size_hectares,
            "satellite": satellite.model_dump(),
            "baseline_tco2e_y": baseline_tco2e_y,
        },
        "prompt": prompt,
        "raw_text": raw_text,
        "parsed_json": parsed_json,
        "parsed_steps": [step.model_dump() for step in parsed],
    })
    return parsed


def _generate_with_ollama(
    prompt: str,
    lat: float,
    lon: float,
    farm_size_hectares: float,
    satellite: SatelliteSummary,
    baseline_tco2e_y: float,
) -> List[RoadmapStep]:
    payload = {
        "model": _ollama_model(),
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.4,
        },
    }
    req = Request(
        url=f"{_ollama_base_url()}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=_ollama_timeout_seconds()) as resp:
        raw = resp.read().decode("utf-8")
    outer = json.loads(raw)
    raw_text = cast(Optional[str], outer.get("response"))
    if not raw_text:
        raise ValueError("ollama_empty_response")
    data = json.loads(raw_text)
    parsed = _parse_roadmap_data(data)
    _write_llm_log({
        "provider": "ollama",
        "model": _ollama_model(),
        "status": "success",
        "input": {
            "lat": lat,
            "lon": lon,
            "farm_size_hectares": farm_size_hectares,
            "satellite": satellite.model_dump(),
            "baseline_tco2e_y": baseline_tco2e_y,
        },
        "prompt": prompt,
        "raw_text": raw_text,
        "parsed_json": data,
        "parsed_steps": [step.model_dump() for step in parsed],
    })
    return parsed


def _generate_with_openai(
    prompt: str,
    lat: float,
    lon: float,
    farm_size_hectares: float,
    satellite: SatelliteSummary,
    baseline_tco2e_y: float,
) -> List[RoadmapStep]:
    payload = {
        "model": _openai_model(),
        "messages": [
            {"role": "system", "content": "Output strict JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.8,
        "response_format": {"type": "json_object"},
    }
    req = Request(
        url=f"{_openai_base_url()}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {_openai_api_key()}",
        },
        method="POST",
    )
    with urlopen(req, timeout=_openai_timeout_seconds()) as resp:
        raw = resp.read().decode("utf-8")
    outer = json.loads(raw)
    choices = cast(List[Any], outer.get("choices", []))
    if not choices:
        raise ValueError("openai_no_choices")
    msg = cast(Dict[str, Any], choices[0].get("message", {}))
    raw_text = cast(Optional[str], msg.get("content"))
    if not raw_text:
        raise ValueError("openai_empty_content")
    data = json.loads(raw_text)
    parsed = _parse_roadmap_data(data)
    _write_llm_log({
        "provider": "openai",
        "model": _openai_model(),
        "status": "success",
        "input": {
            "lat": lat,
            "lon": lon,
            "farm_size_hectares": farm_size_hectares,
            "satellite": satellite.model_dump(),
            "baseline_tco2e_y": baseline_tco2e_y,
        },
        "prompt": prompt,
        "raw_text": raw_text,
        "parsed_json": data,
        "parsed_steps": [step.model_dump() for step in parsed],
    })
    return parsed


def generate_maize_roadmap(
    lat: float,
    lon: float,
    farm_size_hectares: float,
    satellite: SatelliteSummary,
    baseline_tco2e_y: float,
) -> List[RoadmapStep]:
    """
    Returns 3 roadmap steps from configured AI provider(s), then hardcoded fallback.
    """
    prompt = _build_prompt(lat, lon, farm_size_hectares, satellite, baseline_tco2e_y)
    primary = _primary_backend()
    secondary = _fallback_backend()
    ordered = [b for b in [primary, secondary] if b in {"openai", "gemini"}]
    if not ordered:
        ordered = ["openai"]

    last_error_type = ""
    last_error = ""
    for provider in ordered:
        try:
            if provider == "openai":
                return _generate_with_openai(
                    prompt=prompt,
                    lat=lat,
                    lon=lon,
                    farm_size_hectares=farm_size_hectares,
                    satellite=satellite,
                    baseline_tco2e_y=baseline_tco2e_y,
                )
            if provider == "ollama":
                return _generate_with_ollama(
                    prompt=prompt,
                    lat=lat,
                    lon=lon,
                    farm_size_hectares=farm_size_hectares,
                    satellite=satellite,
                    baseline_tco2e_y=baseline_tco2e_y,
                )
            return _generate_with_gemini(
                prompt=prompt,
                lat=lat,
                lon=lon,
                farm_size_hectares=farm_size_hectares,
                satellite=satellite,
                baseline_tco2e_y=baseline_tco2e_y,
            )
        except Exception as exc:
            last_error_type = type(exc).__name__
            last_error = str(exc)
            _write_llm_log({
                "provider": provider,
                "model": (
                    _openai_model() if provider == "openai"
                    else _ollama_model() if provider == "ollama"
                    else "gemini-2.0-flash"
                ),
                "status": "fallback",
                "reason": "exception",
                "error_type": last_error_type,
                "error": last_error,
                "input": {
                    "lat": lat,
                    "lon": lon,
                    "farm_size_hectares": farm_size_hectares,
                    "satellite": satellite.model_dump(),
                    "baseline_tco2e_y": baseline_tco2e_y,
                },
                "prompt": prompt,
                "raw_text": None,
                "parsed_json": None,
            })
            continue

    _write_llm_log({
        "provider": "fallback",
        "model": "hardcoded",
        "status": "fallback",
        "reason": "all_providers_failed",
        "error_type": last_error_type,
        "error": last_error,
        "input": {
            "lat": lat,
            "lon": lon,
            "farm_size_hectares": farm_size_hectares,
            "satellite": satellite.model_dump(),
            "baseline_tco2e_y": baseline_tco2e_y,
        },
        "prompt": prompt,
        "raw_text": None,
        "parsed_json": None,
    })
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
