"""
Satellite data provider stubs for NDVI and cropland confidence.
"""
from __future__ import annotations

from typing import Dict, Tuple
import hashlib
from dataclasses import dataclass

from app.models.schemas import SatelliteSummary


def _seed_from_latlon(lat: float, lon: float) -> int:
    """
    Deterministic seed based on lat/lon so the same pin always returns
    the same 'satellite' values (great for demos).
    """
    key = f"{lat:.5f},{lon:.5f}".encode("utf-8")
    digest = hashlib.sha256(key).hexdigest()
    return int(digest[:8], 16)


def _rand01(seed: int) -> float:
    """
    Tiny deterministic pseudo-random generator returning [0, 1).
    (No external deps; stable across machines.)
    """
    # Linear congruential generator-ish
    seed = (1664525 * seed + 1013904223) & 0xFFFFFFFF
    return seed / 2**32


def get_satellite_summary(lat: float, lon: float) -> SatelliteSummary:
    """
    Mock satellite summary. Later you can replace internals with Google Earth Engine
    but keep the same function signature + output schema.
    """
    seed = _seed_from_latlon(lat, lon)

    r1 = _rand01(seed)
    r2 = _rand01(seed + 1)
    r3 = _rand01(seed + 2)

    # Reasonable demo ranges:
    # NDVI mean typically ~0.2–0.8 for vegetation; trend small +/-.
    ndvi_mean = 0.2 + 0.6 * r1                    # 0.2..0.8
    ndvi_trend = -0.08 + 0.16 * r2                # -0.08..+0.08
    cropland_confidence = 0.55 + 0.45 * r3        # 0.55..1.0

    return SatelliteSummary(
        ndvi_mean=round(ndvi_mean, 3),
        ndvi_trend=round(ndvi_trend, 3),
        cropland_confidence=round(cropland_confidence, 3),
    )
