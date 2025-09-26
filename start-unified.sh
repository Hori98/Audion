#!/bin/bash

# Unified Audion Development Startup
# Combines backend + frontend startup with proper environment variable handling

echo "🎯 Starting Audion Unified Development Environment"
echo "=================================================="

cd "$(dirname "$0")"

# Get the current IP address for network access
CURRENT_IP="localhost"
echo "🌐 Local Network IP: $CURRENT_IP"

# Clean up existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
pkill -f "ngrok" 2>/dev/null || true

sleep 3

# Check virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"  
    echo "   pip install -r backend/requirements.txt"
    exit 1
fi

# Export environment variables for frontend
export EXPO_PUBLIC_API_BASE_URL="http://$CURRENT_IP:8001"
export EXPO_PUBLIC_BACKEND_URL="http://$CURRENT_IP:8001"
echo "📝 Environment variables set:"
echo "   EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL"
echo "   EXPO_PUBLIC_BACKEND_URL=$EXPO_PUBLIC_BACKEND_URL"

# Start backend
echo "🚀 Starting backend server..."
cd backend && source ../venv/bin/activate && uvicorn server:app --reload --port 8001 --host 0.0.0.0 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend connection
if curl -s "http://$CURRENT_IP:8001/docs" > /dev/null; then
    echo "✅ Backend server is running successfully!"
else
    echo "❌ Backend server failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start ngrok (optional)
if command -v ngrok >/dev/null 2>&1; then
    echo "🌐 Starting ngrok tunnel..."
    ngrok http 8001 &
    NGROK_PID=$!
    sleep 5
    echo "✅ Ngrok tunnel started"
else
    echo "⚠️ ngrok not found, skipping tunnel setup"
fi

# Start frontend with environment variables
echo "📱 Starting frontend with correct environment..."
cd audion-app
EXPO_PUBLIC_API_BASE_URL="$EXPO_PUBLIC_API_BASE_URL" EXPO_PUBLIC_BACKEND_URL="$EXPO_PUBLIC_BACKEND_URL" npx expo start --port 8082 --clear &
FRONTEND_PID=$!

echo ""
echo "🎉 All services started successfully!"
echo "   Backend: http://$CURRENT_IP:8001
   Frontend: http://$CURRENT_IP:8082"
echo "   Frontend: Check Expo CLI output above"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill $NGROK_PID 2>/dev/null || true
    pkill -f "expo start" 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Keep script running
wait