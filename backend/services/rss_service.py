"""
RSS feed processing service with caching and article extraction.
"""

import logging
import time
import uuid
import feedparser
from typing import List, Optional, Dict, Any
from datetime import datetime

from config.settings import RSS_CACHE_EXPIRY_SECONDS
from config.database import get_database, is_database_connected
from models.article import Article
from models.rss import RSSSource
from services.article_service import classify_article_genre
from utils.errors import handle_database_error, handle_generic_error
from utils.database import find_many_by_user, find_one_by_id

# Global RSS cache
RSS_CACHE: Dict[str, Dict[str, Any]] = {}

async def get_user_rss_sources(user_id: str, active_only: bool = True) -> List[RSSSource]:
    """
    Get RSS sources for a user.
    
    Args:
        user_id: User ID
        active_only: If True, only return active sources
        
    Returns:
        List[RSSSource]: User's RSS sources
    """
    try:
        filters = {}
        if active_only:
            filters["is_active"] = True
            
        sources_data = await find_many_by_user("rss_sources", user_id, filters)
        
        return [RSSSource(**source) for source in sources_data]
        
    except Exception as e:
        logging.error(f"Error getting user RSS sources: {e}")
        raise handle_database_error(e, "get RSS sources")

async def create_rss_source(user_id: str, name: str, url: str) -> RSSSource:
    """
    Create a new RSS source for a user.
    
    Args:
        user_id: User ID
        name: Source name
        url: RSS feed URL
        
    Returns:
        RSSSource: Created RSS source
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "create RSS source")
        
        db = get_database()
        
        # Check if source already exists for this user
        existing = await db.rss_sources.find_one({"user_id": user_id, "url": url})
        if existing:
            raise ValueError("RSS source with this URL already exists")
        
        source_data = {
            "user_id": user_id,
            "name": name,
            "url": url,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        result = await db.rss_sources.insert_one(source_data)
        source_id = str(result.inserted_id)
        
        return RSSSource(
            id=source_id,
            user_id=user_id,
            name=name,
            url=url,
            is_active=True,
            created_at=source_data["created_at"]
        )
        
    except Exception as e:
        logging.error(f"Error creating RSS source: {e}")
        raise handle_database_error(e, "create RSS source")

async def update_rss_source(user_id: str, source_id: str, is_active: bool) -> bool:
    """
    Update RSS source active status.
    
    Args:
        user_id: User ID
        source_id: RSS source ID
        is_active: New active status
        
    Returns:
        bool: True if updated successfully
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "update RSS source")
        
        db = get_database()
        
        from bson import ObjectId
        # Cast source_id to ObjectId for proper matching
        try:
            source_obj_id = ObjectId(source_id)
        except Exception:
            # If invalid ObjectId string, attempt direct string match as fallback
            source_obj_id = source_id

        result = await db.rss_sources.update_one(
            {"_id": source_obj_id, "user_id": user_id},
            {"$set": {"is_active": is_active}}
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logging.error(f"Error updating RSS source: {e}")
        raise handle_database_error(e, "update RSS source")

async def delete_rss_source(user_id: str, source_id: str) -> bool:
    """
    Delete an RSS source.
    
    Args:
        user_id: User ID
        source_id: RSS source ID to delete
        
    Returns:
        bool: True if deleted successfully
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "delete RSS source")
        
        db = get_database()
        
        from bson import ObjectId
        try:
            source_obj_id = ObjectId(source_id)
        except Exception:
            source_obj_id = source_id

        result = await db.rss_sources.delete_one({"_id": source_obj_id, "user_id": user_id})
        return result.deleted_count > 0
        
    except Exception as e:
        logging.error(f"Error deleting RSS source: {e}")
        raise handle_database_error(e, "delete RSS source")

def parse_rss_feed(url: str, use_cache: bool = True) -> Optional[feedparser.FeedParserDict]:
    """
    Parse RSS feed with optional caching.
    
    Args:
        url: RSS feed URL
        use_cache: Whether to use cached feed if available
        
    Returns:
        FeedParserDict or None: Parsed feed data or None if failed
    """
    try:
        cache_key = url
        current_time = time.time()
        
        # Check cache if enabled
        if use_cache and cache_key in RSS_CACHE:
            cached_data = RSS_CACHE[cache_key]
            if current_time - cached_data['timestamp'] < RSS_CACHE_EXPIRY_SECONDS:
                logging.info(f"Using cached feed for {url}")
                return cached_data['feed']
        
        # Parse feed
        logging.info(f"Fetching new feed for {url}")
        feed = feedparser.parse(url)
        
        # Cache the result if parsing was successful
        if use_cache and hasattr(feed, 'entries'):
            RSS_CACHE[cache_key] = {
                'feed': feed,
                'timestamp': current_time
            }
        
        return feed
        
    except Exception as e:
        logging.error(f"Error parsing RSS feed {url}: {e}")
        return None

def extract_articles_from_feed(feed: feedparser.FeedParserDict, 
                              source_name: str, 
                              max_articles: int = 10) -> List[Article]:
    """
    Extract articles from parsed RSS feed.
    
    Args:
        feed: Parsed RSS feed
        source_name: Name of the RSS source
        max_articles: Maximum number of articles to extract
        
    Returns:
        List[Article]: Extracted articles
    """
    articles = []
    
    try:
        if not hasattr(feed, 'entries'):
            logging.warning(f"Feed has no entries: {source_name}")
            return articles
        
        for entry in feed.entries[:max_articles]:
            try:
                # Extract article data
                title = getattr(entry, 'title', "No Title")
                summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                link = getattr(entry, 'link', "")
                
                # Parse published date
                published = ""
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    published = time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed)
                
                # Extract thumbnail/image URL
                thumbnail_url = None
                try:
                    # Check for media:thumbnail or media:content
                    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                        thumbnail_url = entry.media_thumbnail[0]['url']
                    elif hasattr(entry, 'media_content') and entry.media_content:
                        for media in entry.media_content:
                            if 'image' in media.get('type', ''):
                                thumbnail_url = media['url']
                                break
                    # Check for enclosures (common for images)
                    elif hasattr(entry, 'enclosures') and entry.enclosures:
                        for enclosure in entry.enclosures:
                            if enclosure.get('type', '').startswith('image/'):
                                thumbnail_url = enclosure['href']
                                break
                    # Check for links with image type
                    elif hasattr(entry, 'links') and entry.links:
                        for link_entry in entry.links:
                            if link_entry.get('type', '').startswith('image/'):
                                thumbnail_url = link_entry['href']
                                break
                    # Check summary/description for img tags (basic HTML parsing)
                    if not thumbnail_url and summary:
                        import re
                        img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
                        img_match = re.search(img_pattern, summary, re.IGNORECASE)
                        if img_match:
                            thumbnail_url = img_match.group(1)
                except Exception as img_e:
                    logging.debug(f"Error extracting image URL from entry: {img_e}")
                
                # Classify genre
                genre = classify_article_genre(title, summary)
                
                # Create article
                article = Article(
                    id=str(uuid.uuid4()),
                    title=title,
                    summary=summary,
                    link=link,
                    published=published,
                    source_name=source_name,
                    content=summary,  # Use summary as content for now
                    genre=genre,
                    thumbnail_url=thumbnail_url
                )
                
                articles.append(article)
                
            except Exception as e:
                logging.warning(f"Error extracting article from entry: {e}")
                continue
        
        logging.info(f"Extracted {len(articles)} articles from {source_name}")
        return articles
        
    except Exception as e:
        logging.error(f"Error extracting articles from feed: {e}")
        return articles

async def get_articles_for_user(user_id: str, 
                               genre: Optional[str] = None,
                               source: Optional[str] = None,
                               max_articles: int = 50) -> List[Article]:
    """
    Get articles from user's RSS sources with optional filtering.
    
    Args:
        user_id: User ID
        genre: Optional genre filter
        source: Optional source name filter
        max_articles: Maximum number of articles to return
        
    Returns:
        List[Article]: Articles from user's RSS sources
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "get articles")
        
        db = get_database()
        
        # Build source filter
        source_filter = {"user_id": user_id, "is_active": True}
        if source:
            source_filter["name"] = source
        
        # Get user's RSS sources
        sources = await db.rss_sources.find(source_filter).to_list(100)
        
        all_articles = []
        
        # Process each source
        for source_doc in sources:
            try:
                feed = parse_rss_feed(source_doc["url"])
                
                if feed:
                    articles = extract_articles_from_feed(
                        feed, 
                        source_doc["name"], 
                        max_articles=10
                    )
                    all_articles.extend(articles)
                    
            except Exception as e:
                logging.warning(f"Error processing RSS source {source_doc['url']}: {e}")
                continue
        
        logging.info(f"Fetched {len(all_articles)} articles before filtering")
        
        # Apply genre filter
        if genre:
            all_articles = [
                article for article in all_articles 
                if article.genre and article.genre.lower() == genre.lower()
            ]
            logging.info(f"Filtered to {len(all_articles)} articles for genre: {genre}")
        
        # Sort by published date (newest first) and limit results
        sorted_articles = sorted(
            all_articles, 
            key=lambda x: x.published or "", 
            reverse=True
        )
        
        return sorted_articles[:max_articles]
        
    except Exception as e:
        logging.error(f"Error getting articles for user: {e}")
        raise handle_database_error(e, "get articles")

def clear_rss_cache():
    """Clear the RSS feed cache."""
    global RSS_CACHE
    RSS_CACHE.clear()
    logging.info("RSS cache cleared")

def get_cache_stats() -> Dict[str, Any]:
    """
    Get RSS cache statistics.
    
    Returns:
        Dict: Cache statistics
    """
    current_time = time.time()
    
    total_entries = len(RSS_CACHE)
    expired_entries = 0
    
    for cache_data in RSS_CACHE.values():
        if current_time - cache_data['timestamp'] >= RSS_CACHE_EXPIRY_SECONDS:
            expired_entries += 1
    
    return {
        "total_entries": total_entries,
        "expired_entries": expired_entries,
        "active_entries": total_entries - expired_entries,
        "cache_expiry_seconds": RSS_CACHE_EXPIRY_SECONDS
    }
