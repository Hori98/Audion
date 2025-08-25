"""
API v1 router aggregation
Clean separation of endpoints by domain
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# TODO: Add other endpoint routers as they are implemented
# api_router.include_router(articles.router, prefix="/articles", tags=["Articles"])
# api_router.include_router(audio.router, prefix="/audio", tags=["Audio Generation"])
# api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
