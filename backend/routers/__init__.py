"""
API routers for the Audion backend application.
"""

from .auth import router as auth_router
from .rss import router as rss_router
from .articles import router as articles_router
from .audio import router as audio_router
from .user import router as user_router

# Export all routers for easy import in main server
routers = [
    auth_router,
    rss_router,
    articles_router,
    audio_router,
    user_router
]

__all__ = ["routers", "auth_router", "rss_router", "articles_router", "audio_router", "user_router"]