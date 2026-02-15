"""Credibility API router with CRS login + report fetch integration."""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Optional, List, Dict

import requests  # type: ignore[import]
from fastapi import APIRouter, HTTPException, Response  # type: ignore[import]
from pydantic import BaseModel, Field  # type: ignore[import]
from dotenv import load_dotenv  # type: ignore[import]

router = APIRouter()
load_dotenv()
CACHE_PATH = Path("data/crs_demo_cache.json")


class CredibilityRequest(BaseModel):
    """Request schema for checking farmer credibility."""
    farmer_name: str = Field(..., min_length=1)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = None
    farm_id: Optional[str] = None


class CredibilityResponse(BaseModel):
    """Response schema for farmer credibility check."""
    credible: bool
    score: float  # 0..1
    flags: List[str]
    request_id: Optional[str] = None
    report: Optional[Dict[str, Any]] = None


class CredibilityPdfRequest(BaseModel):
    """Request schema for downloading CRS PDF report by RequestID."""
    request_id: str = Field(..., min_length=1)
    request_data: dict[str, Any] = Field(default_factory=dict)


def _fallback_enabled() -> bool:
    return os.getenv("CRS_ENABLE_DEMO_FALLBACK", "true").strip().lower() in {"1", "true", "yes", "on"}


def _cache_key(first_name: str, last_name: str, address: str) -> str:
    return f"{first_name.strip().lower()}|{last_name.strip().lower()}|{address.strip().lower()}"


def _read_demo_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _write_demo_cache(payload: dict[str, Any]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(payload), encoding="utf-8")


def _save_cached_response(key: str, response: CredibilityResponse) -> None:
    cache = _read_demo_cache()
    cache[key] = response.model_dump()
    # Keep a global last-success backup in case key lookup misses.
    cache["__last_success__"] = response.model_dump()
    _write_demo_cache(cache)


def _load_cached_response(key: str) -> Optional[CredibilityResponse]:
    cache = _read_demo_cache()
    raw = cache.get(key) or cache.get("__last_success__")
    if not isinstance(raw, dict):
        return None
    try:
        return CredibilityResponse(**raw)
    except Exception:
        return None


def _synthetic_demo_response(
    first_name: str,
    last_name: str,
    line1: str,
    city: str,
    state: str,
    postal: str,
    req: CredibilityRequest,
) -> CredibilityResponse:
    now_id = f"fallback-{int(time.time())}"
    report = {
        "requestData": {
            "firstName": first_name,
            "lastName": last_name,
            "middleName": "",
            "suffix": "",
            "birthDate": os.getenv("CRS_SANDBOX_BIRTHDATE", "1963-11-12"),
            "ssn": os.getenv("CRS_SANDBOX_SSN", "666265040"),
            "email": req.email or "",
            "phoneNumber": req.phone or "",
            "addresses": [{
                "borrowerResidencyType": "Current",
                "addressLine1": line1,
                "addressLine2": "",
                "city": city,
                "state": state,
                "postalCode": postal.replace("-", ""),
            }],
        },
        "repositoryIncluded": {"experian": True, "equifax": False, "transunion": False},
        "scores": [{
            "modelName": "VantageScore 4.0",
            "modelNameType": "V4",
            "sourceType": "Experian",
            "scoreValue": "700",
            "scoreMaximumValue": "850",
            "scoreMinimumValue": "300",
        }],
        "inquiries": [],
        "tradelines": [],
        "publicRecords": [],
    }
    return CredibilityResponse(
        credible=True,
        score=0.88,
        flags=["demo_fallback_used_crs_temporarily_unavailable"],
        request_id=now_id,
        report=report,
    )


def _parse_address(address: Optional[str]) -> tuple[str, str, str, str]:
    """Parse a single-line US address into address line + city + state + zip."""
    raw = (address or "").strip()
    if not raw:
        return ("", "", "", "")

    # Expected shape: "123 Main St, Dallas, TX 75201"
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if len(parts) >= 3:
        line1 = parts[0]
        city = parts[1]
        state_zip = parts[2]
        match = re.search(r"([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)", state_zip)
        if match:
            return (line1, city, match.group(1).upper(), match.group(2))
        if len(state_zip) == 2:
            return (line1, city, state_zip.upper(), "")

    # Fallback: treat whole input as line1.
    return (raw, "", "", "")


def _bureau_path(bureau: str) -> str:
    key = bureau.strip().lower()
    if key == "equifax":
        return "equifax/credit-report/standard"
    if key == "transunion":
        return "transunion/credit-report/standard"
    return "experian/credit-profile/credit-report/standard"


def _bureau_pdf_path(bureau: str) -> str:
    key = bureau.strip().lower()
    if key == "equifax":
        return "equifax/standard-credit-report/pdf"
    if key == "transunion":
        return "transunion/standard-credit-report/pdf"
    return "experian/credit-profile/standard-credit-report/pdf"


def _load_crs_settings() -> tuple[str, str, str, str, str, int]:
    """Load required CRS settings from environment."""
    base_url = os.getenv("CRS_BASE_URL", "").rstrip("/")
    username = os.getenv("CRS_USERNAME") or ""
    password = os.getenv("CRS_PASSWORD") or ""
    bureau = os.getenv("CRS_BUREAU", "experian")
    config = os.getenv("CRS_SANDBOX_CONFIG", "exp-prequal-vantage4")
    timeout_s = int(os.getenv("CRS_TIMEOUT_SECONDS", "30"))

    if not base_url or not username or not password:
        raise HTTPException(
            status_code=500,
            detail="CRS is not configured. Set CRS_BASE_URL, CRS_USERNAME, CRS_PASSWORD."
        )
    return base_url, username, password, bureau, config, timeout_s


def _login_crs_token(base_url: str, username: str, password: str, timeout_s: int) -> str:
    """Authenticate with CRS and return JWT token."""
    try:
        login_resp = requests.post(
            f"{base_url}/users/login",
            json={"username": username, "password": password},
            timeout=timeout_s,
        )
        login_resp.raise_for_status()
        login_data = login_resp.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"CRS login failed: {exc}") from exc

    token = login_data.get("token")
    if not token:
        raise HTTPException(status_code=502, detail="CRS login succeeded but token missing.")
    return token


def _post_with_auth_retry(
    url: str,
    token: str,
    timeout_s: int,
    json_body: dict[str, Any],
    accept_pdf: bool = False,
) -> requests.Response:
    """POST with bearer/raw token fallback and retries for transient upstream errors."""
    attempts = 3
    last_exc: Optional[Exception] = None

    for attempt in range(attempts):
        headers = {"Authorization": f"Bearer {token}"}
        if accept_pdf:
            headers["Accept"] = "application/pdf"
        try:
            resp = requests.post(url, json=json_body, headers=headers, timeout=timeout_s)
            if resp.status_code in (401, 403):
                raw_headers = {"Authorization": token}
                if accept_pdf:
                    raw_headers["Accept"] = "application/pdf"
                resp = requests.post(url, json=json_body, headers=raw_headers, timeout=timeout_s)
            # Retry transient upstream 5xx
            if resp.status_code >= 500 and attempt < attempts - 1:
                time.sleep(0.5 * (attempt + 1))
                continue
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < attempts - 1:
                time.sleep(0.5 * (attempt + 1))
                continue
            break

    raise HTTPException(status_code=502, detail=f"CRS upstream request failed after retries: {last_exc}")


@router.post("/api/credibility/check", response_model=CredibilityResponse)
def check_credibility(req: CredibilityRequest) -> CredibilityResponse:
    """Check credibility by logging into CRS and pulling a sandbox credit report."""
    base_url, username, password, bureau, config, timeout_s = _load_crs_settings()

    # Sandbox identity defaults (required by bureau APIs).
    sandbox_birth_date = os.getenv("CRS_SANDBOX_BIRTHDATE", "1963-11-12")
    sandbox_ssn = os.getenv("CRS_SANDBOX_SSN", "666265040")

    first_name = (req.first_name or req.farmer_name.split(" ")[0]).strip()
    last_name = (req.last_name or req.farmer_name.replace(first_name, "", 1)).strip()
    line1, city, state, postal = _parse_address(req.address or req.country)

    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First and last name are required.")

    if not line1:
        raise HTTPException(status_code=400, detail="Address is required.")

    report_payload = {
        "firstName": first_name,
        "lastName": last_name,
        "middleName": "",
        "suffix": "",
        "birthDate": sandbox_birth_date,
        "ssn": sandbox_ssn,
        "email": req.email,
        "phoneNumber": req.phone,
        "addresses": [{
            "borrowerResidencyType": "Current",
            "addressLine1": line1,
            "addressLine2": "",
            "city": city,
            "state": state,
            "postalCode": postal.replace("-", ""),
        }],
    }

    cache_key = _cache_key(first_name, last_name, req.address or req.country or "")

    try:
        token = _login_crs_token(base_url, username, password, timeout_s)
        report_url = f"{base_url}/{_bureau_path(bureau)}/{config}"
        report_resp = _post_with_auth_retry(
            report_url,
            token=token,
            timeout_s=timeout_s,
            json_body=report_payload,
        )

        report_data = report_resp.json()
        request_id = report_resp.headers.get("RequestID")

        flags: List[str] = []
        if not report_data:
            flags.append("empty_report")
        score = 0.9 if request_id else 0.8

        live_response = CredibilityResponse(
            credible=len(flags) == 0,
            score=score,
            flags=flags,
            request_id=request_id,
            report=report_data,
        )
        _save_cached_response(cache_key, live_response)
        return live_response
    except HTTPException as exc:
        if not _fallback_enabled():
            raise

        cached = _load_cached_response(cache_key)
        if cached:
            cached.flags = list(cached.flags) + ["demo_fallback_used_cached_response"]
            return cached

        return _synthetic_demo_response(first_name, last_name, line1, city, state, postal, req)


@router.post("/api/credibility/pdf")
def download_credibility_pdf(req: CredibilityPdfRequest) -> Response:
    """Download CRS PDF report using RequestID and original request payload."""
    base_url, username, password, bureau, config, timeout_s = _load_crs_settings()
    token = _login_crs_token(base_url, username, password, timeout_s)

    if not req.request_data:
        raise HTTPException(status_code=400, detail="request_data is required to generate PDF.")

    pdf_url = f"{base_url}/{_bureau_pdf_path(bureau)}/{config}/{req.request_id}"
    pdf_resp = _post_with_auth_retry(
        pdf_url,
        token=token,
        timeout_s=timeout_s,
        json_body=req.request_data,
        accept_pdf=True,
    )

    content_type = pdf_resp.headers.get("Content-Type", "application/pdf")
    if "pdf" not in content_type.lower():
        raise HTTPException(status_code=502, detail="CRS PDF endpoint did not return a PDF payload.")

    filename = f"crs-credit-report-{req.request_id}.pdf"
    return Response(
        content=pdf_resp.content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
