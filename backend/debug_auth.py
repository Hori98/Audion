#!/usr/bin/env python3

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logging.basicConfig(level=logging.INFO)

async def debug_user_lookup():
    """デバッグ：ユーザーの認証問題を調査"""
    
    # MongoDB接続
    MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    DB_NAME = os.getenv('DB_NAME', 'audion_db')
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # テスト用のトークン
        test_token = "8135236f-38cd-4cd8-b67f-2972db82ef94"
        
        print(f"🔍 Testing authentication with token: {test_token}")
        
        # ユーザー検索（現在のロジック）
        user_by_id = await db.users.find_one({"id": test_token})
        print(f"📄 User found by id field: {user_by_id is not None}")
        if user_by_id:
            print(f"📄 User data: {user_by_id}")
            
        # 別のフィールド名でも試してみる
        user_by_token = await db.users.find_one({"token": test_token})
        print(f"📄 User found by token field: {user_by_token is not None}")
        
        # _idフィールドでも試してみる
        user_by_mongodb_id = await db.users.find_one({"_id": test_token})
        print(f"📄 User found by _id field: {user_by_mongodb_id is not None}")
        
        # 全ユーザーの一覧表示（最初の5件）
        print(f"\n🗃️ First 5 users in database:")
        users = await db.users.find().limit(5).to_list(5)
        for user in users:
            print(f"   - ID: {user.get('id', 'N/A')}, Email: {user.get('email', 'N/A')}")
            
        # プロファイルコレクションも確認
        print(f"\n🗃️ First 5 profiles in database:")
        profiles = await db.profiles.find().limit(5).to_list(5)
        for profile in profiles:
            print(f"   - Profile ID: {profile.get('id', 'N/A')}, User ID: {profile.get('user_id', 'N/A')}")
            
        # 古いトークンが別のコレクションにないか確認
        print(f"\n🔍 Checking all collections for the token...")
        collections = await db.list_collection_names()
        print(f"Available collections: {collections}")
        
        for collection_name in collections:
            collection = db[collection_name]
            count = await collection.count_documents({"$or": [
                {"id": test_token}, 
                {"token": test_token}, 
                {"access_token": test_token},
                {"user_id": test_token}
            ]})
            if count > 0:
                print(f"📄 Token found in collection '{collection_name}': {count} documents")
            
    except Exception as e:
        print(f"❌ Error during debug: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(debug_user_lookup())