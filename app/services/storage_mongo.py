"""
MongoDB storage layer for Terra30.
Replaces CSV persistence with Atlas collections.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.services.database import get_db  # type: ignore[import]


# ---- helpers ----

def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{str(uuid4().hex)[:12]}"  # type: ignore


# ------------------------------------------------------------------
# Farms
# ------------------------------------------------------------------

def save_farm(farm_name: str, state: str, country: str = "United States", email: Optional[str] = None) -> str:
    """Insert a farm document. Returns the farm_id. Optional email links it to a user."""
    db = get_db()
    farm_id = _new_id("farm_")
    db.farms.insert_one({
        "farm_id": farm_id,
        "email": email,
        "farm_name": farm_name,
        "state": state,
        "country": country,
        "created_at": _now_iso(),
    })
    return farm_id


def get_farm_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieve the latest farm for a specific user email."""
    db = get_db()
    # Find most recently created farm for this email
    return db.farms.find_one({"email": email}, {"_id": 0}, sort=[("created_at", -1)])


def get_farm(farm_id: str) -> Optional[Dict[str, Any]]:
    db = get_db()
    return db.farms.find_one({"farm_id": farm_id}, {"_id": 0})


# ------------------------------------------------------------------
# Fields
# ------------------------------------------------------------------

def save_field(
    farm_id: str,
    field_name: str,
    latitude: float,
    longitude: float,
    area_value: float,
    area_unit: str,
    area_ha: float,
    crop_type: str,
    baseline: Optional[Dict[str, Any]] = None,
    project: Optional[Dict[str, Any]] = None,
) -> str:
    """Insert a field document. Returns the field_id."""
    db = get_db()
    field_id = _new_id("field_")
    db.fields.insert_one({
        "field_id": field_id,
        "farm_id": farm_id,
        "field_name": field_name,
        "latitude": latitude,
        "longitude": longitude,
        "area_value": area_value,
        "area_unit": area_unit,
        "area_ha": area_ha,
        "crop_type": crop_type,
        "baseline": baseline,
        "project": project,
    })
    return field_id


def get_fields_by_farm(farm_id: str) -> List[Dict[str, Any]]:
    """Retrieve all fields for a specific farm."""
    db = get_db()
    return list(db.fields.find({"farm_id": farm_id}, {"_id": 0}))


# ------------------------------------------------------------------
# Management events
# ------------------------------------------------------------------

def save_events(field_id: str, scenario: str, events: List[Dict[str, Any]]) -> None:
    """Bulk-insert management events for a field+scenario."""
    if not events:
        return
    db = get_db()
    docs = []
    for e in events:
        docs.append({
            "event_id": _new_id("evt_"),
            "field_id": field_id,
            "scenario": scenario,
            **e,
        })
    db.management_events.insert_many(docs)


# ------------------------------------------------------------------
# Analyses  (the big one — stores complete results)
# ------------------------------------------------------------------

def save_analysis(
    farm_name: str,
    state: str,
    analysis_window: Dict[str, str],
    result: Dict[str, Any],
) -> str:
    db = get_db()
    analysis_id = _new_id("analysis_")
    doc = {
        "analysis_id": analysis_id,
        "farm_name": farm_name,
        "state": state,
        "analysis_window": analysis_window,
        "result": result,
        "created_at": _now_iso(),
    }
    db.analyses.insert_one(doc)
    return analysis_id


def get_analysis(analysis_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single analysis by ID."""
    db = get_db()
    doc = db.analyses.find_one({"analysis_id": analysis_id}, {"_id": 0})
    return doc


def link_analysis_to_user(analysis_id: str, email: str) -> bool:
    """Update an analysis document to link it to a user email."""
    db = get_db()
    res = db.analyses.update_one(
        {"analysis_id": analysis_id},
        {"$set": {"email": email}}
    )
    # Check matched_count instead of modified_count to avoid false negatives on redundant links
    return res.matched_count > 0


def get_latest_analysis_for_user(email: str) -> Optional[Dict[str, Any]]:
    """Retrieve the most recent analysis for a user."""
    db = get_db()
    return db.analyses.find_one({"email": email}, {"_id": 0}, sort=[("created_at", -1)])


def list_analyses(limit: int = 50) -> List[Dict[str, Any]]:
    """List recent analyses (most recent first)."""
    db = get_db()
    cursor = db.analyses.find(
        {},
        {"_id": 0, "analysis_id": 1, "farm_name": 1, "state": 1,
         "analysis_window": 1, "created_at": 1},
    ).sort("created_at", -1).limit(limit)
    return list(cursor)
