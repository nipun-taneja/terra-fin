from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Set, Tuple

from fastapi import APIRouter  # type: ignore[import]
from pydantic import BaseModel, Field  # type: ignore[import]

router = APIRouter()

# In-memory store for hackathon demo:
# key = (farm_name, field_name)
# value = {"completed": set(step_id), "timeline": [(ts_iso, balance)]}
_STORE: Dict[Tuple[str, str], Dict[str, Any]] = {}


class CompleteStepRequest(BaseModel):
    farm_name: str = Field(..., min_length=1)
    field_name: str = Field(..., min_length=1)
    step_id: str = Field(..., min_length=1)
    # Optional: how much this step improves credits (frontend can send or backend can decide)
    total_field_reduction_tco2e: float
    total_steps_for_field: int


class TimelinePoint(BaseModel):
    ts: str
    balance_credits: float


class CompleteStepResponse(BaseModel):
    ok: bool
    farm_name: str
    field_name: str
    step_id: str
    completed_steps: List[str]
    balance_credits: float
    timeline: List[TimelinePoint]


@router.post("/api/steps/complete", response_model=CompleteStepResponse)
def complete_step(req: CompleteStepRequest) -> CompleteStepResponse:
    key = (req.farm_name.strip(), req.field_name.strip())
    rec = _STORE.get(key)

    if rec is None:
        rec = {"completed": set(), "timeline": []}
        _STORE[key] = rec

    completed = rec["completed"]
    timeline = rec["timeline"]
    assert isinstance(completed, set)
    assert isinstance(timeline, list)

    # Get current balance
    current_balance = float(timeline[-1][1]) if len(timeline) > 0 else 0.0

    # If already completed, don't increase again
    if req.total_steps_for_field <= 0:
        req.total_steps_for_field = 1

    # Compute delta credits per step from total reduction (simple demo mapping)
    # For hackathon: 1 credit ~= 1 tCO2e (you can change later)
    total_red = float(req.total_field_reduction_tco2e)
    total_steps = float(req.total_steps_for_field)
    divider = total_steps if total_steps > 0 else 1.0
    delta = float(round(float(total_red / divider), 3))  # type: ignore[call-overload]

    if req.step_id not in completed:
        completed.add(req.step_id)
        # The following line was added based on the user's instruction,
        # which showed this line duplicated inside the if block with a type: ignore.
        # This might be a typo in the instruction, but it's applied faithfully.
        delta = float(round(float(total_red / divider), 3))  # type: ignore
        current_balance = float(round(float(float(current_balance) + delta), 3))  # type: ignore
        ts = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        timeline.append((ts, current_balance))


    return CompleteStepResponse(**{
        "ok": True,
        "farm_name": str(req.farm_name or ""),
        "field_name": str(req.field_name or ""),
        "step_id": str(req.step_id or ""),
        "completed_steps": [str(s) for s in sorted(list(completed))],
        "balance_credits": float(current_balance),
        "timeline": [TimelinePoint(**{"ts": str(t[0]), "balance_credits": float(t[1])}) for t in timeline],
    })
class StepStateResponse(BaseModel):
    ok: bool
    farm_name: str
    field_name: str
    completed_steps: List[str]
    balance_credits: float
    timeline: List[TimelinePoint]


@router.get("/api/steps/state", response_model=StepStateResponse)
def get_step_state(farm_name: str, field_name: str) -> StepStateResponse:
    key = (farm_name.strip(), field_name.strip())
    rec = _STORE.get(key)

    if rec is None:
        return StepStateResponse(**{
            "ok": True,
            "farm_name": farm_name,
            "field_name": field_name,
            "completed_steps": [],
            "balance_credits": 0.0,
            "timeline": [],
        })

    completed = rec["completed"]
    timeline = rec["timeline"]
    assert isinstance(completed, set)
    assert isinstance(timeline, list)

    current_balance = float(timeline[-1][1]) if len(timeline) > 0 else 0.0

    return StepStateResponse(**{
        "ok": True,
        "farm_name": farm_name,
        "field_name": field_name,
        "completed_steps": sorted(list(completed)),
        "balance_credits": current_balance,
        "timeline": [TimelinePoint(**{"ts": str(t[0]), "balance_credits": float(t[1])}) for t in timeline],
    })

@router.get("/api/steps/debug/keys")
def debug_keys():
    return {"keys": [f"{k[0]} | {k[1]}" for k in _STORE.keys()]}
