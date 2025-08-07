"""
Audio-related Pydantic models for audio creation and management.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AudioCreation(BaseModel):
    """Model for audio podcast creations."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    article_ids: List[str]
    article_titles: List[str]
    audio_url: str
    duration: int
    script: Optional[str] = None
    chapters: Optional[List[Dict[str, Any]]] = None  # [{"title": "Article Title", "start_time": 0, "end_time": 30000, "original_url": "https://..."}] (times in milliseconds)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AudioCreationRequest(BaseModel):
    """Request model for creating audio from articles."""
    article_ids: List[str]
    article_titles: List[str]
    custom_title: Optional[str] = None
    article_urls: Optional[List[str]] = None  # Add URLs for auto-pick articles

class RenameRequest(BaseModel):
    """Request model for renaming audio files."""
    new_title: str

class Playlist(BaseModel):
    """User playlist model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    audio_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False
    cover_image_url: Optional[str] = None

class PlaylistCreate(BaseModel):
    """Request model for creating playlists."""
    name: str
    description: Optional[str] = ""
    is_public: bool = False

class PlaylistUpdate(BaseModel):
    """Request model for updating playlists."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class PlaylistAddAudio(BaseModel):
    """Request model for adding audio to playlists."""
    audio_ids: List[str]

class Album(BaseModel):
    """User album model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # creator of the album
    name: str
    description: Optional[str] = ""
    audio_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False
    cover_image_url: Optional[str] = None
    tags: List[str] = []  # for categorization (e.g., "daily news", "tech news", "series")
    series_info: Optional[Dict[str, Any]] = None  # for series metadata like episode number, season

class AlbumCreate(BaseModel):
    """Request model for creating albums."""
    name: str
    description: Optional[str] = ""
    is_public: bool = False
    tags: List[str] = []

class AlbumUpdate(BaseModel):
    """Request model for updating albums."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

class AlbumAddAudio(BaseModel):
    """Request model for adding audio to albums."""
    audio_ids: List[str]

class DownloadedAudio(BaseModel):
    """Model for downloaded audio tracking."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    audio_id: str
    downloaded_at: datetime = Field(default_factory=datetime.utcnow)
    local_file_path: Optional[str] = None
    file_size: Optional[int] = None
    download_quality: str = "standard"  # standard, high
    auto_downloaded: bool = True  # True if auto-downloaded on creation