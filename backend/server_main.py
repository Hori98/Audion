"""
Audion Backend - Unified Server Entry

This entrypoint aligns the app to the modular architecture:
- Uses centralized DB connection from `config.database`
- Includes all routers from `backend/routers`
- Wires `runtime.shared_state` for AutoPick V2 compatibility
- Provides / and /api/health endpoints, and static file serving
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

from pathlib import Path

# Config and DB
from backend.config.database import connect_to_database, create_database_indexes, is_database_connected, get_database
from backend.config.settings import (
    LOG_LEVEL, LOG_FORMAT, ALLOWED_ORIGINS,
    AUDIO_STORAGE_PATH, PROFILE_IMAGES_PATH,
    OPENAI_API_KEY,
)

# Routers
from backend.routers import routers as all_routers
from backend.routers import autopick_v2 as r_autopick_v2

# Shared runtime state for modules that cannot import server directly
from backend.runtime import shared_state


logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Starting Audion Backend (server_main)...")

    try:
        # Connect DB and create indexes
        _, connected = await connect_to_database()
        if connected:
            await create_database_indexes()
            logging.info("Database setup completed")

        # Wire shared_state for modules that rely on it (e.g., AutoPick V2)
        try:
            shared_state.db = get_database()
            shared_state.db_connected = is_database_connected()
            logging.info(f"shared_state wired (connected={shared_state.db_connected})")
        except Exception as e:
            logging.warning(f"Failed to wire shared_state: {e}")

    except Exception as e:
        logging.error(f"Startup error: {e}")
        logging.info("Continuing with limited functionality")

    yield

    logging.info("Shutting down Audion Backend (server_main)...")


app = FastAPI(
    title="Audion Backend API",
    description="Backend API for the Audion application",
    version="3.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Include all modular routers
for router in all_routers:
    app.include_router(router)

# Include AutoPick V2 router only if OpenAI is configured; otherwise, skip to allow server to boot
try:
    if OPENAI_API_KEY and OPENAI_API_KEY != "your-openai-key":
        app.include_router(r_autopick_v2.router)
    else:
        logging.warning("Skipping AutoPick V2 router: OPENAI_API_KEY not configured")
except Exception as e:
    logging.warning(f"Failed to include AutoPick V2 router: {e}")


# Health checks
@app.get("/api/health", tags=["Health"])
async def api_health():
    return {
        "status": "ok",
        "database_connected": is_database_connected(),
        "version": "3.0.0",
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "message": "Audion Backend (server_main) running",
        "version": "3.0.0",
    }


# Static file serving
@app.get("/audio/{filename}", tags=["Static Files"])
async def serve_audio_file(filename: str):
    path = AUDIO_STORAGE_PATH / filename
    if not path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path, media_type="audio/mpeg")


@app.get("/profile-images/{filename}", tags=["Static Files"])
async def serve_profile_image(filename: str):
    path = PROFILE_IMAGES_PATH / filename
    if not path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile image not found")
    return FileResponse(path, media_type="image/jpeg")
