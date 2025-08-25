"""
Audio content model - Simplified from complex existing system
Focus on core audio generation and playback functionality
"""

import enum
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AudioStatus(str, enum.Enum):
    """Audio generation status"""

    processing = "processing"
    completed = "completed"
    failed = "failed"


class AudioLanguage(str, enum.Enum):
    """Supported audio languages"""

    japanese = "ja"
    english = "en"


class AudioContent(Base):
    """Audio content model"""

    __tablename__ = "audio_contents"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Relationships
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    article_id = Column(String, ForeignKey("articles.id"), nullable=False, index=True)

    # Content
    title = Column(String, nullable=False, index=True)
    script = Column(Text, nullable=False)  # AI-generated script
    audio_url = Column(Text, nullable=True)  # S3 URL after generation

    # Audio properties
    duration = Column(Integer, default=0)  # Duration in seconds
    language = Column(Enum(AudioLanguage), default=AudioLanguage.japanese)
    voice_type = Column(String, default="alloy")  # OpenAI TTS voice

    # Status
    status = Column(Enum(AudioStatus), default=AudioStatus.processing, index=True)

    # Analytics
    play_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", backref="audio_contents")
    article = relationship("Article", backref="audio_contents")


# Pydantic schemas
class AudioContentBase(BaseModel):
    """Base audio content schema"""

    title: str
    language: AudioLanguage = AudioLanguage.japanese
    voice_type: str = "alloy"


class AudioCreateRequest(BaseModel):
    """Audio creation request"""

    article_id: str
    title: Optional[str] = None
    language: AudioLanguage = AudioLanguage.japanese
    voice_type: str = "alloy"


class AudioGenerationResponse(BaseModel):
    """Audio generation response (immediate)"""

    id: str
    status: AudioStatus
    message: str
    estimated_duration: Optional[int] = None


class AudioContentInDB(AudioContentBase):
    """Audio content as stored in database"""

    id: str
    user_id: str
    article_id: str
    script: str
    audio_url: Optional[str] = None
    duration: int
    status: AudioStatus
    play_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AudioContentResponse(AudioContentInDB):
    """Audio content response (public)"""

    pass


class AudioLibraryResponse(BaseModel):
    """User's audio library"""

    audio_contents: list[AudioContentResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
