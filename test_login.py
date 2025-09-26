#!/usr/bin/env python3
"""
Audion Login Test Script
修正したJWT decodingベースのログイン機能をテスト
"""

import requests
import json
import base64

# Test configuration
BASE_URL = "http://localhost:8001"
TEST_EMAIL = "demo@example.com"
TEST_PASSWORD = "demo123"

def test_login():
    """Login test with demo credentials"""
    print("🔧 Audion Login Function Test")
    print("=" * 50)

    login_url = f"{BASE_URL}/api/auth/login"
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }

    print(f"📍 Endpoint: {login_url}")
    print(f"📧 Email: {TEST_EMAIL}")
    print(f"🔑 Password: {TEST_PASSWORD}")

    try:
        response = requests.post(login_url, json=login_data)
        print(f"\n📊 Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")

            # Extract and decode JWT token
            token = data.get('access_token')
            if token:
                print(f"🎫 Token: {token[:20]}...{token[-10:]}")

                # Decode JWT payload
                try:
                    # JWT format: header.payload.signature
                    payload_b64 = token.split('.')[1]
                    # Add padding if needed
                    payload_b64 += '=' * (4 - len(payload_b64) % 4)
                    payload = json.loads(base64.b64decode(payload_b64))

                    print("👤 Decoded User Info:")
                    print(f"   ID: {payload.get('sub')}")
                    print(f"   Email: {payload.get('email')}")
                    print(f"   Exp: {payload.get('exp')}")

                except Exception as jwt_error:
                    print(f"❌ JWT decode error: {jwt_error}")

            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Connection Error - Backend server not running on port 8001")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_me_endpoint(token):
    """Test /api/auth/me endpoint with token"""
    print("\n🔧 Testing /api/auth/me endpoint")
    print("=" * 50)

    me_url = f"{BASE_URL}/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(me_url, headers=headers)
        print(f"📊 Status Code: {response.status_code}")

        if response.status_code == 200:
            user_data = response.json()
            print("✅ User info retrieved successfully!")
            print(f"User data: {json.dumps(user_data, indent=2)}")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    # Test login
    login_success = test_login()

    if login_success:
        print("\n🎉 Login test passed!")

        # Extract token and test /me endpoint
        try:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            token = response.json().get('access_token')
            if token:
                test_me_endpoint(token)
        except:
            pass
    else:
        print("\n❌ Login test failed!")

    print("\n" + "=" * 50)
    print("🏁 Test completed")