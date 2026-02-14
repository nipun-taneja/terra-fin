from __future__ import annotations

from typing import Literal, Optional


def estimate_maize_baseline_tco2e_y(
    farm_size_hectares: float,
    region: Optional[Literal["global", "us", "asia", "africa", "latam", "eu"]] = "global",
) -> float:
    """
    Hackathon-friendly baseline emissions estimate for maize (tCO2e/year).

    We keep this intentionally simple and transparent:
    - Use an emissions intensity per hectare-year (tCO2e/ha/year),
      mostly driven by nitrogen fertilizer (N2O), field operations, and residue handling.
    - Region tweak is optional (very rough multipliers).

    IMPORTANT: This is a demo assumption layer. Later you can replace it with
    FAOSTAT/EarthStat or a more detailed model without changing the API contract.
    """
    if farm_size_hectares <= 0:
        return 0.0

    # Base (global) assumption: ~2.5 tCO2e/ha/year for maize production (rough demo value).
    base_t_per_ha_y = 2.5

    region_multiplier = {
        "global": 1.00,
        "us": 1.10,
        "eu": 0.95,
        "asia": 1.05,
        "africa": 0.90,
        "latam": 1.00,
    }.get(region or "global", 1.00)

    baseline = base_t_per_ha_y * region_multiplier * farm_size_hectares
    return round(baseline, 2)
