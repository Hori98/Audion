#!/usr/bin/env python3
"""
Test articles API to check RSS data fetching
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8001"
TEST_EMAIL = "demo@example.com"
TEST_PASSWORD = "demo123"

def test_articles_api():
    print("🔧 Testing Articles API with RSS Data")
    print("=" * 50)

    # Login first
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Check RSS sources
    print("\n📊 Current RSS Sources:")
    rss_response = requests.get(f"{BASE_URL}/api/rss-sources", headers=headers)
    if rss_response.status_code == 200:
        sources = rss_response.json()
        print(f"   Found {len(sources)} RSS sources:")
        for source in sources:
            print(f"   - {source['name']}: {source['url']} (active: {source['is_active']})")
    else:
        print(f"   ❌ Failed to get RSS sources: {rss_response.status_code}")

    # Test articles API
    print("\n📰 Testing Articles API:")
    articles_response = requests.get(f"{BASE_URL}/api/articles", headers=headers)

    print(f"   Status Code: {articles_response.status_code}")

    if articles_response.status_code == 200:
        articles = articles_response.json()
        print(f"   ✅ Found {len(articles)} articles")

        if articles:
            print("\n📄 Sample Article:")
            sample = articles[0]
            print(f"   Title: {sample.get('title', 'N/A')}")
            print(f"   Source: {sample.get('source_name', 'N/A')}")
            print(f"   Published: {sample.get('published', 'N/A')}")
            print(f"   Genre: {sample.get('genre', 'N/A')}")
            return True
        else:
            print("   ⚠️  No articles found (empty response)")
            return False
    else:
        print(f"   ❌ Failed: {articles_response.status_code}")
        print(f"   Response: {articles_response.text}")
        return False

if __name__ == "__main__":
    success = test_articles_api()
    print("\n" + "=" * 50)
    print("🏁 Test completed:", "✅ Success" if success else "❌ Failed")