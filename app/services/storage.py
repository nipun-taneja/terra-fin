"""
Storage facade with runtime backend selection.

Backends:
- sqlite (default)
- mongo
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv  # type: ignore[import]


def _backend_name() -> str:
    load_dotenv(override=True)
    return os.getenv("STORAGE_BACKEND", "sqlite").strip().lower()


def _impl():
    backend = _backend_name()
    if backend == "mongo":
        from app.services import storage_mongo as impl  # type: ignore[import]
        return impl
    from app.services import storage_sqlite as impl  # type: ignore[import]
    return impl


def save_farm(farm_name: str, state: str, country: str = "United States", email: Optional[str] = None) -> str:
    return _impl().save_farm(farm_name=farm_name, state=state, country=country, email=email)


def get_farm_by_email(email: str) -> Optional[Dict[str, Any]]:
    return _impl().get_farm_by_email(email=email)


def get_farm(farm_id: str) -> Optional[Dict[str, Any]]:
    return _impl().get_farm(farm_id=farm_id)


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
    return _impl().save_field(
        farm_id=farm_id,
        field_name=field_name,
        latitude=latitude,
        longitude=longitude,
        area_value=area_value,
        area_unit=area_unit,
        area_ha=area_ha,
        crop_type=crop_type,
        baseline=baseline,
        project=project,
    )


def get_fields_by_farm(farm_id: str) -> List[Dict[str, Any]]:
    return _impl().get_fields_by_farm(farm_id=farm_id)


def save_events(field_id: str, scenario: str, events: List[Dict[str, Any]]) -> None:
    _impl().save_events(field_id=field_id, scenario=scenario, events=events)


def save_analysis(
    farm_name: str,
    state: str,
    analysis_window: Dict[str, str],
    result: Dict[str, Any],
) -> str:
    return _impl().save_analysis(
        farm_name=farm_name,
        state=state,
        analysis_window=analysis_window,
        result=result,
    )


def update_analysis_result(analysis_id: str, result: Dict[str, Any]) -> None:
    impl = _impl()
    if hasattr(impl, "update_analysis_result"):
        impl.update_analysis_result(analysis_id=analysis_id, result=result)


def get_analysis(analysis_id: str) -> Optional[Dict[str, Any]]:
    return _impl().get_analysis(analysis_id=analysis_id)


def link_analysis_to_user(analysis_id: str, email: str) -> bool:
    return _impl().link_analysis_to_user(analysis_id=analysis_id, email=email)


def get_latest_analysis_for_user(email: str) -> Optional[Dict[str, Any]]:
    return _impl().get_latest_analysis_for_user(email=email)


def list_analyses(limit: int = 50) -> List[Dict[str, Any]]:
    return _impl().list_analyses(limit=limit)

