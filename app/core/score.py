from __future__ import annotations
from typing import Dict


def compute_credit_score(
    annual_reduction_tco2e_mid: float,
    area_ha: float,
    data_quality_score: float,
    additionality_flag: bool,
    verification_ready: bool,
    uncertainty_pct: float,
) -> Dict:
    """
    0–100 score with breakdown.
    """

    # A) Data completeness (0–25)
    data_component = max(0.0, min(25.0, data_quality_score * 25.0))

    # B) Reduction potential normalized per ha (0–25)
    reduction_per_ha = annual_reduction_tco2e_mid / max(area_ha, 1e-9)
    reduction_component = max(0.0, min(25.0, reduction_per_ha * 5.0))  # scale

    # C) Additionality (0–20)
    additionality_component = 20.0 if additionality_flag else 6.0

    # D) Verification readiness (0–20)
    verification_component = 20.0 if verification_ready else 10.0

    # E) Uncertainty penalty (0–10)
    penalty = max(0.0, min(10.0, uncertainty_pct * 10.0))

    score = data_component + reduction_component + additionality_component + verification_component - penalty
    score = max(0.0, min(100.0, score))

    return {
        "carbon_credit_score_0_100": round(score, 2),
        "components": {
            "data_completeness": round(data_component, 2),
            "reduction_potential": round(reduction_component, 2),
            "additionality": round(additionality_component, 2),
            "verification_readiness": round(verification_component, 2),
            "uncertainty_penalty": round(penalty, 2),
        },
    }

