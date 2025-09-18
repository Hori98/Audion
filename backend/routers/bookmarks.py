"""
Bookmarks router for user bookmarks.
"""

import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from models.user import User
from models.bookmark import Bookmark, BookmarkCreate
from services.auth_service import get_current_user
from config.database import get_database

router = APIRouter(prefix="/api", tags=["Bookmarks"])

@router.post("/bookmarks", response_model=Bookmark)
async def create_bookmark(bookmark_data: BookmarkCreate, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        existing = await db.bookmarks.find_one({"user_id": current_user.id, "article_id": bookmark_data.article_id})
        if existing:
            raise HTTPException(status_code=409, detail="Article already bookmarked")
        bookmark = Bookmark(user_id=current_user.id, **bookmark_data.dict())
        await db.bookmarks.insert_one(bookmark.dict())
        return bookmark
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating bookmark: {e}")
        raise HTTPException(status_code=500, detail="Failed to create bookmark")

@router.get("/bookmarks", response_model=List[Bookmark])
async def get_bookmarks(current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        bookmarks: List[Bookmark] = []
        async for doc in db.bookmarks.find({"user_id": current_user.id}).sort("bookmarked_at", -1):
            bookmarks.append(Bookmark(**doc))
        return bookmarks
    except Exception as e:
        logging.error(f"Error getting bookmarks: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bookmarks")

@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        result = await db.bookmarks.delete_one({"id": bookmark_id, "user_id": current_user.id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        return {"message": "Bookmark deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting bookmark: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete bookmark")

@router.delete("/bookmarks/article/{article_id}")
async def delete_bookmark_by_article(article_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        result = await db.bookmarks.delete_one({"article_id": article_id, "user_id": current_user.id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        return {"message": "Bookmark deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting bookmark by article: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete bookmark")

@router.get("/bookmarks/check/{article_id}")
async def check_bookmark_status(article_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        bookmark = await db.bookmarks.find_one({"article_id": article_id, "user_id": current_user.id})
        return {"is_bookmarked": bookmark is not None}
    except Exception as e:
        logging.error(f"Error checking bookmark status: {e}")
        return {"is_bookmarked": False}

