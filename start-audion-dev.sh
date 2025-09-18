#!/bin/bash

echo "🚀 Starting Audion Development Environment..."

# 現在のIPアドレス自動検出
CURRENT_IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1)
echo "   Detected IP: $CURRENT_IP"

# .env.developmentのIPアドレス自動更新
if [ -f "audion-app/.env.development" ]; then
    # Normalize to base URL without trailing /api (frontend adds /api in endpoints)
    sed -i '' "s#^EXPO_PUBLIC_API_BASE_URL=.*#EXPO_PUBLIC_API_BASE_URL=http://$CURRENT_IP:8003#" audion-app/.env.development
    echo "   Updated audion-app/.env.development with IP: $CURRENT_IP ✅"
fi

# MongoDB確認・起動
echo "-> Checking MongoDB..."
if ! brew services list | grep -q "mongodb-community.*started"; then
    echo "   Starting MongoDB..."
    brew services start mongodb/brew/mongodb-community
else
    echo "   MongoDB already running ✅"
fi

# バックエンドサーバー起動
echo "-> Starting Backend Server (Port 8003)..."
cd backend
source ../venv/bin/activate
uvicorn server:app --reload --port 8003 --host 0.0.0.0 &
BACKEND_PID=$!
cd ..

# バックエンド起動待機
echo "   Waiting for backend to start..."
sleep 5

# フロントエンド起動
echo "-> Starting Frontend (Expo)..."
cd audion-app
npx expo start --clear &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Audion Development Environment is running:"
echo "   🔧 Backend API: http://$CURRENT_IP:8003"
echo "   📱 Frontend: Starting Expo Metro bundler..."
echo "   🛑 Press Ctrl+C to stop all services"
echo ""

# 終了時の後処理
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Shutdown complete"
}

trap cleanup EXIT INT TERM

# プロセスが生きている間待機
wait
