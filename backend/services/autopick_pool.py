"""
AutoPick article pool resolver.

Builds the article pool from either frontend-provided candidates (home scope)
or the user's active RSS sources (feed/default scope), with simple caching.
"""

from typing import List, Dict, Any
import time
import uuid
import feedparser
import logging

from backend.models.article import Article, AutoPickRequest
from backend.services.article_service import classify_article_genre as classify_genre


async def resolve_article_pool_for_request(
    request: AutoPickRequest,
    user_id: str,
    db,
    db_connected: bool,
    rss_cache: Dict[str, Dict[str, Any]],
    cache_expiry_seconds: int,
) -> List[Article]:
    """Build the article pool for AutoPick.

    - If `tab_scope == 'home'` and `candidates` present: use candidates only
    - Else: fetch from user's active RSS sources (fallback)
    """
    all_articles: List[Article] = []

    # Home scope with candidates
    if (request.tab_scope or '').lower() == 'home' and request.candidates:
        for c in request.candidates:
            try:
                title = c.title or "No Title"
                summary = c.summary or ("No summary available")
                genre = classify_genre(title, summary)
                all_articles.append(Article(
                    id=c.id or str(uuid.uuid4()),
                    title=title,
                    summary=summary,
                    link=c.link or "",
                    published=c.published_at or "",
                    source_name=c.source_name or "Home Candidates",
                    content=summary,
                    genre=genre,
                ))
            except Exception as ce:
                logging.warning(f"Failed to convert candidate to Article: {ce}")
        return all_articles

    # RSS sources path
    if not db_connected or db is None:
        return []

    sources = await db.rss_sources.find({
        "user_id": user_id,
        "$or": [
            {"is_active": {"$ne": False}},
            {"is_active": {"$exists": False}}
        ]
    }).to_list(100)

    for source in sources:
        try:
            cache_key = source["url"]
            current_time = time.time()
            if cache_key in rss_cache and (current_time - rss_cache[cache_key]['timestamp'] < cache_expiry_seconds):
                feed = rss_cache[cache_key]['feed']
            else:
                feed = feedparser.parse(source["url"])
                rss_cache[cache_key] = {'feed': feed, 'timestamp': current_time}

            for entry in getattr(feed, 'entries', [])[:20]:
                article_title = getattr(entry, 'title', "No Title")
                article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                article_genre = classify_genre(article_title, article_summary)
                all_articles.append(Article(
                    id=str(uuid.uuid4()),
                    title=article_title,
                    summary=article_summary,
                    link=getattr(entry, 'link', ""),
                    published=time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else "",
                    source_name=source["name"],
                    content=article_summary,
                    genre=article_genre
                ))
        except Exception as e:
            logging.warning(f"Error parsing RSS feed {source.get('url','')} : {e}")
            continue

    return all_articles
