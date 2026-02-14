from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.pipelines.ingest import (
    create_farm,
    add_field,
    add_field_season,
    add_management_event,
)
from app.pipelines.enrich import enrich_weather
from app.pipelines.estimate import run_estimates
from app.services.storage_csv import read_rows

DATA_DIR = ROOT / "data"


def _prompt(msg: str, default: str | None = None) -> str:
    if default is None:
        return input(msg).strip()
    v = input(f"{msg} [{default}]: ").strip()
    return v if v else default


def _prompt_float(msg: str, default: float | None = None) -> float:
    while True:
        s = _prompt(msg, str(default) if default is not None else None)
        try:
            return float(s)
        except ValueError:
            print("Please enter a number.")


def _prompt_int(msg: str, default: int | None = None) -> int:
    while True:
        s = _prompt(msg, str(default) if default is not None else None)
        try:
            return int(s)
        except ValueError:
            print("Please enter an integer.")


def _prompt_choice(msg: str, choices: list[str], default: str | None = None) -> str:
    choices_lower = [c.lower() for c in choices]
    while True:
        s = _prompt(f"{msg} ({'/'.join(choices)})", default).lower()
        if s in choices_lower:
            return s
        print(f"Please choose one of: {choices}")


def _safe_remove(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass


def _wipe_data_csvs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name in [
        "farms.csv",
        "fields.csv",
        "fields_seasons.csv",
        "management_events.csv",
        "weather_daily.csv",
        "estimates.csv",
    ]:
        _safe_remove(DATA_DIR / name)


def _add_simple_events(data_dir: str, season_id: str, scenario: str) -> None:
    """
    Ask only for 3 levers (MVP):
      - number of tillage passes
      - fertilizer amount (numeric)
      - number of irrigation events
    Create that many management events with generic dates.
    """
    print(f"\n--- {scenario.upper()} management inputs ---")
    tillage_passes = _prompt_int("Tillage passes", 1 if scenario == "project" else 2)
    fert_amount = _prompt_float(
        "Fertilizer amount (just a number)",
        95.0 if scenario == "project" else 120.0,
    )
    fert_unit = _prompt("Fertilizer unit (e.g., lb_N_per_acre)", "lb_N_per_acre")
    irrigation_events = _prompt_int("Irrigation events", 1)

    # Generic dates (fine for demo)
    for i in range(tillage_passes):
        add_management_event(
            data_dir,
            season_id,
            "tillage",
            f"2024-03-{1+i:02d}",
            notes=f"{scenario} tillage pass {i+1}",
        )

    add_management_event(
        data_dir,
        season_id,
        "fertilizer",
        "2024-03-15",
        amount=fert_amount,
        unit=fert_unit,
        product="urea",
        notes=f"{scenario} fertilizer",
    )

    for i in range(irrigation_events):
        add_management_event(
            data_dir,
            season_id,
            "irrigation",
            f"2024-06-{1+i:02d}",
            notes=f"{scenario} irrigation {i+1}",
        )


def _print_results() -> None:
    """
    Reads estimates.csv + fields.csv and prints:
      - Annual reduction (low/mid/high)
      - Carbon Credit Score (0-100)
      - Credits forecast for 6/12/24/36 months (after buffer pool)
      - Earnings forecast (net, after platform fee)
      - Per-field breakdown
      - AI agent recommendations (ranked) incl. CAPEX + evidence
    """
    from app.core.score import compute_credit_score
    from app.core.forecast import generate_credit_forecast
    from app.core.earnings import estimate_earnings

    estimates_path = DATA_DIR / "estimates.csv"
    fields_path = DATA_DIR / "fields.csv"

    if not estimates_path.exists():
        print("\nNo estimates.csv produced.")
        return

    est_rows = read_rows(estimates_path)
    if not est_rows:
        print("\nEstimates file exists but has no rows.")
        return

    field_rows = read_rows(fields_path)
    fields = {
        (r.get("field_id") or "").strip(): r
        for r in field_rows
        if (r.get("field_id") or "").strip()
    }

    horizons = [6, 12, 24, 36]
    buffer_pool_pct = 0.10
    platform_fee_pct = 0.10

    total_low = 0.0
    total_mid = 0.0
    total_high = 0.0
    total_area_ha = 0.0
    dq_sum = 0.0
    n = 0

    per_field: list[dict] = []

    for r in est_rows:
        fid = (r.get("field_id") or "").strip()
        if not fid:
            continue

        mid = float(r.get("estimated_tco2e") or 0.0)
        low = float(r.get("low_tco2e") or 0.0)
        high = float(r.get("high_tco2e") or 0.0)
        dq = float(r.get("data_quality_score") or 0.0)

        fld = fields.get(fid, {})
        area_ha = float(fld.get("area_ha") or 0.0)

        total_low += low
        total_mid += mid
        total_high += high
        total_area_ha += area_ha
        dq_sum += dq
        n += 1

        per_field.append(
            {
                "field_id": fid,
                "field_name": fld.get("field_name", fid),
                "crop_type": r.get("crop_type", ""),
                "annual_reduction_tco2e": {"low": low, "mid": mid, "high": high},
                "data_quality_score": dq,
                "assumptions": r.get("assumptions", ""),
            }
        )

    avg_dq = dq_sum / max(n, 1)

    # Uncertainty pct derived from bounds (conservative)
    if total_mid > 0:
        uncertainty_pct = min(
            0.40,
            max(0.0, (total_high - total_low) / (2.0 * total_mid)),
        )
    else:
        uncertainty_pct = 0.40

    # Simple MVP flags (later: compute these from evidence data)
    additionality_flag = total_mid > 0.25
    verification_ready = True

    score = compute_credit_score(
        annual_reduction_tco2e_mid=total_mid,
        area_ha=max(total_area_ha, 1e-9),
        data_quality_score=avg_dq,
        additionality_flag=additionality_flag,
        verification_ready=verification_ready,
        uncertainty_pct=uncertainty_pct,
    )

    forecast = generate_credit_forecast(
        annual_low=total_low,
        annual_mid=total_mid,
        annual_high=total_high,
        horizons_months=horizons,
        buffer_pool_pct=buffer_pool_pct,
    )

    earnings = estimate_earnings(
        forecast=forecast,
        price_low=10,
        price_mid=25,
        price_high=40,
        platform_fee_pct=platform_fee_pct,
    )

    print("\n==============================")
    print("DEMO OUTPUT (Score + Credits + Earnings)")
    print("==============================")
    print(f"Annual reduction (tCO2e): low={total_low:.3f} mid={total_mid:.3f} high={total_high:.3f}")
    print(f"Carbon Credit Score: {score['carbon_credit_score_0_100']} / 100")

    print("\nCredits forecast (after buffer pool):")
    for f in forecast:
        c = f["credits_tco2e"]
        print(f"  - {f['months']} months: low={c['low']} mid={c['mid']} high={c['high']} tCO2e")

    print("\nNet earnings forecast (after platform fee):")
    for e in earnings:
        n_usd = e["net_earnings_usd"]
        print(f"  - {e['months']} months: ${n_usd['low']} (low) | ${n_usd['mid']} (mid) | ${n_usd['high']} (high)")

    print("\nPer-field summary:")
    for pf in per_field:
        a = pf["annual_reduction_tco2e"]
        print(f"  - {pf['field_name']} ({pf['crop_type']}): low={a['low']:.3f} mid={a['mid']:.3f} high={a['high']:.3f}")

    print("\nNotes:")
    print(f"- Buffer pool used: {int(buffer_pool_pct * 100)}%")
    print(f"- Platform fee used: {int(platform_fee_pct * 100)}%")
    print("- Price band used: $10 / $25 / $40 per tCO2e")

    # ------------------------------
    # AI Recommendations (Gemini / fallback)
    # ------------------------------
    try:
        from app.services.agent_gemini import get_recommendations

        agent_payload = {
            "summary": {
                "annual_reduction_tco2e": {"low": total_low, "mid": total_mid, "high": total_high},
                "carbon_credit_score_0_100": score["carbon_credit_score_0_100"],
                "area_ha": total_area_ha,
            },
            "fields": [
                {
                    "field_name": pf["field_name"],
                    "crop_type": pf["crop_type"],
                    "annual_reduction_tco2e": pf["annual_reduction_tco2e"],
                }
                for pf in per_field
            ],
            "constraints": {
                "max_upfront_cost_usd": 5000,
                "no_new_equipment": False,
            },
        }

        agent_out = get_recommendations(agent_payload)

        print("\n==============================")
        print("RECOMMENDED MEASURES (Ranked)")
        print("==============================")

        for i, m in enumerate(agent_out.get("recommended_measures", []), start=1):
            cap = m.get("capital_required_usd", {})
            opx = m.get("annual_opex_change_usd", {})
            tl = m.get("timeline_months", {})
            uplift = m.get("expected_credit_uplift_tco2e_per_year", {})

            print(f"\n{i}) {m.get('title','(untitled)')}  [{m.get('risk_level','medium')}]")
            print(f"   Why: {m.get('why_it_helps','')}")
            print(f"   Fields: {', '.join(m.get('field_names', [])) or 'All'}")
            print(f"   CAPEX: ${cap.get('low',0)} – ${cap.get('high',0)}")
            if opx:
                print(f"   OPEX change (annual): ${opx.get('low',0)} – ${opx.get('high',0)}")
            if tl:
                print(f"   Timeline: {tl.get('min',1)} – {tl.get('max',3)} months")
            if uplift:
                print(f"   Expected credit uplift: +{uplift.get('low',0)} to +{uplift.get('high',0)} tCO2e/year")

            steps = m.get("implementation_steps", [])
            if steps:
                print("   Steps:")
                for s in steps:
                    print(f"     - {s}")

            ev = m.get("verification_evidence", [])
            if ev:
                print("   Evidence for appraiser:")
                for evi in ev:
                    print(f"     - {evi}")

        print("\n==============================")
        print("WHAT TO DO NEXT")
        print("==============================")
        for item in agent_out.get("what_to_do_next", []):
            print(f" - {item}")

        print("\n==============================")
        print("APPRAISER EVIDENCE CHECKLIST")
        print("==============================")
        for item in agent_out.get("appraiser_evidence_checklist", []):
            print(f" - {item}")

        notes = agent_out.get("notes", [])
        if notes:
            print("\nNotes:")
            for n_ in notes:
                print(f" - {n_}")

    except Exception as e:
        print("\n(Agent recommendations unavailable)")
        print(f"Reason: {e}")

    print("- File outputs saved under /data.")


def main() -> None:
    print("\nTerra30 Demo CLI (US Corn/Rice)")

    wipe = _prompt_choice("Wipe existing CSVs first?", ["yes", "no"], "yes")
    if wipe == "yes":
        _wipe_data_csvs()

    farm_name = _prompt("Farm name", "Demo Farm")
    state = _prompt("State (2-letter)", "CA")
    year = _prompt_int("Year for demo", 2024)

    farm_id = create_farm(str(DATA_DIR), farm_name=farm_name, state=state)

    n_fields = _prompt_int("How many fields?", 4)

    for i in range(n_fields):
        print(f"\n=== Field {i+1}/{n_fields} ===")
        field_name = _prompt("Field name", f"Field {chr(ord('A') + i)}")

        lat = _prompt_float("Centroid latitude", 38.50 + (i * 0.01))
        lon = _prompt_float("Centroid longitude", -121.50 + (i * 0.01))

        area_value = _prompt_float("Area value", 50.0 if i == 0 else 30.0)
        area_unit = _prompt_choice("Area unit", ["acre", "hectare", "sqm"], "acre")

        crop_type = _prompt_choice("Crop type", ["corn", "rice"], "corn")

        field_id = add_field(
            str(DATA_DIR),
            farm_id=farm_id,
            field_name=field_name,
            centroid_lat=lat,
            centroid_lon=lon,
            area_value=area_value,
            area_unit=area_unit,
            boundary_geojson="",
        )

        baseline_season_id = add_field_season(
            str(DATA_DIR),
            field_id,
            year,
            "baseline",
            crop_type,
            notes="baseline",
        )
        project_season_id = add_field_season(
            str(DATA_DIR),
            field_id,
            year,
            "project",
            crop_type,
            notes="project",
        )

        _add_simple_events(str(DATA_DIR), baseline_season_id, "baseline")
        _add_simple_events(str(DATA_DIR), project_season_id, "project")

    print("\n--- Enriching weather (Open-Meteo) ---")
    start_date = _prompt("Weather start date (YYYY-MM-DD)", f"{year}-03-01")
    end_date = _prompt("Weather end date (YYYY-MM-DD)", f"{year}-03-10")
    enrich_weather(str(DATA_DIR), start_date, end_date)
    print(" Weather enrichment done -> data/weather_daily.csv")

    print("\n--- Running estimates ---")
    run_estimates(str(DATA_DIR))
    print("Estimates done -> data/estimates.csv")

    _print_results()


if __name__ == "__main__":
    main()
