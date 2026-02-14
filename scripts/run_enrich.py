from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.pipelines.enrich import enrich_weather
from app.pipelines.estimate import run_estimates


DATA_DIR = ROOT / "data"


def _safe_remove(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass


def main() -> None:
    # Clean outputs so each run is reproducible
    _safe_remove(DATA_DIR / "weather_daily.csv")
    _safe_remove(DATA_DIR / "estimates.csv")

    start_date = "2024-03-01"
    end_date = "2024-03-10"

    enrich_weather(str(DATA_DIR), start_date, end_date)
    print("✅ Weather enrichment done -> data/weather_daily.csv")

    run_estimates(str(DATA_DIR))
    print("✅ Estimates done -> data/estimates.csv")


if __name__ == "__main__":
    main()
