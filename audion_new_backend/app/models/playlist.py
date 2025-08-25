"""
Playlist model - Simplified "Listen Later" functionality for beta
Advanced playlist features moved to launch version
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

# Association table for playlist-audio many-to-many relationship
playlist_audio_association = Table(
    "playlist_audio_items",
    Base.metadata,
    Column("playlist_id", String, ForeignKey("playlists.id"), primary_key=True),
    Column("audio_id", String, ForeignKey("audio_contents.id"), primary_key=True),
    Column("position", Integer, nullable=False, default=0),
    Column("added_at", DateTime(timezone=True), server_default=func.now()),
)


class Playlist(Base):
    """Playlist model - Beta version (simplified)"""

    __tablename__ = "playlists"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Ownership
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Content
    name = Column(String, nullable=False, default="Listen Later")
    description = Column(Text, nullable=True)

    # Settings (beta version - keep simple)
    is_default = Column(Boolean, default=False)  # Default "Listen Later" playlist

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", backref="playlists")
    audio_contents = relationship(
        "AudioContent", secondary=playlist_audio_association, backref="playlists"
    )


# Pydantic schemas
class PlaylistBase(BaseModel):
    """Base playlist schema"""

    name: str = "Listen Later"
    description: Optional[str] = None


class PlaylistCreate(PlaylistBase):
    """Playlist creation schema"""

    pass


class PlaylistUpdate(BaseModel):
    """Playlist update schema"""

    name: Optional[str] = None
    description: Optional[str] = None


class PlaylistItemAdd(BaseModel):
    """Add item to playlist"""

    audio_id: str


class PlaylistItemRemove(BaseModel):
    """Remove item from playlist"""

    audio_id: str


class PlaylistInDB(PlaylistBase):
    """Playlist as stored in database"""

    id: str
    user_id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlaylistResponse(PlaylistInDB):
    """Playlist response (public)"""

    audio_count: int = 0  # Computed field


class PlaylistWithAudioResponse(PlaylistResponse):
    """Playlist with audio content"""

    from app.models.audio import AudioContentResponse

    audio_contents: list[AudioContentResponse] = []
