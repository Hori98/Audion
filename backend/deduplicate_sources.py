#!/usr/bin/env python3
"""
Deduplicate RSS sources script
Removes duplicate RSS sources based on URL and name matching.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "audion")

async def deduplicate_sources():
    """Remove duplicate RSS sources from the database."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔍 Analyzing RSS sources for duplicates...")
    
    # Get all RSS sources
    sources = await db.rss_sources.find({}).to_list(None)
    total_sources = len(sources)
    print(f"📊 Found {total_sources} total RSS sources")
    
    # Group by URL and name
    url_groups = defaultdict(list)
    name_groups = defaultdict(list)
    
    for source in sources:
        url = source.get("url", "").strip().lower()
        name = source.get("name", "").strip().lower()
        
        if url:
            url_groups[url].append(source)
        if name:
            name_groups[name].append(source)
    
    # Find duplicates by URL
    url_duplicates = {url: sources_list for url, sources_list in url_groups.items() if len(sources_list) > 1}
    name_duplicates = {name: sources_list for name, sources_list in name_groups.items() if len(sources_list) > 1}
    
    print(f"⚠️ Found {len(url_duplicates)} duplicate URL groups")
    print(f"⚠️ Found {len(name_duplicates)} duplicate name groups")
    
    # Process URL duplicates
    to_delete = []
    for url, duplicate_sources in url_duplicates.items():
        print(f"\n🔗 URL: {url}")
        print(f"   Duplicates: {len(duplicate_sources)}")
        
        # Keep the oldest one (first created)
        oldest = min(duplicate_sources, key=lambda x: x.get("created_at", ""))
        to_keep = oldest["_id"]
        
        for source in duplicate_sources:
            if source["_id"] != to_keep:
                print(f"   🗑️ Will delete: {source.get('name', 'Unknown')} (ID: {source['_id']})")
                to_delete.append(source["_id"])
            else:
                print(f"   ✅ Will keep: {source.get('name', 'Unknown')} (ID: {source['_id']})")
    
    # Process name duplicates (only if they're not already handled by URL duplicates)
    for name, duplicate_sources in name_duplicates.items():
        # Skip if all sources in this group are already marked for deletion or keeping
        if all(source["_id"] in to_delete or source["_id"] in [s["_id"] for s in url_duplicates.get(duplicate_sources[0].get("url", "").strip().lower(), [])] for source in duplicate_sources):
            continue
            
        print(f"\n📝 Name: {name}")
        print(f"   Duplicates: {len(duplicate_sources)}")
        
        # Keep the oldest one (first created)
        oldest = min(duplicate_sources, key=lambda x: x.get("created_at", ""))
        to_keep = oldest["_id"]
        
        for source in duplicate_sources:
            if source["_id"] != to_keep and source["_id"] not in to_delete:
                print(f"   🗑️ Will delete: {source.get('url', 'Unknown')} (ID: {source['_id']})")
                to_delete.append(source["_id"])
            elif source["_id"] == to_keep:
                print(f"   ✅ Will keep: {source.get('url', 'Unknown')} (ID: {source['_id']})")
    
    print(f"\n📊 Summary:")
    print(f"   Total sources: {total_sources}")
    print(f"   To delete: {len(to_delete)}")
    print(f"   To keep: {total_sources - len(to_delete)}")
    
    if to_delete:
        print(f"\n🗑️ Auto-deleting {len(to_delete)} duplicate sources...")
        # Delete duplicates
        result = await db.rss_sources.delete_many({"_id": {"$in": to_delete}})
        print(f"✅ Deleted {result.deleted_count} duplicate sources")
    else:
        print("✅ No duplicates found to delete")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(deduplicate_sources())