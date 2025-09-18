#!/usr/bin/env python3
"""
プロフィール更新機能の専用テストスクリプト
JSON形式でのユーザー名更新をテスト
"""
import requests
import json
import time

# テスト設定
API_BASE_URL = "http://localhost:8003/api"
TEST_EMAIL = f"test_profile_{int(time.time())}@example.com"
TEST_PASSWORD = "password123"

def test_profile_update():
    print("=== プロフィール更新機能テスト ===\n")
    
    # 1. ユーザー登録
    print("1. ユーザー登録中...")
    register_response = requests.post(f"{API_BASE_URL}/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if register_response.status_code != 200:
        print(f"❌ 登録失敗: {register_response.status_code} - {register_response.text}")
        return False
    
    auth_data = register_response.json()
    token = auth_data.get("access_token")
    print(f"✅ 登録成功 - Token: {token}")
    
    # 2. 現在のユーザー情報取得
    print("\n2. 現在のユーザー情報取得中...")
    headers = {"Authorization": f"Bearer {token}"}
    me_response = requests.get(f"{API_BASE_URL}/auth/me", headers=headers)
    
    if me_response.status_code != 200:
        print(f"❌ ユーザー情報取得失敗: {me_response.status_code} - {me_response.text}")
        return False
    
    user_info = me_response.json()
    print(f"✅ 現在のユーザー情報:")
    print(f"   - Email: {user_info.get('email')}")
    print(f"   - Username: {user_info.get('username')}")
    print(f"   - ID: {user_info.get('id')}")
    
    # 3. プロフィール更新（JSON形式）
    print("\n3. プロフィール更新（JSON形式）...")
    new_username = "updated_user_123"
    update_data = {
        "username": new_username,
        "email": None  # emailは更新しない
    }
    
    update_response = requests.put(
        f"http://localhost:8003/api/user/profile",
        json=update_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    
    print(f"   - リクエストURL: http://localhost:8003/api/user/profile")
    print(f"   - リクエストボディ: {json.dumps(update_data, indent=2)}")
    print(f"   - レスポンスステータス: {update_response.status_code}")
    print(f"   - レスポンス: {update_response.text}")
    
    if update_response.status_code != 200:
        print(f"❌ プロフィール更新失敗: {update_response.status_code}")
        return False
    
    updated_data = update_response.json()
    updated_user = updated_data.get("user", {})
    
    if updated_user.get("username") == new_username:
        print(f"✅ プロフィール更新成功!")
        print(f"   - 新しいユーザー名: {updated_user.get('username')}")
        print(f"   - Email: {updated_user.get('email')}")
        return True
    else:
        print(f"❌ ユーザー名が正しく更新されませんでした")
        print(f"   - 期待値: {new_username}")
        print(f"   - 実際: {updated_user.get('username')}")
        return False

if __name__ == "__main__":
    success = test_profile_update()
    if success:
        print("\n🎉 すべてのテストが成功しました！")
    else:
        print("\n❌ テストが失敗しました")