"""
RSS-related Pydantic models for RSS source management.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RSSSource(BaseModel):
    """RSS source model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    url: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RSSSourceCreate(BaseModel):
    """Model for creating new RSS sources."""
    name: str
    url: str

class RSSSourceUpdate(BaseModel):
    """Model for updating RSS source settings."""
    is_active: bool

class PresetCategory(BaseModel):
    """Preset RSS category for onboarding."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    display_name: str
    description: str
    icon: str
    color: str
    rss_sources: List[Dict[str, str]]  # [{"name": "TechCrunch", "url": "https://..."}]
    sample_audio_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PresetSource(BaseModel):
    """Individual preset RSS source."""
    name: str
    url: str
    category: str
    category_display_name: str
    description: str
    icon: str
    color: str

class PresetSourceSearch(BaseModel):
    """Model for searching preset sources."""
    query: str
    category: Optional[str] = None

class OnboardRequest(BaseModel):
    """Model for user onboarding requests."""
    selected_categories: List[str]  # category names
    user_preferences: Optional[Dict[str, Any]] = None