from fastapi import APIRouter, HTTPException  # type: ignore[import]
from pydantic import BaseModel  # type: ignore[import]
from typing import Optional, List, Dict, Any
from ..services.storage import (  # type: ignore[import]
    get_farm_by_email, 
    get_latest_analysis_for_user,
    get_fields_by_farm,
    link_analysis_to_user,
    save_farm,
    save_field
)

router = APIRouter(prefix="/api/profile", tags=["profile"])

class ProfileResponse(BaseModel):
    email: str
    farm: Optional[Dict[str, Any]] = None
    fields: List[Dict[str, Any]] = []
    latest_analysis: Optional[Dict[str, Any]] = None

class SaveFarmRequest(BaseModel):
    email: str
    farm: Dict[str, Any]
    fields: List[Dict[str, Any]]

@router.get("/load", response_model=ProfileResponse)
def load_profile(email: str):
    """
    Fetch the latest farm and analysis configuration for a given email.
    Used to restore state for returning users.
    """
    try:
        farm = get_farm_by_email(email)
        fields = []
        if farm:
            fields = get_fields_by_farm(str(farm["farm_id"])) # type: ignore
            
        analysis = get_latest_analysis_for_user(email)
        
        farm_info = dict(farm) if farm else None
        fields_info = [dict(f) for f in fields] if fields else []
        latest_out = dict(analysis) if analysis else None

        return ProfileResponse(**{
            "email": str(email),
            "farm": farm_info,
            "fields": fields_info,
            "latest_analysis": latest_out,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@router.post("/save")
def save_profile_link(email: str, analysis_id: str):
    """
    Explicitly link a recent analysis to a user email.
    """
    try:
        success = link_analysis_to_user(analysis_id, email)
        if not success:
            raise HTTPException(status_code=404, detail="Analysis not found")
        return {"status": "success", "message": f"Analysis {analysis_id} linked to {email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error linking analysis: {e}")

@router.post("/save-farm")
def save_farm_full(req: SaveFarmRequest):
    """
    Save farm and field details for a user.
    """
    try:
        # Save farm linked to email
        farm_id = save_farm(
            req.farm["farm_name"], 
            req.farm["state"], 
            country=req.farm.get("country", "United States"),
            email=req.email
        )
        
        # Save each field linked to this farm
        for f in req.fields:
            area_raw = f.get("area_ha") or f.get("area_value") or 0.0
            save_field(
                farm_id=farm_id,
                field_name=str(f["field_name"]),
                latitude=float(f["latitude"]),
                longitude=float(f["longitude"]),
                area_value=float(f["area_value"]),
                area_unit=str(f["area_unit"]),
                area_ha=float(area_raw),
                crop_type=str(f["crop_type"]),
                baseline=f.get("baseline"),
                project=f.get("project")
            )
            
        return {"status": "success", "farm_id": farm_id, "message": f"Farm and {len(req.fields)} fields saved for {req.email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving farm: {e}")
