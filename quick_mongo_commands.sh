#!/bin/bash
# 🎯 Audion MongoDB クイック管理スクリプト
# 初心者向け：コマンド1つでデータベース操作

# 色付きメッセージ関数
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_info() { echo -e "\033[34m💡 $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }

echo "🎯 Audion MongoDB クイック管理ツール"
echo "======================================"

# MongoDBが起動しているかチェック
if ! pgrep -q mongod; then
    print_warning "MongoDBが起動していません"
    print_info "MongoDB起動中..."
    brew services start mongodb-community
    sleep 3
fi

# Python仮想環境の確認
if [ ! -d "venv" ]; then
    print_info "Python仮想環境を作成中..."
    python3 -m venv venv
fi

# 仮想環境をアクティベート
source venv/bin/activate 2>/dev/null || {
    print_error "Python仮想環境のアクティベートに失敗"
    exit 1
}

# 必要なライブラリをインストール
pip install motor python-dotenv > /dev/null 2>&1

echo ""
echo "📋 使用可能なコマンド:"
echo "1. 👥 ユーザー一覧表示"
echo "2. 🗑️ 全データ削除"
echo "3. 💾 データバックアップ"
echo "4. 🎯 フル管理ツール起動"

case $1 in
    "list"|"1")
        echo ""
        print_info "登録済みユーザー一覧を表示中..."
        python3 -c "
import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def list_users():
    load_dotenv('backend/.env')
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['Audion_DB']

    try:
        users = await db.users.find({}).to_list(length=None)
        if not users:
            print('📭 登録済みユーザーはいません')
        else:
            print(f'📊 総ユーザー数: {len(users)}')
            print('=' * 40)
            for i, user in enumerate(users, 1):
                email = user.get('email', 'N/A')
                name = user.get('name', user.get('displayName', 'N/A'))
                print(f'{i}. 📧 {email} 👤 {name}')
    except Exception as e:
        print(f'❌ エラー: {e}')
    finally:
        client.close()

asyncio.run(list_users())
"
        ;;

    "clear"|"delete"|"2")
        echo ""
        print_warning "全ユーザーとデータを削除します"
        read -p "本当に削除しますか？ (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            print_info "全データ削除中..."
            python3 -c "
import asyncio
import motor.motor_asyncio
from dotenv import load_dotenv

async def clear_all():
    load_dotenv('backend/.env')
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['Audion_DB']

    collections = ['users', 'user_subscriptions', 'audio_creations', 'rss_sources', 'audio_files', 'user_settings']
    total = 0

    try:
        for collection in collections:
            result = await db[collection].delete_many({})
            if result.deleted_count > 0:
                print(f'🗑️ {collection}: {result.deleted_count}件削除')
                total += result.deleted_count
        print(f'✅ 削除完了! 合計 {total} 件削除')
    except Exception as e:
        print(f'❌ エラー: {e}')
    finally:
        client.close()

asyncio.run(clear_all())
"
            print_success "全データ削除完了!"
        else
            print_info "削除をキャンセルしました"
        fi
        ;;

    "backup"|"3")
        echo ""
        print_info "データバックアップ中..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        backup_file="audion_backup_${timestamp}.json"

        python3 -c "
import asyncio
import motor.motor_asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

async def backup():
    load_dotenv('backend/.env')
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['Audion_DB']

    backup_data = {}
    collections = ['users', 'user_subscriptions', 'audio_creations', 'rss_sources']

    try:
        for collection in collections:
            data = await db[collection].find({}).to_list(length=None)
            for item in data:
                if '_id' in item:
                    item['_id'] = str(item['_id'])
            backup_data[collection] = data
            print(f'📦 {collection}: {len(data)}件')

        with open('$backup_file', 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2)

        print(f'✅ バックアップ完了: $backup_file')
    except Exception as e:
        print(f'❌ エラー: {e}')
    finally:
        client.close()

asyncio.run(backup())
"
        print_success "バックアップ完了: $backup_file"
        ;;

    "manage"|"4"|*)
        if [ "$1" = "" ]; then
            echo ""
            print_info "フル管理ツールを起動します..."
        fi
        echo ""
        print_info "Python管理ツール起動中..."
        python3 simple_mongo_manager.py
        ;;
esac

echo ""
print_info "使い方："
echo "  ./quick_mongo_commands.sh list      # ユーザー一覧"
echo "  ./quick_mongo_commands.sh clear     # 全削除"
echo "  ./quick_mongo_commands.sh backup    # バックアップ"
echo "  ./quick_mongo_commands.sh manage    # フル管理ツール"