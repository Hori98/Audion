"""
Subscription router for subscription and plan management APIs.
"""

import logging
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.user import User
from models.subscription import SubscriptionInfo
from services.subscription_service import get_user_subscription_info
from services.auth_service import get_current_user
from utils.errors import handle_database_error, handle_generic_error
security = HTTPBearer()

router = APIRouter(prefix="/api", tags=["Subscription Management"])


@router.get("/user/subscription/info", response_model=SubscriptionInfo)
async def get_subscription_info(current_user: User = Depends(get_current_user)):
    """
    Get comprehensive subscription information for the current user.
    
    Returns:
        - User subscription details (plan, limits, etc.)
        - Current daily usage statistics
        - Plan configuration and description
        - Remaining daily audio creation quota
    """
    try:
        logging.info(f"Getting subscription info for user: {current_user.id}")
        subscription_info = await get_user_subscription_info(current_user.id)
        
        logging.info(f"Successfully retrieved subscription info for user {current_user.id}: "
                    f"plan={subscription_info.subscription.plan}, "
                    f"max_articles={subscription_info.subscription.max_audio_articles}")
        
        return subscription_info
        
    except Exception as e:
        logging.error(f"Error getting subscription info for user {current_user.id}: {e}")
        raise handle_database_error(e, "get subscription information")


@router.get("/user/subscription/limits")
async def get_subscription_limits(current_user: User = Depends(get_current_user)):
    """
    Get subscription limits only (lightweight endpoint).
    
    Returns:
        - Maximum articles per audio
        - Maximum daily audio count
        - Remaining daily quota
    """
    try:
        subscription_info = await get_user_subscription_info(current_user.id)
        
        return {
            "max_audio_articles": subscription_info.subscription.max_audio_articles,
            "max_daily_audio_count": subscription_info.subscription.max_daily_audio_count,
            "remaining_daily_audio": subscription_info.remaining_daily_audio,
            "current_plan": subscription_info.subscription.plan
        }
        
    except Exception as e:
        logging.error(f"Error getting subscription limits for user {current_user.id}: {e}")
        raise handle_generic_error(e, "get subscription limits")


@router.get("/user/subscription/status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """
    Get subscription status summary.
    
    Returns:
        - Plan name
        - Active status
        - Usage summary
    """
    try:
        subscription_info = await get_user_subscription_info(current_user.id)
        
        return {
            "plan": subscription_info.subscription.plan,
            "is_active": True,  # Simplified for now
            "daily_usage": {
                "audio_created_today": subscription_info.daily_usage.audio_count,
                "articles_processed_today": subscription_info.daily_usage.total_articles,
                "remaining_audio_quota": subscription_info.remaining_daily_audio
            },
            "plan_limits": {
                "max_articles_per_audio": subscription_info.subscription.max_audio_articles,
                "max_daily_audio": subscription_info.subscription.max_daily_audio_count
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting subscription status for user {current_user.id}: {e}")
        raise handle_generic_error(e, "get subscription status")