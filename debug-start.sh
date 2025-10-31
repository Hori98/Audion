#!/bin/bash

# Debug startup script for Audion
# This script helps diagnose network and server issues

echo "🚀 Starting Audion Debug Mode"
echo "================================"

# Check if backend is running
echo "🔍 Checking backend status..."
if curl -s http://localhost:8003/health > /dev/null; then
    echo "✅ Backend is running"
    curl -s http://localhost:8003/health | jq '.' 2>/dev/null || curl -s http://localhost:8003/health
else
    echo "❌ Backend is not running. Starting test server..."
    cd backend
    source ../venv/bin/activate
    python test_server.py > test_server_debug.log 2>&1 &
    echo "⏳ Waiting for server to start..."
    sleep 3
    
    if curl -s http://localhost:8003/health > /dev/null; then
        echo "✅ Test server started successfully"
    else
        echo "❌ Failed to start test server"
        exit 1
    fi
    cd ..
fi

echo ""
echo "🌐 Network diagnostics:"
echo "- Local IP: $(ifconfig en0 | grep 'inet ' | awk '{print $2}' 2>/dev/null || echo 'Not available')"
echo "- Backend URL: http://localhost:8003"
echo "- Health endpoint: $(curl -s http://localhost:8003/health 2>/dev/null | head -c 100)..."

echo ""
echo "📱 Starting frontend..."
cd audion-app-fresh

# Set environment for debugging
export DEBUG=1
export EXPO_DEBUG=1

# Start Expo
echo "🎯 Use these commands to test:"
echo "  Web: Press 'w' in Expo CLI"
echo "  iOS: Press 'i' in Expo CLI"
echo "  Android: Press 'a' in Expo CLI"
echo ""
echo "📊 Logs will show connection attempts and errors"
echo "🔧 Backend test server logs: backend/test_server_debug.log"
echo ""

npx expo start --clear
