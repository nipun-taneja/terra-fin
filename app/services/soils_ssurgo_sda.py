from __future__ import annotations

from typing import Dict, Any


def fetch_soil_profile_stub(lat: float, lon: float) -> Dict[str, Any]:
    """
    Skeleton stub.
    Later: replace with a Soil Data Access query to mapunit/component tables.
    For now, we return empty-ish fields so the rest of the pipeline is runnable.
    """
    return {
        "source": "ssurgo_sda_stub",
        "soc": None,
        "clay_pct": None,
        "sand_pct": None,
        "silt_pct": None,
        "ph": None,
        "drainage_class": "",
        "notes": "SSURGO integration pending",
    }
