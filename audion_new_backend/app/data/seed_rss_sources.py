"""
RSS Sources seed data - Popular Japanese RSS sources and categories
"""

import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.rss_source import PreConfiguredRSSSource, RSSCategory


async def seed_rss_categories(db: AsyncSession):
    """Seed RSS categories"""
    
    categories = [
        {
            "name": "news",
            "name_ja": "ニュース",
            "description": "General news and current affairs",
            "icon": "📰",
            "color": "#007bff",
            "sort_order": 1
        },
        {
            "name": "technology",
            "name_ja": "テクノロジー", 
            "description": "Technology and IT news",
            "icon": "💻",
            "color": "#28a745",
            "sort_order": 2
        },
        {
            "name": "business",
            "name_ja": "ビジネス",
            "description": "Business and economics",
            "icon": "💼",
            "color": "#ffc107",
            "sort_order": 3
        },
        {
            "name": "sports",
            "name_ja": "スポーツ",
            "description": "Sports news and updates",
            "icon": "⚽",
            "color": "#dc3545",
            "sort_order": 4
        },
        {
            "name": "entertainment",
            "name_ja": "エンタメ",
            "description": "Entertainment and lifestyle",
            "icon": "🎬",
            "color": "#e83e8c",
            "sort_order": 5
        },
        {
            "name": "science",
            "name_ja": "サイエンス",
            "description": "Science and research",
            "icon": "🔬",
            "color": "#6f42c1",
            "sort_order": 6
        }
    ]
    
    for cat_data in categories:
        # Check if category already exists
        existing = await db.execute(
            select(RSSCategory).where(RSSCategory.name == cat_data["name"])
        )
        if existing.scalar_one_or_none():
            continue
            
        category = RSSCategory(
            id=str(uuid.uuid4()),
            name=cat_data["name"],
            name_ja=cat_data["name_ja"],
            description=cat_data["description"],
            icon=cat_data["icon"],
            color=cat_data["color"],
            sort_order=cat_data["sort_order"],
            is_active=True
        )
        db.add(category)
    
    await db.commit()


async def seed_preconfigured_sources(db: AsyncSession):
    """Seed popular Japanese RSS sources"""
    
    sources = [
        # News Sources
        {
            "name": "NHK NEWS WEB",
            "description": "日本放送協会の総合ニュース",
            "url": "https://www3.nhk.or.jp/rss/news/cat0.xml",
            "category": "news",
            "language": "ja",
            "country": "JP",
            "popularity_score": 95,
            "reliability_score": 98,
            "is_featured": True,
            "favicon_url": "https://www.nhk.or.jp/favicon.ico",
            "website_url": "https://www3.nhk.or.jp/news/"
        },
        {
            "name": "朝日新聞デジタル",
            "description": "朝日新聞社の総合ニュース",
            "url": "https://www.asahi.com/rss/asahi/newsheadlines.rdf",
            "category": "news", 
            "language": "ja",
            "country": "JP",
            "popularity_score": 90,
            "reliability_score": 95,
            "is_featured": True,
            "favicon_url": "https://www.asahi.com/favicon.ico",
            "website_url": "https://www.asahi.com/"
        },
        {
            "name": "読売新聞オンライン",
            "description": "読売新聞社の総合ニュース",
            "url": "https://www.yomiuri.co.jp/rss/",
            "category": "news",
            "language": "ja", 
            "country": "JP",
            "popularity_score": 88,
            "reliability_score": 94,
            "is_featured": True,
            "favicon_url": "https://www.yomiuri.co.jp/favicon.ico",
            "website_url": "https://www.yomiuri.co.jp/"
        },
        {
            "name": "毎日新聞",
            "description": "毎日新聞社の総合ニュース",
            "url": "https://mainichi.jp/rss/etc/mainichi-flash.rss",
            "category": "news",
            "language": "ja",
            "country": "JP", 
            "popularity_score": 85,
            "reliability_score": 92,
            "is_featured": True,
            "favicon_url": "https://mainichi.jp/favicon.ico",
            "website_url": "https://mainichi.jp/"
        },
        
        # Technology Sources
        {
            "name": "ITmedia NEWS",
            "description": "IT・テクノロジーの最新ニュース",
            "url": "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
            "category": "technology",
            "language": "ja",
            "country": "JP",
            "popularity_score": 82,
            "reliability_score": 90,
            "is_featured": True,
            "favicon_url": "https://www.itmedia.co.jp/favicon.ico",
            "website_url": "https://www.itmedia.co.jp/news/"
        },
        {
            "name": "CNET Japan",
            "description": "テクノロジー＆ビジネス情報のメディア",
            "url": "https://feeds.japan.cnet.com/rss/cnet/all.rdf",
            "category": "technology",
            "language": "ja",
            "country": "JP",
            "popularity_score": 78,
            "reliability_score": 88,
            "is_featured": False,
            "favicon_url": "https://japan.cnet.com/favicon.ico",
            "website_url": "https://japan.cnet.com/"
        },
        {
            "name": "Engadget日本版",
            "description": "デジタルガジェット情報",
            "url": "https://feeds.engadget.com/engadget/japanese",
            "category": "technology",
            "language": "ja",
            "country": "JP",
            "popularity_score": 75,
            "reliability_score": 85,
            "is_featured": False,
            "favicon_url": "https://www.engadget.com/favicon.ico",
            "website_url": "https://japanese.engadget.com/"
        },
        
        # Business Sources
        {
            "name": "日本経済新聞",
            "description": "経済・ビジネスニュース",
            "url": "https://www.nikkei.com/content/rss/",
            "category": "business",
            "language": "ja",
            "country": "JP",
            "popularity_score": 92,
            "reliability_score": 96,
            "is_featured": True,
            "favicon_url": "https://www.nikkei.com/favicon.ico",
            "website_url": "https://www.nikkei.com/"
        },
        {
            "name": "東洋経済オンライン",
            "description": "ビジネス・経済情報サイト",
            "url": "https://feed.toyokeizai.net/rss",
            "category": "business",
            "language": "ja",
            "country": "JP",
            "popularity_score": 80,
            "reliability_score": 87,
            "is_featured": False,
            "favicon_url": "https://toyokeizai.net/favicon.ico",
            "website_url": "https://toyokeizai.net/"
        },
        
        # Sports Sources
        {
            "name": "スポーツナビ",
            "description": "Yahoo!のスポーツ総合サイト",
            "url": "https://sports.yahoo.co.jp/rss.xml",
            "category": "sports",
            "language": "ja",
            "country": "JP",
            "popularity_score": 85,
            "reliability_score": 88,
            "is_featured": True,
            "favicon_url": "https://s.yimg.jp/favicon.ico",
            "website_url": "https://sports.yahoo.co.jp/"
        },
        {
            "name": "スポーツ報知",
            "description": "報知新聞社のスポーツニュース",
            "url": "https://hochi.news/rss/",
            "category": "sports", 
            "language": "ja",
            "country": "JP",
            "popularity_score": 72,
            "reliability_score": 82,
            "is_featured": False,
            "favicon_url": "https://hochi.news/favicon.ico",
            "website_url": "https://hochi.news/"
        },
        
        # Entertainment Sources
        {
            "name": "オリコンニュース",
            "description": "エンタメ・芸能ニュース",
            "url": "https://www.oricon.co.jp/rss/news/",
            "category": "entertainment",
            "language": "ja",
            "country": "JP",
            "popularity_score": 78,
            "reliability_score": 80,
            "is_featured": False,
            "favicon_url": "https://www.oricon.co.jp/favicon.ico", 
            "website_url": "https://www.oricon.co.jp/"
        },
        
        # Science Sources
        {
            "name": "科学技術振興機構",
            "description": "科学技術に関する情報",
            "url": "https://www.jst.go.jp/rss/",
            "category": "science",
            "language": "ja",
            "country": "JP",
            "popularity_score": 65,
            "reliability_score": 92,
            "is_featured": False,
            "favicon_url": "https://www.jst.go.jp/favicon.ico",
            "website_url": "https://www.jst.go.jp/"
        }
    ]
    
    for source_data in sources:
        # Check if source already exists
        existing = await db.execute(
            select(PreConfiguredRSSSource).where(PreConfiguredRSSSource.url == source_data["url"])
        )
        if existing.scalar_one_or_none():
            continue
            
        source = PreConfiguredRSSSource(
            id=str(uuid.uuid4()),
            name=source_data["name"],
            description=source_data["description"],
            url=source_data["url"],
            category=source_data["category"],
            language=source_data["language"],
            country=source_data["country"],
            popularity_score=source_data["popularity_score"],
            reliability_score=source_data["reliability_score"],
            is_featured=source_data["is_featured"],
            is_active=True,
            favicon_url=source_data.get("favicon_url"),
            website_url=source_data.get("website_url")
        )
        db.add(source)
    
    await db.commit()


async def seed_all_rss_data(db: AsyncSession):
    """Seed all RSS data - categories and sources"""
    await seed_rss_categories(db)
    await seed_preconfigured_sources(db)
    print("RSS seed data created successfully!")