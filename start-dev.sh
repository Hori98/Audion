#!/bin/bash

# Audion Development Environment Startup Script
# For user testing and development

echo "🎯 Starting Audion Development Environment"
echo "======================================"

cd "$(dirname "$0")"

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

sleep 2

# Start server manager for development environment
echo "🚀 Starting development servers..."
node server-manager.js start dev

echo ""
echo "✅ Development environment is ready!"
echo "   Frontend: http://localhost:8081"
echo "   Backend: http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all servers"