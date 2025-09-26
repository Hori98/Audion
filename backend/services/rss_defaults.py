"""
RSS Default Sources for New Users
新規ユーザー登録時に自動設定される基本RSSソース
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any
import logging
from config.database import get_database

# デフォルトRSSソース設定
DEFAULT_RSS_SOURCES = [
    {
        "name": "NHK NEWS WEB",
        "url": "https://www3.nhk.or.jp/rss/news/cat0.xml",
        "category": "news",
        "genre": "ニュース",
        "is_default": True
    },
    {
        "name": "ITmedia NEWS",
        "url": "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
        "category": "technology",
        "genre": "テクノロジー",
        "is_default": True
    },
    {
        "name": "Yahoo!ニュース",
        "url": "https://news.yahoo.co.jp/rss/topics/top-picks.xml",
        "category": "news",
        "genre": "ニュース",
        "is_default": True
    },
    {
        "name": "CNET Japan",
        "url": "https://feeds.japan.cnet.com/rss/cnet/all.rdf",
        "category": "technology",
        "genre": "テクノロジー",
        "is_default": True
    },
    {
        "name": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "category": "technology",
        "genre": "テクノロジー",
        "is_default": True
    }
]

async def setup_default_rss_sources(user_id: str) -> bool:
    """
    新規ユーザーにデフォルトRSSソースを設定

    Args:
        user_id: ユーザーID

    Returns:
        bool: 設定成功の場合True
    """
    try:
        db = get_database()

        # 既存のRSSソースがあるかチェック
        existing_count = await db.rss_sources.count_documents({"user_id": user_id})
        if existing_count > 0:
            logging.info(f"User {user_id} already has RSS sources, skipping defaults")
            return True

        # デフォルトソースを追加
        sources_to_insert = []
        for source_config in DEFAULT_RSS_SOURCES:
            rss_source = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": source_config["name"],
                "url": source_config["url"],
                "custom_name": source_config["name"],
                "custom_url": source_config["url"],
                "custom_category": source_config["category"],
                "category": source_config["category"],
                "genre": source_config["genre"],
                "is_active": True,
                "notification_enabled": True,
                "last_article_count": 0,
                "fetch_error_count": 0,
                "created_at": datetime.utcnow().isoformat(),
                "display_name": source_config["name"],
                "display_url": source_config["url"],
                "display_category": source_config["category"],
                "is_default": source_config.get("is_default", True)
            }
            sources_to_insert.append(rss_source)

        # 一括挿入
        if sources_to_insert:
            result = await db.rss_sources.insert_many(sources_to_insert)
            logging.info(f"✅ Added {len(result.inserted_ids)} default RSS sources for user {user_id}")
            return True

        return False

    except Exception as e:
        logging.error(f"❌ Error setting up default RSS sources for user {user_id}: {e}")
        return False

async def get_default_sources_count() -> int:
    """
    デフォルトRSSソース数を取得

    Returns:
        int: デフォルトソース数
    """
    return len(DEFAULT_RSS_SOURCES)