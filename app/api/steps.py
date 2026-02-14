from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Tuple

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

# In-memory store for hackathon demo:
# key = (farm_name, field_name)
# value = {"completed": set(step_id), "timeline": [(ts_iso, balance)]}
_STORE: Dict[Tuple[str, str], Dict[str, object]] = {}


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
    delta = float(req.total_field_reduction_tco2e) / float(req.total_steps_for_field)
    delta = round(delta, 3)

    if req.step_id not in completed:
        completed.add(req.step_id)
        current_balance = round(current_balance + delta, 3)
        ts = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        timeline.append((ts, current_balance))


    return CompleteStepResponse(
        ok=True,
        farm_name=req.farm_name,
        field_name=req.field_name,
        step_id=req.step_id,
        completed_steps=sorted(list(completed)),
        balance_credits=current_balance,
        timeline=[TimelinePoint(ts=t[0], balance_credits=float(t[1])) for t in timeline],
    )
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
        return StepStateResponse(
            ok=True,
            farm_name=farm_name,
            field_name=field_name,
            completed_steps=[],
            balance_credits=0.0,
            timeline=[],
        )

    completed = rec["completed"]
    timeline = rec["timeline"]
    assert isinstance(completed, set)
    assert isinstance(timeline, list)

    current_balance = float(timeline[-1][1]) if len(timeline) > 0 else 0.0

    return StepStateResponse(
        ok=True,
        farm_name=farm_name,
        field_name=field_name,
        completed_steps=sorted(list(completed)),
        balance_credits=current_balance,
        timeline=[TimelinePoint(ts=t[0], balance_credits=float(t[1])) for t in timeline],
    )

@router.get("/api/steps/debug/keys")
def debug_keys():
    return {"keys": [f"{k[0]} | {k[1]}" for k in _STORE.keys()]}
