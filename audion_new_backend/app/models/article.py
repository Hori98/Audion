"""
Article model - Simplified from existing complex RSS system
Focus on core functionality for beta version
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class Article(Base):
    """Article model - RSS content storage"""

    __tablename__ = "articles"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Core content
    title = Column(String, nullable=False, index=True)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=True)  # Full text if available
    url = Column(Text, nullable=False, unique=True)

    # Metadata
    published_at = Column(DateTime(timezone=True), nullable=False, index=True)
    source_name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True, index=True)  # AI-classified

    # Media
    thumbnail_url = Column(Text, nullable=True)

    # Computed fields
    reading_time = Column(Integer, default=5)  # Estimated minutes
    audio_available = Column(Boolean, default=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# Pydantic schemas
class ArticleBase(BaseModel):
    """Base article schema"""

    title: str
    summary: str
    url: HttpUrl
    source_name: str
    published_at: datetime


class ArticleCreate(ArticleBase):
    """Article creation schema"""

    content: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[HttpUrl] = None
    reading_time: int = 5


class ArticleUpdate(BaseModel):
    """Article update schema"""

    category: Optional[str] = None
    audio_available: bool = False


class ArticleInDB(ArticleBase):
    """Article as stored in database"""

    id: str
    content: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    reading_time: int
    audio_available: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ArticleResponse(ArticleInDB):
    """Article response schema"""

    pass


class ArticleListResponse(BaseModel):
    """Article list with pagination"""

    articles: list[ArticleResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
