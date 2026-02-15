"""
SQLite storage backend for Terra30.
Designed to mirror storage_mongo function signatures for easy backend swapping.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from dotenv import load_dotenv  # type: ignore[import]

_conn: sqlite3.Connection | None = None
_lock = threading.Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{str(uuid4().hex)[:12]}"


def _db_path() -> Path:
    load_dotenv(override=True)
    raw = os.getenv("SQLITE_DB_PATH", "data/terrafin.db").strip()
    return Path(raw)


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is not None:
        return _conn

    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    _init_schema(conn)
    _conn = conn
    return conn


def _init_schema(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS farms (
                farm_id TEXT PRIMARY KEY,
                email TEXT,
                farm_name TEXT NOT NULL,
                state TEXT NOT NULL,
                country TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fields (
                field_id TEXT PRIMARY KEY,
                farm_id TEXT NOT NULL,
                field_name TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                area_value REAL NOT NULL,
                area_unit TEXT NOT NULL,
                area_ha REAL NOT NULL,
                crop_type TEXT NOT NULL,
                baseline_json TEXT,
                project_json TEXT,
                FOREIGN KEY(farm_id) REFERENCES farms(farm_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS management_events (
                event_id TEXT PRIMARY KEY,
                field_id TEXT NOT NULL,
                scenario TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                FOREIGN KEY(field_id) REFERENCES fields(field_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                analysis_id TEXT PRIMARY KEY,
                farm_name TEXT NOT NULL,
                state TEXT NOT NULL,
                analysis_window_json TEXT NOT NULL,
                result_json TEXT NOT NULL,
                email TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_farms_email_created ON farms(email, created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_fields_farm ON fields(farm_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analyses_email_created ON analyses(email, created_at DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC)")


def _loads(value: Optional[str]) -> Any:
    if value is None:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def save_farm(farm_name: str, state: str, country: str = "United States", email: Optional[str] = None) -> str:
    conn = _get_conn()
    farm_id = _new_id("farm_")
    with _lock, conn:
        conn.execute(
            """
            INSERT INTO farms (farm_id, email, farm_name, state, country, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (farm_id, email, farm_name, state, country, _now_iso()),
        )
    return farm_id


def get_farm_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute(
        """
        SELECT farm_id, email, farm_name, state, country, created_at
        FROM farms
        WHERE email = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (email,),
    ).fetchone()
    return dict(row) if row else None


def get_farm(farm_id: str) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute(
        """
        SELECT farm_id, email, farm_name, state, country, created_at
        FROM farms
        WHERE farm_id = ?
        LIMIT 1
        """,
        (farm_id,),
    ).fetchone()
    return dict(row) if row else None


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
    conn = _get_conn()
    field_id = _new_id("field_")
    with _lock, conn:
        conn.execute(
            """
            INSERT INTO fields (
                field_id, farm_id, field_name, latitude, longitude, area_value,
                area_unit, area_ha, crop_type, baseline_json, project_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                field_id,
                farm_id,
                field_name,
                latitude,
                longitude,
                area_value,
                area_unit,
                area_ha,
                crop_type,
                json.dumps(baseline) if baseline is not None else None,
                json.dumps(project) if project is not None else None,
            ),
        )
    return field_id


def get_fields_by_farm(farm_id: str) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT field_id, farm_id, field_name, latitude, longitude, area_value,
               area_unit, area_ha, crop_type, baseline_json, project_json
        FROM fields
        WHERE farm_id = ?
        ORDER BY rowid ASC
        """,
        (farm_id,),
    ).fetchall()

    out: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["baseline"] = _loads(item.pop("baseline_json"))
        item["project"] = _loads(item.pop("project_json"))
        out.append(item)
    return out


def save_events(field_id: str, scenario: str, events: List[Dict[str, Any]]) -> None:
    if not events:
        return
    conn = _get_conn()
    docs = [(_new_id("evt_"), field_id, scenario, json.dumps(e)) for e in events]
    with _lock, conn:
        conn.executemany(
            """
            INSERT INTO management_events (event_id, field_id, scenario, payload_json)
            VALUES (?, ?, ?, ?)
            """,
            docs,
        )


def save_analysis(
    farm_name: str,
    state: str,
    analysis_window: Dict[str, str],
    result: Dict[str, Any],
) -> str:
    conn = _get_conn()
    analysis_id = _new_id("analysis_")
    with _lock, conn:
        conn.execute(
            """
            INSERT INTO analyses (analysis_id, farm_name, state, analysis_window_json, result_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                analysis_id,
                farm_name,
                state,
                json.dumps(analysis_window),
                json.dumps(result),
                _now_iso(),
            ),
        )
    return analysis_id


def update_analysis_result(analysis_id: str, result: Dict[str, Any]) -> None:
    conn = _get_conn()
    with _lock, conn:
        conn.execute(
            "UPDATE analyses SET result_json = ? WHERE analysis_id = ?",
            (json.dumps(result), analysis_id),
        )


def get_analysis(analysis_id: str) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute(
        """
        SELECT analysis_id, farm_name, state, analysis_window_json, result_json, email, created_at
        FROM analyses
        WHERE analysis_id = ?
        LIMIT 1
        """,
        (analysis_id,),
    ).fetchone()
    if not row:
        return None
    item = dict(row)
    item["analysis_window"] = _loads(item.pop("analysis_window_json"))
    item["result"] = _loads(item.pop("result_json"))
    return item


def link_analysis_to_user(analysis_id: str, email: str) -> bool:
    conn = _get_conn()
    with _lock, conn:
        cur = conn.execute(
            "UPDATE analyses SET email = ? WHERE analysis_id = ?",
            (email, analysis_id),
        )
    return cur.rowcount > 0


def get_latest_analysis_for_user(email: str) -> Optional[Dict[str, Any]]:
    conn = _get_conn()
    row = conn.execute(
        """
        SELECT analysis_id, farm_name, state, analysis_window_json, result_json, email, created_at
        FROM analyses
        WHERE email = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (email,),
    ).fetchone()
    if not row:
        return None
    item = dict(row)
    item["analysis_window"] = _loads(item.pop("analysis_window_json"))
    item["result"] = _loads(item.pop("result_json"))
    return item


def list_analyses(limit: int = 50) -> List[Dict[str, Any]]:
    conn = _get_conn()
    rows = conn.execute(
        """
        SELECT analysis_id, farm_name, state, analysis_window_json, created_at
        FROM analyses
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()

    out: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["analysis_window"] = _loads(item.pop("analysis_window_json"))
        out.append(item)
    return out

