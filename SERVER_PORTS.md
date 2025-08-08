# 🚀 Audion サーバーポート管理ガイド

## 📋 ポート割り当て

### **ユーザー専用サーバー (User Server)**
- **ポート:** `8003`
- **用途:** メイン開発・テスト用
- **起動コマンド:**
```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo
source venv/bin/activate
cd backend
uvicorn server:app --reload --port 8003
```

### **Claude AI専用サーバー (Claude Server)**  
- **ポート:** `8002`
- **用途:** デバッグ・API検証専用
- **起動コマンド:**
```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo
source venv/bin/activate
cd backend
uvicorn server:app --reload --port 8002
```

## 🔧 アプリ設定

### **フロントエンド設定**
- **ファイル:** `audion-app/.env`
- **設定値:** `EXPO_PUBLIC_BACKEND_URL=http://localhost:8003`
- **接続先:** ユーザー専用サーバー (port 8003)

## 📝 使用ルール

### **ユーザー使用時**
1. ポート8003でサーバーを起動
2. アプリ開発・テスト・実際の使用はすべてポート8003
3. 通常のExpo開発サーバーも合わせて起動

### **Claude AI使用時**
1. ポート8002でサーバーを起動
2. API検証・デバッグ専用
3. ユーザーのサーバーと干渉しない

## ⚠️ 注意事項

### **プロセス確認・停止**
```bash
# 現在のプロセス確認
ps aux | grep uvicorn

# 特定ポートで起動中のプロセスを停止
kill [プロセスID]

# 全uvicornプロセスを停止
pkill -f uvicorn
```

### **ポート使用状況確認**
```bash
# ポート8002の使用状況
lsof -i :8002

# ポート8003の使用状況  
lsof -i :8003
```

## 📊 **MongoDB必須要件**

### **MongoDBインストール**
```bash
# MongoDBをHomebrew経由でインストール
brew tap mongodb/brew
brew install mongodb-community

# MongoDBサービスを開始
brew services start mongodb/brew/mongodb-community

# サービス状況確認
brew services list | grep mongodb
```

### **MongoDB接続確認**
```bash
# MongoDB Shell接続テスト
mongosh
# または
mongo

# データベース一覧表示
show dbs
```

⚠️ **重要**: MongoDBが起動していない場合、すべてのAPI呼び出しで500エラーが発生します。

## 🎯 現在の問題と解決策

### **問題**
- アプリがサーバーに接続できない (Network Error)
- 複数のポートでサーバーが起動してしまい混乱
- **500エラー**: MongoDBが未起動または未接続

### **解決手順**
1. **MongoDB起動**: `brew services start mongodb/brew/mongodb-community`
2. **既存プロセス停止**: `pkill -f uvicorn`
3. **ユーザーサーバー起動**: 上記のport 8003コマンド実行
4. **アプリ再起動**: Expo開発サーバーもリフレッシュ

## 📊 ログ確認

### **サーバーが正常起動した時のログ**
```
INFO:     Uvicorn running on http://127.0.0.1:8003 (Press CTRL+C to quit)
INFO:     Connected to MongoDB successfully
INFO:     Application startup complete.
```

### **ヘルスチェック確認**
```bash
curl http://localhost:8003/health
# 期待レスポンス: {"status":"healthy",...}
```

---
*Last Updated: 2025年8月8日*
*このファイルはサーバー起動前に必ず確認してください*