"""
API v1 router aggregation
Clean separation of endpoints by domain
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, articles, audio, rss_sources

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Include article management endpoints
api_router.include_router(articles.router, tags=["Articles"])

# Include audio generation endpoints
api_router.include_router(audio.router, tags=["Audio Generation"])

# Include RSS source management endpoints
api_router.include_router(rss_sources.router, tags=["RSS Sources"])

# TODO: Add other endpoint routers as they are implemented
# api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
