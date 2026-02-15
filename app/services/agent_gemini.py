from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv

load_dotenv()


# -----------------------------
# JSON schema we want back
# -----------------------------
AGENT_OUTPUT_SCHEMA_EXAMPLE: Dict[str, Any] = {
    "recommended_measures": [
        {
            "title": "Split nitrogen applications + 4R nutrient management",
            "why_it_helps": "Reduces N2O emissions and improves nitrogen use efficiency.",
            "field_names": ["Field A"],
            "implementation_steps": ["...", "..."],
            "capital_required_usd": {"low": 0, "high": 1500},
            "annual_opex_change_usd": {"low": -500, "high": 200},
            "timeline_months": {"min": 1, "max": 3},
            "expected_credit_uplift_tco2e_per_year": {"low": 0.3, "high": 1.2},
            "verification_evidence": ["fertilizer receipts", "application log"],
            "risk_level": "low",
        }
    ],
    "what_to_do_next": [
        "Confirm baseline fertilizer rates for last season (receipts or logs).",
        "Pick 1–2 measures to start and track changes for verification.",
    ],
    "appraiser_evidence_checklist": [
        "Field boundary/area confirmation",
        "Fertilizer receipts + application dates/rates",
        "Irrigation logs or pump runtime logs (if applicable)",
        "Photos of practice changes (before/after)",
    ],
    "notes": ["If uncertain, provide conservative ranges."],
}


def _build_prompt(payload: Dict[str, Any]) -> str:
    return (
        "You are an agricultural carbon advisor agent for US farms (corn/rice). "
        "Return ONLY valid JSON. No markdown, no extra text.\n\n"
        "Task:\n"
        "You are give input JSON which has field level details. For each field:"
        "1) Recommend measures to improve carbon credit score and increase credits.\n"
        "2) Include anticipated capital required (CAPEX) as a low/high USD range.\n"
        "3) Include what to do next.\n"
        "4) Include appraiser evidence checklist.\n\n"
        "Rules:\n"
        "- Be conservative. Use ranges. If data is missing, note assumptions.\n"
        "- Respect constraints.max_upfront_cost_usd and constraints.no_new_equipment if provided.\n"
        "- Output MUST match the provided JSON schema shape.\n\n"
        "INPUT_JSON:\n"
        f"{json.dumps(payload, ensure_ascii=False)}\n\n"
        "OUTPUT_SCHEMA_EXAMPLE:\n"
        f"{json.dumps(AGENT_OUTPUT_SCHEMA_EXAMPLE, ensure_ascii=False)}"
    )


def _try_call_gemini(payload: Dict[str, Any]) -> Dict[str, Any] | None:
    """
    Tries Google Gemini SDKs. Returns dict if successful, else None.
    Supports either:
      - google-generativeai (import google.generativeai as genai)
      - google-genai (from google import genai)
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None

    prompt = _build_prompt(payload)

    # Attempt: google-generativeai
    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content(
            prompt,
            generation_config={"temperature": 0.3},
        )
        text = getattr(resp, "text", None) or str(resp)
        return json.loads(text)
    except Exception:
        pass

    # Attempt: google-genai (newer)
    try:
        from google import genai  # type: ignore

        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            # Some environments support forcing JSON; if unsupported it will ignore.
            config={"response_mime_type": "application/json", "temperature": 0.3},
        )
        text = getattr(resp, "text", None) or str(resp)
        return json.loads(text)
    except Exception:
        return None


def _heuristic_recommendations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback that still produces useful ranked measures with CAPEX ranges.
    Uses simple rules based on baseline/project deltas and constraints.
    """
    constraints = payload.get("constraints", {}) or {}
    max_capex = float(constraints.get("max_upfront_cost_usd", 999999))
    no_new_eq = bool(constraints.get("no_new_equipment", False))

    fields: List[Dict[str, Any]] = payload.get("fields", []) or []

    field_names = [f.get("field_name", "Field") for f in fields]
    crops = {f.get("crop_type") for f in fields}

    measures: List[Dict[str, Any]] = []

    # 1) Fertilizer optimization (almost always)
    measures.append(
        {
            "title": "Split nitrogen applications + 4R nutrient management",
            "why_it_helps": "Reduces N2O emissions by avoiding excess nitrogen and improving timing.",
            "field_names": field_names,
            "implementation_steps": [
                "Split N into 2–3 applications aligned to crop growth stages",
                "Use soil/tissue test (optional) to prevent over-application",
                "Record dates, rates, products for verification",
            ],
            "capital_required_usd": {"low": 0, "high": 1500},
            "annual_opex_change_usd": {"low": -800, "high": 200},
            "timeline_months": {"min": 1, "max": 3},
            "expected_credit_uplift_tco2e_per_year": {"low": 0.3, "high": 1.5},
            "verification_evidence": [
                "fertilizer purchase receipts",
                "application log (dates, rates, product)",
                "soil test report (if used)",
            ],
            "risk_level": "low",
        }
    )

    # 2) Reduced tillage
    if not no_new_eq:
        capex = {"low": 0, "high": 8000}
    else:
        capex = {"low": 0, "high": 500}  # training/contracting only

    measures.append(
        {
            "title": "Reduce tillage passes / adopt reduced tillage where feasible",
            "why_it_helps": "Cuts fuel use and can reduce soil carbon loss from disturbance.",
            "field_names": field_names,
            "implementation_steps": [
                "Reduce passes (e.g., 2 → 1) and avoid unnecessary tillage",
                "Track operations (date + equipment) for verification",
            ],
            "capital_required_usd": capex,
            "annual_opex_change_usd": {"low": -1200, "high": 0},
            "timeline_months": {"min": 1, "max": 6},
            "expected_credit_uplift_tco2e_per_year": {"low": 0.2, "high": 1.2},
            "verification_evidence": [
                "field operation logs",
                "fuel receipts (optional)",
                "photos of residue/soil condition (before/after)",
            ],
            "risk_level": "medium",
        }
    )

    # 3) Irrigation efficiency
    measures.append(
        {
            "title": "Irrigation scheduling (avoid over-watering) + optional soil moisture sensors",
            "why_it_helps": "Reduces pumping energy and water use; can improve nitrogen efficiency.",
            "field_names": field_names,
            "implementation_steps": [
                "Use weather + crop stage to schedule irrigation",
                "If feasible, add soil moisture sensors in representative zones",
                "Log irrigation events/runtimes",
            ],
            "capital_required_usd": {"low": 0, "high": 5000},
            "annual_opex_change_usd": {"low": -1500, "high": 200},
            "timeline_months": {"min": 1, "max": 6},
            "expected_credit_uplift_tco2e_per_year": {"low": 0.1, "high": 0.8},
            "verification_evidence": [
                "irrigation logs or pump runtime logs",
                "sensor invoices (if used)",
                "field notes on scheduling approach",
            ],
            "risk_level": "low",
        }
    )

    # 4) Rice-specific methane (future meaningfulness)
    if "rice" in crops:
        measures.append(
            {
                "title": "Rice: adopt Alternate Wetting and Drying (AWD) where suitable",
                "why_it_helps": "Can reduce methane emissions from continuously flooded fields.",
                "field_names": [f.get("field_name", "Rice field") for f in fields if f.get("crop_type") == "rice"],
                "implementation_steps": [
                    "Assess field leveling and water control structures",
                    "Implement AWD cycles and record flood/dry periods",
                    "Train staff and document practice change",
                ],
                "capital_required_usd": {"low": 0, "high": 2000},
                "annual_opex_change_usd": {"low": -500, "high": 500},
                "timeline_months": {"min": 1, "max": 12},
                "expected_credit_uplift_tco2e_per_year": {"low": 0.5, "high": 3.0},
                "verification_evidence": [
                    "water management logs",
                    "photos of water level indicators",
                    "field inspection notes",
                ],
                "risk_level": "medium",
            }
        )

    # Apply constraint: filter measures that exceed max_capex (simple)
    filtered: List[Dict[str, Any]] = []
    for m in measures:
        if float(m["capital_required_usd"]["low"]) <= max_capex:
            # If high > max, keep but note
            if float(m["capital_required_usd"]["high"]) > max_capex:
                m = dict(m)
                m["notes"] = [f"High-end CAPEX may exceed your max_upfront_cost_usd={max_capex}."]
            filtered.append(m)

    # Rank: low risk first, then highest expected uplift high-end
    risk_order = {"low": 0, "medium": 1, "high": 2}
    filtered.sort(
        key=lambda x: (
            risk_order.get(x.get("risk_level", "medium"), 1),
            -float(x["expected_credit_uplift_tco2e_per_year"]["high"]),
        )
    )

    return {
        "recommended_measures": filtered[:6],
        "what_to_do_next": [
            "Choose 1–2 measures to implement in the next 30–60 days (low risk first).",
            "Start a simple log: fertilizer applications (date, product, rate), tillage operations, irrigation events.",
            "Save receipts/invoices for any inputs or equipment changes.",
            "Schedule an appraiser visit after the first verified practice change is in place.",
        ],
        "appraiser_evidence_checklist": [
            "Confirm field boundary/area and crop type",
            "Baseline fertilizer receipts and application records (previous season)",
            "Project-season fertilizer receipts + application log (dates, rates)",
            "Tillage operation log (passes reduced) and optional fuel receipts",
            "Irrigation logs or pump runtime logs (if applicable)",
            "Photos of practice changes and field conditions",
        ],
        "notes": [
            "Fallback recommendations used (Gemini not called or SDK unavailable).",
            "Capital estimates are approximate ranges for MVP purposes.",
        ],
    }


def get_recommendations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Primary function: returns strict JSON with CAPEX + steps + evidence.
    """
    # Try Gemini first
    out = _try_call_gemini(payload)
    if isinstance(out, dict) and "recommended_measures" in out:
        return out

    # Fallback
    return _heuristic_recommendations(payload)