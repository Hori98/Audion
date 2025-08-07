"""
User router for user profile, preferences, and account management.
"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends

from models.user import User, UserProfile, UserInteraction
from models.rss import OnboardRequest, PresetCategory
from models.common import StandardResponse
from services.auth_service import get_current_user, delete_user
from services.user_service import (
    get_or_create_user_profile, get_user_insights, 
    initialize_user_with_onboard_preferences
)
from utils.errors import handle_database_error, handle_generic_error

router = APIRouter(prefix="/api", tags=["User Management"])

@router.get("/user-profile", response_model=UserProfile)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get user profile with preferences."""
    try:
        profile = await get_or_create_user_profile(current_user.id)
        return profile
    except Exception as e:
        logging.error(f"Error getting user profile: {e}")
        raise handle_database_error(e, "get user profile")

@router.get("/user-insights")
async def get_user_insights_endpoint(current_user: User = Depends(get_current_user)):
    """Get user insights and analytics."""
    try:
        insights = await get_user_insights(current_user.id)
        return {"message": "User insights", "data": insights}
    except Exception as e:
        logging.error(f"Error getting user insights: {e}")
        raise handle_generic_error(e, "get user insights")

@router.post("/onboard/setup")
async def setup_user_onboard(request: OnboardRequest, current_user: User = Depends(get_current_user)):
    """Setup user preferences from onboarding."""
    try:
        success = await initialize_user_with_onboard_preferences(
            current_user.id, request.selected_categories
        )
        if success:
            return StandardResponse(message="Onboard preferences setup successfully")
        else:
            raise HTTPException(status_code=500, detail="Failed to setup preferences")
    except Exception as e:
        logging.error(f"Error setting up onboard preferences: {e}")
        raise handle_generic_error(e, "setup onboard preferences")

@router.delete("/user/account")
async def delete_user_account(current_user: User = Depends(get_current_user)):
    """Delete user account and all associated data."""
    try:
        success = await delete_user(current_user.id)
        if success:
            return StandardResponse(message="User account deleted successfully")
        else:
            raise HTTPException(status_code=500, detail="Failed to delete account")
    except Exception as e:
        logging.error(f"Error deleting user account: {e}")
        raise handle_database_error(e, "delete user account")