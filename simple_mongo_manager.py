#!/usr/bin/env python3
"""
🎯 Audion MongoDB 初心者向け管理ツール
簡単にユーザーデータの確認・削除・バックアップができます
"""
import asyncio
import motor.motor_asyncio
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv('backend/.env')

class MongoManager:
    def __init__(self):
        self.mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
        self.db_name = os.getenv('DB_NAME', 'Audion_DB')
        self.client = None
        self.db = None

    async def connect(self):
        """MongoDB接続"""
        try:
            self.client = motor.motor_asyncio.AsyncIOMotorClient(self.mongo_url)
            self.db = self.client[self.db_name]
            # 接続テスト
            await self.db.command('ping')
            print("✅ MongoDBに接続成功!")
            return True
        except Exception as e:
            print(f"❌ MongoDB接続エラー: {e}")
            print("💡 MongoDBサーバーが起動しているか確認してください:")
            print("   brew services start mongodb-community")
            return False

    async def close(self):
        """MongoDB接続終了"""
        if self.client:
            self.client.close()

    async def list_users(self):
        """👥 ユーザー一覧表示"""
        print("\n📋 登録済みユーザー一覧")
        print("=" * 50)

        try:
            users = await self.db.users.find({}).to_list(length=None)

            if not users:
                print("📭 登録済みユーザーはいません")
                return []

            for i, user in enumerate(users, 1):
                print(f"\n{i}. ユーザーID: {user.get('id', 'N/A')}")
                print(f"   📧 メール: {user.get('email', 'N/A')}")
                print(f"   👤 名前: {user.get('name', user.get('displayName', 'N/A'))}")
                print(f"   📅 作成日: {user.get('created_at', 'N/A')}")

                # サブスクリプション情報
                subscription = await self.db.user_subscriptions.find_one({"user_id": user.get('id')})
                plan = subscription.get('plan', 'free') if subscription else 'free'
                print(f"   💳 プラン: {plan}")

                # 音声ファイル数
                audio_count = await self.db.audio_creations.count_documents({"user_id": user.get('id')})
                print(f"   🎵 音声ファイル数: {audio_count}")

                # RSSソース数
                rss_count = await self.db.rss_sources.count_documents({"user_id": user.get('id')})
                print(f"   📰 RSSソース数: {rss_count}")

                print("-" * 30)

            print(f"\n📊 総ユーザー数: {len(users)}")
            return users

        except Exception as e:
            print(f"❌ ユーザー一覧取得エラー: {e}")
            return []

    async def delete_user_by_email(self, email):
        """🗑️ 特定ユーザーをメールアドレスで削除"""
        print(f"\n🔍 ユーザー削除: {email}")
        print("=" * 50)

        try:
            # ユーザー検索
            user = await self.db.users.find_one({"email": email})
            if not user:
                print(f"❌ ユーザーが見つかりません: {email}")
                return False

            user_id = user.get('id', str(user.get('_id', '')))
            user_name = user.get('name', user.get('displayName', 'N/A'))

            print(f"👤 削除対象: {user_name} ({email})")
            print(f"🆔 ユーザーID: {user_id}")

            # 確認
            confirm = input("\n⚠️ 本当に削除しますか？ 'yes' と入力してください: ")
            if confirm.lower() != 'yes':
                print("❌ 削除をキャンセルしました")
                return False

            # 関連データ削除
            collections_to_clear = [
                ('users', {"email": email}),
                ('user_subscriptions', {"user_id": user_id}),
                ('audio_creations', {"user_id": user_id}),
                ('rss_sources', {"user_id": user_id}),
                ('user_settings', {"user_id": user_id}),
                ('user_preferences', {"user_id": user_id}),
                ('audio_schedules', {"user_id": user_id}),
            ]

            total_deleted = 0
            print(f"\n🗑️ データ削除中...")

            for collection_name, query in collections_to_clear:
                try:
                    result = await self.db[collection_name].delete_many(query)
                    if result.deleted_count > 0:
                        print(f"   {collection_name}: {result.deleted_count}件削除")
                        total_deleted += result.deleted_count
                except Exception as e:
                    print(f"   {collection_name}: エラー - {str(e)}")

            print(f"\n✅ 削除完了! 合計 {total_deleted} 件のデータを削除しました")
            return True

        except Exception as e:
            print(f"❌ ユーザー削除エラー: {e}")
            return False

    async def delete_all_users(self):
        """🗑️ 全ユーザーとデータを削除"""
        print("\n⚠️ 全データ削除")
        print("=" * 50)
        print("🚨 この操作は取り消せません!")
        print("📋 削除対象: 全ユーザー、音声ファイル、RSSソース、設定など")

        # 二重確認
        confirm1 = input("\n本当に全データを削除しますか？ 'DELETE ALL' と入力してください: ")
        if confirm1 != 'DELETE ALL':
            print("❌ 削除をキャンセルしました")
            return False

        confirm2 = input("最終確認: もう一度 'yes' と入力してください: ")
        if confirm2.lower() != 'yes':
            print("❌ 削除をキャンセルしました")
            return False

        try:
            # 削除対象コレクション
            collections_to_clear = [
                'users', 'user_subscriptions', 'audio_creations',
                'rss_sources', 'articles', 'audio_files',
                'user_settings', 'user_preferences',
                'audio_schedules', 'playlist_items'
            ]

            total_deleted = 0
            print(f"\n🗑️ 全データ削除中...")

            for collection_name in collections_to_clear:
                try:
                    result = await self.db[collection_name].delete_many({})
                    if result.deleted_count > 0:
                        print(f"   {collection_name}: {result.deleted_count}件削除")
                        total_deleted += result.deleted_count
                except Exception as e:
                    print(f"   {collection_name}: エラー - {str(e)}")

            print(f"\n✅ 全データ削除完了! 合計 {total_deleted} 件削除しました")
            print("🎯 アプリは完全にクリーンな状態になりました")
            return True

        except Exception as e:
            print(f"❌ 全データ削除エラー: {e}")
            return False

    async def backup_users(self):
        """💾 ユーザーデータのバックアップ"""
        print("\n💾 ユーザーデータバックアップ")
        print("=" * 50)

        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = f"audion_backup_{timestamp}.json"

            # データ収集
            backup_data = {}
            collections = ['users', 'user_subscriptions', 'audio_creations', 'rss_sources']

            for collection_name in collections:
                data = await self.db[collection_name].find({}).to_list(length=None)
                # ObjectIdをstrに変換
                for item in data:
                    if '_id' in item:
                        item['_id'] = str(item['_id'])
                backup_data[collection_name] = data
                print(f"📦 {collection_name}: {len(data)}件")

            # ファイル保存
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)

            print(f"\n✅ バックアップ完了!")
            print(f"📁 ファイル: {backup_file}")
            print(f"💿 サイズ: {os.path.getsize(backup_file)} bytes")
            return backup_file

        except Exception as e:
            print(f"❌ バックアップエラー: {e}")
            return None

async def main():
    """メイン関数"""
    print("🎯 Audion MongoDB 管理ツール")
    print("=" * 50)

    manager = MongoManager()

    # MongoDB接続
    if not await manager.connect():
        return

    try:
        while True:
            print("\n📋 操作を選択してください:")
            print("1. 👥 ユーザー一覧表示")
            print("2. 🗑️ 特定ユーザー削除 (メールアドレス指定)")
            print("3. 🗑️ 全ユーザー・データ削除 ⚠️")
            print("4. 💾 データバックアップ")
            print("5. 🚪 終了")

            choice = input("\n選択 (1-5): ").strip()

            if choice == '1':
                await manager.list_users()

            elif choice == '2':
                email = input("削除するユーザーのメールアドレス: ").strip()
                if email:
                    await manager.delete_user_by_email(email)
                else:
                    print("❌ メールアドレスを入力してください")

            elif choice == '3':
                await manager.delete_all_users()

            elif choice == '4':
                backup_file = await manager.backup_users()
                if backup_file:
                    print(f"💡 復元方法: mongoimport --db {manager.db_name} --collection [コレクション名] --file {backup_file}")

            elif choice == '5':
                print("👋 終了します")
                break

            else:
                print("❌ 1-5の数字を入力してください")

            input("\nEnterキーを押して続行...")

    finally:
        await manager.close()

if __name__ == '__main__':
    asyncio.run(main())