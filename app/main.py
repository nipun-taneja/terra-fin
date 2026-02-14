"""
Main FastAPI application entry point for Terra30 Backend.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.credibility import router as credibility_router
from app.api.farm_analysis import router as farm_analysis_router
from app.api.steps import router as steps_router


app = FastAPI(title="Terra30 Backend (Maize-only)", version="0.1.0")

# Allow your Next.js frontend to call this backend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


app.include_router(credibility_router)
app.include_router(farm_analysis_router)
app.include_router(steps_router)

