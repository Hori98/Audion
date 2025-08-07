"""
Pydantic models for the Audion backend application.
"""

from .user import User, UserCreate, UserLogin, UserProfile, UserInteraction, ProfileImageUpload
from .rss import RSSSource, RSSSourceCreate, RSSSourceUpdate, PresetCategory, PresetSource, PresetSourceSearch, OnboardRequest
from .article import Article, AutoPickRequest, MisreadingFeedback, GENRE_KEYWORDS
from .audio import (
    AudioCreation, AudioCreationRequest, RenameRequest,
    Playlist, PlaylistCreate, PlaylistUpdate, PlaylistAddAudio,
    Album, AlbumCreate, AlbumUpdate, AlbumAddAudio,
    DownloadedAudio
)
from .common import StandardResponse, ErrorResponse, TokenResponse, HealthResponse

__all__ = [
    # User models
    "User", "UserCreate", "UserLogin", "UserProfile", "UserInteraction", "ProfileImageUpload",
    
    # RSS models
    "RSSSource", "RSSSourceCreate", "RSSSourceUpdate", "PresetCategory", "PresetSource", "PresetSourceSearch", "OnboardRequest",
    
    # Article models
    "Article", "AutoPickRequest", "MisreadingFeedback", "GENRE_KEYWORDS",
    
    # Audio models
    "AudioCreation", "AudioCreationRequest", "RenameRequest",
    "Playlist", "PlaylistCreate", "PlaylistUpdate", "PlaylistAddAudio",
    "Album", "AlbumCreate", "AlbumUpdate", "AlbumAddAudio",
    "DownloadedAudio",
    
    # Common models
    "StandardResponse", "ErrorResponse", "TokenResponse", "HealthResponse"
]