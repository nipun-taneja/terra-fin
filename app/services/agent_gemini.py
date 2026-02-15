from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

# -----------------------------
# Default offer catalog (US-focused)
# NOTE:
# - CRS Credit API is credit-reporting/underwriting data (not carbon credits).
# - Carbon programs / registries are included as pathways for verified credits.
# -----------------------------
DEFAULT_OFFER_CATALOG: List[Dict[str, Any]] = [
    # ---- Credit-data / underwriting (API tool)
    {
        "provider_name": "CRS Credit API",
        "provider_category": "credit_data_api",
        "offer_type": "credit_report_api",
        "best_for": "Pulling borrower credit data for loan pre-qualification and underwriting workflows",
        "apply_url": "https://crscreditapi.com/",
        "contact_email": "",
        "requirements": ["End-user consent", "Permissible purpose (lending)"],
        "what_to_send": ["Borrower identity + consent artifact (per your compliance flow)"],
        "next_steps": ["Use CRS to fetch credit attributes for underwriting (do not treat as carbon provider)"],
        "risks_and_notes": [
            "CRS is not a carbon credit marketplace/registry; it supports lending decisions via credit data."
        ],
    },
    # ---- Big ag lenders / finance pathways
    {
        "provider_name": "CoBank (Farm Credit System)",
        "provider_category": "bank_lender",
        "offer_type": "ag_loan_or_sustainability_linked_credit",
        "best_for": "Ag co-ops / supply chains / larger operators seeking conservation-linked financing",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Farm financials", "Practice plan", "Projected cashflow"],
        "what_to_send": ["Farm summary", "Field/practice plan", "Input logs (baseline + project)"],
        "next_steps": ["Ask about sustainability-linked or conservation-aligned financing options"],
        "risks_and_notes": ["Terms vary by underwriting and relationship"],
    },
    {
        "provider_name": "Farm Credit (network of local associations)",
        "provider_category": "bank_lender",
        "offer_type": "ag_operating_loan_or_conservation_finance",
        "best_for": "Working capital + practice adoption financing via ag-focused lender network",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Farm financials", "Practice plan"],
        "what_to_send": ["Farm summary", "Practice plan", "Documentation plan for verification"],
        "next_steps": ["Contact local Farm Credit association; ask about climate-smart / conservation financing"],
        "risks_and_notes": ["Availability varies by region and association"],
    },
    {
        "provider_name": "Rabobank / Rabo AgriFinance (US ag finance)",
        "provider_category": "bank_lender",
        "offer_type": "ag_financing_clean_energy_or_transition",
        "best_for": "Ag operations financing; sometimes clean-energy / transition-related projects",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Farm financials", "Project/practice plan"],
        "what_to_send": ["Farm summary", "Practice plan + expected savings/revenue"],
        "next_steps": ["Ask for financing options aligned to sustainability / transition projects"],
        "risks_and_notes": ["Product offerings vary by borrower profile and region"],
    },
    {
        "provider_name": "Farmer Mac (via lenders / programs)",
        "provider_category": "bank_lender",
        "offer_type": "mortgage_liquidity_or_sustainability_incentive_program",
        "best_for": "Financing liquidity; some programs incentivize sustainable practices via partners",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Typically accessed via participating lenders/partners"],
        "what_to_send": ["Farm mortgage context (if applicable)", "Practice adoption proof/data sharing"],
        "next_steps": ["Ask lender/partner if Farmer Mac sustainability incentives apply"],
        "risks_and_notes": ["Usually not direct-to-farmer lending; often via partner channels"],
    },
    # ---- Carbon programs / aggregators (farmer-facing)
    {
        "provider_name": "Indigo Ag (carbon program / credits)",
        "provider_category": "carbon_program_marketplace",
        "offer_type": "carbon_program_enrollment",
        "best_for": "Farmer enrollment + MRV + credit sales (program-managed)",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Practice adoption + data sharing; verification workflow"],
        "what_to_send": ["Field history", "Practice plan", "Input logs", "Evidence artifacts"],
        "next_steps": ["Enroll; follow MRV steps; schedule verification"],
        "risks_and_notes": ["Eligibility and crediting depends on methodology + additionality rules"],
    },
    {
        "provider_name": "Truterra (farmer sustainability program)",
        "provider_category": "carbon_program_marketplace",
        "offer_type": "sustainability_program_or_carbon_pathway",
        "best_for": "Practice planning + data workflows that may connect to credit programs",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Practice plan + field data"],
        "what_to_send": ["Field data + practice logs + evidence"],
        "next_steps": ["Enroll; confirm whether credits are issued via a registry-backed pathway"],
        "risks_and_notes": ["Program offerings vary; credits may be via partners/methodologies"],
    },
    # ---- Registries (credit issuance rules; often indirect for farmers)
    {
        "provider_name": "Climate Action Reserve (CAR)",
        "provider_category": "carbon_registry",
        "offer_type": "registry_methodology_and_issuance",
        "best_for": "Registry-backed issuance (often via project developer/aggregator)",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Methodology compliance", "Verification", "Monitoring reports"],
        "what_to_send": ["Project documentation, monitoring + verification package"],
        "next_steps": ["Typically join via a developer/aggregator; confirm applicable protocol"],
        "risks_and_notes": ["Farmers usually participate through programs rather than direct registry interaction"],
    },
    {
        "provider_name": "American Carbon Registry (ACR)",
        "provider_category": "carbon_registry",
        "offer_type": "registry_methodology_and_issuance",
        "best_for": "Registry-backed credits via project developers/programs",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Methodology + verification + monitoring"],
        "what_to_send": ["Project documentation + monitoring"],
        "next_steps": ["Participate through a developer/aggregator"],
        "risks_and_notes": ["Direct registry interaction is uncommon for small farms"],
    },
    {
        "provider_name": "Verra (VCS)",
        "provider_category": "carbon_registry",
        "offer_type": "registry_methodology_and_issuance",
        "best_for": "Large-scale registry-backed credit issuance via developers",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Methodology + verification + monitoring"],
        "what_to_send": ["Project documentation + monitoring"],
        "next_steps": ["Participate through a developer/aggregator"],
        "risks_and_notes": ["Farmers typically join programs aligned to VCS methodologies"],
    },
    {
        "provider_name": "Gold Standard",
        "provider_category": "carbon_registry",
        "offer_type": "registry_methodology_and_issuance",
        "best_for": "High-integrity methodologies (often developer-led)",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Methodology + verification + monitoring"],
        "what_to_send": ["Project documentation + monitoring"],
        "next_steps": ["Participate through a developer/aggregator"],
        "risks_and_notes": ["Direct participation is uncommon for small farms"],
    },
    # ---- Public programs (US + CA)
    {
        "provider_name": "USDA NRCS EQIP / CSP",
        "provider_category": "public_program",
        "offer_type": "cost_share_conservation_practices",
        "best_for": "Cost-share / payments to adopt conservation practices (not always carbon credits)",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Eligibility + conservation plan via NRCS"],
        "what_to_send": ["Farm info", "Practice plan", "Land control documentation"],
        "next_steps": ["Contact local USDA Service Center / NRCS office"],
        "risks_and_notes": ["These are incentive programs; stacking rules vary by program and credit methodology"],
    },
    {
        "provider_name": "USDA FSA Conservation Loans (guaranteed via lenders)",
        "provider_category": "public_program",
        "offer_type": "conservation_loan_guarantee",
        "best_for": "Financing conservation projects via approved lenders with FSA guarantee",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["Conservation plan approved by NRCS; lender underwriting"],
        "what_to_send": ["Conservation plan", "Farm financials", "Project budget"],
        "next_steps": ["Ask your lender about FSA-guaranteed conservation loans"],
        "risks_and_notes": ["Loan terms depend on lender; guarantee supports access to credit"],
    },
    {
        "provider_name": "CDFA Healthy Soils Program (California)",
        "provider_category": "public_program",
        "offer_type": "grant_incentive_for_ghg_reduction",
        "best_for": "CA growers implementing soil practices to reduce GHGs / increase soil carbon",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["CA eligibility + program rules"],
        "what_to_send": ["Project/practice plan", "Field info", "Budget + evidence plan"],
        "next_steps": ["Apply during open rounds; use technical assistance if available"],
        "risks_and_notes": ["Round timing varies; not a carbon registry credit"],
    },
    {
        "provider_name": "CDFA SWEEP (California)",
        "provider_category": "public_program",
        "offer_type": "irrigation_efficiency_grant",
        "best_for": "CA irrigation upgrades that save water + reduce GHGs",
        "apply_url": "",
        "contact_email": "",
        "requirements": ["CA eligibility + irrigation project scope"],
        "what_to_send": ["Irrigation upgrade plan", "Budget", "Field info"],
        "next_steps": ["Apply during open rounds"],
        "risks_and_notes": ["Round timing varies; not a carbon registry credit"],
    },
]

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
    "offers": {
        "disclaimer": "These are suggested providers/programs to explore. Availability and eligibility vary by location and provider. This is not financial advice.",
        "ranked_offers": [
            {
                "provider_name": "CoBank (Farm Credit System)",
                "provider_category": "bank_lender",
                "offer_type": "ag_loan_or_sustainability_linked_credit",
                "best_for": "Ag co-ops / farm supply chains / larger operators",
                "match_score_0_100": 78,
                "why_ranked": ["Ag-focused lender; may fit conservation/climate-finance narratives."],
                "estimated_terms": {
                    "advance_usd_range": [5000, 50000],
                    "apr_range": [6.0, 13.0],
                    "tenor_months_range": [12, 60],
                    "repayment_source": "farm_cashflow_or_credit_proceeds",
                },
                "requirements": ["Basic farm financials", "Practice plan / projected cashflow"],
                "what_to_send": ["Farm summary", "Field/practice plan", "Last season input logs (if any)"],
                "next_steps": ["Contact provider and ask for conservation-aligned / sustainability-linked credit options"],
                "risks_and_notes": ["Terms vary widely; may require underwriting/relationship."],
                "links": {"apply_url": "", "contact_email": ""},
            }
        ],
    },
    "notes": ["If uncertain, provide conservative ranges."],
}


def _clean(s: Any) -> str:
    return str(s).strip()


def _as_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


def _as_int(x: Any, default: int = 0) -> int:
    try:
        return int(float(x))
    except Exception:
        return default


def _with_default_offer_catalog(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    If caller didn't provide offer_catalog, inject DEFAULT_OFFER_CATALOG.
    This keeps frontend payloads simple.
    """
    out = dict(payload)
    if not isinstance(out.get("offer_catalog"), list) or not out.get("offer_catalog"):
        out["offer_catalog"] = DEFAULT_OFFER_CATALOG
    return out


def _build_prompt(payload: Dict[str, Any]) -> str:
    """
    Strong prompt:
    - JSON-only output
    - Offers must come ONLY from offer_catalog
    """
    return (
        "You are an agricultural carbon advisor agent for US farms (corn/rice). "
        "Return ONLY valid JSON. No markdown, no extra text.\n\n"
        "Task:\n"
        "1) Recommend measures to improve carbon credit score and increase credits.\n"
        "2) Include anticipated capital required (CAPEX) as a low/high USD range.\n"
        "3) Include what to do next.\n"
        "4) Include appraiser evidence checklist.\n"
        "5) Include a ranked list of financing / program / marketplace options under offers.ranked_offers.\n\n"
        "Rules:\n"
        "- Be conservative. Use ranges. If data is missing, note assumptions.\n"
        "- Respect constraints.max_upfront_cost_usd and constraints.no_new_equipment if provided.\n"
        "- For offers: ONLY use providers listed in INPUT_JSON.offer_catalog. Do not invent providers.\n"
        "- offers.ranked_offers should contain 3–6 options if offer_catalog is present.\n"
        "- Output MUST match the provided JSON schema shape.\n\n"
        "INPUT_JSON:\n"
        f"{json.dumps(payload, ensure_ascii=False)}\n\n"
        "OUTPUT_SCHEMA_EXAMPLE:\n"
        f"{json.dumps(AGENT_OUTPUT_SCHEMA_EXAMPLE, ensure_ascii=False)}"
    )


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """
    Handles:
      - pure JSON
      - JSON wrapped with extra text (slice between first { and last })
    """
    text = text.strip()
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    i = text.find("{")
    j = text.rfind("}")
    if i != -1 and j != -1 and j > i:
        chunk = text[i : j + 1]
        try:
            obj = json.loads(chunk)
            if isinstance(obj, dict):
                return obj
        except Exception:
            return None

    return None


def _try_call_gemini(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Tries Google Gemini SDKs. Returns dict if successful, else None.
    Supports either:
      - google-generativeai (deprecated)
      - google-genai (newer)
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None

    prompt = _build_prompt(payload)

    # Attempt: google-generativeai (deprecated)
    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content(prompt, generation_config={"temperature": 0.3})
        text = getattr(resp, "text", None) or str(resp)
        parsed = _extract_json(text)
        if parsed:
            return parsed
    except Exception:
        pass

    # Attempt: google-genai (newer)
    try:
        from google import genai  # type: ignore

        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json", "temperature": 0.3},
        )
        text = getattr(resp, "text", None) or str(resp)
        parsed = _extract_json(text)
        if parsed:
            return parsed
    except Exception:
        return None

    return None


# -----------------------------
# Heuristic fallback (measures + offers)
# -----------------------------
def _heuristic_recommendations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback that produces:
      - ranked measures with CAPEX ranges
      - what_to_do_next
      - evidence checklist
      - offers.ranked_offers (ONLY from offer_catalog)
    """
    constraints = payload.get("constraints", {}) or {}
    max_capex = _as_float(constraints.get("max_upfront_cost_usd", 999999), 999999.0)
    no_new_eq = bool(constraints.get("no_new_equipment", False))

    fields: List[Dict[str, Any]] = payload.get("fields", []) or []
    field_names = [f.get("field_name", "Field") for f in fields]

    crops = {(_clean(f.get("crop_type", "")).lower()) for f in fields if f.get("crop_type")}
    if not crops:
        crops = {"corn"}

    measures: List[Dict[str, Any]] = []

    # 1) Fertilizer optimization
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

    # 2) Irrigation efficiency
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

    # 3) Reduced tillage
    capex = {"low": 0, "high": 8000}
    if no_new_eq:
        capex = {"low": 0, "high": 500}

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

    # 4) Rice methane (AWD)
    if "rice" in crops:
        rice_fields = [
            f.get("field_name", "Rice field")
            for f in fields
            if _clean(f.get("crop_type", "")).lower() == "rice"
        ]
        measures.append(
            {
                "title": "Rice: adopt Alternate Wetting and Drying (AWD) where suitable",
                "why_it_helps": "Can reduce methane emissions from continuously flooded fields.",
                "field_names": rice_fields or field_names,
                "implementation_steps": [
                    "Assess field leveling and water control structures",
                    "Implement AWD cycles and record flood/dry periods",
                    "Use simple water level indicators; document practice change",
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

    # Apply max CAPEX constraint (simple)
    filtered: List[Dict[str, Any]] = []
    for m in measures:
        low_capex = _as_float((m.get("capital_required_usd") or {}).get("low", 0), 0.0)
        high_capex = _as_float((m.get("capital_required_usd") or {}).get("high", 0), 0.0)
        if low_capex <= max_capex:
            if high_capex > max_capex:
                m = dict(m)
                m["notes"] = [f"High-end CAPEX may exceed your max_upfront_cost_usd={int(max_capex)}."]
            filtered.append(m)

    # Rank: low risk first, then higher uplift
    risk_order = {"low": 0, "medium": 1, "high": 2}
    filtered.sort(
        key=lambda x: (
            risk_order.get(x.get("risk_level", "medium"), 1),
            -_as_float((x.get("expected_credit_uplift_tco2e_per_year") or {}).get("high", 0), 0.0),
        )
    )

    offers = _heuristic_rank_offers(payload)

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
        "offers": offers,
        "notes": [
            "Fallback recommendations used (Gemini not called or SDK unavailable).",
            "Capital estimates and offer terms are approximate ranges for MVP purposes.",
        ],
    }


def _heuristic_rank_offers(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Offers are ranked ONLY from payload.offer_catalog.
    No hallucinated providers.
    """
    catalog = payload.get("offer_catalog", []) or []
    summary = payload.get("summary", {}) or {}

    score = _as_float(summary.get("carbon_credit_score_0_100", 0.0), 0.0)
    annual_mid = _as_float((summary.get("annual_reduction_tco2e", {}) or {}).get("mid", 0.0), 0.0)

    crops = {
        (_clean(f.get("crop_type", "")).lower())
        for f in (payload.get("fields", []) or [])
        if f.get("crop_type")
    }
    has_rice = "rice" in crops

    ranked: List[Dict[str, Any]] = []

    for item in catalog:
        name = _clean(item.get("provider_name", ""))
        if not name:
            continue

        cat = _clean(item.get("provider_category", "other")).lower()

        offer_type = _clean(item.get("offer_type", ""))
        if not offer_type:
            if cat == "carbon_program_marketplace":
                offer_type = "carbon_program_enrollment"
            elif cat in ("bank_lender", "lender", "credit_union"):
                offer_type = "financing"
            elif cat == "carbon_registry":
                offer_type = "registry_pathway"
            elif cat == "public_program":
                offer_type = "incentive_or_grant"
            elif cat == "credit_data_api":
                offer_type = "credit_report_api"
            else:
                offer_type = "program_support"

        match = 50
        why: List[str] = []

        if cat == "carbon_program_marketplace":
            match += 15
            why.append("Direct path to generate/sell credits via a program administrator.")
            if annual_mid >= 5:
                match += 15
                why.append("Projected reductions are meaningful enough to justify enrollment effort.")
            if has_rice:
                match += 5
                why.append("Rice methane reductions can be material if AWD practices are adopted.")
        elif cat == "carbon_registry":
            match += 8
            why.append("Registry pathway (usually via a developer/aggregator) for issuance/crediting.")
            if annual_mid >= 5:
                match += 5
                why.append("Scale may support registry-backed pathway through a program.")
        elif cat == "public_program":
            match += 15
            why.append("Public programs can help finance adoption and documentation.")
        elif cat in ("bank_lender", "lender", "credit_union"):
            why.append("Financing option to cover adoption costs or bridge cashflow.")
            if score >= 60:
                match += 15
                why.append("Score suggests stronger trackability/verification story.")
            if annual_mid >= 3:
                match += 10
                why.append("Projected reductions support a climate-finance narrative.")
        elif cat == "credit_data_api":
            match += 5
            why.append("Useful for underwriting workflows (credit data), not carbon issuance.")
        else:
            why.append("General option included from provided catalog.")

        match = max(0, min(100, match))

        ranked.append(
            {
                "provider_name": name,
                "provider_category": cat,
                "offer_type": offer_type,
                "best_for": _clean(item.get("best_for", "")),
                "match_score_0_100": match,
                "why_ranked": why[:4],
                "estimated_terms": {
                    "advance_usd_range": item.get("advance_usd_range", [0, 0]),
                    "apr_range": item.get("apr_range", [0.0, 0.0]),
                    "tenor_months_range": item.get("tenor_months_range", [0, 0]),
                    "repayment_source": _clean(item.get("repayment_source", "")),
                },
                "requirements": item.get("requirements", []) or [],
                "what_to_send": item.get("what_to_send", []) or [],
                "next_steps": item.get("next_steps", []) or [],
                "risks_and_notes": item.get("risks_and_notes", []) or [],
                "links": {
                    "apply_url": _clean(item.get("apply_url", "")),
                    "contact_email": _clean(item.get("contact_email", "")),
                },
            }
        )

    ranked.sort(key=lambda x: -_as_int(x.get("match_score_0_100", 0), 0))
    ranked = ranked[:6]

    return {
        "disclaimer": (
            "These are suggested providers/programs to explore. Availability and eligibility vary by "
            "location and provider. This is not financial advice."
        ),
        "ranked_offers": ranked,
    }


def _merge_offers_if_missing(agent_out: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    If Gemini returns measures but no offers, inject offers heuristically
    (still ONLY from offer_catalog).
    """
    if not isinstance(agent_out, dict):
        return agent_out

    if "offers" not in agent_out or not isinstance(agent_out.get("offers"), dict):
        agent_out = dict(agent_out)
        agent_out["offers"] = _heuristic_rank_offers(payload)
        return agent_out

    offers = agent_out.get("offers") or {}
    if isinstance(offers, dict) and "ranked_offers" not in offers:
        offers = dict(offers)
        offers["ranked_offers"] = _heuristic_rank_offers(payload).get("ranked_offers", [])
        agent_out = dict(agent_out)
        agent_out["offers"] = offers

    return agent_out


def get_recommendations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Primary function:
      - ensures offer_catalog exists (default catalog if missing)
      - tries Gemini
      - ensures offers section exists and respects offer_catalog
      - falls back to heuristic
    """
    payload = _with_default_offer_catalog(payload)

    out = _try_call_gemini(payload)
    if isinstance(out, dict) and "recommended_measures" in out:
        out = _merge_offers_if_missing(out, payload)
        return out

    return _heuristic_recommendations(payload)
