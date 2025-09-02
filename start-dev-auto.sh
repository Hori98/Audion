#!/bin/bash

# 🎯 Audion Development Environment with Auto IP Detection
# このスクリプトは現在のIPアドレスを自動検出し、環境設定を更新します

echo "🎯 Starting Audion Development Environment with Auto IP Detection"
echo "=================================================================="

# 現在のローカルIPアドレスを自動検出
CURRENT_IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect local IP address"
    exit 1
fi

echo "🌐 Detected Local IP: $CURRENT_IP"

# フロントエンドの.env.developmentファイルを更新
FRONTEND_ENV="audion_new_frontend/.env.development"
if [ -f "$FRONTEND_ENV" ]; then
    echo "📝 Updating frontend environment configuration..."
    
    # 現在の設定をバックアップ
    cp "$FRONTEND_ENV" "$FRONTEND_ENV.backup.$(date +%Y%m%d_%H%M%S)"
    
    # IP アドレスを更新（ngrok URLは保持）
    sed -i.tmp "s|# Backup local URL: http://.*:8003/api|# Backup local URL: http://$CURRENT_IP:8003/api|g" "$FRONTEND_ENV"
    rm "$FRONTEND_ENV.tmp"
    
    echo "   ✅ Updated API backup URL to: http://$CURRENT_IP:8003/api"
else
    echo "❌ Frontend environment file not found: $FRONTEND_ENV"
    exit 1
fi

echo ""
echo "🚀 Current Configuration:"
echo "   Backend Server: http://$CURRENT_IP:8003"
echo "   Frontend Server: http://localhost:8085"
echo "   ngrok Tunnel: https://e1c749645ae5.ngrok-free.app"
echo ""
echo "💡 ngrok provides stable connectivity regardless of IP changes!"
echo "   Use ngrok URL for development to avoid future IP issues."
echo ""

# バックエンドサーバーを起動
echo "🚀 Starting backend server..."
cd backend
source ../venv/bin/activate 2>/dev/null || echo "Warning: Virtual environment not found"

# 既存のプロセスをクリーンアップ
echo "🧹 Cleaning up existing processes..."
pkill -f "uvicorn.*server:app" || true
sleep 2

# サーバー起動
echo "   Backend will be accessible at: http://$CURRENT_IP:8003"
uvicorn server:app --reload --port 8003 --host 0.0.0.0