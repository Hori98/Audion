#!/bin/bash

# Audion Testing Environment Startup Script
# For AI assistant testing (separate ports)

echo "🤖 Starting Audion Testing Environment"
echo "====================================="

cd "$(dirname "$0")"

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:8002 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true

sleep 2

# Start server manager for testing environment
echo "🚀 Starting testing servers..."
node server-manager.js start test

echo ""
echo "✅ Testing environment is ready!"
echo "   Frontend: http://localhost:8083"
echo "   Backend: http://localhost:8002"
echo ""
echo "Press Ctrl+C to stop all servers"