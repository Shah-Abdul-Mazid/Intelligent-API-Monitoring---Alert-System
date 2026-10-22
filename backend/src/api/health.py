from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.core.config import settings
from src.database.connection import get_db

router = APIRouter(tags=["Health & AI Config"])


class AIConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": db_status,
        "ai_integration": "OpenAI API",
        "ai_model": settings.OPENAI_MODEL,
        "ai_key_configured": bool(settings.OPENAI_API_KEY),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/ai/config")
def get_ai_config():
    masked_key = ""
    if settings.OPENAI_API_KEY:
        masked_key = settings.OPENAI_API_KEY[:7] + "..." + settings.OPENAI_API_KEY[-4:]
    return {
        "provider": "OpenAI",
        "model": settings.OPENAI_MODEL,
        "has_api_key": bool(settings.OPENAI_API_KEY),
        "masked_key": masked_key,
        "status": "Live API Mode" if settings.OPENAI_API_KEY else "SRE Engine (Ready for Key)",
    }


@router.post("/ai/config")
def update_ai_config(payload: AIConfigUpdate):
    if payload.api_key is not None:
        settings.OPENAI_API_KEY = payload.api_key.strip()
    if payload.model:
        settings.OPENAI_MODEL = payload.model.strip()

    return {
        "success": True,
        "provider": "OpenAI",
        "model": settings.OPENAI_MODEL,
        "has_api_key": bool(settings.OPENAI_API_KEY),
        "status": "Live API Mode" if settings.OPENAI_API_KEY else "SRE Engine (Ready for Key)",
    }
