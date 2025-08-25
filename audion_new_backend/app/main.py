"""
New Audion Backend - Clean FastAPI Application
Modern architecture with proper separation of concerns
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


# FastAPI application instance
app = FastAPI(
    title="New Audion Backend",
    version=settings.app_version,
    description="Clean rewrite of Audion backend with modern FastAPI architecture",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "New Audion Backend",
        "version": settings.app_version,
        "status": "healthy",
        "environment": settings.app_env,
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.app_env,
        "database": "connected",  # TODO: Add actual DB health check
        "services": {
            "openai": "configured" if settings.openai_api_key else "not configured",
            "aws_s3": "configured" if settings.aws_access_key_id else "not configured",
            "redis": "configured",
        },
    }
