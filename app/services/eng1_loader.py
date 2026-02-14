from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

ANALYSIS_DIR = Path("data/analyses")


def load_eng1_analysis(analysis_id: str) -> Dict[str, Any]:
    """
    Loads Engineer-1 farm analysis JSON from:
      data/analyses/<analysis_id>.json
    """
    path = ANALYSIS_DIR / f"{analysis_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Eng1 analysis file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))
