from __future__ import annotations
from pathlib import Path
import os


# -----------------------------
# Project Paths
# -----------------------------
ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"


# -----------------------------
# Weather Defaults
# -----------------------------
DEFAULT_START_DATE = "2024-03-01"
DEFAULT_END_DATE = "2024-03-10"


# -----------------------------
# Emission Proxy Constants (MVP)
# These are placeholders and will be refined
# -----------------------------
TILLAGE_REDUCTION_TCO2E_PER_HA = 0.10
FERTILIZER_REDUCTION_FACTOR = 0.005
IRRIGATION_REDUCTION_TCO2E_PER_HA = 0.02


# -----------------------------
# Future API Keys
# -----------------------------
GOOGLE_EARTH_ENGINE_KEY = os.getenv("GOOGLE_EARTH_ENGINE_KEY", "")
SSURGO_API_URL = "https://sdmdataaccess.nrcs.usda.gov/Tabular/SDMTabularService.asmx"
