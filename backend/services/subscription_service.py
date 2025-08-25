"""
Subscription service for managing user subscriptions and plan information.
"""

import logging
from datetime import datetime, date
from typing import Optional

from models.subscription import (
    SubscriptionInfo, UserSubscription, DailyUsage, PlanConfig, 
    SubscriptionTier, PlanLimits
)
async def get_user_subscription_info(user_id: str) -> SubscriptionInfo:
    """
    Get comprehensive subscription information for a user.
    Returns subscription details, usage, and plan configuration.
    """
    try:
        # Direct MongoDB connection to avoid dependency issues
        from motor.motor_asyncio import AsyncIOMotorClient
        
        client = AsyncIOMotorClient('mongodb://localhost:27017/')
        db = client['audion_database']
        
        # Get or create user subscription
        subscription_data = await get_or_create_subscription(db, user_id)
        
        # Get or create daily usage
        usage_data = await get_or_create_daily_usage(db, user_id)
        
        # Get plan configuration
        plan_config = get_plan_configuration(subscription_data["plan"])
        
        # Calculate remaining daily audio
        remaining_daily = max(0, subscription_data["max_daily_audio_count"] - usage_data["audio_count"])
        
        # Close database connection
        client.close()
        
        return SubscriptionInfo(
            subscription=UserSubscription(**subscription_data),
            daily_usage=DailyUsage(**usage_data),
            plan_config=plan_config,
            remaining_daily_audio=remaining_daily
        )
        
    except Exception as e:
        logging.error(f"Error getting subscription info for user {user_id}: {e}")
        # Return default free plan on error
        return get_default_subscription_info(user_id)


async def get_or_create_subscription(db, user_id: str) -> dict:
    """Get existing subscription or create default free plan."""
    try:
        # Try to find existing subscription
        subscription = await db.subscriptions.find_one({"user_id": user_id})
        
        if subscription:
            # Convert ObjectId to string for response
            subscription["id"] = str(subscription["_id"])
            del subscription["_id"]
            
            # Ensure all required fields exist
            if "created_at" not in subscription:
                subscription["created_at"] = datetime.utcnow().isoformat()
            if "expires_at" not in subscription:
                subscription["expires_at"] = None
            
            return subscription
            
        # Create default free subscription
        limits = PlanLimits.get_limits(SubscriptionTier.FREE)
        default_subscription = {
            "user_id": user_id,
            "plan": SubscriptionTier.FREE,
            "max_daily_audio_count": limits.max_daily_audio,
            "max_audio_articles": limits.max_articles_per_audio,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None
        }
        
        # Insert and return
        result = await db.subscriptions.insert_one(default_subscription)
        default_subscription["id"] = str(result.inserted_id)
        
        return default_subscription
        
    except Exception as e:
        logging.error(f"Error in get_or_create_subscription: {e}")
        # Return in-memory default
        limits = PlanLimits.get_limits(SubscriptionTier.FREE)
        return {
            "id": "default",
            "user_id": user_id,
            "plan": SubscriptionTier.FREE,
            "max_daily_audio_count": limits.max_daily_audio,
            "max_audio_articles": limits.max_articles_per_audio,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None
        }


async def get_or_create_daily_usage(db, user_id: str) -> dict:
    """Get today's usage or create new record."""
    try:
        today = date.today().isoformat()
        
        # Try to find today's usage
        usage = await db.daily_usage.find_one({
            "user_id": user_id,
            "date": today
        })
        
        if usage:
            usage["id"] = str(usage["_id"])
            del usage["_id"]
            return usage
            
        # Create today's usage record
        default_usage = {
            "user_id": user_id,
            "date": today,
            "audio_count": 0,
            "total_articles": 0
        }
        
        result = await db.daily_usage.insert_one(default_usage)
        default_usage["id"] = str(result.inserted_id)
        
        return default_usage
        
    except Exception as e:
        logging.error(f"Error in get_or_create_daily_usage: {e}")
        # Return in-memory default
        return {
            "id": "default",
            "user_id": user_id,
            "date": date.today().isoformat(),
            "audio_count": 0,
            "total_articles": 0
        }


def get_plan_configuration(plan: str) -> PlanConfig:
    """Get configuration for a specific plan."""
    try:
        tier = SubscriptionTier(plan.lower())
    except ValueError:
        tier = SubscriptionTier.FREE
        
    limits = PlanLimits.get_limits(tier)
    
    descriptions = {
        SubscriptionTier.FREE: "Free plan with basic features",
        SubscriptionTier.BASIC: "Basic plan with enhanced features",
        SubscriptionTier.PREMIUM: "Premium plan with all features"
    }
    
    return PlanConfig(
        plan=tier.value,
        max_daily_audio_count=limits.max_daily_audio,
        max_audio_articles=limits.max_articles_per_audio,
        description=descriptions.get(tier, descriptions[SubscriptionTier.FREE])
    )


def get_default_subscription_info(user_id: str) -> SubscriptionInfo:
    """Get default subscription info for error cases."""
    limits = PlanLimits.get_limits(SubscriptionTier.FREE)
    today = date.today().isoformat()
    now = datetime.utcnow().isoformat()
    
    return SubscriptionInfo(
        subscription=UserSubscription(
            id="default",
            user_id=user_id,
            plan=SubscriptionTier.FREE,
            max_daily_audio_count=limits.max_daily_audio,
            max_audio_articles=limits.max_articles_per_audio,
            created_at=now
        ),
        daily_usage=DailyUsage(
            id="default",
            user_id=user_id,
            date=today,
            audio_count=0,
            total_articles=0
        ),
        plan_config=get_plan_configuration(SubscriptionTier.FREE),
        remaining_daily_audio=limits.max_daily_audio
    )


async def update_daily_usage(user_id: str, audio_created: bool = False, articles_processed: int = 0):
    """Update user's daily usage statistics."""
    try:
        db = get_database()
        today = date.today().isoformat()
        
        update_data = {}
        if audio_created:
            update_data["$inc"] = {"audio_count": 1}
        if articles_processed > 0:
            update_data.setdefault("$inc", {})["total_articles"] = articles_processed
            
        if update_data:
            await db.daily_usage.update_one(
                {"user_id": user_id, "date": today},
                update_data,
                upsert=True
            )
            logging.info(f"Updated daily usage for user {user_id}: {update_data}")
            
    except Exception as e:
        logging.error(f"Error updating daily usage for user {user_id}: {e}")