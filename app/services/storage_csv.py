from __future__ import annotations
import csv
from pathlib import Path
from typing import Dict, List

def append_row(csv_path: str | Path, row: Dict, fieldnames: List[str]) -> None:
    csv_path = Path(csv_path)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = csv_path.exists()

    with csv_path.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in fieldnames})

def read_rows(csv_path: str | Path) -> List[Dict[str, str]]:
    csv_path = Path(csv_path)
    if not csv_path.exists():
        return []

    # utf-8-sig removes BOM if present
    with csv_path.open("r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        out: List[Dict[str, str]] = []
        for row in reader:
            # Normalize keys: strip whitespace and remove accidental BOM
            clean = {}
            for k, v in row.items():
                if k is None:
                    continue
                ck = k.strip().lstrip("\ufeff")
                clean[ck] = v
            out.append(clean)
        return out
