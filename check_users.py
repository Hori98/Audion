#!/usr/bin/env python3
"""
Audion ユーザー管理スクリプト
登録済みユーザーの確認・削除機能
"""
import asyncio
import motor.motor_asyncio
import os
import sys
from dotenv import load_dotenv

async def list_users():
    """登録済みユーザー一覧表示"""
    load_dotenv('backend/.env')
    client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.getenv('DB_NAME', 'audion_db')]

    try:
        users = await db.users.find({}).to_list(length=None)
        print('=== 登録済みユーザー一覧 ===')
        if not users:
            print('登録済みユーザーはいません。')
        else:
            for i, user in enumerate(users, 1):
                print(f'{i}. ID: {user["_id"]}')
                print(f'   Email: {user.get("email", "N/A")}')
                print(f'   Name: {user.get("name", user.get("displayName", "N/A"))}')
                print(f'   作成日: {user.get("created_at", "N/A")}')
                print('---')

        print(f'総ユーザー数: {len(users)}')
        return users
    finally:
        client.close()

async def delete_all_users():
    """全ユーザーの削除"""
    load_dotenv('backend/.env')
    client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.getenv('DB_NAME', 'audion_db')]

    try:
        # 関連データも削除
        collections_to_clear = ['users', 'audio_files', 'rss_sources', 'articles']

        for collection_name in collections_to_clear:
            result = await db[collection_name].delete_many({})
            print(f'{collection_name}: {result.deleted_count}件のデータを削除')

        print('全ユーザーと関連データを削除しました。')
    finally:
        client.close()

async def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'delete':
        print('⚠️ 全ユーザーとデータを削除しますか？ (yes/no)')
        confirm = input()
        if confirm.lower() == 'yes':
            await delete_all_users()
        else:
            print('削除をキャンセルしました。')
    else:
        await list_users()

if __name__ == '__main__':
    asyncio.run(main())