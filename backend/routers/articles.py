"""
Articles router for fetching and managing articles from RSS sources.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.user import User
from models.article import Article, AutoPickRequest
from models.common import StandardResponse
from services.auth_service import get_current_user
from services.rss_service import get_articles_for_user
from services.user_service import auto_pick_articles, record_audio_interaction
from services.article_service import filter_articles_by_genre
from utils.errors import handle_database_error, handle_generic_error

router = APIRouter(prefix="/api", tags=["Articles"])
security = HTTPBearer()

@router.get("/articles", response_model=List[Article])
async def get_articles(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    genre: Optional[str] = Query(None, description="Filter articles by genre"),
    source: Optional[str] = Query(None, description="Filter articles by source name")
):
    """
    Get articles from user's RSS sources with optional filtering.

    Args:
        credentials: HTTP Bearer credentials containing JWT token
        genre: Optional genre filter
        source: Optional source name filter

    Returns:
        List[Article]: Filtered articles
    """
    try:
        current_user = await get_current_user(credentials)
        articles = await get_articles_for_user(
            current_user.id,
            genre=genre,
            source=source,
            max_articles=50
        )

        logging.info(f"Retrieved {len(articles)} articles for user {current_user.email}")
        return articles

    except Exception as e:
        logging.error(f"Error getting articles: {e}")
        raise handle_database_error(e, "get articles")

@router.post("/articles", response_model=List[Article])
async def post_articles(request: Dict[str, Any], current_user: User = Depends(get_current_user)):
    """
    Alternative endpoint for getting articles (POST method for complex filters).
    
    Args:
        request: Request data with filtering options
        current_user: Current authenticated user
        
    Returns:
        List[Article]: Filtered articles
    """
    try:
        genre = request.get("genre")
        source = request.get("source")
        max_articles = request.get("max_articles", 50)
        
        articles = await get_articles_for_user(
            current_user.id,
            genre=genre,
            source=source,
            max_articles=max_articles
        )
        
        return articles
        
    except Exception as e:
        logging.error(f"Error getting articles (POST): {e}")
        raise handle_database_error(e, "get articles")

@router.post("/auto-pick", response_model=List[Article])
async def get_auto_picked_articles(
    request: AutoPickRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    Get auto-picked articles based on user preferences.
    
    Args:
        request: Auto-pick request parameters
        current_user: Current authenticated user
        
    Returns:
        List[Article]: Auto-picked articles
    """
    try:
        # Get all available articles
        all_articles = await get_articles_for_user(current_user.id, max_articles=100)
        
        if not all_articles:
            return []
        
        # Auto-pick articles based on user preferences
        selected_articles = await auto_pick_articles(
            current_user.id,
            all_articles,
            max_articles=request.max_articles or 5,
            preferred_genres=request.preferred_genres
        )
        
        logging.info(f"Auto-picked {len(selected_articles)} articles for user {current_user.email}")
        return selected_articles
        
    except Exception as e:
        logging.error(f"Error auto-picking articles: {e}")
        raise handle_generic_error(e, "auto-pick articles")

@router.get("/articles/genres")
async def get_available_genres(current_user: User = Depends(get_current_user)):
    """
    Get list of available genres from user's articles.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Dict: Available genres with counts
    """
    try:
        # Get all articles for the user
        all_articles = await get_articles_for_user(current_user.id, max_articles=200)
        
        # Count articles by genre
        genre_counts = {}
        for article in all_articles:
            genre = article.genre or "General"
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
        
        # Sort by count
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "message": "Available genres",
            "data": {
                "genres": dict(sorted_genres),
                "total_articles": len(all_articles)
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting available genres: {e}")
        raise handle_generic_error(e, "get available genres")

@router.post("/articles/{article_id}/interaction")
async def record_article_interaction(
    article_id: str,
    interaction_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Record user interaction with an article.
    
    Args:
        article_id: Article ID
        interaction_data: Interaction data (type, genre, etc.)
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Interaction recording result
    """
    try:
        from models.user import UserInteraction
        from services.user_service import update_user_preferences
        
        # Create interaction object
        interaction = UserInteraction(
            article_id=article_id,
            interaction_type=interaction_data.get("interaction_type", "viewed"),
            genre=interaction_data.get("genre", "General"),
            metadata=interaction_data.get("metadata")
        )
        
        # Update user preferences
        await update_user_preferences(current_user.id, interaction)
        
        return StandardResponse(message="Article interaction recorded successfully")
        
    except Exception as e:
        logging.error(f"Error recording article interaction: {e}")
        raise handle_generic_error(e, "record article interaction")

@router.get("/articles/search")
async def search_articles(
    q: str = Query(..., description="Search query"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    current_user: User = Depends(get_current_user)
):
    """
    Search articles by title and content.
    
    Args:
        q: Search query
        genre: Optional genre filter
        current_user: Current authenticated user
        
    Returns:
        List[Article]: Matching articles
    """
    try:
        # Get articles
        articles = await get_articles_for_user(current_user.id, genre=genre, max_articles=100)
        
        # Simple text search
        query_lower = q.lower()
        matching_articles = []
        
        for article in articles:
            if (query_lower in article.title.lower() or 
                query_lower in article.summary.lower()):
                matching_articles.append(article)
        
        # Sort by relevance (title matches first)
        title_matches = [a for a in matching_articles if query_lower in a.title.lower()]
        summary_matches = [a for a in matching_articles if query_lower not in a.title.lower()]
        
        results = title_matches + summary_matches
        
        logging.info(f"Article search '{q}' returned {len(results)} results for user {current_user.email}")
        return results[:20]  # Limit to 20 results

    except Exception as e:
        logging.error(f"Error searching articles: {e}")
        raise handle_generic_error(e, "search articles")

@router.get("/articles/curated", response_model=List[Article])
async def get_curated_articles_endpoint(
    genre: Optional[str] = Query(None, description="Filter by genre (optional)"),
    max_articles: int = Query(50, ge=1, le=100, description="Maximum number of articles to return")
):
    """
    Get curated articles from preset RSS sources.

    This endpoint is used by the Home tab to display articles from
    system-defined RSS sources (jp_rss_sources.json).
    No authentication required - public curated content.

    Args:
        genre: Optional genre filter (e.g., "総合ニュース", "テクノロジー")
        max_articles: Maximum number of articles to return (1-100)

    Returns:
        List[Article]: List of curated articles sorted by publication date

    Raises:
        HTTPException: If error occurs while fetching articles
    """
    try:
        from services.rss_service import get_curated_articles

        logging.info(f"Fetching curated articles - genre: {genre}, max: {max_articles}")

        articles = await get_curated_articles(
            genre=genre,
            max_articles=max_articles
        )

        logging.info(f"Successfully fetched {len(articles)} curated articles")
        return articles

    except Exception as e:
        logging.error(f"Error in get_curated_articles_endpoint: {e}")
        raise handle_generic_error(e, "fetch curated articles")

@router.get("/articles/categories")
async def get_curated_categories():
    """
    Get available article categories from preset RSS sources.
    No authentication required - public information.

    Returns:
        List[dict]: Available categories with their names and descriptions
    """
    import json
    import os

    try:
        # Load preset RSS sources
        preset_file_path = os.path.join(os.path.dirname(__file__), "../presets/jp_rss_sources.json")

        if not os.path.exists(preset_file_path):
            logging.error(f"Preset RSS sources file not found: {preset_file_path}")
            raise HTTPException(status_code=500, detail="Preset sources configuration not found")

        with open(preset_file_path, 'r', encoding='utf-8') as f:
            preset_data = json.load(f)

        categories = []
        for category in preset_data.get("categories", []):
            categories.append({
                "id": category.get("id"),
                "name": category.get("name"),
                "description": category.get("description")
            })

        logging.info(f"Returning {len(categories)} available categories")
        return {"categories": categories}

    except Exception as e:
        logging.error(f"Error getting curated categories: {e}")
        raise handle_generic_error(e, "get available categories")