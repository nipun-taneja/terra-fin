from __future__ import annotations

import os
from pathlib import Path

# Make sure imports work even if you kept config.py at repo root
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.pipelines.ingest import (
    create_farm, add_field, add_field_season, add_management_event
)


DATA_DIR = str(ROOT / "data")


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    farm_id = create_farm(DATA_DIR, farm_name="Demo Farm", state="CA")

    # Example 4 fields (centroids are arbitrary)
    fields = []
    fields.append(add_field(DATA_DIR, farm_id, "Field A", 38.50, -121.50, 50, "acre"))
    fields.append(add_field(DATA_DIR, farm_id, "Field B", 38.52, -121.47, 30, "acre"))
    fields.append(add_field(DATA_DIR, farm_id, "Field C", 38.48, -121.53, 20, "acre"))
    fields.append(add_field(DATA_DIR, farm_id, "Field D", 38.51, -121.55, 40, "acre"))

    # Create baseline + project seasons for 2024
    for i, field_id in enumerate(fields):
        crop = "corn" if i < 3 else "rice"

        base_season = add_field_season(DATA_DIR, field_id, 2024, "baseline", crop, notes="baseline")
        proj_season = add_field_season(DATA_DIR, field_id, 2024, "project", crop, notes="project")

        # Baseline events (more tillage / more fertilizer)
        add_management_event(DATA_DIR, base_season, "tillage", "2024-03-01", notes="conventional tillage pass")
        add_management_event(DATA_DIR, base_season, "fertilizer", "2024-03-15", amount=120, unit="lb_N_per_acre", product="urea")
        add_management_event(DATA_DIR, base_season, "irrigation", "2024-06-01", notes="irrigation event")

        # Project events (reduced tillage + reduced fertilizer)
        add_management_event(DATA_DIR, proj_season, "tillage", "2024-03-05", notes="reduced tillage pass")
        add_management_event(DATA_DIR, proj_season, "fertilizer", "2024-03-20", amount=95, unit="lb_N_per_acre", product="urea")
        add_management_event(DATA_DIR, proj_season, "irrigation", "2024-06-10", notes="irrigation event")

    print("✅ Sample CSVs created under /data")


if __name__ == "__main__":
    main()
