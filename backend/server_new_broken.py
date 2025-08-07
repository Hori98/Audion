"""
Refactored Audion Backend Server - Modular Architecture
FastAPI server with separated concerns and clean architecture.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

# Import configuration and database
from config.database import connect_to_database, create_database_indexes
from config.settings import (
    LOG_LEVEL, LOG_FORMAT, ALLOWED_ORIGINS, 
    AUDIO_STORAGE_PATH, PROFILE_IMAGES_PATH
)

# Import all routers
from routers import routers

# Import services for background tasks
from services.audio_service import cleanup_expired_deleted_audio

# Configure logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events.
    """
    # Startup
    logging.info("Starting Audion Backend Server...")
    
    try:
        # Connect to database
        db, connected = await connect_to_database()
        
        if connected:
            # Create database indexes
            await create_database_indexes()
            logging.info("Database setup completed successfully")
            
            # Run cleanup tasks (non-blocking)
            try:
                await cleanup_expired_deleted_audio()
                logging.info("Startup cleanup tasks completed")
            except Exception as e:
                logging.warning(f"Startup cleanup failed: {e}")
        else:
            logging.warning("Server starting in limited mode without database")
    
    except Exception as e:
        logging.error(f"Startup error: {e}")
        logging.info("Server will continue with limited functionality")
    
    logging.info("Audion Backend Server started successfully")
    
    yield
    
    # Shutdown
    logging.info("Shutting down Audion Backend Server...")

# Create FastAPI application
app = FastAPI(
    title="Audion Backend API",
    description="Backend API for the Audion podcast generation application",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include all routers
for router in routers:
    app.include_router(router)

# Health check endpoints
@app.get("/api/health", tags=["Health Check"])
async def health_check():
    """API health check endpoint."""
    from config.database import is_database_connected
    
    return {
        "status": "ok",
        "database_connected": is_database_connected(),
        "version": "2.0.0"
    }

@app.get("/", tags=["Health Check"])
async def read_root():
    """Root endpoint with welcome message."""
    return {
        "status": "ok", 
        "message": "Welcome to Audion Backend V2 - Modular Architecture!",
        "version": "2.0.0"
    }

# Static file serving endpoints
@app.get("/audio/{filename}", tags=["Static Files"])
async def serve_audio_file(filename: str):
    """Serve audio files from local storage."""
    audio_path = AUDIO_STORAGE_PATH / filename
    
    if not audio_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(audio_path, media_type="audio/mpeg")

@app.get("/profile-images/{filename}", tags=["Static Files"])
async def serve_profile_image(filename: str):
    """Serve profile images from local storage."""
    image_path = PROFILE_IMAGES_PATH / filename
    
    if not image_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile image not found")
    
    return FileResponse(image_path, media_type="image/jpeg")

# Additional utility endpoints
@app.get("/api/system/info", tags=["System"])
async def get_system_info():
    """Get system information and statistics."""
    try:
        from services.storage_service import get_storage_stats
        from services.rss_service import get_cache_stats
        from config.database import is_database_connected
        
        return {
            "status": "ok",
            "database_connected": is_database_connected(),
            "storage_stats": get_storage_stats(),
            "cache_stats": get_cache_stats(),
            "version": "2.0.0"
        }
    except Exception as e:
        logging.error(f"Error getting system info: {e}")
        return {
            "status": "error",
            "message": "Failed to get system information"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server_new:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )