"""
Articles router for fetching and managing articles from RSS sources.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query

from models.user import User
from models.article import Article, AutoPickRequest
from models.common import StandardResponse
from services.auth_service import get_current_user
from services.rss_service import get_articles_for_user
from services.user_service import auto_pick_articles, record_audio_interaction
from services.article_service import filter_articles_by_genre
from utils.errors import handle_database_error, handle_generic_error

router = APIRouter(prefix="/api", tags=["Articles"])

@router.get("/articles", response_model=List[Article])
async def get_articles(
    current_user: User = Depends(get_current_user),
    genre: Optional[str] = Query(None, description="Filter articles by genre"),
    source: Optional[str] = Query(None, description="Filter articles by source name")
):
    """
    Get articles from user's RSS sources with optional filtering.
    
    Args:
        current_user: Current authenticated user
        genre: Optional genre filter
        source: Optional source name filter
        
    Returns:
        List[Article]: Filtered articles
    """
    try:
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