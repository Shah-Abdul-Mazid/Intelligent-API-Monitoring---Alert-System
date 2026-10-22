import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.core.config import settings
from src.core.logging import logger
from src.database.connection import init_db
from src.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}...")
    init_db()
    logger.info("Application startup complete.")
    yield
    logger.info("Application shutdown.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Intelligent API Monitoring and Alert System with automated anomaly detection.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000
    logger.info(
        f"{request.method} {request.url.path} -> Status: {response.status_code} ({duration:.2f}ms)"
    )
    return response


# Mount API Routes at root (satisfies /monitor & /alerts directly) and under /api
app.include_router(api_router)
app.include_router(api_router, prefix="/api")

# Static frontend mount if built
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
