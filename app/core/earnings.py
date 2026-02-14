from __future__ import annotations
from typing import Dict, List


def estimate_earnings(
    forecast: List[Dict],
    price_low: float = 10.0,
    price_mid: float = 25.0,
    price_high: float = 40.0,
    platform_fee_pct: float = 0.10,
) -> List[Dict]:
    out: List[Dict] = []

    for entry in forecast:
        m = entry["months"]
        c = entry["credits_tco2e"]

        net_low = c["low"] * price_low * (1 - platform_fee_pct)
        net_mid = c["mid"] * price_mid * (1 - platform_fee_pct)
        net_high = c["high"] * price_high * (1 - platform_fee_pct)

        out.append(
            {
                "months": m,
                "net_earnings_usd": {
                    "low": round(net_low, 2),
                    "mid": round(net_mid, 2),
                    "high": round(net_high, 2),
                },
            }
        )

    return out
