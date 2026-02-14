from __future__ import annotations

from pathlib import Path
import sys
from datetime import datetime

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
    Then create that many events (with generic dates).
    """
    print(f"\n--- {scenario.upper()} management inputs ---")
    tillage_passes = _prompt_int("Tillage passes", 1 if scenario == "project" else 2)
    fert_amount = _prompt_float("Fertilizer amount (just a number)", 95.0 if scenario == "project" else 120.0)
    fert_unit = _prompt("Fertilizer unit (e.g., lb_N_per_acre)", "lb_N_per_acre")
    irrigation_events = _prompt_int("Irrigation events", 1)

    # Generic dates (good enough for demo)
    for i in range(tillage_passes):
        add_management_event(data_dir, season_id, "tillage", f"2024-03-{1+i:02d}", notes=f"{scenario} tillage pass {i+1}")

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
        add_management_event(data_dir, season_id, "irrigation", f"2024-06-{1+i:02d}", notes=f"{scenario} irrigation {i+1}")


def _print_results() -> None:
    estimates_path = DATA_DIR / "estimates.csv"
    if not estimates_path.exists():
        print("\nNo estimates.csv produced (usually means no baseline/project pairs matched).")
        return

    rows = read_rows(estimates_path)
    if not rows:
        print("\nEstimates file exists but has no rows.")
        return

    # Summarize
    total = 0.0
    by_field: dict[str, float] = {}
    for r in rows:
        fid = (r.get("field_id") or "").strip()
        val = float(r.get("estimated_tco2e") or 0.0)
        total += val
        by_field[fid] = by_field.get(fid, 0.0) + val

    print("\n==============================")
    print("✅ DEMO OUTPUT (MVP Estimate)")
    print("==============================")
    print(f"Total estimated reductions: {total:.4f} tCO2e")
    print("Per-field:")
    for fid, v in sorted(by_field.items(), key=lambda x: -x[1]):
        print(f"  - {fid}: {v:.4f} tCO2e")

    print("\nNotes:")
    print("- This is a placeholder proxy estimator (fertilizer/tillage/irrigation deltas).")
    print("- Rice methane is NOT modeled yet; we’ll add it next for meaningful rice results.")
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

    field_ids: list[str] = []
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
        field_ids.append(field_id)

        # seasons
        baseline_season_id = add_field_season(str(DATA_DIR), field_id, year, "baseline", crop_type, notes="baseline")
        project_season_id = add_field_season(str(DATA_DIR), field_id, year, "project", crop_type, notes="project")

        # events (baseline + project)
        _add_simple_events(str(DATA_DIR), baseline_season_id, "baseline")
        _add_simple_events(str(DATA_DIR), project_season_id, "project")

    print("\n--- Enriching weather (Open-Meteo) ---")
    start_date = _prompt("Weather start date (YYYY-MM-DD)", f"{year}-03-01")
    end_date = _prompt("Weather end date (YYYY-MM-DD)", f"{year}-03-10")
    enrich_weather(str(DATA_DIR), start_date, end_date)
    print("✅ Weather enrichment done -> data/weather_daily.csv")

    print("\n--- Running estimates ---")
    run_estimates(str(DATA_DIR))
    print("✅ Estimates done -> data/estimates.csv")

    _print_results()


if __name__ == "__main__":
    main()
