#!/usr/bin/env python3
"""
Test audio generation API to check RSS articles to audio conversion
"""

import requests
import json
import time
import os

# Configuration
BASE_URL = "http://localhost:8001"
TEST_EMAIL = "demo@example.com"
TEST_PASSWORD = "demo123"

def test_audio_generation():
    print("🎵 Testing Audio Generation API")
    print("=" * 60)

    # Step 1: Login first
    print("\n🔐 Step 1: User Authentication")
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        return False

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Authentication successful")

    # Step 2: Check available articles
    print("\n📰 Step 2: Checking Available Articles")
    articles_response = requests.get(f"{BASE_URL}/api/articles", headers=headers)

    if articles_response.status_code != 200:
        print(f"❌ Failed to get articles: {articles_response.status_code}")
        print(f"   Response: {articles_response.text}")
        return False

    articles = articles_response.json()
    print(f"✅ Found {len(articles)} articles available for audio generation")

    if len(articles) == 0:
        print("⚠️  No articles available - cannot test audio generation")
        return False

    # Display sample articles
    print("📄 Sample articles:")
    for i, article in enumerate(articles[:3]):
        print(f"   {i+1}. {article.get('title', 'N/A')[:60]}...")

    # Step 3: Test AutoPick Audio Generation
    print("\n🎯 Step 3: Testing AutoPick Audio Generation")
    autopick_request = {
        "max_articles": 3,
        "voice_language": "ja-JP",
        "voice_name": "alloy",
        "prompt_style": "standard",
        "preferred_genres": ["総合ニュース", "テクノロジー"]
    }

    print("📤 Sending AutoPick request...")
    print(f"   Request data: {json.dumps(autopick_request, indent=2, ensure_ascii=False)}")

    autopick_response = requests.post(
        f"{BASE_URL}/api/v2/audio/autopick",
        json=autopick_request,
        headers=headers,
        timeout=120  # 2 minutes timeout for audio generation
    )

    print(f"📥 Response status: {autopick_response.status_code}")

    if autopick_response.status_code == 200:
        audio_result = autopick_response.json()
        print("✅ AutoPick audio generation successful!")
        print(f"   🎵 Audio ID: {audio_result.get('id')}")
        print(f"   📰 Title: {audio_result.get('title')}")
        print(f"   🔗 Audio URL: {audio_result.get('audio_url')}")
        print(f"   ⏱️  Duration: {audio_result.get('duration')} seconds")
        print(f"   📊 Articles processed: {audio_result.get('articles_count')}")
        print(f"   🔤 Script length: {len(audio_result.get('script', ''))} characters")

        # Check if audio file was created
        audio_url = audio_result.get('audio_url')
        if audio_url:
            print(f"\n🔍 Step 4: Verifying audio file accessibility")
            try:
                audio_check_response = requests.head(audio_url, timeout=10)
                if audio_check_response.status_code == 200:
                    print("✅ Audio file is accessible")
                else:
                    print(f"⚠️  Audio file not accessible: {audio_check_response.status_code}")
            except Exception as e:
                print(f"⚠️  Error checking audio file: {e}")

        return True

    else:
        print(f"❌ AutoPick audio generation failed: {autopick_response.status_code}")
        print(f"   Response: {autopick_response.text}")
        return False

def test_manual_audio_generation():
    """Test manual audio generation with specific articles"""
    print("\n📋 Testing Manual Audio Generation")
    print("-" * 40)

    # Login first
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    if login_response.status_code != 200:
        print(f"❌ Login failed for manual test: {login_response.status_code}")
        return False

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get articles for manual selection
    articles_response = requests.get(f"{BASE_URL}/api/articles", headers=headers)
    if articles_response.status_code != 200:
        print(f"❌ Failed to get articles for manual test: {articles_response.status_code}")
        return False

    articles = articles_response.json()
    if len(articles) < 2:
        print("⚠️  Not enough articles for manual generation test")
        return False

    # Select first 2 articles for manual generation
    selected_articles = articles[:2]
    manual_request = {
        "article_ids": [article.get('id') or f"manual_test_{i}" for i, article in enumerate(selected_articles)],
        "article_titles": [article.get('title', f'Article {i+1}') for i, article in enumerate(selected_articles)],
        "article_summaries": [article.get('summary', article.get('description', '')) for article in selected_articles],
        "voice_language": "ja-JP",
        "voice_name": "alloy",
        "prompt_style": "standard"
    }

    print("📤 Sending Manual generation request...")
    print(f"   Selected {len(selected_articles)} articles")

    manual_response = requests.post(
        f"{BASE_URL}/api/v2/audio/manual",
        json=manual_request,
        headers=headers,
        timeout=120
    )

    print(f"📥 Manual generation response: {manual_response.status_code}")

    if manual_response.status_code == 200:
        manual_result = manual_response.json()
        print("✅ Manual audio generation successful!")
        print(f"   🎵 Audio ID: {manual_result.get('id')}")
        print(f"   📰 Title: {manual_result.get('title')}")
        print(f"   📊 Articles processed: {manual_result.get('articles_count')}")
        return True
    else:
        print(f"❌ Manual audio generation failed: {manual_response.status_code}")
        print(f"   Response: {manual_response.text}")
        return False

def check_audio_library():
    """Check if generated audio appears in user's library"""
    print("\n📚 Checking Audio Library")
    print("-" * 30)

    # Login
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    if login_response.status_code != 200:
        print(f"❌ Login failed for library check: {login_response.status_code}")
        return False

    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Check audio library endpoint
    library_response = requests.get(f"{BASE_URL}/api/audio/library", headers=headers)

    print(f"📥 Library response: {library_response.status_code}")

    if library_response.status_code == 200:
        library_items = library_response.json()
        print(f"✅ Found {len(library_items)} items in audio library")

        if library_items:
            print("📄 Recent audio items:")
            for i, item in enumerate(library_items[:3]):
                print(f"   {i+1}. {item.get('title', 'N/A')[:50]}...")

        return True
    else:
        print(f"❌ Failed to access audio library: {library_response.status_code}")
        print(f"   Response: {library_response.text}")
        return False

if __name__ == "__main__":
    print("🎵 AUDION AUDIO GENERATION TEST SUITE")
    print("=" * 60)

    # Test 1: AutoPick Audio Generation
    autopick_success = test_audio_generation()

    # Test 2: Manual Audio Generation
    manual_success = test_manual_audio_generation()

    # Test 3: Audio Library Check
    library_success = check_audio_library()

    # Summary
    print("\n" + "=" * 60)
    print("🏁 AUDIO GENERATION TEST RESULTS")
    print("=" * 60)
    print(f"🎯 AutoPick Generation: {'✅ Success' if autopick_success else '❌ Failed'}")
    print(f"📋 Manual Generation:   {'✅ Success' if manual_success else '❌ Failed'}")
    print(f"📚 Library Access:      {'✅ Success' if library_success else '❌ Failed'}")

    overall_success = autopick_success and manual_success and library_success
    print(f"\n🎵 Overall Result: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")

    if not overall_success:
        print("\n🔧 Troubleshooting:")
        if not autopick_success:
            print("   - Check OpenAI API key configuration")
            print("   - Verify TTS service availability")
            print("   - Check audio file storage setup")
        if not manual_success:
            print("   - Verify manual article selection logic")
            print("   - Check article data validation")
        if not library_success:
            print("   - Check audio library endpoint configuration")
            print("   - Verify database audio storage")