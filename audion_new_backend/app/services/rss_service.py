"""
RSS Service - Handles RSS feed parsing and article extraction
Clean implementation focused on core functionality
"""

import asyncio
import hashlib
import httpx
import feedparser
from datetime import datetime
from typing import List, Optional
from urllib.parse import urljoin, urlparse

from app.models.article import Article, ArticleCreate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class RSSService:
    """RSS feed processing service"""
    
    @staticmethod
    async def fetch_feed(url: str) -> Optional[dict]:
        """Fetch RSS feed from URL with timeout"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # Parse RSS feed
                feed_data = feedparser.parse(response.content)
                
                if feed_data.bozo:
                    # Feed parsing error
                    return None
                    
                return feed_data
                
        except (httpx.HTTPError, httpx.TimeoutException):
            return None
    
    @staticmethod
    def parse_articles(feed_data: dict, source_name: str) -> List[ArticleCreate]:
        """Parse articles from RSS feed data"""
        articles = []
        
        # Get feed info
        feed_title = feed_data.feed.get('title', source_name)
        
        for entry in feed_data.entries:
            # Extract article data
            title = entry.get('title', 'Untitled')
            summary = entry.get('summary', '') or entry.get('description', '')
            url = entry.get('link', '')
            
            if not url:
                continue
                
            # Parse published date
            published_at = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6])
                except (TypeError, ValueError):
                    pass
            
            if not published_at:
                published_at = datetime.utcnow()
            
            # Extract content
            content = ""
            if hasattr(entry, 'content'):
                content = entry.content[0].get('value', '') if entry.content else ''
            elif hasattr(entry, 'description'):
                content = entry.description
            
            # Estimate reading time (simple word count method)
            word_count = len((title + ' ' + summary + ' ' + content).split())
            reading_time = max(1, word_count // 200)  # Assume 200 words per minute
            
            article = ArticleCreate(
                title=title,
                summary=summary or "No summary available",
                url=url,
                source_name=feed_title,
                published_at=published_at,
                content=content,
                reading_time=reading_time
            )
            
            articles.append(article)
        
        return articles
    
    @staticmethod
    async def save_articles(articles: List[ArticleCreate], db: AsyncSession) -> int:
        """Save articles to database, avoiding duplicates"""
        saved_count = 0
        
        try:
            for article_data in articles:
                # Check if article already exists by URL
                result = await db.execute(
                    select(Article).where(Article.url == str(article_data.url))
                )
                existing = result.scalar_one_or_none()
                
                if existing:
                    continue
                
                # Create new article
                article = Article(
                    title=article_data.title,
                    summary=article_data.summary,
                    content=article_data.content,
                    url=str(article_data.url),
                    source_name=article_data.source_name,
                    published_at=article_data.published_at,
                    reading_time=article_data.reading_time
                )
                
                db.add(article)
                saved_count += 1
            
            await db.commit()
            
        except Exception as e:
            await db.rollback()
            raise e
        
        return saved_count
    
    @classmethod
    async def process_rss_url(cls, url: str, db: AsyncSession) -> dict:
        """Process RSS URL and return results"""
        # Fetch feed
        feed_data = await cls.fetch_feed(url)
        if not feed_data:
            return {"success": False, "message": "Failed to fetch RSS feed"}
        
        # Extract source name from feed or URL
        source_name = feed_data.feed.get('title', urlparse(url).netloc)
        
        # Parse articles
        articles = cls.parse_articles(feed_data, source_name)
        if not articles:
            return {"success": False, "message": "No articles found in feed"}
        
        # Save articles
        try:
            saved_count = await cls.save_articles(articles, db)
            return {
                "success": True,
                "message": f"Successfully processed {len(articles)} articles, saved {saved_count} new ones",
                "total_articles": len(articles),
                "new_articles": saved_count,
                "source_name": source_name
            }
        except Exception as e:
            return {"success": False, "message": f"Error saving articles: {str(e)}"}


# RSS URL validation helper
def is_valid_rss_url(url: str) -> bool:
    """Basic RSS URL validation"""
    try:
        parsed = urlparse(url)
        return parsed.scheme in ('http', 'https') and parsed.netloc
    except:
        return False