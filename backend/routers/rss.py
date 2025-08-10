"""
RSS router for managing RSS sources and related operations.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query

from models.user import User
from models.rss import RSSSource, RSSSourceCreate, RSSSourceUpdate
from models.common import StandardResponse
from services.auth_service import get_current_user
from services.rss_service import (
    get_user_rss_sources, create_rss_source, update_rss_source, 
    delete_rss_source, get_cache_stats, clear_rss_cache
)
from utils.errors import handle_database_error, handle_generic_error

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