"""
RSS Sources API endpoints - Enhanced RSS reader functionality
Pre-configured sources + user management
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_database
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import UserInDB
from app.models.rss_source import (
    UserRSSSourceCreate,
    UserRSSSourceResponse,
    PreConfiguredRSSSourceResponse,
    RSSCategoryResponse,
    RSSSourceSearchResponse
)
from app.services.rss_source_service import RSSSourceService

router = APIRouter(prefix="/rss-sources", tags=["RSS Sources"])


@router.get("/search", response_model=RSSSourceSearchResponse)
async def search_rss_sources(
    query: Optional[str] = Query(None, description="Search term"),
    category: Optional[str] = Query(None, description="Category filter"),
    language: str = Query("ja", description="Language filter"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=50, description="Items per page"),
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Search pre-configured RSS sources"""
    
    try:
        # Search sources
        sources_data = await RSSSourceService.search_preconfigured_sources(
            db=db,
            query=query,
            category=category,
            language=language,
            page=page,
            per_page=per_page
        )
        
        # Get categories for filtering UI
        categories = await RSSSourceService.get_categories(db)
        
        return RSSSourceSearchResponse(
            sources=[PreConfiguredRSSSourceResponse.model_validate(s) for s in sources_data["sources"]],
            categories=[RSSCategoryResponse.model_validate(c) for c in categories],
            total=sources_data["total"],
            page=sources_data["page"],
            per_page=sources_data["per_page"],
            has_next=sources_data["has_next"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to search RSS sources")


@router.get("/categories", response_model=list[RSSCategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all RSS categories"""
    
    try:
        categories = await RSSSourceService.get_categories(db)
        return [RSSCategoryResponse.model_validate(c) for c in categories]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get categories")


@router.get("/my-sources", response_model=list[UserRSSSourceResponse])
async def get_my_sources(
    category: Optional[str] = Query(None, description="Category filter"),
    is_active: Optional[bool] = Query(None, description="Active status filter"),
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get user's RSS sources"""
    
    try:
        sources = await RSSSourceService.get_user_sources(
            db=db,
            user_id=current_user.id,
            category=category,
            is_active=is_active
        )
        return sources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user sources")


@router.post("/add", response_model=UserRSSSourceResponse)
async def add_rss_source(
    source_data: UserRSSSourceCreate,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Add RSS source to user's collection"""
    
    try:
        user_source = await RSSSourceService.add_user_source(
            db=db,
            user_id=current_user.id,
            source_data=source_data
        )
        
        # Get enhanced response with computed fields
        sources = await RSSSourceService.get_user_sources(
            db=db,
            user_id=current_user.id
        )
        
        # Find the newly created source
        for source in sources:
            if source.id == user_source.id:
                return source
        
        raise HTTPException(status_code=500, detail="Failed to retrieve added source")
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to add RSS source")


@router.delete("/{source_id}")
async def remove_rss_source(
    source_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Remove RSS source from user's collection"""
    
    try:
        success = await RSSSourceService.remove_user_source(
            db=db,
            user_id=current_user.id,
            source_id=source_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="RSS source not found")
        
        return {"message": "RSS source removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to remove RSS source")


@router.patch("/{source_id}", response_model=UserRSSSourceResponse)
async def update_rss_source(
    source_id: str,
    updates: Dict[str, Any],
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Update RSS source settings"""
    
    try:
        updated_source = await RSSSourceService.update_user_source(
            db=db,
            user_id=current_user.id,
            source_id=source_id,
            updates=updates
        )
        
        if not updated_source:
            raise HTTPException(status_code=404, detail="RSS source not found")
        
        # Get enhanced response
        sources = await RSSSourceService.get_user_sources(
            db=db,
            user_id=current_user.id
        )
        
        for source in sources:
            if source.id == updated_source.id:
                return source
        
        raise HTTPException(status_code=500, detail="Failed to retrieve updated source")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update RSS source")


@router.get("/featured", response_model=list[PreConfiguredRSSSourceResponse])
async def get_featured_sources(
    language: str = Query("ja", description="Language filter"),
    limit: int = Query(10, ge=1, le=20, description="Number of sources"),
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get featured RSS sources for discovery"""
    
    try:
        sources_data = await RSSSourceService.search_preconfigured_sources(
            db=db,
            language=language,
            page=1,
            per_page=limit
        )
        
        # Filter featured sources
        featured_sources = [
            s for s in sources_data["sources"] 
            if s.is_featured
        ]
        
        return [PreConfiguredRSSSourceResponse.model_validate(s) for s in featured_sources]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get featured sources")