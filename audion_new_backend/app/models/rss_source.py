"""
RSS Source models - Pre-configured and user-managed RSS sources
Enhanced RSS reader functionality with categorization
"""

import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, HttpUrl
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PreConfiguredRSSSource(Base):
    """Pre-configured RSS sources available for all users"""
    
    __tablename__ = "preconfigured_rss_sources"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    url = Column(String, nullable=False, unique=True)
    category = Column(String, nullable=False, index=True)
    language = Column(String, default="ja", index=True)  # ja, en, etc.
    country = Column(String, default="JP", index=True)   # JP, US, UK, etc.
    
    # Metadata
    favicon_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    
    # Quality metrics
    popularity_score = Column(Integer, default=0, index=True)
    reliability_score = Column(Integer, default=100)  # 0-100
    
    # Admin management
    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserRSSSource(Base):
    """User's RSS sources (both from pre-configured and custom)"""
    
    __tablename__ = "user_rss_sources"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Reference to pre-configured source (if applicable)
    preconfigured_source_id = Column(
        String, 
        ForeignKey("preconfigured_rss_sources.id"), 
        nullable=True,
        index=True
    )
    
    # Custom source data (for user-added sources)
    custom_name = Column(String, nullable=True)
    custom_url = Column(String, nullable=True)
    custom_category = Column(String, nullable=True)
    
    # User preferences
    is_active = Column(Boolean, default=True, index=True)
    custom_alias = Column(String, nullable=True)  # User can rename source
    notification_enabled = Column(Boolean, default=True)
    
    # Metadata
    last_fetched = Column(DateTime(timezone=True), nullable=True)
    last_article_count = Column(Integer, default=0)
    fetch_error_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="rss_sources")
    preconfigured_source = relationship("PreConfiguredRSSSource")


class RSSCategory(Base):
    """RSS source categories for organization"""
    
    __tablename__ = "rss_categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True, index=True)
    name_ja = Column(String, nullable=True)  # Japanese translation
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)  # Emoji or icon name
    color = Column(String, default="#007bff")  # Hex color
    sort_order = Column(Integer, default=0, index=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Pydantic schemas
class PreConfiguredRSSSourceBase(BaseModel):
    name: str
    description: Optional[str] = None
    url: HttpUrl
    category: str
    language: str = "ja"
    country: str = "JP"


class PreConfiguredRSSSourceCreate(PreConfiguredRSSSourceBase):
    favicon_url: Optional[str] = None
    website_url: Optional[str] = None
    popularity_score: int = 0
    reliability_score: int = 100
    is_featured: bool = False


class PreConfiguredRSSSourceResponse(PreConfiguredRSSSourceBase):
    id: str
    favicon_url: Optional[str] = None
    website_url: Optional[str] = None
    popularity_score: int
    reliability_score: int
    is_active: bool
    is_featured: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserRSSSourceCreate(BaseModel):
    preconfigured_source_id: Optional[str] = None
    custom_name: Optional[str] = None
    custom_url: Optional[HttpUrl] = None
    custom_category: Optional[str] = None
    custom_alias: Optional[str] = None
    notification_enabled: bool = True


class UserRSSSourceResponse(BaseModel):
    id: str
    user_id: str
    preconfigured_source_id: Optional[str] = None
    custom_name: Optional[str] = None
    custom_url: Optional[str] = None
    custom_category: Optional[str] = None
    custom_alias: Optional[str] = None
    is_active: bool
    notification_enabled: bool
    last_fetched: Optional[datetime] = None
    last_article_count: int
    fetch_error_count: int
    created_at: datetime
    
    # Computed fields
    display_name: Optional[str] = None
    display_url: Optional[str] = None
    display_category: Optional[str] = None
    
    class Config:
        from_attributes = True


class RSSCategoryResponse(BaseModel):
    id: str
    name: str
    name_ja: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: str
    sort_order: int
    
    class Config:
        from_attributes = True


class RSSSourceSearchResponse(BaseModel):
    sources: List[PreConfiguredRSSSourceResponse]
    categories: List[RSSCategoryResponse]
    total: int
    page: int
    per_page: int
    has_next: bool