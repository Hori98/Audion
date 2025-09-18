"""
User router for user profile, preferences, and account management.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Form, File, UploadFile
from datetime import datetime

from models.user import User, UserProfile, UserInteraction, UserProfileUpdate
from models.rss import OnboardRequest, PresetCategory
from models.common import StandardResponse
from services.auth_service import delete_user
from config.database import get_database
from services.user_service import (
    get_or_create_user_profile, get_user_insights, 
    initialize_user_with_onboard_preferences
)
from utils.errors import handle_database_error, handle_generic_error
from config.database import get_database, is_database_connected
from pydantic import BaseModel
from typing import Optional

# Import auth dependencies
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import get_current_user as get_user_from_credentials

security = HTTPBearer()

# Create router instance
router = APIRouter(prefix="/api", tags=["User Management"])

# Create a wrapper function for dependency injection
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user using auth service"""
    return await get_user_from_credentials(credentials)

# Test endpoint to verify multipart/form-data handling (no auth required)
@router.post("/test-multipart")
async def test_multipart(
    test_field: Optional[str] = Form(None),
    test_file: Optional[UploadFile] = File(None)
):
    """Test multipart/form-data processing."""
    return {
        "message": "Multipart test successful",
        "test_field": test_field,
        "has_file": test_file is not None,
        "file_info": {
            "filename": test_file.filename if test_file else None,
            "content_type": test_file.content_type if test_file else None
        } if test_file else None
    }

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

@router.put("/user/profile")
async def update_user_profile(
    request: UserProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user profile information (JSON format)."""
    try:
        logging.info(f"[Profile Update] User {current_user.id} updating profile")
        logging.info(f"[Profile Update] Received: username={request.username}, email={request.email}")
        
        db = get_database()
        users_collection = db.users
        
        # Prepare update data
        update_data = {
            "updated_at": datetime.utcnow()
        }
        
        # Update username if provided
        if request.username is not None and request.username.strip():
            update_data["username"] = request.username.strip()
            logging.info(f"[Profile Update] Setting username to: {request.username.strip()}")
        
        # Update email if provided  
        if request.email is not None and request.email.strip():
            update_data["email"] = request.email.strip()
            logging.info(f"[Profile Update] Setting email to: {request.email.strip()}")
        
        # Update user in database
        result = await users_collection.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            logging.warning(f"[Profile Update] No document was modified for user {current_user.id}")
        
        # Fetch updated user data
        updated_user_data = await users_collection.find_one({"id": current_user.id})
        if not updated_user_data:
            raise HTTPException(status_code=404, detail="User not found after update")
        
        # Convert MongoDB document to User model
        updated_user = User(
            id=updated_user_data["id"],
            email=updated_user_data["email"],
            username=updated_user_data.get("username"),
            display_name=updated_user_data.get("display_name"),
            profile_image=updated_user_data.get("profile_image"),
            subscription_tier=updated_user_data.get("subscription_tier", "free"),
            created_at=updated_user_data["created_at"],
            updated_at=updated_user_data["updated_at"]
        )
        
        logging.info(f"[Profile Update] Successfully updated user {current_user.id}")
        
        return {
            "user": updated_user,
            "message": "Profile updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[Profile Update] Error updating user profile: {e}")
        raise handle_database_error(e, "update user profile")

# ===== User Settings =====

class UserSettingsUpdate(BaseModel):
    audio_quality: Optional[str] = None
    auto_play_next: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    push_notifications: Optional[bool] = None
    schedule_enabled: Optional[bool] = None
    schedule_time: Optional[str] = None
    schedule_count: Optional[int] = None
    text_size: Optional[str] = None
    language: Optional[str] = None
    auto_pick_settings: Optional[dict] = None

@router.get("/user/settings")
async def get_user_settings(current_user: User = Depends(get_current_user)):
    if not is_database_connected():
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    db = get_database()
    try:
        profile = await db.user_profiles.find_one({"user_id": current_user.id})
        if not profile:
            # return sensible defaults
            return {
                "audio_quality": "standard",
                "auto_play_next": True,
                "notifications_enabled": True,
                "push_notifications": True,
                "schedule_enabled": False,
                "schedule_time": "07:00",
                "schedule_count": 3,
                "text_size": "medium",
                "language": "en",
                "auto_pick_settings": {
                    "max_articles": 5,
                    "preferred_genres": [],
                    "excluded_genres": [],
                    "source_priority": "balanced",
                    "time_based_filtering": True,
                },
            }
        # map only settings subset back
        return {
            k: profile.get(k)
            for k in [
                "audio_quality",
                "auto_play_next",
                "notifications_enabled",
                "push_notifications",
                "schedule_enabled",
                "schedule_time",
                "schedule_count",
                "text_size",
                "language",
                "auto_pick_settings",
            ]
        }
    except Exception as e:
        logging.error(f"Settings retrieval error: {e}")
        raise handle_generic_error(e, "get settings")

@router.put("/user/settings")
async def update_user_settings_router(settings: UserSettingsUpdate, current_user: User = Depends(get_current_user)):
    if not is_database_connected():
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    db = get_database()
    try:
        update_data = {}
        if settings.audio_quality is not None:
            if settings.audio_quality not in ["standard", "high"]:
                raise HTTPException(status_code=400, detail="Invalid audio quality. Must be 'standard' or 'high'")
            update_data["audio_quality"] = settings.audio_quality
        if settings.auto_play_next is not None:
            update_data["auto_play_next"] = settings.auto_play_next
        if settings.notifications_enabled is not None:
            update_data["notifications_enabled"] = settings.notifications_enabled
        if settings.push_notifications is not None:
            update_data["push_notifications"] = settings.push_notifications
        if settings.schedule_enabled is not None:
            update_data["schedule_enabled"] = settings.schedule_enabled
        if settings.schedule_time is not None:
            import re
            if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', settings.schedule_time):
                raise HTTPException(status_code=400, detail="Invalid time format. Must be HH:MM")
            update_data["schedule_time"] = settings.schedule_time
        if settings.schedule_count is not None:
            if settings.schedule_count < 1 or settings.schedule_count > 10:
                raise HTTPException(status_code=400, detail="Schedule count must be between 1 and 10")
            update_data["schedule_count"] = settings.schedule_count
        if settings.text_size is not None:
            if settings.text_size not in ["small", "medium", "large"]:
                raise HTTPException(status_code=400, detail="Invalid text size. Must be 'small', 'medium', or 'large'")
            update_data["text_size"] = settings.text_size
        if settings.language is not None:
            if settings.language not in ["en", "ja"]:
                raise HTTPException(status_code=400, detail="Invalid language. Must be 'en' or 'ja'")
            update_data["language"] = settings.language
        if settings.auto_pick_settings is not None:
            auto_pick = settings.auto_pick_settings
            if "max_articles" in auto_pick and (auto_pick["max_articles"] < 1 or auto_pick["max_articles"] > 20):
                raise HTTPException(status_code=400, detail="max_articles must be between 1 and 20")
            if "source_priority" in auto_pick and auto_pick["source_priority"] not in ["balanced", "popular", "recent"]:
                raise HTTPException(status_code=400, detail="Invalid source_priority")
            update_data["auto_pick_settings"] = auto_pick
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid settings to update")
        update_data["updated_at"] = datetime.utcnow()
        await db.user_profiles.update_one(
            {"user_id": current_user.id},
            {"$set": update_data},
            upsert=True,
        )
        return {"message": "Settings updated successfully", "updated_fields": list(update_data.keys())}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Settings update error: {e}")
        raise handle_generic_error(e, "update settings")
