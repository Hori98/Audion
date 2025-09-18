"""
Archive router for managing archived articles.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from models.user import User
from models.archive import ArchivedArticle, ArchiveRequest, ArchiveUpdateRequest
from services.auth_service import get_current_user
from config.database import get_database

router = APIRouter(prefix="/api", tags=["Archive"])

@router.post("/archive/article", response_model=ArchivedArticle)
async def archive_article(request: ArchiveRequest, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        existing = await db.archived_articles.find_one({"user_id": current_user.id, "article_id": request.article_id})
        if existing:
            return ArchivedArticle(**existing)
        archived = ArchivedArticle(
            user_id=current_user.id,
            article_id=request.article_id,
            article_title=request.article_title,
            article_summary=request.article_summary,
            article_link=request.article_link,
            article_published=request.article_published,
            source_name=request.source_name,
            article_genre=request.article_genre,
            article_content=request.article_content,
            search_text=f"{request.article_title} {request.article_summary}",
        )
        await db.archived_articles.insert_one(archived.dict())
        # Best-effort interaction log
        try:
            await db.user_interactions.insert_one({
                "user_id": current_user.id,
                "article_id": request.article_id,
                "interaction_type": "archived",
                "genre": request.article_genre or "General",
                "timestamp": datetime.utcnow(),
                "metadata": {"source": request.source_name},
            })
        except Exception as e:
            logging.warning(f"Failed to record archive interaction: {e}")
        return archived
    except Exception as e:
        logging.error(f"Archive article error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/archive/articles")
async def get_archived_articles(
    current_user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = 50,
    folder: Optional[str] = None,
    genre: Optional[str] = None,
    favorites_only: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = "archived_at",
    sort_order: str = "desc",
):
    db = get_database()
    try:
        query = {"user_id": current_user.id}
        if folder:
            query["folder"] = folder
        if genre:
            query["genre"] = genre
        if favorites_only:
            query["is_favorite"] = True
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"summary": {"$regex": search, "$options": "i"}},
            ]
        offset = (page - 1) * limit
        sort_dir = -1 if sort_order == "desc" else 1
        total = await db.archived_articles.count_documents(query)
        cursor = db.archived_articles.find(query).sort([(sort_by, sort_dir)]).skip(offset).limit(limit)
        items = await cursor.to_list(length=limit)
        articles = [ArchivedArticle(**it).dict() for it in items]
        return {"articles": articles, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}
    except Exception as e:
        logging.error(f"Get archived articles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/archive/article/{article_id}", response_model=ArchivedArticle)
async def update_archived_article(article_id: str, request: ArchiveUpdateRequest, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        update_data = {}
        if request.tags is not None:
            update_data["tags"] = request.tags
        if request.notes is not None:
            update_data["notes"] = request.notes
        if request.read_status is not None:
            update_data["read_status"] = request.read_status
        if request.is_favorite is not None:
            update_data["is_favorite"] = request.is_favorite
        if request.folder is not None:
            update_data["folder"] = request.folder
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        result = await db.archived_articles.update_one({"user_id": current_user.id, "article_id": article_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Archived article not found")
        updated = await db.archived_articles.find_one({"user_id": current_user.id, "article_id": article_id})
        return ArchivedArticle(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update archived article error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/archive/article/{article_id}")
async def unarchive_article(article_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        result = await db.archived_articles.delete_one({"user_id": current_user.id, "article_id": article_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Archived article not found")
        try:
            await db.user_interactions.insert_one({
                "user_id": current_user.id,
                "article_id": article_id,
                "interaction_type": "unarchived",
                "genre": "General",
                "timestamp": datetime.utcnow(),
            })
        except Exception as e:
            logging.warning(f"Failed to record unarchive interaction: {e}")
        return {"message": "Article removed from archive successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unarchive article error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/archive/stats")
async def get_archive_stats(current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        total = await db.archived_articles.count_documents({"user_id": current_user.id})
        favorites = await db.archived_articles.count_documents({"user_id": current_user.id, "is_favorite": True})
        unread = await db.archived_articles.count_documents({"user_id": current_user.id, "is_read": {"$ne": True}})
        return {"total": total, "favorites": favorites, "unread": unread}
    except Exception as e:
        logging.error(f"Get archive stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/archive/folders", response_model=List[str])
async def get_archive_folders(current_user: User = Depends(get_current_user)):
    db = get_database()
    try:
        folders = await db.archived_articles.distinct("folder", {"user_id": current_user.id})
        return sorted([f for f in folders if f])
    except Exception as e:
        logging.error(f"Get archive folders error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

