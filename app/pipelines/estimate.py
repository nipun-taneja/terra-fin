from __future__ import annotations

from pathlib import Path
from typing import Dict, Any, List, Tuple

from app.services.storage_csv import read_rows, append_row


# -----------------------------
# Output CSV schema
# -----------------------------
ESTIMATES_FIELDS = [
    "season_id",
    "field_id",
    "year",
    "scenario",
    "crop_type",
    "estimated_tco2e",
    "low_tco2e",
    "high_tco2e",
    "data_quality_score",
    "assumptions",
]


# -----------------------------
# Small helpers (robust CSV keys)
# -----------------------------
def _clean(s: Any) -> str:
    return str(s).strip()


def _pick(row: Dict[str, Any], keys: List[str], required: bool = True) -> str:
    """
    Try a list of possible key names. Returns a stripped string.
    If required=False and nothing found, returns "".
    """
    for k in keys:
        if k in row and _clean(row[k]) != "":
            return _clean(row[k])
    if required:
        raise KeyError(f"Missing required key. Tried {keys}. Found columns: {list(row.keys())}")
    return ""


def _as_float(val: str, default: float = 0.0) -> float:
    try:
        return float(_clean(val))
    except Exception:
        return default


# -----------------------------
# Data quality scoring (simple)
# -----------------------------
def _data_quality_score(season_events: List[Dict[str, str]]) -> float:
    """
    Simple heuristic:
    - +0.3 if fertilizer events exist
    - +0.3 if tillage events exist
    - +0.2 if irrigation events exist
    - +0.2 if >= 4 events total
    capped to 1.0
    """
    types = {(_clean(e.get("event_type", "")).lower()) for e in season_events}
    score = 0.0
    if "fertilizer" in types:
        score += 0.3
    if "tillage" in types:
        score += 0.3
    if "irrigation" in types:
        score += 0.2
    if len(season_events) >= 4:
        score += 0.2
    return min(1.0, score)


# -----------------------------
# Placeholder delta estimator
# -----------------------------
def estimate_season_delta_tco2e(
    area_ha: float,
    crop_type: str,
    baseline_events: List[Dict[str, str]],
    project_events: List[Dict[str, str]],
) -> Tuple[float, str]:
    """
    Placeholder delta model (MVP only):
    - If project has fewer tillage events than baseline => small benefit
    - If fertilizer amount reduced (sum of 'amount') => moderate benefit
    - If irrigation events reduced => tiny benefit (energy proxy)

    NOTE: Rice methane is NOT modeled yet (we note it in assumptions).
    """

    crop_type = _clean(crop_type).lower()

    def count_type(events: List[Dict[str, str]], t: str) -> int:
        t = t.lower()
        return sum(1 for e in events if _clean(e.get("event_type", "")).lower() == t)

    def sum_amount_for_type(events: List[Dict[str, str]], t: str) -> float:
        t = t.lower()
        total = 0.0
        for e in events:
            if _clean(e.get("event_type", "")).lower() == t:
                try:
                    total += float(_clean(e.get("amount", "") or "0"))
                except Exception:
                    pass
        return total

    base_tillage = count_type(baseline_events, "tillage")
    proj_tillage = count_type(project_events, "tillage")

    base_fert = sum_amount_for_type(baseline_events, "fertilizer")
    proj_fert = sum_amount_for_type(project_events, "fertilizer")

    base_irr = count_type(baseline_events, "irrigation")
    proj_irr = count_type(project_events, "irrigation")

    delta = 0.0
    assumptions: List[str] = []

    # small: reduced tillage -> 0.10 tCO2e/ha per fewer tillage op (placeholder)
    if proj_tillage < base_tillage:
        d = (base_tillage - proj_tillage) * 0.10 * max(area_ha, 0.0)
        delta += d
        assumptions.append("reduced_tillage_proxy")

    # moderate: fertilizer reduction -> 0.005 tCO2e per (unit of 'amount') per ha (placeholder)
    if proj_fert < base_fert:
        d = (base_fert - proj_fert) * 0.005 * max(area_ha, 1e-9)
        delta += d
        assumptions.append("fertilizer_reduction_proxy")

    # tiny: fewer irrigation events -> 0.02 tCO2e/ha per fewer irrigation event (placeholder)
    if proj_irr < base_irr:
        d = (base_irr - proj_irr) * 0.02 * max(area_ha, 0.0)
        delta += d
        assumptions.append("irrigation_energy_proxy")

    if crop_type == "rice":
        assumptions.append("rice_methane_not_modeled_yet")

    if not assumptions:
        assumptions.append("no_detected_changes")

    return float(max(delta, 0.0)), ",".join(assumptions)


# -----------------------------
# Main pipeline entry point
# -----------------------------
def run_estimates(data_dir: str) -> None:
    """
    Reads:
      - fields.csv
      - fields_seasons.csv
      - management_events.csv

    Writes:
      - estimates.csv
    """
    data_dir = str(data_dir)

    # ---- Load fields, tolerant of header variations
    field_rows = read_rows(Path(data_dir) / "fields.csv")
    fields: Dict[str, Dict[str, str]] = {}

    for r in field_rows:
        field_id = _pick(r, ["field_id", "Field ID", "FIELD_ID", "fieldId", "id"], required=False)
        if not field_id:
            continue
        fields[field_id] = r

    # ---- Load seasons & events
    seasons = read_rows(Path(data_dir) / "fields_seasons.csv")
    events = read_rows(Path(data_dir) / "management_events.csv")

    # index events by season_id
    events_by_season: Dict[str, List[Dict[str, str]]] = {}
    for e in events:
        sid = _pick(e, ["season_id", "Season ID", "SEASON_ID", "seasonId"], required=False)
        if not sid:
            continue
        events_by_season.setdefault(sid, []).append(e)

    # group seasons by (field_id, year, crop_type), separate baseline vs project
    grouped: Dict[tuple, Dict[str, Dict[str, str]]] = {}
    for s in seasons:
        field_id = _pick(s, ["field_id", "Field ID", "FIELD_ID", "fieldId"], required=False)
        year = _pick(s, ["year", "Year", "YEAR"], required=False)
        crop_type = _pick(s, ["crop_type", "Crop Type", "CROP_TYPE", "crop"], required=False)
        scenario = _pick(s, ["scenario", "Scenario", "SCENARIO"], required=False).lower()

        if not (field_id and year and crop_type and scenario):
            continue

        key = (field_id, year, crop_type)
        grouped.setdefault(key, {})
        grouped[key][scenario] = s

    # ---- Compute estimates for keys that have both baseline and project
    for (field_id, year, crop_type), scen_map in grouped.items():
        if "baseline" not in scen_map or "project" not in scen_map:
            continue

        fld = fields.get(field_id)
        if not fld:
            # field referenced in seasons.csv doesn't exist in fields.csv
            continue

        # area_ha might have different header names; try a few
        area_ha_str = _pick(
            fld,
            ["area_ha", "Area (ha)", "AREA_HA", "areaHa"],
            required=False
        )
        area_ha = _as_float(area_ha_str, default=0.0)

        base_season = scen_map["baseline"]
        proj_season = scen_map["project"]

        base_season_id = _pick(base_season, ["season_id", "Season ID", "SEASON_ID", "seasonId"])
        proj_season_id = _pick(proj_season, ["season_id", "Season ID", "SEASON_ID", "seasonId"])

        base_events = events_by_season.get(base_season_id, [])
        proj_events = events_by_season.get(proj_season_id, [])

        dq = (_data_quality_score(base_events) + _data_quality_score(proj_events)) / 2.0

        delta_tco2e, assumptions = estimate_season_delta_tco2e(
            area_ha=area_ha,
            crop_type=crop_type,
            baseline_events=base_events,
            project_events=proj_events,
        )

        # conservative uncertainty:
        # dq=1.0 -> +/-10%, dq=0.0 -> +/-40%
        uncertainty = 0.40 - (0.30 * dq)
        low = max(0.0, delta_tco2e * (1.0 - uncertainty))
        high = delta_tco2e * (1.0 + uncertainty)

        out_row = {
            "season_id": proj_season_id,
            "field_id": field_id,
            "year": int(_as_float(year, default=0.0)),
            "scenario": "project",
            "crop_type": _clean(crop_type).lower(),
            "estimated_tco2e": round(delta_tco2e, 6),
            "low_tco2e": round(low, 6),
            "high_tco2e": round(high, 6),
            "data_quality_score": round(dq, 3),
            "assumptions": assumptions,
        }

        append_row(Path(data_dir) / "estimates.csv", out_row, ESTIMATES_FIELDS)
