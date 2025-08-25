"""
Subscription-related Pydantic models for subscription and plan management.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum

class SubscriptionTier(str, Enum):
    """Subscription tier enumeration."""
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"

class UserSubscription(BaseModel):
    """User subscription information."""
    id: str
    user_id: str
    plan: str
    max_daily_audio_count: int
    max_audio_articles: int
    created_at: str
    expires_at: Optional[str] = None

class DailyUsage(BaseModel):
    """Daily usage tracking."""
    id: str
    user_id: str
    date: str
    audio_count: int
    total_articles: int

class PlanConfig(BaseModel):
    """Plan configuration details."""
    plan: str
    max_daily_audio_count: int
    max_audio_articles: int
    description: str

class SubscriptionInfo(BaseModel):
    """Complete subscription information response."""
    subscription: UserSubscription
    daily_usage: DailyUsage
    plan_config: PlanConfig
    remaining_daily_audio: int

class PlanLimits(BaseModel):
    """Plan limits configuration."""
    max_articles_per_audio: int
    max_daily_audio: int

    @classmethod
    def get_limits(cls, tier: SubscriptionTier) -> "PlanLimits":
        """Get limits for a specific subscription tier."""
        limits_map = {
            SubscriptionTier.FREE: cls(max_articles_per_audio=3, max_daily_audio=3),
            SubscriptionTier.BASIC: cls(max_articles_per_audio=10, max_daily_audio=10),
            SubscriptionTier.PREMIUM: cls(max_articles_per_audio=20, max_daily_audio=30),
        }
        return limits_map.get(tier, limits_map[SubscriptionTier.FREE])