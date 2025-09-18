#!/usr/bin/env python3
"""
データベース接続テスト
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_db_connection():
    """データベース接続をテスト"""
    try:
        # .envファイルを読み込む
        env_path = "/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/.env"
        with open(env_path, 'r') as f:
            env_content = f.read()
        
        # MONGO_URLを取得
        for line in env_content.split('\n'):
            if line.startswith('MONGO_URL='):
                mongo_url = line.split('=', 1)[1]
                break
        else:
            print("❌ MONGO_URL not found in .env file")
            return False
        
        # MongoDB接続テスト
        print(f"MongoDB URL: {mongo_url[:50]}...")
        client = AsyncIOMotorClient(mongo_url)
        
        # 接続テスト
        print("Trying to connect to MongoDB...")
        await client.admin.command('ping')
        print("✅ MongoDB接続成功!")
        
        # データベース接続テスト
        db = client["Audion_DB"]
        collections = await db.list_collection_names()
        print(f"✅ データベース'Audion_DB'のコレクション: {collections}")
        
        # usersコレクションのテスト
        users_collection = db.users
        user_count = await users_collection.count_documents({})
        print(f"✅ usersコレクションのドキュメント数: {user_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ データベース接続エラー: {e}")
        return False
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(test_db_connection())