#!/usr/bin/env python3
"""
プロフィール画像アップロード機能のテストスクリプト
"""
import requests
import time
import io
from PIL import Image

# テスト設定
API_BASE_URL = "http://localhost:8003/api"
TEST_EMAIL = f"test_image_{int(time.time())}@example.com"
TEST_PASSWORD = "password123"

def create_test_image():
    """テスト用の小さな画像を作成"""
    img = Image.new('RGB', (100, 100), color='red')
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    return img_buffer

def test_image_upload():
    print("=== プロフィール画像アップロード機能テスト ===\n")
    
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
    
    # 2. 画像アップロード
    print("\n2. プロフィール画像アップロード中...")
    image_buffer = create_test_image()
    
    files = {
        'file': ('test_profile.jpg', image_buffer, 'image/jpeg')
    }
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    upload_response = requests.post(
        f"{API_BASE_URL}/user/profile/image",
        files=files,
        headers=headers
    )
    
    print(f"   - リクエストURL: {API_BASE_URL}/user/profile/image")
    print(f"   - レスポンスステータス: {upload_response.status_code}")
    print(f"   - レスポンス: {upload_response.text}")
    
    if upload_response.status_code == 200:
        print("✅ プロフィール画像アップロード成功!")
        result = upload_response.json()
        print(f"   - 画像URL: {result.get('profile_image_url')}")
        return True
    else:
        print(f"❌ プロフィール画像アップロード失敗: {upload_response.status_code}")
        return False

if __name__ == "__main__":
    success = test_image_upload()
    if success:
        print("\n🎉 すべてのテストが成功しました！")
    else:
        print("\n❌ テストが失敗しました")