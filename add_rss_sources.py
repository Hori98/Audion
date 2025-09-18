#!/usr/bin/env python
"""
Add comprehensive RSS sources to MongoDB for testing
"""
import asyncio
import os
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def add_rss_sources():
    # Load environment variables
    load_dotenv('backend/.env')
    
    # Get MongoDB URL
    mongo_url = os.getenv('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL not found in environment variables")
        return
    
    # Test user ID (the one that is already in database)
    test_user_id = "8135236f-38cd-4cd8-b67f-2972db82ef94"  # From debug output
    
    # Comprehensive RSS source list (Japanese + US sources)
    rss_sources = [
        # 日本のニュースメディア
        {
            "name": "NHK NEWS WEB",
            "url": "https://www3.nhk.or.jp/rss/news/cat0.xml",
            "custom_name": "NHK NEWS WEB",
            "custom_url": "https://www3.nhk.or.jp/rss/news/cat0.xml",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "朝日新聞デジタル",
            "url": "https://www.asahi.com/rss/asahi/newsheadlines.rdf",
            "custom_name": "朝日新聞デジタル",
            "custom_url": "https://www.asahi.com/rss/asahi/newsheadlines.rdf",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "毎日新聞",
            "url": "https://mainichi.jp/rss/etc/mainichi-flash.rss",
            "custom_name": "毎日新聞",
            "custom_url": "https://mainichi.jp/rss/etc/mainichi-flash.rss",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "読売新聞オンライン",
            "url": "https://www.yomiuri.co.jp/rss/",
            "custom_name": "読売新聞オンライン",
            "custom_url": "https://www.yomiuri.co.jp/rss/",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "日本経済新聞",
            "url": "https://www.nikkei.com/news/feed/",
            "custom_name": "日本経済新聞",
            "custom_url": "https://www.nikkei.com/news/feed/",
            "custom_category": "business",
            "category": "business",
            "genre": "ビジネス"
        },
        {
            "name": "ITmedia NEWS",
            "url": "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
            "custom_name": "ITmedia NEWS",
            "custom_url": "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
            "custom_category": "technology",
            "category": "technology",
            "genre": "テクノロジー"
        },
        {
            "name": "CNET Japan",
            "url": "https://feeds.japan.cnet.com/rss/cnet/all.rdf",
            "custom_name": "CNET Japan",
            "custom_url": "https://feeds.japan.cnet.com/rss/cnet/all.rdf",
            "custom_category": "technology",
            "category": "technology",
            "genre": "テクノロジー"
        },
        {
            "name": "Engadget 日本版",
            "url": "https://japanese.engadget.com/rss.xml",
            "custom_name": "Engadget 日本版",
            "custom_url": "https://japanese.engadget.com/rss.xml",
            "custom_category": "technology",
            "category": "technology",
            "genre": "テクノロジー"
        },
        {
            "name": "TechCrunch Japan",
            "url": "https://jp.techcrunch.com/feed/",
            "custom_name": "TechCrunch Japan",
            "custom_url": "https://jp.techcrunch.com/feed/",
            "custom_category": "technology",
            "category": "technology",
            "genre": "テクノロジー"
        },
        {
            "name": "Yahoo!ニュース",
            "url": "https://news.yahoo.co.jp/rss/topics/top-picks.xml",
            "custom_name": "Yahoo!ニュース",
            "custom_url": "https://news.yahoo.co.jp/rss/topics/top-picks.xml",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "スポーツニッポン",
            "url": "https://www.sponichi.co.jp/rss/",
            "custom_name": "スポーツニッポン",
            "custom_url": "https://www.sponichi.co.jp/rss/",
            "custom_category": "sports",
            "category": "sports",
            "genre": "スポーツ"
        },
        
        # US News Sources  
        {
            "name": "CNN",
            "url": "http://rss.cnn.com/rss/edition.rss",
            "custom_name": "CNN",
            "custom_url": "http://rss.cnn.com/rss/edition.rss",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "BBC News",
            "url": "http://feeds.bbci.co.uk/news/rss.xml",
            "custom_name": "BBC News",
            "custom_url": "http://feeds.bbci.co.uk/news/rss.xml",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "Reuters",
            "url": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
            "custom_name": "Reuters",
            "custom_url": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
            "custom_category": "business",
            "category": "business",
            "genre": "ビジネス"
        },
        {
            "name": "The New York Times",
            "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
            "custom_name": "The New York Times",
            "custom_url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "The Guardian",
            "url": "https://www.theguardian.com/world/rss",
            "custom_name": "The Guardian",
            "custom_url": "https://www.theguardian.com/world/rss",
            "custom_category": "news",
            "category": "news",
            "genre": "ニュース"
        },
        {
            "name": "TechCrunch",
            "url": "https://techcrunch.com/feed/",
            "custom_name": "TechCrunch",
            "custom_url": "https://techcrunch.com/feed/",
            "custom_category": "technology",
            "category": "technology",
            "genre": "テクノロジー"
        },
        {
            "name": "The Verge",
            "url": "https://www.theverge.com/rss/index.xml",
            "custom_name": "The Verge",
            "custom_url": "https://www.theverge.com/rss/index.xml",
            "custom_category": "technology",
            "category": "technology",
            "genre": "テクノロジー"
        },
        {
            "name": "Wired",
            "url": "https://www.wired.com/feed/rss",
            "custom_name": "Wired",
            "custom_url": "https://www.wired.com/feed/rss",
            "custom_category": "technology",
            "category": "technology",
            "genre": "テクノロジー"
        },
        {
            "name": "ESPN",
            "url": "https://www.espn.com/espn/rss/news",
            "custom_name": "ESPN",
            "custom_url": "https://www.espn.com/espn/rss/news",
            "custom_category": "sports",
            "category": "sports",
            "genre": "スポーツ"
        },
        {
            "name": "Wall Street Journal",
            "url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
            "custom_name": "Wall Street Journal",
            "custom_url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
            "custom_category": "business",
            "category": "business",
            "genre": "ビジネス"
        }
    ]
    
    try:
        # Create client and connect
        client = AsyncIOMotorClient(mongo_url)
        db = client["Audion_DB"]
        
        print(f"💾 Adding {len(rss_sources)} RSS sources to database for user: {test_user_id}")
        
        inserted_count = 0
        for source in rss_sources:
            # Check if already exists
            existing = await db.rss_sources.find_one({
                "user_id": test_user_id,
                "url": source["url"]
            })
            
            if existing:
                print(f"⏭️  Skipping existing source: {source['name']}")
                continue
            
            # Create RSS source document
            new_source = {
                "id": str(uuid.uuid4()),
                "user_id": test_user_id,
                "name": source["name"],
                "url": source["url"],
                "custom_name": source["custom_name"],
                "custom_url": source["custom_url"],
                "custom_category": source["custom_category"],
                "category": source["category"],
                "genre": source["genre"],
                "is_active": True,
                "notification_enabled": True,
                "last_article_count": 0,
                "fetch_error_count": 0,
                "created_at": datetime.utcnow().isoformat(),
                "display_name": source["custom_name"],
                "display_url": source["custom_url"],
                "display_category": source["custom_category"]
            }
            
            # Insert to database
            result = await db.rss_sources.insert_one(new_source)
            print(f"✅ Added: {source['name']} (ID: {result.inserted_id})")
            inserted_count += 1
        
        print(f"\n🎉 Successfully added {inserted_count} new RSS sources!")
        
        # Final count check
        total_count = await db.rss_sources.count_documents({"user_id": test_user_id})
        print(f"📊 Total RSS sources for user: {total_count}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(add_rss_sources())