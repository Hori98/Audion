# Connection Routing Guide - Smart Backend Detection

## Overview

The Audion app now intelligently detects which connection mode (LAN vs Tunnel) you're using and automatically routes to the appropriate backend:

| Connection Mode | Detected By | Backend URL | Use Case |
|---|---|---|---|
| **LAN Mode** | Local IP address (192.168.x.x) | `http://{local-ip}:8005` | Local network testing, physical devices |
| **Tunnel Mode** | Non-IP hostname | `https://audion.onrender.com` | Remote testing, cross-network access |
| **Production** | `!__DEV__` flag | `https://audion.onrender.com` | Deployed app |

---

## How It Works

### Code Location
[audion-app-fresh/config/api.ts](audion-app-fresh/config/api.ts#L10-L45)

### Detection Algorithm

```typescript
const detectBackendUrl = (): string => {
  if (__DEV__) {
    const devPort = process.env.EXPO_PUBLIC_DEV_API_PORT || '8005';

    try {
      // Get the connection information from Expo Constants
      const hostUri = Constants.manifest2?.extra?.expoGo?.debuggerHost ||
                      Constants.manifest?.debuggerHost ||
                      Constants.expoConfig?.hostUri;

      if (hostUri) {
        // Extract hostname/IP from format like "192.168.11.35:19000" or "tunnel-url.ngrok.io:19000"
        const host = String(hostUri).split(':')[0];

        // Check if it's a valid IPv4 address using regex
        if (host && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
          // ✅ LAN Mode: It's a local IP address
          console.log('🔧 LAN mode detected - using local IP:', host);
          return `http://${host}:${devPort}`;
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not detect host:', e);
    }

    // ✅ Tunnel Mode: Use Render backend (more reliable than localhost)
    // Reason: Tunnel simulator cannot access localhost:8005 from inside the tunnel
    console.log('🔧 Tunnel mode detected - using Render backend');
    return process.env.EXPO_PUBLIC_PROD_API_URL || 'https://audion.onrender.com';
  }

  // Production: Always use Render
  return process.env.EXPO_PUBLIC_PROD_API_URL || 'https://audion.onrender.com';
};
```

---

## Testing Connection Routing

### Setup Prerequisites

Ensure both backends are ready:

```bash
# Terminal 1: Start local backend
cd backend
uvicorn server:app --port 8005

# Verify with:
curl -s http://localhost:8005/api/health | jq .
# Expected: {"status":"ok"}
```

### Test 1: LAN Mode Testing (Recommended for Local Development)

**Use Case:** Test on physical device or emulator on same network

**Steps:**

```bash
# Terminal 2: Start Expo in LAN mode
cd audion-app-fresh
npx expo start --lan
```

**What to expect:**

```
✅ Console output should show:
🔧 LAN mode detected - using local IP: 192.168.11.35

✅ Frontend logs will show:
🔗 API_CONFIG.BASE_URL: http://192.168.11.35:8005
```

**Verification:**

1. Open Expo Go app on physical device/emulator
2. Scan QR code from terminal
3. App should load with login screen
4. Attempt login - should connect to local backend (192.168.11.35:8005)
5. Check Expo terminal for API connection logs

**Expected API Behavior:**
- Health check: `GET http://192.168.11.35:8005/api/health` → ✅ Success
- Login: `POST http://192.168.11.35:8005/api/auth/login` → ✅ Returns access token

---

### Test 2: Tunnel Mode Testing (Cross-Network Access)

**Use Case:** Test on remote device, different network, or when LAN unavailable

**Steps:**

```bash
# Terminal 2: Start Expo in Tunnel mode
cd audion-app-fresh
npx expo start --tunnel
```

**What to expect:**

```
✅ Console output should show:
🔧 Tunnel mode detected - using Render backend

✅ Frontend logs will show:
🔗 API_CONFIG.BASE_URL: https://audion.onrender.com
```

**Verification:**

1. Open Expo Go app
2. Scan QR code from terminal
3. App should load with login screen
4. Attempt login - should connect to Render backend (https://audion.onrender.com)
5. Check Expo terminal for API connection logs

**Expected API Behavior:**
- Health check: `GET https://audion.onrender.com/api/health` → ✅ Success
- Login: `POST https://audion.onrender.com/api/auth/login` → ✅ Returns access token

**Note:** Tunnel mode may experience ngrok connection instability (infrastructure issue, not code issue). If experiencing disconnections, switch to LAN mode for more stable local testing.

---

### Test 3: Manual Connection Verification

**Check local backend is responding:**

```bash
curl -X GET http://localhost:8005/api/health \
  -H "Content-Type: application/json"

# Expected response:
# {"status":"ok"}
```

**Check Render backend is responding:**

```bash
curl -X GET https://audion.onrender.com/api/health \
  -H "Content-Type: application/json"

# Expected response:
# {"status":"ok"}
```

**Test login on both backends:**

```bash
# Local backend
curl -X POST http://localhost:8005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Render backend
curl -X POST https://audion.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Both should return: {"access_token":"...","token_type":"bearer"}
```

---

## Troubleshooting

### Issue: "Network Error - No response from server"

**Possible Causes:**

| Symptom | Cause | Solution |
|---|---|---|
| Shows `baseURL: http://192.168.x.x:8005` but fails | LAN mode but backend not running | `cd backend && uvicorn server:app --port 8005` |
| Shows `baseURL: https://audion.onrender.com` but fails | Render not deployed or no internet | Check Render dashboard, verify environment variables |
| Tunnel keeps disconnecting | ngrok instability | Switch to LAN mode with `npx expo start --lan` |

**Debug Steps:**

1. **Check which backend is being used:**
   ```bash
   # Look at Expo terminal for:
   # ✅ "🔧 LAN mode detected" → Using local backend
   # ✅ "🔧 Tunnel mode detected" → Using Render backend
   ```

2. **Verify backend is running:**
   ```bash
   # Local
   curl http://localhost:8005/api/health

   # Render
   curl https://audion.onrender.com/api/health
   ```

3. **Check environment variables:**
   ```bash
   cd audion-app-fresh
   cat .env.development | grep EXPO_PUBLIC
   ```

4. **Clear and rebuild:**
   ```bash
   cd audion-app-fresh
   rm -rf .expo .metro-cache
   npx expo start --clear --lan
   ```

### Issue: "Cannot find test user"

**Solution:** Create test user in MongoDB

```bash
python3 << 'EOF'
import os
from pymongo import MongoClient
from datetime import datetime
import bcrypt

# Connect to MongoDB (local development)
client = MongoClient('mongodb://localhost:27017')
db = client['audion_atlas_DB']

# Hash password
password = "password123"
hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Create test user
test_user = {
    "email": "test@example.com",
    "username": "testuser",
    "hashed_password": hashed_password,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
    "subscription_plan": "free",
    "is_active": True
}

# Insert user
result = db['users'].insert_one(test_user)
print(f"✅ Test user created with ID: {result.inserted_id}")
print(f"   Email: test@example.com")
print(f"   Password: password123")
EOF
```

---

## Environment Variables

### Frontend (`audion-app-fresh/.env.development`)

```bash
# Backend URL for Render (used as Tunnel mode fallback)
EXPO_PUBLIC_PROD_API_URL=https://audion.onrender.com

# Port for local development (used in LAN mode)
EXPO_PUBLIC_DEV_API_PORT=8005

# Request timeout
EXPO_PUBLIC_API_TIMEOUT=60000

# Debug settings
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_MOCK_DATA_FALLBACK=false
EXPO_PUBLIC_ENABLE_DEV_TOOLS=true
```

### Backend (`backend/.env`)

Critical variables for local development:

```bash
ENVIRONMENT=development
MONGO_URL=mongodb://localhost:27017
DB_NAME=audion_atlas_DB
JWT_SECRET_KEY=sk_audion_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
OPENAI_API_KEY=your_openai_api_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=ap-southeast-2
S3_BUCKET_NAME=audion-audio-files
```

---

## Network Architecture

### Local Development (LAN Mode)

```
┌─────────────────────────────────────────────────────────┐
│ Your Development Machine (192.168.11.x)                 │
├──────────────────────┬──────────────────────────────────┤
│ Metro Dev Server     │ Backend Server                   │
│ (Port 8081)          │ (Port 8005)                      │
│                      │ ↑ MongoDB connection             │
└──────────────────────┼──────────────────────────────────┘
           ↑           ↑
           │           │ (Same network)
           │           │
    ┌──────┴───────────┴──────┐
    │  Physical Device / Emu  │
    │  (Expo Go App)          │
    │  (Same WiFi network)    │
    └─────────────────────────┘

API Flow:
App → http://192.168.11.x:8005/api/* → Local Backend
```

### Tunnel Mode (ngrok)

```
┌─────────────────────────────────────────┐
│ Your Development Machine                │
├─────────────────────────────────────────┤
│ Metro Dev Server (Port 8081)            │
│ Tunnel via ngrok                        │
└──────┬──────────────────────────────────┘
       │
       │ (ngrok tunnel)
       │
   ┌───▼─────────────────────────────────┐
   │ ngrok Cloud Infrastructure          │
   └───┬─────────────────────────────────┘
       │
   ┌───▼─────────────────────────────────┐
   │ Remote Device (Different network)   │
   │ (Expo Go App via Tunnel)            │
   └─────────────────────────────────────┘

API Flow:
App → https://audion.onrender.com/api/* → Render Backend
(Using Render backend because simulator inside tunnel cannot access localhost)
```

### Production (Render)

```
┌─────────────────────────────────────┐
│ Render.com Deployment               │
├─────────────────────────────────────┤
│ Frontend: Expo Bare / Web           │
│ Backend: FastAPI (Port 8005)        │
│ Database: MongoDB Atlas             │
└─────────────────────────────────────┘

API Flow:
App → https://audion.onrender.com/api/* → Render Backend
```

---

## Summary

✅ **API Configuration is smart**: The app automatically detects your connection mode and routes accordingly

✅ **Both backends work**: Local (192.168.x.x:8005) and Render (https://audion.onrender.com) are verified functional

✅ **Zero configuration needed**: Just start Expo and the detection works automatically

✅ **Environment variables ready**: All required variables are in place

---

## Next Steps

1. **Start local backend:** `cd backend && uvicorn server:app --port 8005`
2. **Start Expo:** `cd audion-app-fresh && npx expo start --lan` (or `--tunnel`)
3. **Open Expo Go:** Scan QR code
4. **Test login:** Check console logs for which backend is detected
5. **Monitor**: Watch Expo terminal and backend logs for API calls

---

**Last Updated:** 2025-10-30
**Status:** ✅ Connection routing configured and tested
**Reference:** [api.ts](audion-app-fresh/config/api.ts)
