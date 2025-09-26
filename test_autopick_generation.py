#!/usr/bin/env python3
"""
Audion AutoPick Generation Test Script
- Tests the /api/v2/audio/autopick endpoint
- Authenticates, sends a request, and prints the response.
"""

import requests
import json
import os

# --- Test Configuration ---
BASE_URL = "http://localhost:8003"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
AUTOPICK_URL = f"{BASE_URL}/api/v2/audio/autopick"

# Use environment variables for credentials if available, otherwise use defaults
TEST_EMAIL = os.getenv("AUDION_TEST_EMAIL", "demo@example.com")
TEST_PASSWORD = os.getenv("AUDION_TEST_PASSWORD", "demo123")

def get_auth_token():
    """Logs in and returns the access token."""
    login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
    try:
        response = requests.post(LOGIN_URL, json=login_data)
        response.raise_for_status()  # Raise an exception for bad status codes
        return response.json().get("access_token")
    except requests.exceptions.RequestException as e:
        print(f"❌ Authentication failed: {e}")
        return None

def test_autopick_generation():
    """
    Tests the autopick audio generation endpoint.
    """
    print("🚀 Audion AutoPick Generation Test")
    print("=" * 50)

    # 1. Get auth token
    print("🔑 Authenticating...")
    token = get_auth_token()
    if not token:
        print("🛑 Test aborted due to authentication failure.")
        return

    print("✅ Authentication successful.")
    print(f"   Token: {token[:20]}...")

    # 2. Prepare and send AutoPick request
    headers = {"Authorization": f"Bearer {token}"}
    autopick_payload = {
        "max_articles": 3,
        "voice_language": "ja-JP",
        "voice_name": "alloy",
        "prompt_style": "standard"
    }

    print("\n🎧 Sending AutoPick Request...")
    print(f"   Endpoint: {AUTOPICK_URL}")
    print(f"   Payload: {json.dumps(autopick_payload, indent=2)}")

    try:
        # Set a generous timeout as AI processing can be slow
        response = requests.post(AUTOPICK_URL, headers=headers, json=autopick_payload, timeout=180)

        print("\n📊 Response Received")
        print(f"   Status Code: {response.status_code}")

        # 3. Print response
        if response.ok:
            try:
                response_data = response.json()
                print("✅ AutoPick generation request successful!")
                print(json.dumps(response_data, indent=2, ensure_ascii=False))
            except json.JSONDecodeError:
                print("❌ Failed to decode JSON response.")
                print(f"   Response Text: {response.text}")
        else:
            print(f"❌ AutoPick generation failed.")
            try:
                # Try to print JSON error detail if available
                error_data = response.json()
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except json.JSONDecodeError:
                print(f"   Response Text: {response.text}")

    except requests.exceptions.Timeout:
        print("❌ Request timed out after 180 seconds. The process may still be running in the background.")
    except requests.exceptions.RequestException as e:
        print(f"❌ An error occurred during the request: {e}")

if __name__ == "__main__":
    test_autopick_generation()
    print("\n" + "=" * 50)
    print("🏁 Test completed.")