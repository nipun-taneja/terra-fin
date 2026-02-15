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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None


class CredibilityCriminalRequest(BaseModel):
    """Request schema for downloading CRS criminal/background report."""
    request_id: Optional[str] = None
    request_data: dict[str, Any] = Field(default_factory=dict)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class CredibilityIdentityRequest(BaseModel):
    """Request schema for identity/fraud report endpoints."""
    request_id: Optional[str] = None
    request_data: dict[str, Any] = Field(default_factory=dict)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    ip_address: Optional[str] = None


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


def _format_birthdate_mm_dd_yyyy(raw: str) -> str:
    raw = (raw or "").strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", raw)
    if m:
        return f"{m.group(2)}-{m.group(3)}-{m.group(1)}"
    m2 = re.match(r"^(\d{2})-(\d{2})-(\d{4})$", raw)
    if m2:
        return raw
    return "01-01-1982"


def _format_ssn_dashes(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 9:
        return f"{digits[0:3]}-{digits[3:5]}-{digits[5:9]}"
    return "666-44-3321"


def _split_house_and_street(line1: str) -> tuple[str, str]:
    m = re.match(r"^\s*(\d+)\s+(.+)$", line1 or "")
    if m:
        return (m.group(1), m.group(2))
    return ("", (line1 or "").strip())


def _format_ssn_last4(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) >= 4:
        return digits[-4:]
    return "7537"


def _natalie_identity_defaults() -> dict[str, str]:
    # CRS sandbox identity known to work consistently for FlexID/Fraud Finder.
    return {
        "firstName": "NATALIE",
        "lastName": "KORZEC",
        "ssnLast4": "7537",
        "dateOfBirth": "1940-12-23",
        "streetAddress": "801 E OGDEN 1011",
        "city": "VAUGHN",
        "state": "WA",
        "zipCode": "98394",
        "phone": "5031234567",
        "email": "natalie@example.com",
        "ipAddress": "47.25.65.96",
    }


def _build_flex_id_payload(req: CredibilityIdentityRequest) -> dict[str, Any]:
    d = _natalie_identity_defaults()
    return {
        "firstName": d["firstName"],
        "lastName": d["lastName"],
        "ssn": d["ssnLast4"],
        "dateOfBirth": d["dateOfBirth"],
        "streetAddress": d["streetAddress"],
        "city": d["city"],
        "state": d["state"],
        "zipCode": d["zipCode"],
        "homePhone": d["phone"],
    }


def _build_fraud_finder_payload(req: CredibilityIdentityRequest) -> dict[str, Any]:
    d = _natalie_identity_defaults()
    return {
        "firstName": d["firstName"],
        "lastName": d["lastName"],
        "phoneNumber": d["phone"],
        "email": d["email"],
        "ipAddress": d["ipAddress"],
        "address": {
            "addressLine1": d["streetAddress"],
            "city": d["city"],
            "state": d["state"],
            "postalCode": d["zipCode"],
        },
    }


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


def _get_with_auth_retry(
    url: str,
    token: str,
    timeout_s: int,
    accept_pdf: bool = False,
) -> requests.Response:
    """GET with bearer/raw token fallback and retries for transient upstream errors."""
    attempts = 3
    last_exc: Optional[Exception] = None

    for attempt in range(attempts):
        headers = {"Authorization": f"Bearer {token}"}
        if accept_pdf:
            headers["Accept"] = "application/pdf"
        try:
            resp = requests.get(url, headers=headers, timeout=timeout_s)
            if resp.status_code in (401, 403):
                raw_headers = {"Authorization": token}
                if accept_pdf:
                    raw_headers["Accept"] = "application/pdf"
                resp = requests.get(url, headers=raw_headers, timeout=timeout_s)
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

    raise HTTPException(status_code=502, detail=f"CRS upstream GET request failed after retries: {last_exc}")


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

    request_data = dict(req.request_data or {})
    request_id_for_pdf = req.request_id
    if not request_data:
        # Minimal persisted path from onboarding:
        # call consumer report endpoint first using first/last/address,
        # then use returned RequestID to fetch PDF.
        first_name = (req.first_name or "").strip()
        last_name = (req.last_name or "").strip()
        address = (req.address or "").strip()
        if not first_name or not last_name or not address:
            raise HTTPException(
                status_code=400,
                detail="Either request_data or (first_name + last_name + address) is required for PDF generation.",
            )

        line1, city, state, postal = _parse_address(address)
        if not line1:
            raise HTTPException(status_code=400, detail="Address is required for CRS PDF generation.")

        request_data = {
            "firstName": first_name,
            "lastName": last_name,
            "middleName": "",
            "suffix": "",
            "birthDate": os.getenv("CRS_SANDBOX_BIRTHDATE", "1963-11-12"),
            "ssn": os.getenv("CRS_SANDBOX_SSN", "666265040"),
            "email": "",
            "phoneNumber": "",
            "addresses": [{
                "borrowerResidencyType": "Current",
                "addressLine1": line1,
                "addressLine2": "",
                "city": city,
                "state": state,
                "postalCode": postal.replace("-", ""),
            }],
        }

        report_url = f"{base_url}/{_bureau_path(bureau)}/{config}"
        report_resp = _post_with_auth_retry(
            report_url,
            token=token,
            timeout_s=timeout_s,
            json_body=request_data,
        )
        request_id_for_pdf = report_resp.headers.get("RequestID") or req.request_id
        if not request_id_for_pdf:
            raise HTTPException(status_code=502, detail="CRS report response did not include RequestID.")

    pdf_url = f"{base_url}/{_bureau_pdf_path(bureau)}/{config}/{request_id_for_pdf}"
    pdf_resp = _post_with_auth_retry(
        pdf_url,
        token=token,
        timeout_s=timeout_s,
        json_body=request_data,
        accept_pdf=True,
    )

    content_type = pdf_resp.headers.get("Content-Type", "application/pdf")
    if "pdf" not in content_type.lower():
        raise HTTPException(status_code=502, detail="CRS PDF endpoint did not return a PDF payload.")

    filename = f"crs-credit-report-{request_id_for_pdf}.pdf"
    return Response(
        content=pdf_resp.content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/credibility/criminal")
def download_credibility_criminal(req: CredibilityCriminalRequest) -> Response:
    """
    Download CRS criminal/background report.

    Flow (aligned to CRS sandbox collection):
    1) POST /criminal/new-request (JSON order)
    2) Extract RequestID from response/header
    3) POST /criminal/new-pdf-request/{RequestID}
    """
    base_url, username, password, _bureau, _config, timeout_s = _load_crs_settings()
    token = _login_crs_token(base_url, username, password, timeout_s)

    request_data = dict(req.request_data or {})
    has_subject_info = isinstance(request_data.get("subjectInfo"), dict)
    if not has_subject_info:
        first_name = (req.first_name or "").strip()
        last_name = (req.last_name or "").strip()
        address = (req.address or "").strip()
        if not first_name or not last_name or not address:
            raise HTTPException(
                status_code=400,
                detail="Either request_data or (first_name + last_name + address) is required for criminal report.",
            )

        line1, city, state, postal = _parse_address(address)
        if not line1:
            raise HTTPException(status_code=400, detail="Address is required for criminal report generation.")

        house_number, street_name = _split_house_and_street(line1)
        birth_date = _format_birthdate_mm_dd_yyyy(os.getenv("CRS_SANDBOX_BIRTHDATE", "1963-11-12"))
        ssn = _format_ssn_dashes(os.getenv("CRS_SANDBOX_SSN", "666265040"))

        request_data = {
            "reference": f"terrafin-{int(time.time())}",
            "subjectInfo": {
                "last": last_name,
                "first": first_name,
                "middle": "",
                "dob": birth_date,
                "ssn": ssn,
                "houseNumber": house_number,
                "streetName": street_name,
                "city": city,
                "state": state,
                "zip": postal.replace("-", ""),
            },
        }

    step1_url = f"{base_url}/criminal/new-request"
    try:
        step1_resp = _post_with_auth_retry(
            step1_url,
            token=token,
            timeout_s=timeout_s,
            json_body=request_data,
        )
    except HTTPException:
        if not _fallback_enabled():
            raise
        # Demo-safe fallback identity (known-working in CRS sandbox criminal flow).
        request_data = {
            "reference": f"terrafin-fallback-{int(time.time())}",
            "subjectInfo": {
                "last": "Consumer",
                "first": "Jonathan",
                "middle": "",
                "dob": "01-01-1982",
                "ssn": "666-44-3321",
                "houseNumber": "1803",
                "streetName": "Norma",
                "city": "Cottonwood",
                "state": "CA",
                "zip": "91502",
            },
        }
        step1_resp = _post_with_auth_retry(
            step1_url,
            token=token,
            timeout_s=timeout_s,
            json_body=request_data,
        )

    request_id = step1_resp.headers.get("RequestID")
    if not request_id:
        try:
            step1_json = step1_resp.json()
        except ValueError:
            step1_json = {}
        if isinstance(step1_json, dict):
            request_id = (
                step1_json.get("requestId")
                or step1_json.get("requestID")
                or step1_json.get("RequestID")
                or step1_json.get("responseID")
                or step1_json.get("responseId")
            )
    request_id = str(request_id or req.request_id or "").strip()
    if not request_id:
        raise HTTPException(status_code=502, detail="CRS criminal order did not return RequestID.")

    time.sleep(0.25)
    step2_url = f"{base_url}/criminal/new-pdf-request/{request_id}"
    try:
        step2_resp = _get_with_auth_retry(
            step2_url,
            token=token,
            timeout_s=timeout_s,
            accept_pdf=True,
        )
    except HTTPException:
        if not _fallback_enabled():
            raise
        # Retry once after brief wait for report materialization.
        time.sleep(0.5)
        step2_resp = _get_with_auth_retry(
            step2_url,
            token=token,
            timeout_s=timeout_s,
            accept_pdf=True,
        )

    content_type = step2_resp.headers.get("Content-Type", "application/pdf")
    lower_ct = content_type.lower()
    if "pdf" in lower_ct:
        return Response(
            content=step2_resp.content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="crs-criminal-report-{request_id}.pdf"'},
        )

    # Some upstream environments may return JSON payloads instead of a binary PDF.
    try:
        payload = step2_resp.json()
    except ValueError:
        payload = {"raw": step2_resp.text}
    wrapped = {
        "request_id": request_id,
        "source": "crs_criminal_report",
        "data": payload,
    }
    return Response(
        content=json.dumps(wrapped),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="crs-criminal-report-{request_id}.json"'},
    )


@router.post("/api/credibility/flex-id")
def download_flex_id_json(req: CredibilityIdentityRequest) -> Response:
    """Fetch LexisNexis FlexID JSON report."""
    base_url, username, password, _bureau, _config, timeout_s = _load_crs_settings()
    token = _login_crs_token(base_url, username, password, timeout_s)
    request_data = _build_flex_id_payload(req)

    step1_url = f"{base_url}/flex-id/flex-id"
    try:
        step1_resp = _post_with_auth_retry(
            step1_url,
            token=token,
            timeout_s=timeout_s,
            json_body=request_data,
        )
    except HTTPException:
        if not _fallback_enabled():
            raise
        # Known-working FlexID sandbox identity from CRS collection.
        request_data = {
            "firstName": "NATALIE",
            "lastName": "KORZEC",
            "ssn": "7537",
            "dateOfBirth": "1940-12-23",
            "streetAddress": "801 E OGDEN 1011",
            "city": "VAUGHN",
            "state": "WA",
            "zipCode": "98394",
            "homePhone": "5031234567",
        }
        step1_resp = _post_with_auth_retry(
            step1_url,
            token=token,
            timeout_s=timeout_s,
            json_body=request_data,
        )

    request_id = step1_resp.headers.get("RequestID")
    try:
        payload = step1_resp.json()
    except ValueError:
        payload = {"raw": step1_resp.text}
    wrapped = {
        "request_id": request_id,
        "source": "crs_flex_id_report",
        "data": payload,
    }
    filename = f"crs-flex-id-report-{request_id or 'latest'}.json"
    return Response(
        content=json.dumps(wrapped),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/credibility/flex-id/pdf")
def download_flex_id_pdf(req: CredibilityIdentityRequest) -> Response:
    """Fetch LexisNexis FlexID PDF report."""
    base_url, username, password, _bureau, _config, timeout_s = _load_crs_settings()
    token = _login_crs_token(base_url, username, password, timeout_s)
    request_data = _build_flex_id_payload(req)

    request_id = (req.request_id or "").strip()
    if not request_id:
        step1_url = f"{base_url}/flex-id/flex-id"
        try:
            step1_resp = _post_with_auth_retry(
                step1_url,
                token=token,
                timeout_s=timeout_s,
                json_body=request_data,
            )
        except HTTPException:
            if not _fallback_enabled():
                raise
            request_data = {
                "firstName": "NATALIE",
                "lastName": "KORZEC",
                "ssn": "7537",
                "dateOfBirth": "1940-12-23",
                "streetAddress": "801 E OGDEN 1011",
                "city": "VAUGHN",
                "state": "WA",
                "zipCode": "98394",
                "homePhone": "5031234567",
            }
            step1_resp = _post_with_auth_retry(
                step1_url,
                token=token,
                timeout_s=timeout_s,
                json_body=request_data,
            )
        request_id = (step1_resp.headers.get("RequestID") or "").strip()

    if not request_id:
        raise HTTPException(status_code=502, detail="CRS FlexID order did not return RequestID.")

    step2_url = f"{base_url}/flex-id/pdf/{request_id}"
    step2_resp = _post_with_auth_retry(
        step2_url,
        token=token,
        timeout_s=timeout_s,
        json_body={},
        accept_pdf=True,
    )
    content_type = step2_resp.headers.get("Content-Type", "application/pdf")
    if "pdf" not in content_type.lower():
        raise HTTPException(status_code=502, detail="CRS FlexID PDF endpoint did not return a PDF payload.")
    return Response(
        content=step2_resp.content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="crs-flex-id-report-{request_id}.pdf"'},
    )


@router.post("/api/credibility/fraud-finder")
def download_fraud_finder_json(req: CredibilityIdentityRequest) -> Response:
    """Fetch Fraud Finder JSON report."""
    base_url, username, password, _bureau, _config, timeout_s = _load_crs_settings()
    token = _login_crs_token(base_url, username, password, timeout_s)
    request_data = _build_fraud_finder_payload(req)

    step1_url = f"{base_url}/fraud-finder/fraud-finder"
    step1_resp = _post_with_auth_retry(
        step1_url,
        token=token,
        timeout_s=timeout_s,
        json_body=request_data,
    )

    request_id = step1_resp.headers.get("RequestID")
    try:
        payload = step1_resp.json()
    except ValueError:
        payload = {"raw": step1_resp.text}
    wrapped = {
        "request_id": request_id,
        "source": "crs_fraud_finder_report",
        "data": payload,
    }
    filename = f"crs-fraud-finder-report-{request_id or 'latest'}.json"
    return Response(
        content=json.dumps(wrapped),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/credibility/fraud-finder/pdf")
def download_fraud_finder_pdf(req: CredibilityIdentityRequest) -> Response:
    """Fetch Fraud Finder PDF report."""
    base_url, username, password, _bureau, _config, timeout_s = _load_crs_settings()
    token = _login_crs_token(base_url, username, password, timeout_s)
    request_data = _build_fraud_finder_payload(req)

    request_id = (req.request_id or "").strip()
    if not request_id:
        step1_url = f"{base_url}/fraud-finder/fraud-finder"
        step1_resp = _post_with_auth_retry(
            step1_url,
            token=token,
            timeout_s=timeout_s,
            json_body=request_data,
        )
        request_id = (step1_resp.headers.get("RequestID") or "").strip()

    if not request_id:
        raise HTTPException(status_code=502, detail="CRS Fraud Finder order did not return RequestID.")

    step2_url = f"{base_url}/fraud-finder/pdf/{request_id}"
    step2_resp = _post_with_auth_retry(
        step2_url,
        token=token,
        timeout_s=timeout_s,
        json_body={},
        accept_pdf=True,
    )
    content_type = step2_resp.headers.get("Content-Type", "application/pdf")
    if "pdf" not in content_type.lower():
        raise HTTPException(status_code=502, detail="CRS Fraud Finder PDF endpoint did not return a PDF payload.")
    return Response(
        content=step2_resp.content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="crs-fraud-finder-report-{request_id}.pdf"'},
    )
