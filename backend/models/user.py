"""
User-related Pydantic models for authentication and user management.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class User(BaseModel):
    """User model for authenticated users."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    """Model for user registration requests."""
    email: str
    password: str

class UserLogin(BaseModel):
    """Model for user login requests."""
    email: str
    password: str

class UserProfile(BaseModel):
    """User profile with preferences and interaction history."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    genre_preferences: Dict[str, float] = Field(default_factory=lambda: {
        "Technology": 1.0,
        "Finance": 1.0,
        "Sports": 1.0,
        "Politics": 1.0,
        "Health": 1.0,
        "Entertainment": 1.0,
        "Science": 1.0,
        "Environment": 1.0,
        "Education": 1.0,
        "Travel": 1.0,
        "General": 1.0
    })
    interaction_history: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserInteraction(BaseModel):
    """Model for tracking user interactions with articles and audio."""
    article_id: str
    interaction_type: str  # "liked", "disliked", "created_audio", "skipped", "completed", "saved", "partial_play", "quick_exit"
    genre: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None  # For additional context like play_duration, completion_percentage

class ProfileImageUpload(BaseModel):
    """Model for profile image upload requests."""
    user_id: str
    image_data: str  # base64 encoded image data
    filename: str