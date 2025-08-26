"""
Articles API endpoints - Article management and RSS processing
Contract-first design with proper pagination
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, or_, select, func
from pydantic import BaseModel

from app.core.database import get_database
from app.api.v1.endpoints.auth import get_current_user
from app.models.article import Article, ArticleListResponse, ArticleResponse, ArticleUpdate
from app.models.user import UserInDB
from app.services.rss_service import RSSService, is_valid_rss_url


router = APIRouter(prefix="/articles", tags=["articles"])


class ImportRSSRequest(BaseModel):
    """Request schema for RSS import"""
    rss_url: str


class CreateArticleRequest(BaseModel):
    """Request schema for creating article"""
    title: str
    summary: str
    url: str
    source_name: str
    content: Optional[str] = None
    reading_time: int = 5


@router.get("", response_model=ArticleListResponse)
async def get_articles(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in title and summary"),
    source_name: Optional[str] = Query(None, description="Filter by source name"),
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get paginated articles with filtering"""
    
    # Build query
    query = select(Article)
    
    # Apply filters
    if category:
        query = query.where(Article.category == category)
    
    if source_name:
        query = query.where(Article.source_name.ilike(f"%{source_name}%"))
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Article.title.ilike(search_term),
                Article.summary.ilike(search_term)
            )
        )
    
    # Get total count for pagination
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Apply pagination and ordering
    articles_query = (
        query.order_by(desc(Article.published_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    
    result = await db.execute(articles_query)
    articles = result.scalars().all()
    
    # Calculate pagination info
    has_next = (page * per_page) < total
    
    return ArticleListResponse(
        articles=[ArticleResponse.model_validate(article) for article in articles],
        total=total,
        page=page,
        per_page=per_page,
        has_next=has_next
    )


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get single article by ID"""
    
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return ArticleResponse.model_validate(article)


@router.post("", response_model=ArticleResponse)
async def create_article(
    request: CreateArticleRequest,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new article"""
    
    # Check if article already exists by URL
    result = await db.execute(select(Article).where(Article.url == request.url))
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Article with this URL already exists")
    
    # Create new article
    article = Article(
        title=request.title,
        summary=request.summary,
        content=request.content,
        url=request.url,
        source_name=request.source_name,
        published_at=datetime.utcnow(),
        reading_time=request.reading_time
    )
    
    db.add(article)
    await db.commit()
    await db.refresh(article)
    
    return ArticleResponse.model_validate(article)


@router.patch("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: str,
    update_data: ArticleUpdate,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Update article metadata"""
    
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Update fields
    if update_data.category is not None:
        article.category = update_data.category
    
    article.audio_available = update_data.audio_available
    
    await db.commit()
    await db.refresh(article)
    
    return ArticleResponse.model_validate(article)


@router.delete("/{article_id}")
async def delete_article(
    article_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete article"""
    
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    await db.delete(article)
    await db.commit()
    
    return {"message": "Article deleted successfully"}


@router.post("/import-rss")
async def import_from_rss(
    request: ImportRSSRequest,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Import articles from RSS feed"""
    
    # Validate URL
    if not is_valid_rss_url(request.rss_url):
        raise HTTPException(status_code=400, detail="Invalid RSS URL format")
    
    # Process RSS feed
    result = await RSSService.process_rss_url(request.rss_url, db)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "message": result["message"],
        "source_name": result["source_name"],
        "total_articles": result["total_articles"],
        "new_articles": result["new_articles"]
    }


@router.get("/sources/list")
async def get_article_sources(
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get list of unique article sources"""
    
    result = await db.execute(select(Article.source_name).distinct())
    sources = result.scalars().all()
    
    return {"sources": sorted(sources)}


@router.get("/categories/list")
async def get_article_categories(
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get list of unique article categories"""
    
    result = await db.execute(
        select(Article.category)
        .where(Article.category.isnot(None))
        .distinct()
    )
    categories = result.scalars().all()
    category_names = [cat for cat in categories if cat]
    
    return {"categories": sorted(category_names)}