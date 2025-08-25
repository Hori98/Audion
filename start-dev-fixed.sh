#!/bin/bash

# Audion Development Environment Startup Script (Fixed)
# For user testing and development with proper network connectivity

echo "🎯 Starting Audion Development Environment (Fixed)"
echo "=================================================="

cd "$(dirname "$0")"

# Get the current IP address for network access
CURRENT_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
echo "🌐 Local Network IP: $CURRENT_IP"

# Clean up any existing processes on backend port
echo "🧹 Cleaning up existing backend processes..."
lsof -ti:8003 | xargs kill -9 2>/dev/null || true

sleep 2

# Start backend server with network access
echo "🚀 Starting backend server..."
echo "   Backend will be accessible at: http://$CURRENT_IP:8003"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r backend/requirements.txt"
    exit 1
fi

# Start backend in background
cd backend && source ../venv/bin/activate && uvicorn server:app --reload --port 8003 --host 0.0.0.0 &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend connection
if curl -s "http://$CURRENT_IP:8003/api/health" > /dev/null; then
    echo "✅ Backend server is running successfully!"
    echo "   API Health Check: http://$CURRENT_IP:8003/api/health"
else
    echo "❌ Backend server failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "📱 Now you can start the frontend:"
echo "   cd audion-app"
echo "   npx expo start"
echo ""
echo "🔧 Environment Variables:"
echo "   EXPO_PUBLIC_BACKEND_URL should be set to: http://$CURRENT_IP:8003"
echo ""
echo "Press Ctrl+C to stop backend server"

# Keep script running to maintain backend
trap 'echo "🛑 Stopping backend server..."; kill $BACKEND_PID 2>/dev/null || true; exit 0' INT TERM

wait $BACKEND_PID