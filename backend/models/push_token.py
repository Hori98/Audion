"""
Push token models for managing device-specific push notification tokens.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PushTokenPayload(BaseModel):
    """Request model for registering a push notification token."""
    token: str = Field(..., description="The Expo push token for this device")


class PushToken(BaseModel):
    """Push token model stored in database."""
    id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    user_id: str = Field(..., description="User ID this token belongs to")
    token: str = Field(..., description="The actual push token")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    device_info: Optional[dict] = Field(default=None, description="Optional device information")


class PushTokenResponse(BaseModel):
    """Response model for push token registration."""
    status: str
    message: str
    token_id: Optional[str] = None