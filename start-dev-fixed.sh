#!/bin/bash

# Audion Development Environment Startup Script (Fixed)
# For user testing and development with proper network connectivity

echo "🎯 Starting Audion Development Environment (Fixed)"
echo "=================================================="

cd "$(dirname "$0")"

# Force IP address to 192.168.11.21 for consistency
CURRENT_IP="192.168.11.21"
echo "🌐 Local Network IP: $CURRENT_IP"

# Clean up any existing processes on backend port
echo "🧹 Cleaning up existing backend processes..."
lsof -ti:8003 | xargs kill -9 2>/dev/null || true

# Clean and prepare log files
echo "📋 Clearing previous log files..."
mkdir -p logs
> logs/dev-backend.log
> logs/dev-backend.error.log

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

# Start backend in background and redirect output to logs
echo "🚀 Starting backend server (logging to logs/dev-backend.log and logs/dev-backend.error.log)..."
(cd backend && source ../venv/bin/activate && uvicorn server:app --reload --port 8003 --host 0.0.0.0 > ../logs/dev-backend.log 2> ../logs/dev-backend.error.log) &
BACKEND_PID=$!

# Wait for backend to start with a retry loop
echo "⏳ Waiting for backend to start..."
MAX_WAIT=12 # 12 * 5 = 60 seconds
COUNT=0
while [ $COUNT -lt $MAX_WAIT ]; do
    # Check if the process is still running
    if ! ps -p $BACKEND_PID > /dev/null; then
        echo "❌ Backend process terminated unexpectedly."
        # Set COUNT to MAX_WAIT to trigger failure condition
        COUNT=$MAX_WAIT
        continue
    fi

    # Check for health
    if curl -s --fail "http://$CURRENT_IP:8003/api/health" > /dev/null; then
        echo "✅ Backend server is running successfully!"
        echo "   API Health Check: http://$CURRENT_IP:8003/api/health"
        break
    fi
    echo "   ... still waiting ($((COUNT * 5))s)"
    sleep 5
    COUNT=$((COUNT + 1))
done

if [ $COUNT -ge $MAX_WAIT ]; then
    echo "❌ Backend server failed to start after 60 seconds or terminated unexpectedly."
    echo "   Recent backend error logs (logs/dev-backend.error.log):"
    tail -n 20 logs/dev-backend.error.log || echo "   (no error log file found)"
    echo "   Recent backend logs (logs/dev-backend.log):"
    tail -n 20 logs/dev-backend.log || echo "   (no log file found)"

    # Make sure the process is killed
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "📱 Now you can start the frontend:"
echo "   cd audion-app-fresh"
echo "   npx expo start --port 8084"
echo ""
echo "🔧 Environment Variables:"
echo "   EXPO_PUBLIC_API_BASE_URL should be set to: http://$CURRENT_IP:8003"
echo ""
echo "Press Ctrl+C to stop backend server"

# Keep script running to maintain backend
trap 'echo "🛑 Stopping backend server..."; kill $BACKEND_PID 2>/dev/null || true; exit 0' INT TERM

wait $BACKEND_PID