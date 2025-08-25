"""
User model - Clean implementation based on NEW_AUDION_REQUIREMENTS.md
Simplified from existing complex user management
"""

import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class SubscriptionTier(str, enum.Enum):
    """Subscription tier enumeration"""

    free = "free"
    premium = "premium"


class User(Base):
    """User model with essential fields only"""

    __tablename__ = "users"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Authentication
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    # Profile
    display_name = Column(String, nullable=True)
    avatar_url = Column(Text, nullable=True)

    # Subscription
    subscription_tier = Column(
        Enum(SubscriptionTier), default=SubscriptionTier.free, nullable=False
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# Pydantic schemas for API
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema"""

    email: EmailStr
    display_name: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema"""

    password: str


class UserUpdate(BaseModel):
    """User update schema"""

    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserInDB(UserBase):
    """User as stored in database"""

    id: str
    subscription_tier: SubscriptionTier
    created_at: datetime
    updated_at: datetime
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    """User response schema (excludes sensitive data)"""

    pass
