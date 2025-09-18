#!/usr/bin/env python
"""
Debug script to check RSS sources in MongoDB
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId

async def debug_rss_sources():
    # Load environment variables
    load_dotenv('backend/.env')
    
    # Get MongoDB URL
    mongo_url = os.getenv('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL not found in environment variables")
        return
    
    # Hide the password in the URL for display
    display_url = mongo_url.split('@')[1] if '@' in mongo_url else mongo_url
    print(f"MongoDB URL: mongodb+srv://***:***@{display_url}")
    
    try:
        # Create client and connect
        client = AsyncIOMotorClient(mongo_url)
        db = client["Audion_DB"]
        
        # Check rss_sources collection
        print("\n=== RSS Sources Collection ===")
        rss_count = await db.rss_sources.count_documents({})
        print(f"📊 Total RSS sources: {rss_count}")
        
        if rss_count > 0:
            # Get all RSS sources
            rss_sources = []
            async for doc in db.rss_sources.find({}):
                rss_sources.append(doc)
            
            print(f"\n📋 Found {len(rss_sources)} RSS sources:")
            for i, source in enumerate(rss_sources[:10]):  # Show only first 10
                print(f"  {i+1}. ID: {source.get('_id')}")
                print(f"     Name: {source.get('name', 'N/A')}")
                print(f"     URL: {source.get('url', 'N/A')}")
                print(f"     User ID: {source.get('user_id', 'N/A')}")
                print(f"     Type: {type(source.get('user_id'))}")
                print()
        
        # Check users collection
        print("\n=== Users Collection ===")
        users_count = await db.users.count_documents({})
        print(f"📊 Total users: {users_count}")
        
        if users_count > 0:
            # Get all users
            print(f"\n👥 User IDs:")
            async for doc in db.users.find({}, {"_id": 1, "email": 1}):
                print(f"  User ID: {doc['_id']} (Type: {type(doc['_id'])}) - Email: {doc.get('email', 'N/A')}")
        
        # Check if there's a specific user ID from the token
        print("\n=== Token User Check ===")
        token_user_id = "571c864e-b152-4f5e-a670-07b7e7f0e66a"
        print(f"Looking for user with ID: {token_user_id}")
        
        # Try to find user as string
        user_by_string = await db.users.find_one({"_id": token_user_id})
        print(f"User found by string ID: {'Yes' if user_by_string else 'No'}")
        
        # Try to find user as ObjectId (this should work after our fix)
        try:
            user_by_objectid = await db.users.find_one({"_id": ObjectId(token_user_id)})
            print(f"User found by ObjectId: {'Yes' if user_by_objectid else 'No'}")
        except Exception as e:
            print(f"Error converting to ObjectId: {e}")
        
        # Check RSS sources for this specific user_id
        user_rss_sources = await db.rss_sources.count_documents({"user_id": token_user_id})
        print(f"RSS sources for user {token_user_id}: {user_rss_sources}")
        
        # Check all RSS sources
        print("\n=== All RSS Sources ===")
        async for doc in db.rss_sources.find({}):
            print(f"  RSS ID: {doc.get('_id')}")
            print(f"  Name: {doc.get('custom_name', doc.get('name', 'N/A'))}")
            print(f"  User ID: {doc.get('user_id', 'N/A')} (Type: {type(doc.get('user_id'))})")
            print()
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_rss_sources())