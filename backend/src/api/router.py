from fastapi import APIRouter
from src.api.alerts import router as alerts_router
from src.api.health import router as health_router
from src.api.monitor import router as monitor_router

# Core API Router
api_router = APIRouter()

api_router.include_router(monitor_router)
api_router.include_router(alerts_router)
api_router.include_router(health_router)
