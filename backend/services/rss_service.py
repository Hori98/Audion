"""
RSS feed processing service with caching and article extraction.
"""

import logging
import time
import uuid
import feedparser
from typing import List, Optional, Dict, Any
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config.settings import RSS_CACHE_EXPIRY_SECONDS
from config.database import get_database, is_database_connected
from models.article import Article
from models.rss import RSSSource
from services.article_service import classify_article_genre, normalize_genre
from utils.errors import handle_database_error, handle_generic_error
from utils.database import find_many_by_user, find_one_by_id, update_document, delete_document

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
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": name,
            "url": url,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        await db.rss_sources.insert_one(source_data)
        source_id = source_data["id"]
        
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
        
        # Use database utils to target Mongo _id consistently
        # Frontend receives `id` derived from Mongo `_id`; use that here
        updated = await update_document(
            "rss_sources",
            source_id,
            {"is_active": is_active},
            user_id=user_id,
        )
        return updated
        
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
        
        # Use database utils to delete by Mongo `_id` consistently
        deleted = await delete_document("rss_sources", source_id, user_id=user_id)
        return deleted
        
    except Exception as e:
        logging.error(f"Error deleting RSS source: {e}")
        raise handle_database_error(e, "delete RSS source")

# Configuration for HTTP requests
RSS_REQUEST_TIMEOUT = 10  # seconds
RSS_MAX_WORKERS = 8  # Parallel workers for RSS fetching

def create_http_session() -> requests.Session:
    """Create a configured HTTP session with retries and timeout."""
    session = requests.Session()

    # Configure retry strategy
    retry_strategy = Retry(
        total=2,
        status_forcelist=[429, 500, 502, 503, 504],
        backoff_factor=1
    )

    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    return session

def parse_rss_feed_safe(url: str, use_cache: bool = True) -> Optional[feedparser.FeedParserDict]:
    """
    Safe RSS feed parsing with timeout and error handling.
    Optimized for parallel processing.

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
                logging.debug(f"Using cached feed for {url}")
                return cached_data['feed']

        # Create HTTP session with timeout
        session = create_http_session()

        # Fetch with timeout
        logging.debug(f"Fetching feed: {url}")
        response = session.get(url, timeout=RSS_REQUEST_TIMEOUT)
        response.raise_for_status()

        # Parse feed from response content
        feed = feedparser.parse(response.content)

        # Cache the result if parsing was successful
        if use_cache and hasattr(feed, 'entries') and len(feed.entries) > 0:
            RSS_CACHE[cache_key] = {
                'feed': feed,
                'timestamp': current_time
            }
            logging.debug(f"Cached feed with {len(feed.entries)} entries for {url}")

        return feed

    except requests.exceptions.Timeout:
        logging.debug(f"Timeout fetching RSS feed: {url}")
        return None
    except requests.exceptions.RequestException as e:
        logging.debug(f"Request error for RSS feed {url}: {e}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error parsing RSS feed {url}: {e}")
        return None

def parse_rss_feed(url: str, use_cache: bool = True) -> Optional[feedparser.FeedParserDict]:
    """
    Parse RSS feed with optional caching - backward compatibility wrapper.
    """
    return parse_rss_feed_safe(url, use_cache)

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
                
                # Classify genre and normalize to UI-aligned categories
                coarse_genre = classify_article_genre(title, summary)
                genre = normalize_genre(title, summary, coarse_genre)
                
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

def fetch_single_source_articles(source_doc: Dict[str, Any]) -> List[Article]:
    """
    Fetch articles from a single RSS source - optimized for parallel processing.

    Args:
        source_doc: RSS source document from database

    Returns:
        List[Article]: Articles from this source
    """
    try:
        feed = parse_rss_feed_safe(source_doc["url"])

        if feed:
            articles = extract_articles_from_feed(
                feed,
                source_doc["name"],
                max_articles=10
            )
            logging.debug(f"Fetched {len(articles)} articles from {source_doc['name']}")
            return articles
        else:
            logging.warning(f"Failed to parse feed from {source_doc['name']}: {source_doc['url']}")
            return []

    except Exception as e:
        logging.warning(f"Error processing RSS source {source_doc.get('name', 'unknown')}: {e}")
        return []

async def get_articles_for_user(user_id: str,
                               genre: Optional[str] = None,
                               source: Optional[str] = None,
                               max_articles: int = 50) -> List[Article]:
    """
    Get articles from user's RSS sources with parallel processing for high performance.

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

        if not sources:
            logging.info(f"No active RSS sources found for user {user_id}")
            return []

        all_articles = []
        start_time = time.time()

        # **PARALLEL PROCESSING**: Process RSS sources concurrently
        with ThreadPoolExecutor(max_workers=RSS_MAX_WORKERS) as executor:
            # Submit all RSS source processing jobs
            future_to_source = {
                executor.submit(fetch_single_source_articles, source_doc): source_doc
                for source_doc in sources
            }

            # Collect results as they complete
            for future in as_completed(future_to_source):
                source_doc = future_to_source[future]
                try:
                    articles = future.result()
                    all_articles.extend(articles)
                except Exception as exc:
                    logging.warning(f"RSS source {source_doc.get('name', 'unknown')} generated exception: {exc}")

        processing_time = time.time() - start_time
        logging.info(f"Fetched {len(all_articles)} articles from {len(sources)} sources in {processing_time:.2f}s (parallel)")

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

def fetch_curated_source_articles(source_data: Dict[str, Any]) -> List[Article]:
    """
    Fetch articles from a single curated RSS source - optimized for parallel processing.

    Args:
        source_data: Source data with 'source', 'category', and other metadata

    Returns:
        List[Article]: Articles from this source
    """
    try:
        source = source_data["source"]
        category = source_data["category"]

        # Parse RSS feed
        feed = parse_rss_feed_safe(source["url"], use_cache=True)
        if not feed:
            logging.debug(f"Failed to parse curated feed from {source['name']}")
            return []

        # Extract articles from feed
        articles = extract_articles_from_feed(
            feed,
            source["name"],
            max_articles=10  # Limit per source
        )

        # Set source metadata and genre for each article
        for article in articles:
            article.source_name = source["name"]
            article.source_id = source["id"]
            article.genre = category["name"]

        logging.debug(f"Fetched {len(articles)} curated articles from {source['name']}")
        return articles

    except Exception as e:
        logging.warning(f"Error processing curated RSS source {source_data['source'].get('name', 'unknown')}: {e}")
        return []

async def get_curated_articles(genre: Optional[str] = None, max_articles: int = 50) -> List[Article]:
    """
    Get articles from preset RSS sources (for Home tab) with parallel processing.

    Args:
        genre: Optional genre filter
        max_articles: Maximum number of articles to return

    Returns:
        List[Article]: Articles from curated RSS sources
    """
    import json
    import os

    try:
        # Load preset RSS sources
        preset_file_path = os.path.join(os.path.dirname(__file__), "../presets/jp_rss_sources.json")

        if not os.path.exists(preset_file_path):
            logging.error(f"Preset RSS sources file not found: {preset_file_path}")
            return []

        with open(preset_file_path, 'r', encoding='utf-8') as f:
            preset_data = json.load(f)

        # Prepare source data for parallel processing
        sources_to_process = []

        # Process each category
        for category in preset_data.get("categories", []):
            # Skip category if genre filter doesn't match
            if genre and genre != 'すべて' and category.get("name") != genre:
                continue

            # Collect active sources
            for source in category.get("sources", []):
                if source.get("is_active", True):
                    sources_to_process.append({
                        "source": source,
                        "category": category
                    })

        if not sources_to_process:
            logging.info(f"No active curated sources found for genre: {genre}")
            return []

        all_articles = []
        start_time = time.time()

        # **PARALLEL PROCESSING**: Process curated RSS sources concurrently
        with ThreadPoolExecutor(max_workers=RSS_MAX_WORKERS) as executor:
            # Submit all RSS source processing jobs
            future_to_source = {
                executor.submit(fetch_curated_source_articles, source_data): source_data
                for source_data in sources_to_process
            }

            # Collect results as they complete
            for future in as_completed(future_to_source):
                source_data = future_to_source[future]
                try:
                    articles = future.result()
                    all_articles.extend(articles)
                except Exception as exc:
                    logging.warning(f"Curated RSS source {source_data['source'].get('name', 'unknown')} generated exception: {exc}")

        processing_time = time.time() - start_time
        logging.info(f"Fetched {len(all_articles)} curated articles from {len(sources_to_process)} sources in {processing_time:.2f}s (parallel)")

        # Apply genre filter if specified (additional safety check)
        if genre and genre != 'すべて':
            all_articles = [
                article for article in all_articles
                if article.genre and article.genre == genre
            ]
            logging.info(f"Filtered to {len(all_articles)} articles for genre: {genre}")

        # Sort by published date (newest first) and limit results
        sorted_articles = sorted(
            all_articles,
            key=lambda x: x.published or "",
            reverse=True
        )

        result = sorted_articles[:max_articles]
        logging.info(f"Returning {len(result)} curated articles")
        return result

    except Exception as e:
        logging.error(f"Error getting curated articles: {e}")
        raise handle_generic_error(e, "get curated articles")
