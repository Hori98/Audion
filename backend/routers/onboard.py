"""
Onboard router for preset categories and initial setup.
"""

import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from models.user import User
from models.rss import PresetCategory, OnboardRequest, RSSSource
from services.auth_service import get_current_user
from config.database import get_database

router = APIRouter(prefix="/api", tags=["Onboard"])

@router.get("/onboard/categories", response_model=List[PresetCategory])
async def get_preset_categories():
    db = get_database()
    categories = await db.preset_categories.find({}).to_list(100)
    return [PresetCategory(**category) for category in categories]

@router.post("/onboard/setup")
async def setup_user_onboard(request: OnboardRequest, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        categories = await db.preset_categories.find({"name": {"$in": request.selected_categories}}).to_list(100)
        if not categories:
            raise HTTPException(status_code=400, detail="No valid categories selected")
        added = 0
        for category in categories:
            for rss in category.get("rss_sources", []):
                try:
                    source = RSSSource(user_id=current_user.id, name=rss.get("name"), url=rss.get("url"))
                    await db.rss_sources.insert_one(source.dict())
                    added += 1
                except Exception as e:
                    logging.warning(f"Failed to add source {rss} for user {current_user.id}: {e}")
                    continue
        return {"message": f"Onboard setup complete", "sources_added": added}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Onboard setup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to setup onboarding")

