# 🚀 Audion ローカル開発 起動コマンド集

## 📋 完全起動手順

### 1️⃣ **バックエンドサーバー起動** (ターミナル1)

```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo
source venv/bin/activate
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8003
```

**起動成功ログ:**
```
INFO:     Uvicorn running on http://0.0.0.0:8003 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

**ヘルスチェック確認:**
```bash
curl http://localhost:8003/health
# 期待レスポンス: {"status":"healthy","database":"connected",...}
```

### 2️⃣ **フロントエンドアプリ起動** (ターミナル2)

```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app-fresh
rm -rf .expo .expo-shared
npx expo start --clear --tunnel
```

**接続成功ログ:**
```
LOG  🔧 LAN mode detected - using local IP: 192.168.11.34
LOG  🔗 API_CONFIG.BASE_URL: http://192.168.11.34:8003
LOG  [Auth] Token validation successful
```

## 🔧 設定確認

### **ポート設定**
- **バックエンド**: 8003ポート (`--host 0.0.0.0` 必須)
- **フロントエンド**: 自動検出で http://192.168.11.34:8003 に接続

### **環境設定ファイル**
- **`.env.development`**: `EXPO_PUBLIC_DEV_API_PORT=8003` ✅
- **`config/api.ts`**: デフォルトポート `8003` ✅

## 🚨 トラブルシューティング

### **バックエンド接続エラー**
```bash
# 既存プロセス停止
pkill -f uvicorn

# 正しいコマンドで再起動
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo
source venv/bin/activate
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8003
```

### **MongoDB未起動エラー**
```bash
# MongoDB起動
brew services start mongodb/brew/mongodb-community

# 確認
brew services list | grep mongodb
```

### **フロントエンド キャッシュクリア**
```bash
cd audion-app-fresh
rm -rf .expo .expo-shared node_modules
npm install
npx expo start --clear --tunnel
```

## ✅ 起動完了チェックリスト

- [ ] バックエンドが http://0.0.0.0:8003 で起動
- [ ] ヘルスチェック `curl http://localhost:8003/health` が成功
- [ ] フロントエンドが http://192.168.11.34:8003 に接続
- [ ] エラーログに "Network Error" が出ていない
- [ ] MongoDB が起動済み
- [ ] 認証が正常に動作

---
*Last Updated: 2025-11-01*
*バックエンドは必ず `--host 0.0.0.0` でLAN接続を有効にすること*