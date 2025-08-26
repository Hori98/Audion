"""
RSS Source Management Service
Handles pre-configured sources and user source management
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rss_source import (
    PreConfiguredRSSSource,
    UserRSSSource, 
    RSSCategory,
    UserRSSSourceCreate,
    UserRSSSourceResponse
)


class RSSSourceService:
    """Service for managing RSS sources"""
    
    @staticmethod
    async def search_preconfigured_sources(
        db: AsyncSession,
        query: Optional[str] = None,
        category: Optional[str] = None,
        language: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Search pre-configured RSS sources"""
        
        # Build query
        stmt = select(PreConfiguredRSSSource).where(PreConfiguredRSSSource.is_active == True)
        
        if query:
            search_term = f"%{query}%"
            stmt = stmt.where(
                or_(
                    PreConfiguredRSSSource.name.ilike(search_term),
                    PreConfiguredRSSSource.description.ilike(search_term)
                )
            )
        
        if category:
            stmt = stmt.where(PreConfiguredRSSSource.category == category)
            
        if language:
            stmt = stmt.where(PreConfiguredRSSSource.language == language)
        
        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Apply ordering and pagination
        stmt = stmt.order_by(
            PreConfiguredRSSSource.is_featured.desc(),
            PreConfiguredRSSSource.popularity_score.desc(),
            PreConfiguredRSSSource.name
        ).offset((page - 1) * per_page).limit(per_page)
        
        result = await db.execute(stmt)
        sources = result.scalars().all()
        
        return {
            "sources": sources,
            "total": total,
            "page": page,
            "per_page": per_page,
            "has_next": (page * per_page) < total
        }
    
    @staticmethod
    async def get_categories(db: AsyncSession) -> List[RSSCategory]:
        """Get all RSS categories"""
        
        stmt = select(RSSCategory).where(
            RSSCategory.is_active == True
        ).order_by(RSSCategory.sort_order, RSSCategory.name)
        
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_user_sources(
        db: AsyncSession,
        user_id: str,
        category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[UserRSSSourceResponse]:
        """Get user's RSS sources with computed display fields"""
        
        stmt = select(UserRSSSource).where(UserRSSSource.user_id == user_id)
        
        if category:
            stmt = stmt.where(
                or_(
                    UserRSSSource.custom_category == category,
                    and_(
                        UserRSSSource.preconfigured_source_id.isnot(None),
                        # Join with preconfigured to check category
                    )
                )
            )
        
        if is_active is not None:
            stmt = stmt.where(UserRSSSource.is_active == is_active)
        
        stmt = stmt.order_by(UserRSSSource.created_at.desc())
        
        result = await db.execute(stmt)
        user_sources = result.scalars().all()
        
        # Enhance with computed fields
        response_sources = []
        for source in user_sources:
            # Get preconfigured source data if available
            preconfigured = None
            if source.preconfigured_source_id:
                preconfigured_result = await db.execute(
                    select(PreConfiguredRSSSource).where(
                        PreConfiguredRSSSource.id == source.preconfigured_source_id
                    )
                )
                preconfigured = preconfigured_result.scalar_one_or_none()
            
            # Create response with computed fields
            response = UserRSSSourceResponse(
                id=source.id,
                user_id=source.user_id,
                preconfigured_source_id=source.preconfigured_source_id,
                custom_name=source.custom_name,
                custom_url=source.custom_url,
                custom_category=source.custom_category,
                custom_alias=source.custom_alias,
                is_active=source.is_active,
                notification_enabled=source.notification_enabled,
                last_fetched=source.last_fetched,
                last_article_count=source.last_article_count,
                fetch_error_count=source.fetch_error_count,
                created_at=source.created_at,
                # Computed fields
                display_name=source.custom_alias or (
                    preconfigured.name if preconfigured else source.custom_name
                ),
                display_url=preconfigured.url if preconfigured else source.custom_url,
                display_category=preconfigured.category if preconfigured else source.custom_category
            )
            response_sources.append(response)
        
        return response_sources
    
    @staticmethod
    async def add_user_source(
        db: AsyncSession,
        user_id: str,
        source_data: UserRSSSourceCreate
    ) -> UserRSSSource:
        """Add RSS source to user's collection"""
        
        # Validate that either preconfigured_source_id OR custom fields are provided
        if source_data.preconfigured_source_id:
            # Verify preconfigured source exists
            preconfigured_result = await db.execute(
                select(PreConfiguredRSSSource).where(
                    PreConfiguredRSSSource.id == source_data.preconfigured_source_id,
                    PreConfiguredRSSSource.is_active == True
                )
            )
            preconfigured = preconfigured_result.scalar_one_or_none()
            if not preconfigured:
                raise ValueError("Pre-configured source not found or inactive")
            
            # Check if user already has this source
            existing_result = await db.execute(
                select(UserRSSSource).where(
                    UserRSSSource.user_id == user_id,
                    UserRSSSource.preconfigured_source_id == source_data.preconfigured_source_id
                )
            )
            if existing_result.scalar_one_or_none():
                raise ValueError("Source already added to user's collection")
                
        elif source_data.custom_url:
            # For custom sources, check URL uniqueness per user
            existing_result = await db.execute(
                select(UserRSSSource).where(
                    UserRSSSource.user_id == user_id,
                    UserRSSSource.custom_url == str(source_data.custom_url)
                )
            )
            if existing_result.scalar_one_or_none():
                raise ValueError("Custom source URL already exists")
        else:
            raise ValueError("Either preconfigured_source_id or custom_url must be provided")
        
        # Create user source
        user_source = UserRSSSource(
            user_id=user_id,
            preconfigured_source_id=source_data.preconfigured_source_id,
            custom_name=source_data.custom_name,
            custom_url=str(source_data.custom_url) if source_data.custom_url else None,
            custom_category=source_data.custom_category,
            custom_alias=source_data.custom_alias,
            notification_enabled=source_data.notification_enabled
        )
        
        db.add(user_source)
        await db.commit()
        await db.refresh(user_source)
        
        return user_source
    
    @staticmethod
    async def remove_user_source(
        db: AsyncSession,
        user_id: str,
        source_id: str
    ) -> bool:
        """Remove RSS source from user's collection"""
        
        result = await db.execute(
            select(UserRSSSource).where(
                UserRSSSource.id == source_id,
                UserRSSSource.user_id == user_id
            )
        )
        source = result.scalar_one_or_none()
        
        if not source:
            return False
        
        await db.delete(source)
        await db.commit()
        
        return True
    
    @staticmethod
    async def update_user_source(
        db: AsyncSession,
        user_id: str,
        source_id: str,
        updates: Dict[str, Any]
    ) -> Optional[UserRSSSource]:
        """Update user RSS source settings"""
        
        result = await db.execute(
            select(UserRSSSource).where(
                UserRSSSource.id == source_id,
                UserRSSSource.user_id == user_id
            )
        )
        source = result.scalar_one_or_none()
        
        if not source:
            return None
        
        # Update allowed fields
        for key, value in updates.items():
            if key in ['custom_alias', 'notification_enabled', 'is_active']:
                setattr(source, key, value)
        
        await db.commit()
        await db.refresh(source)
        
        return source