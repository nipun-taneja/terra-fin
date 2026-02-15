"""
Main FastAPI application entry point for Terra30 Backend.
"""
from fastapi import FastAPI  # type: ignore[import]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import]

from app.api.routes import router  # type: ignore[import]
from app.api.credibility import router as credibility_router  # type: ignore[import]
from app.api.farm_analysis import router as farm_analysis_router  # type: ignore[import]
from app.api.steps import router as steps_router  # type: ignore[import]
from app.api.profile import router as profile_router  # type: ignore[import]


app = FastAPI(title="Terra30 Backend (Maize-only)", version="0.1.0")

# Allow your Next.js frontend to call this backend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Individual API routers
app.include_router(router)
app.include_router(profile_router)
app.include_router(credibility_router)
app.include_router(farm_analysis_router)
app.include_router(steps_router)


@app.get("/health")
def health():
    """Health check endpoint with MongoDB status."""
    mongo_ok = False
    try:
        from app.services.database import ping  # type: ignore[import]
        mongo_ok = ping()
    except Exception:
        pass
    return {"status": "ok", "mongodb": "connected" if mongo_ok else "not_connected"}
