from __future__ import annotations
from typing import Dict, List


def generate_credit_forecast(
    annual_low: float,
    annual_mid: float,
    annual_high: float,
    horizons_months: List[int],
    buffer_pool_pct: float = 0.10,
) -> List[Dict]:
    results: List[Dict] = []

    for months in horizons_months:
        factor = months / 12.0

        low = annual_low * factor
        mid = annual_mid * factor
        high = annual_high * factor

        # conservative buffer deduction
        low *= (1 - buffer_pool_pct)
        mid *= (1 - buffer_pool_pct)
        high *= (1 - buffer_pool_pct)

        results.append(
            {
                "months": months,
                "credits_tco2e": {
                    "low": round(low, 3),
                    "mid": round(mid, 3),
                    "high": round(high, 3),
                },
            }
        )

    return results
