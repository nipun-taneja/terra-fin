from __future__ import annotations

from typing import Tuple


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def compute_annual_savings_tco2e(
    baseline_tco2e_y: float,
    reduction_pct_range: Tuple[float, float],
) -> Tuple[float, float]:
    """
    Convert reduction % range into annual tCO2e saved range.
    """
    rmin, rmax = reduction_pct_range
    rmin = clamp(rmin, 0.0, 95.0)
    rmax = clamp(rmax, rmin, 95.0)

    saved_min = baseline_tco2e_y * (rmin / 100.0)
    saved_max = baseline_tco2e_y * (rmax / 100.0)
    return (round(saved_min, 2), round(saved_max, 2))


def compute_finance_offer(
    annual_tco2e_saved_range: Tuple[float, float],
    carbon_price_usd_per_t: float = 20.0,
    haircut: float = 0.60,
) -> Tuple[Tuple[float, float], Tuple[float, float]]:
    """
    Finance logic:
    - credit_value = tCO2e_saved * carbon_price
    - loan_offer = credit_value * haircut (risk-adjusted pre-sale)
    Returns:
      (credit_value_range, loan_offer_range)
    """
    smin, smax = annual_tco2e_saved_range
    carbon_price_usd_per_t = clamp(carbon_price_usd_per_t, 1.0, 500.0)
    haircut = clamp(haircut, 0.0, 1.0)

    credit_min = smin * carbon_price_usd_per_t
    credit_max = smax * carbon_price_usd_per_t
    loan_min = credit_min * haircut
    loan_max = credit_max * haircut

    return (
        (round(credit_min, 2), round(credit_max, 2)),
        (round(loan_min, 2), round(loan_max, 2)),
    )
