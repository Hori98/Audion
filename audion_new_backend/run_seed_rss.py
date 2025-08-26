#!/usr/bin/env python3
"""
RSS Sources seed data runner
Run this script to populate the database with initial RSS sources and categories
"""

import asyncio
import sys
import os

# Add the app directory to the path so we can import our modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.core.database import get_database
from app.data.seed_rss_sources import seed_all_rss_data
# Import all models to ensure proper relationship resolution
from app.models.user import User
from app.models.rss_source import PreConfiguredRSSSource, UserRSSSource, RSSCategory


async def main():
    """Run RSS seed data population"""
    print("Starting RSS seed data population...")
    
    try:
        # Get database session
        db_gen = get_database()
        db = await anext(db_gen)
        
        # Run seed data
        await seed_all_rss_data(db)
        
        print("✅ RSS seed data population completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during RSS seed data population: {str(e)}")
        raise
    finally:
        if 'db' in locals():
            await db.close()


if __name__ == "__main__":
    asyncio.run(main())