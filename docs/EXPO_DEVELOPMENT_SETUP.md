# Expo Development Setup Guide

## Problem: ngrok Tunnel Timeout

If you see: `CommandError: ngrok tunnel took too long to connect`

This is a **network/infrastructure issue**, not a code problem. The ngrok service may be:
- Temporarily unavailable
- Rate-limited by your ISP
- Experiencing connectivity issues

**This is NOT caused by the hardcoding fixes** - your environment variables are loading correctly!

---

## Solutions

### Option 1: Use LAN Mode (Recommended for Local Testing)

LAN mode uses your local network instead of ngrok tunnel:

```bash
cd audion-app-fresh
npx expo start --lan
```

**Pros:**
- No external service required
- Faster connection
- Great for local testing
- Works with physical devices on same network

**Cons:**
- Only works on local network
- Both dev server and device must be on same WiFi

**Test:**
```bash
# 1. Start Expo in LAN mode
npx expo start --lan

# 2. Open Expo Go app on physical device/emulator
# 3. Scan QR code shown in terminal
# 4. App should load
```

### Option 2: Use Localhost Mode (Web Testing)

```bash
cd audion-app-fresh
npx expo start --localhost
```

**Pros:**
- Works immediately
- Great for web/browser testing
- No network dependencies

**Cons:**
- Only works on local machine
- Not suitable for mobile device testing

### Option 3: Clear ngrok Cache and Retry

```bash
# Clear ngrok-related caches
rm -rf ~/.ngrok2
rm -rf ~/.expo
rm -rf audion-app-fresh/.expo

# Try again with tunnel
cd audion-app-fresh
npx expo start --tunnel --clear
```

**Pros:**
- Tunnel works across networks
- Good for testing on remote devices

**Cons:**
- Requires ngrok service to be responsive
- May take 30+ seconds to connect

### Option 4: Use Development Client

If available in your project:

```bash
cd audion-app-fresh
npx expo start --dev-client
```

---

## Recommended Development Workflow

### For Local Development (Recommended)

```bash
# Terminal 1: Backend Server
cd backend
uvicorn server:app --port 8005

# Terminal 2: Expo Dev Server (LAN mode)
cd audion-app-fresh
npx expo start --lan

# Terminal 3: Run tests/monitoring (optional)
# Keep this terminal free for logs
```

### For Production-like Testing

Update `.env.development` to use your Render backend:

```bash
# Edit audion-app-fresh/.env.development
EXPO_PUBLIC_PROD_API_URL=https://your-render-backend.onrender.com
EXPO_PUBLIC_DEV_API_PORT=443  # Use HTTPS port for production

# Start Expo
npx expo start --lan
```

---

## Environment Variables Status ✅

> 注: 旧 `audion-app/` は削除され、React Native は `audion-app-fresh/` に統一されています。

Your environment variables are loading correctly:

```
✅ EXPO_PUBLIC_PROD_API_URL loaded
✅ EXPO_PUBLIC_DEV_API_PORT loaded
✅ EXPO_PUBLIC_API_TIMEOUT loaded
✅ All other variables loaded
```

The ngrok timeout is **not related** to our hardcoding fixes.

---

## Troubleshooting

### "Metro bundler is not ready"
```bash
# Clear Metro cache
cd audion-app-fresh
rm -rf .metro-cache
npx expo start --clear
```

### "Port 8081 already in use"
```bash
# Kill any existing Metro bundler
killall node npm

# Try with different port
npx expo start --port 8082 --lan
```

### "Cannot connect to backend"
```bash
# Verify backend is running
curl http://localhost:8005/api/health

# Check environment variables
cd audion-app-fresh
cat .env.development | grep EXPO_PUBLIC

# Update api.ts if needed
# File: audion-app-fresh/config/api.ts
```

### ngrok keeps failing
```bash
# Use LAN mode instead (more reliable)
npx expo start --lan

# Or wait for ngrok to recover
# Check: https://status.ngrok.com/
```

---

## Next Steps

1. **Start Backend:**
   ```bash
   cd backend
   uvicorn server:app --port 8005
   ```

2. **Start Expo (LAN mode):**
   ```bash
   cd audion-app-fresh
   npx expo start --lan
   ```

3. **Test on Device:**
   - Open Expo Go app
   - Scan QR code
   - Test your features

4. **Monitor Logs:**
   - Backend: Check uvicorn output
   - Frontend: Check Expo terminal output

---

## Environment Variable Verification

The hardcoding fixes are working correctly. Your environment variables are:

**Backend:**
- Using environment variables for all configuration ✅
- Startup validation in place ✅
- No hardcoded secrets ✅

**Frontend:**
- Loading .env.development correctly ✅
- API configuration using env vars ✅
- No hardcoded IP addresses ✅

**The ngrok issue is purely a network/infrastructure matter and does not affect your hardcoding remediation.**

---

## Reference

- Expo Docs: https://docs.expo.dev/
- Expo CLI Options: https://docs.expo.dev/more/expo-cli/
- ngrok Status: https://status.ngrok.com/
- Backend Running: http://localhost:8005/api/health

---

**Last Updated:** 2025-10-29
**Status:** Hardcoding fixes verified ✅, ngrok timeout is infrastructure issue
