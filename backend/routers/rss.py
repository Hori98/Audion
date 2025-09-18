"""
RSS router for managing RSS sources and related operations.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel

from models.user import User
from models.rss import RSSSource, RSSSourceCreate, RSSSourceUpdate
from models.common import StandardResponse
from services.auth_service import get_current_user
from services.rss_service import (
    get_user_rss_sources, create_rss_source, update_rss_source, 
    delete_rss_source, get_cache_stats, clear_rss_cache
)
from utils.errors import handle_database_error, handle_generic_error
from config.database import get_database
from datetime import datetime
import uuid
from pathlib import Path
import json
from utils.database import insert_document, find_many_by_user, update_many_by_user, delete_many

router = APIRouter(prefix="/api", tags=["RSS Sources"])

@router.get("/rss-sources", response_model=List[RSSSource])
async def get_user_sources(current_user: User = Depends(get_current_user)):
    """
    Get all RSS sources for the current user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List[RSSSource]: User's RSS sources
    """
    try:
        sources = await get_user_rss_sources(current_user.id)
        return sources
        
    except Exception as e:
        logging.error(f"Error getting RSS sources: {e}")
        raise handle_database_error(e, "get RSS sources")

@router.post("/rss-sources", response_model=RSSSource)
async def add_rss_source(source_data: RSSSourceCreate, current_user: User = Depends(get_current_user)):
    """
    Add a new RSS source for the current user.
    
    Args:
        source_data: RSS source creation data
        current_user: Current authenticated user
        
    Returns:
        RSSSource: Created RSS source
    """
    try:
        # Validate input
        if not source_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="RSS source name cannot be empty"
            )
        
        if not source_data.url.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="RSS source URL cannot be empty"
            )
        
        # Basic URL validation
        if not (source_data.url.startswith('http://') or source_data.url.startswith('https://')):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="RSS source URL must start with http:// or https://"
            )
        
        source = await create_rss_source(current_user.id, source_data.name, source_data.url)
        logging.info(f"Created RSS source for user {current_user.email}: {source_data.name}")
        return source
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logging.error(f"Error creating RSS source: {e}")
        raise handle_database_error(e, "create RSS source")

@router.put("/rss-sources/{source_id}", response_model=StandardResponse)
async def update_rss_source_status(
    source_id: str, 
    update_data: RSSSourceUpdate, 
    current_user: User = Depends(get_current_user)
):
    """
    Update RSS source active status.
    
    Args:
        source_id: RSS source ID
        update_data: Update data (is_active status)
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Update result
    """
    try:
        updated = await update_rss_source(current_user.id, source_id, update_data.is_active)
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RSS source not found"
            )
        
        status_text = "activated" if update_data.is_active else "deactivated"
        return StandardResponse(message=f"RSS source {status_text} successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating RSS source: {e}")
        raise handle_database_error(e, "update RSS source")

@router.delete("/rss-sources/{source_id}")
async def delete_rss_source_endpoint(source_id: str, current_user: User = Depends(get_current_user)):
    """
    Delete an RSS source.
    
    Args:
        source_id: RSS source ID to delete
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Deletion result
    """
    try:
        deleted = await delete_rss_source(current_user.id, source_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="RSS source not found"
            )
        
        return StandardResponse(message="RSS source deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting RSS source: {e}")
        raise handle_database_error(e, "delete RSS source")

@router.get("/rss-sources/cache/stats")
async def get_rss_cache_stats(current_user: User = Depends(get_current_user)):
    """
    Get RSS cache statistics (admin/debug endpoint).
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Dict: Cache statistics
    """
    try:
        stats = get_cache_stats()
        return {
            "message": "RSS cache statistics",
            "data": stats
        }
        
    except Exception as e:
        logging.error(f"Error getting cache stats: {e}")
        raise handle_generic_error(e, "get cache statistics")

@router.delete("/rss-sources/cache/clear")
async def clear_rss_cache_endpoint(current_user: User = Depends(get_current_user)):
    """
    Clear RSS feed cache (admin/debug endpoint).
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Cache clear result
    """
    try:
        clear_rss_cache()
        return StandardResponse(message="RSS cache cleared successfully")
        
    except Exception as e:
        logging.error(f"Error clearing RSS cache: {e}")
        raise handle_generic_error(e, "clear RSS cache")

# Flexible add endpoint to support preconfigured or custom payloads
class AddUserSourceRequest(BaseModel):
    preconfigured_source_id: Optional[str] = None
    custom_name: Optional[str] = None
    custom_url: Optional[str] = None
    custom_category: Optional[str] = None
    custom_alias: Optional[str] = None
    is_active: Optional[bool] = True

@router.post("/rss-sources/add")
async def add_user_rss_source(request: AddUserSourceRequest, current_user: User = Depends(get_current_user)):
    """Add RSS source to user's collection with flexible payload."""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=503, detail="Database unavailable")

        new_source = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "preconfigured_source_id": request.preconfigured_source_id,
            "custom_name": request.custom_name,
            "custom_url": request.custom_url,
            "custom_category": request.custom_category,
            "custom_alias": request.custom_alias,
            "is_active": True if request.is_active is None else request.is_active,
            "notification_enabled": False,
            "last_article_count": 0,
            "fetch_error_count": 0,
            "created_at": datetime.utcnow().isoformat(),
            "display_name": request.custom_name or request.custom_alias or "New RSS Source",
            "display_url": request.custom_url or "",
        }

        await insert_document("rss_sources", new_source)
        # respond with same structure (no need to expose Mongo _id here)
        return new_source
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error adding user RSS source: {e}")
        raise handle_database_error(e, "add RSS source")

@router.get("/rss-sources/search")
async def search_rss_sources(
    query: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
    page: Optional[int] = 1,
    per_page: Optional[int] = 50,
    current_user: User = Depends(get_current_user)
):
    """Search pre-configured RSS sources (mock for now)."""
    try:
        logging.info(f"[RSS SEARCH] q={query}, cat={category}, lang={language}")
        mock_sources = [
            {
                "id": "nhk-news",
                "name": "NHK NEWS WEB",
                "description": "NHKの最新ニュース",
                "url": "https://www3.nhk.or.jp/rss/news/cat0.xml",
                "category": "news",
                "language": "ja",
                "country": "JP",
                "favicon_url": "https://www3.nhk.or.jp/favicon.ico",
                "website_url": "https://www3.nhk.or.jp/news/",
                "popularity_score": 95,
                "reliability_score": 98,
                "is_active": True,
                "is_featured": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "nikkei-tech",
                "name": "日本経済新聞 テクノロジー",
                "description": "日経のテクノロジーニュース",
                "url": "https://www.nikkei.com/rss/technology/",
                "category": "technology",
                "language": "ja",
                "country": "JP",
                "favicon_url": "https://www.nikkei.com/favicon.ico",
                "website_url": "https://www.nikkei.com/",
                "popularity_score": 88,
                "reliability_score": 95,
                "is_active": True,
                "is_featured": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]

        filtered = mock_sources
        if query:
            q = query.lower()
            filtered = [s for s in filtered if q in s["name"].lower() or q in s.get("description", "").lower()]
        if category:
            filtered = [s for s in filtered if s.get("category") == category]

        return {
            "sources": filtered,
            "categories": [],
            "total": len(filtered),
            "page": page,
            "per_page": per_page,
            "has_next": False
        }
    except Exception as e:
        logging.error(f"Error searching RSS sources: {e}")
        raise handle_generic_error(e, "search RSS sources")

@router.get("/rss-sources/categories")
async def get_rss_categories(current_user: User = Depends(get_current_user)):
    """Get all RSS categories (from presets or fallback)."""
    try:
        json_file_path = Path(__file__).resolve().parent.parent / "presets" / "jp_rss_sources.json"
        if not json_file_path.exists():
            return [
                {"id": "general", "name": "General", "name_ja": "総合ニュース", "description": "General news", "icon": "📰", "color": "#FF6B6B", "sort_order": 1},
                {"id": "technology", "name": "Technology", "name_ja": "テクノロジー", "description": "Tech news", "icon": "💻", "color": "#4ECDC4", "sort_order": 2},
                {"id": "business", "name": "Business", "name_ja": "ビジネス", "description": "Business", "icon": "💼", "color": "#45B7D1", "sort_order": 3},
            ]

        with open(json_file_path, 'r', encoding='utf-8') as f:
            preset = json.load(f)
        categories = []
        for i, cat in enumerate(preset.get("categories", [])):
            categories.append({
                "id": cat.get("id"),
                "name": cat.get("name"),
                "name_ja": cat.get("name"),
                "description": cat.get("description", ""),
                "icon": "📰",
                "color": "#FF6B6B",
                "sort_order": i + 1,
            })
        return categories
    except Exception as e:
        logging.error(f"Error getting RSS categories: {e}")
        raise handle_generic_error(e, "get RSS categories")

@router.get("/rss-sources/my-sources")
async def get_my_rss_sources(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    try:
        filters: Dict[str, Any] = {}
        if category:
            filters["category"] = category
        if is_active is not None:
            filters["is_active"] = is_active
        sources = await find_many_by_user("rss_sources", current_user.id, filters=filters, limit=None)
        formatted = []
        for s in sources:
            s["display_name"] = s.get("custom_name") or s.get("name", "Unknown Source")
            s["display_url"] = s.get("custom_url") or s.get("url", "")
            formatted.append(s)
        return formatted
    except Exception as e:
        logging.error(f"Error getting user RSS sources: {e}")
        raise handle_generic_error(e, "get user RSS sources")

@router.post("/rss-sources/bootstrap")
async def bootstrap_default_sources(current_user: User = Depends(get_current_user)):
    try:
        default_sources = [
            {"name": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
            {"name": "Reuters", "url": "https://feeds.reuters.com/reuters/topNews"},
            {"name": "Associated Press", "url": "https://feeds.apnews.com/rss/apf-topnews"},
            {"name": "The Guardian", "url": "https://www.theguardian.com/world/rss"},
            {"name": "CNN", "url": "http://rss.cnn.com/rss/edition.rss"},
            {"name": "NPR News", "url": "https://feeds.npr.org/1001/rss.xml"},
            {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
            {"name": "Hacker News", "url": "https://feeds.feedburner.com/oreilly/radar/atom"},
        ]
        added = 0
        for src in default_sources:
            doc = {
                "id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "name": src["name"],
                "url": src["url"],
                "is_active": False,
                "created_at": datetime.utcnow().isoformat(),
            }
            await insert_document("rss_sources", doc)
            added += 1
        return {"message": f"Added {added} default RSS sources", "sources_added": added}
    except Exception as e:
        logging.error(f"Error bootstrapping sources: {e}")
        raise handle_generic_error(e, "bootstrap default sources")

@router.post("/rss-sources/reset-defaults")
async def reset_default_sources_to_inactive(current_user: User = Depends(get_current_user)):
    try:
        default_names = ["BBC News", "Reuters", "Associated Press", "The Guardian", "CNN", "NPR News", "TechCrunch", "Hacker News"]
        modified = await update_many_by_user(
            "rss_sources",
            current_user.id,
            {"name": {"$in": default_names}},
            {"is_active": False},
        )
        return {"message": "Defaults reset to inactive", "modified_count": modified}
    except Exception as e:
        logging.error(f"Error resetting default sources: {e}")
        raise handle_generic_error(e, "reset default sources")

@router.get("/rss-sources/force-cleanup")
async def force_cleanup_all_rss_sources(current_user: User = Depends(get_current_user)):
    try:
        deleted = await delete_many("rss_sources", {})
        return {"message": "RSS sources deleted", "deleted_count": deleted, "status": "success"}
    except Exception as e:
        logging.error(f"Error during force cleanup: {e}")
        raise handle_generic_error(e, "force cleanup RSS sources")
