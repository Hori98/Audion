#!/bin/bash

# 🚀 Audion Project Development Startup Script
# MECEデバッグチェックリストに基づく正しい起動手順

set -e  # Exit on any error

echo "🎯 Audion Development Environment Startup"
echo "========================================"

# 1. プロセスクリーンアップ
echo "🧹 Step 1: Cleaning up existing processes..."
pkill -f "uvicorn.*8003" 2>/dev/null || true
pkill -f "expo.*start" 2>/dev/null || true
sleep 2

# 2. ディレクトリ確認
echo "📁 Step 2: Verifying project structure..."
if [ ! -d "backend" ] || [ ! -d "audion-app" ]; then
    echo "❌ Error: backend/ or audion-app/ directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# 3. バックエンドサーバー起動
echo "🖥️  Step 3: Starting backend server..."
echo "   - Host: 0.0.0.0:8003 (accessible from network)"
echo "   - Database: MongoDB connection check included"

cd backend
source ../venv/bin/activate
nohup uvicorn server:app --reload --port 8003 --host 0.0.0.0 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 4. バックエンドヘルスチェック
echo "🔍 Step 4: Backend health check..."
sleep 3
for i in {1..10}; do
    if curl -s http://192.168.11.21:8003/health > /dev/null; then
        echo "✅ Backend server is ready"
        break
    else
        echo "   Attempt $i/10: Waiting for backend..."
        sleep 2
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Backend health check failed"
        echo "Check backend.log for details"
        exit 1
    fi
done

# 5. フロントエンド起動
echo "📱 Step 5: Starting frontend (Expo)..."
echo "   - API Base URL: http://192.168.11.21:8003 (NO /api suffix)"
echo "   - Cache: Cleared"

cd audion-app
EXPO_PUBLIC_API_BASE_URL="http://192.168.11.21:8003" npx expo start --clear &
FRONTEND_PID=$!
cd ..

# 6. 起動完了とデバッグ情報
echo ""
echo "🎉 Audion Development Environment Ready!"
echo "========================================"
echo "Backend:  http://192.168.11.21:8003"
echo "Frontend: http://localhost:8081"
echo ""
echo "📋 Debug Information:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo "   Backend Log: backend.log"
echo ""
echo "🔧 Expected Console Logs:"
echo "   [API Config] BASE_URL: http://192.168.11.21:8003"
echo "   [AuthContext] Initializing authentication..."
echo "   [API] GET /api/... WITH_AUTH or NO_AUTH"
echo ""
echo "🚨 If you see 401 errors, check DEBUG_CHECKLIST.md"
echo "   Quick fix: Verify no /api duplication in URLs"
echo ""
echo "Press Ctrl+C to stop all processes"

# 7. 終了時のクリーンアップ
trap 'echo "🛑 Shutting down..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit' INT

# 8. プロセス監視
wait