#!/bin/bash

# Audion Simple Startup Script
# シンプルで確実なバックエンド起動

echo "🎯 Starting Audion Backend (Simple)"
echo "=================================="

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r backend/requirements.txt"
    exit 1
fi

# Check if MongoDB is running
if ! curl -s http://localhost:27017 > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB:"
    echo "   brew services start mongodb-community"
    exit 1
fi

echo "✅ MongoDB is running"

# Start backend server
echo "🚀 Starting backend server on http://localhost:8003"
cd backend && source ../venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8003 --reload

echo "🛑 Backend server stopped"