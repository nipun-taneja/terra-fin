from __future__ import annotations

def area_to_hectares(value: float, unit: str) -> float:
    unit = unit.strip().lower()
    if unit in ("ha", "hectare", "hectares"):
        return float(value)
    if unit in ("acre", "acres"):
        return float(value) * 0.404685642
    if unit in ("sqm", "m2", "square_meter", "square_meters"):
        return float(value) / 10_000.0
    raise ValueError(f"Unsupported area unit: {unit}")
