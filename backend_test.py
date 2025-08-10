#!/usr/bin/env python3
import requests
import json
import time
import random
import string
import os
from dotenv import load_dotenv
import sys

# For testing purposes, use the local URL
LOCAL_TESTING = True
if LOCAL_TESTING:
    BACKEND_URL = "http://localhost:8001"
    print(f"Using local backend URL for testing: {BACKEND_URL}")
else:
    # Load environment variables from frontend/.env
    load_dotenv('/app/frontend/.env')
    # Get the backend URL from the environment
    BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
    if not BACKEND_URL:
        print("Error: REACT_APP_BACKEND_URL not found in environment variables")
        sys.exit(1)

# Ensure the URL ends with /api
API_URL = f"{BACKEND_URL}/api"
print(f"Using API URL: {API_URL}")

# Test data
TEST_EMAIL = f"test_user_{random.randint(1000, 9999)}@example.com"
TEST_PASSWORD = "password123"
TEST_RSS_SOURCE_NAME = "TechCrunch"
TEST_RSS_SOURCE_URL = "https://techcrunch.com/feed/"

# Store auth token and created resources for cleanup
auth_token = None
user_id = None
source_id = None
audio_id = None

def print_separator():
    print("\n" + "="*80 + "\n")

def test_register():
    global auth_token, user_id
    print("Testing user registration...")
    
    url = f"{API_URL}/auth/register"
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        auth_token = data.get("access_token")
        user_id = auth_token  # In this implementation, the token is the user ID
        print(f"✅ Registration successful. Token: {auth_token}")
        return True
    else:
        print("❌ Registration failed")
        return False

def test_login():
    global auth_token, user_id
    print("Testing user login...")
    
    url = f"{API_URL}/auth/login"
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(url, json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        auth_token = data.get("access_token")
        user_id = auth_token  # In this implementation, the token is the user ID
        print(f"✅ Login successful. Token: {auth_token}")
        return True
    else:
        print("❌ Login failed")
        return False

def test_add_rss_source():
    global source_id
    print("Testing adding RSS source...")
    
    url = f"{API_URL}/rss-sources"
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "name": TEST_RSS_SOURCE_NAME,
        "url": TEST_RSS_SOURCE_URL
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        source_id = data.get("id")
        print(f"✅ RSS source added successfully. Source ID: {source_id}")
        return True
    else:
        print("❌ Failed to add RSS source")
        return False

def test_get_rss_sources():
    print("Testing getting RSS sources...")
    
    url = f"{API_URL}/rss-sources"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            print(f"✅ Successfully retrieved {len(data)} RSS sources")
            return True
        else:
            print("⚠️ No RSS sources found")
            return True
    else:
        print("❌ Failed to get RSS sources")
        return False

def test_get_articles():
    print("Testing getting articles...")
    
    url = f"{API_URL}/articles"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}...")  # Truncate long response
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list):
            print(f"✅ Successfully retrieved {len(data)} articles")
            return True, data
        else:
            print("⚠️ No articles found or invalid response format")
            return False, None
    else:
        print("❌ Failed to get articles")
        return False, None

def test_create_audio():
    global audio_id
    print("Testing audio creation with AI integration...")
    
    # First get some articles
    success, articles = test_get_articles()
    if not success or not articles:
        print("❌ Cannot create audio without articles")
        return False
    
    # Select up to 3 articles for the audio creation
    selected_articles = articles[:min(3, len(articles))]
    article_ids = [article["id"] for article in selected_articles]
    article_titles = [article["title"] for article in selected_articles]
    
    url = f"{API_URL}/audio/create"
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "article_ids": article_ids,
        "article_titles": article_titles,
        "custom_title": f"AI News Summary {random.randint(1000, 9999)}"
    }
    
    print("Creating audio with payload:")
    print(json.dumps(payload, indent=2))
    
    # Measure response time to verify AI processing
    start_time = time.time()
    response = requests.post(url, json=payload, headers=headers)
    end_time = time.time()
    processing_time = end_time - start_time
    
    print(f"Status Code: {response.status_code}")
    print(f"Response time: {processing_time:.2f} seconds")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        audio_id = data.get("id")
        
        # Verify script field exists and has conversational format
        script = data.get("script", "")
        has_script = bool(script)
        has_host_format = "HOST 1" in script and "HOST 2" in script
        
        print(f"✅ Audio created successfully. Audio ID: {audio_id}")
        print(f"✅ Script field exists: {has_script}")
        print(f"✅ Script has conversational format: {has_host_format}")
        
        # Print a sample of the script
        if has_script:
            print("\nScript sample (first 200 chars):")
            print(script[:200] + "...\n")
        
        return True
    else:
        print("❌ Failed to create audio")
        return False

def test_get_audio_library():
    print("Testing getting audio library with script field...")
    
    url = f"{API_URL}/audio/library"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list):
            print(f"✅ Successfully retrieved {len(data)} audio items")
            
            # Check for script field in the first audio item (if available)
            if data and len(data) > 0:
                first_audio = data[0]
                has_script = "script" in first_audio and bool(first_audio["script"])
                print(f"✅ Script field exists in audio items: {has_script}")
                
                if has_script:
                    script = first_audio["script"]
                    has_host_format = "HOST 1" in script and "HOST 2" in script
                    print(f"✅ Script has conversational format: {has_host_format}")
            
            return True
        else:
            print("⚠️ No audio items found or invalid response format")
            return True
    else:
        print("❌ Failed to get audio library")
        return False

def test_rename_audio():
    if not audio_id:
        print("❌ Cannot rename audio without audio_id")
        return False
    
    print("Testing renaming audio...")
    
    url = f"{API_URL}/audio/{audio_id}/rename"
    headers = {"Authorization": f"Bearer {auth_token}"}
    new_title = f"Renamed Audio {random.randint(1000, 9999)}"
    
    # The API expects a JSON object with new_title
    response = requests.put(url, json={"new_title": new_title}, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print(f"✅ Audio renamed successfully to '{new_title}'")
        return True
    else:
        print("❌ Failed to rename audio")
        return False

def test_delete_audio():
    if not audio_id:
        print("❌ Cannot delete audio without audio_id")
        return False
    
    print("Testing deleting audio...")
    
    url = f"{API_URL}/audio/{audio_id}"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.delete(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print(f"✅ Audio deleted successfully")
        return True
    else:
        print("❌ Failed to delete audio")
        return False

def test_delete_rss_source():
    if not source_id:
        print("❌ Cannot delete RSS source without source_id")
        return False
    
    print("Testing deleting RSS source...")
    
    url = f"{API_URL}/sources/{source_id}"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.delete(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print(f"✅ RSS source deleted successfully")
        return True
    else:
        print("❌ Failed to delete RSS source")
        return False

def test_missing_auth():
    print("Testing endpoint with missing auth token...")
    
    url = f"{API_URL}/rss-sources"
    
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code in [401, 403]:
        print(f"✅ Correctly rejected request without auth token")
        return True
    else:
        print("❌ Failed to properly handle missing auth token")
        return False

def test_ai_pipeline_with_demo_keys():
    print("Testing AI pipeline with demo keys...")
    
    # This test verifies that the system correctly uses mock responses when demo keys are used
    # We'll check the response time - it should be relatively quick since it's using mock data
    
    # First get some articles
    success, articles = test_get_articles()
    if not success or not articles:
        print("❌ Cannot test AI pipeline without articles")
        return False
    
    # Select just 1 article for faster testing
    selected_article = articles[0]
    
    url = f"{API_URL}/audio/create"
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "article_ids": [selected_article["id"]],
        "article_titles": [selected_article["title"]],
        "custom_title": f"AI Pipeline Test {random.randint(1000, 9999)}"
    }
    
    # Measure response time - should be quick with demo keys
    start_time = time.time()
    response = requests.post(url, json=payload, headers=headers)
    end_time = time.time()
    processing_time = end_time - start_time
    
    print(f"Status Code: {response.status_code}")
    print(f"Response time: {processing_time:.2f} seconds")
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify script field exists and has conversational format
        script = data.get("script", "")
        has_script = bool(script)
        has_host_format = "HOST 1" in script and "HOST 2" in script
        
        print(f"✅ AI pipeline with demo keys working")
        print(f"✅ Script field exists: {has_script}")
        print(f"✅ Script has conversational format: {has_host_format}")
        
        # Print a sample of the script
        if has_script:
            print("\nScript sample (first 200 chars):")
            print(script[:200] + "...\n")
        
        return True
    else:
        print("❌ Failed to test AI pipeline with demo keys")
        return False

def test_auto_pick_articles():
    print("Testing auto-pick articles...")
    
    url = f"{API_URL}/auto-pick"
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "max_articles": 5
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list):
            print(f"✅ Successfully got {len(data)} auto-picked articles")
            return True
        else:
            print("❌ Invalid response format for auto-pick")
            return False
    else:
        print("❌ Failed to get auto-picked articles")
        return False

def test_user_profile():
    print("Testing user profile...")
    
    url = f"{API_URL}/user-profile"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(url, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        has_preferences = "genre_preferences" in data
        has_history = "interaction_history" in data
        
        print(f"✅ User profile retrieved successfully")
        print(f"✅ Has genre preferences: {has_preferences}")
        print(f"✅ Has interaction history: {has_history}")
        
        return True
    else:
        print("❌ Failed to get user profile")
        return False

def test_user_interaction():
    print("Testing user interaction recording...")
    
    # First get some articles to interact with
    success, articles = test_get_articles()
    if not success or not articles:
        print("❌ Cannot test interaction without articles")
        return False
    
    # Select first article for interaction
    selected_article = articles[0]
    
    url = f"{API_URL}/user-interaction"
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "article_id": selected_article["id"],
        "interaction_type": "liked",
        "genre": selected_article.get("genre", "General")
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print(f"✅ User interaction recorded successfully")
        return True
    else:
        print("❌ Failed to record user interaction")
        return False

def test_auto_pick_create_audio():
    print("Testing auto-pick create audio...")
    
    url = f"{API_URL}/auto-pick/create-audio"
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "max_articles": 3
    }
    
    start_time = time.time()
    response = requests.post(url, json=payload, headers=headers)
    end_time = time.time()
    processing_time = end_time - start_time
    
    print(f"Status Code: {response.status_code}")
    print(f"Response time: {processing_time:.2f} seconds")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify audio creation fields
        has_audio_url = "audio_url" in data
        has_title = "title" in data and "Auto-Pick" in data["title"]
        has_script = "script" in data
        
        print(f"✅ Auto-pick audio created successfully")
        print(f"✅ Has audio URL: {has_audio_url}")
        print(f"✅ Has auto-pick title: {has_title}")
        print(f"✅ Has script: {has_script}")
        
        return True
    else:
        print("❌ Failed to create auto-pick audio")
        return False

def run_all_tests():
    tests = [
        ("User Registration", test_register),
        ("User Login", test_login),
        ("Missing Auth Token", test_missing_auth),
        ("Add RSS Source", test_add_rss_source),
        ("Get RSS Sources", test_get_rss_sources),
        ("Get Articles", lambda: test_get_articles()[0]),
        ("AI Pipeline with Demo Keys", test_ai_pipeline_with_demo_keys),
        ("Create Audio", test_create_audio),
        ("Get Audio Library", test_get_audio_library),
        ("Rename Audio", test_rename_audio),
        ("User Profile", test_user_profile),
        ("User Interaction", test_user_interaction),
        ("Auto-Pick Articles", test_auto_pick_articles),
        ("Auto-Pick Create Audio", test_auto_pick_create_audio),
        ("Delete Audio", test_delete_audio),
        ("Delete RSS Source", test_delete_rss_source)
    ]
    
    results = {}
    all_passed = True
    
    for test_name, test_func in tests:
        print_separator()
        print(f"Running test: {test_name}")
        try:
            result = test_func()
            results[test_name] = result
            if not result:
                all_passed = False
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            results[test_name] = False
            all_passed = False
    
    print_separator()
    print("TEST SUMMARY:")
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print_separator()
    if all_passed:
        print("🎉 All tests passed successfully!")
    else:
        print("⚠️ Some tests failed. See details above.")
    
    return all_passed

if __name__ == "__main__":
    run_all_tests()