# API動作確認・検証手順書
**作成日**: 2025年1月27日
**対象**: Home UI強化に関連するAPI動作検証

## 🎯 検証目的

### 主要目標
1. **既存API完全性確認**: 現在動作中のAPI群への非破壊影響検証
2. **新機能API要件定義**: 記事分類・エンゲージメント機能用API設計
3. **パフォーマンス基準確認**: レスポンス時間・スループット測定
4. **エラーハンドリング検証**: 障害時の適切なフォールバック確認

## 📋 Phase 1: 既存API動作確認

### 1.1 バックエンドサーバー起動確認
```bash
# サーバー起動状態確認
curl -I http://localhost:8003/health
# 期待レスポンス: HTTP/1.1 200 OK

# API基本接続確認
curl http://localhost:8003/docs
# 期待: FastAPI Swagger UI表示
```

### 1.2 認証API検証
```bash
# ユーザー登録API
curl -X POST http://localhost:8003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "name": "Test User"
  }'

# ログインAPI
curl -X POST http://localhost:8003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'

# JWT Token取得・保存
export JWT_TOKEN="YOUR_ACTUAL_JWT_TOKEN_HERE"
```

### 1.3 RSS・記事取得API検証
```bash
# キュレーション記事取得（Home用）
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8003/api/articles/curated?limit=50"

# ユーザーRSS記事取得（Feed用）
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8003/api/articles?limit=50"

# RSS ソース一覧取得
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8003/api/sources"
```

### 1.4 レスポンス構造検証
```json
// Article型の完全性確認（期待構造）
{
  "id": "string",
  "title": "string",
  "summary": "string",
  "content": "string",
  "genre": "string",           // 必須: ジャンル分類
  "source_name": "string",     // 必須: ソース識別
  "source_id": "string",       // 必須: ソースID
  "url": "string",
  "published_at": "datetime",
  "image_url": "string",
  "read_status": "boolean"     // 新機能: 既読状態
}
```

## 📊 Phase 2: パフォーマンス・負荷テスト

### 2.1 レスポンス時間測定
```bash
# 複数回実行による平均レスポンス時間測定
for i in {1..10}; do
  time curl -s -H "Authorization: Bearer $JWT_TOKEN" \
       "http://localhost:8003/api/articles/curated?limit=50" > /dev/null
done

# 基準: 95%ile < 2秒
```

### 2.2 同時リクエスト負荷テスト
```bash
# Apache Bench使用（要インストール: brew install httpd）
ab -n 100 -c 10 -H "Authorization: Bearer $JWT_TOKEN" \
   "http://localhost:8003/api/articles/curated?limit=10"

# 基準:
# - Requests per second > 10
# - Failed requests = 0
# - 99%ile response time < 5秒
```

### 2.3 メモリ・CPU使用量監視
```bash
# プロセス監視（別ターミナルで実行）
while true; do
  ps aux | grep "uvicorn server:app" | grep -v grep
  sleep 2
done

# 基準: メモリ使用量 < 500MB、CPU使用率 < 50%（通常時）
```

## 🔧 Phase 3: 新機能API要件定義・モック作成

### 3.1 記事分類API設計
```bash
# 新エンドポイント設計案
# GET /api/articles/categorized
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8003/api/articles/categorized?category=emergency&limit=5"

# 期待レスポンス
{
  "emergency": [...]，      // 緊急記事
  "trending": [...],        // トレンド記事
  "personalized": [...],    // パーソナライズ記事
  "latest": [...]           // 最新記事
}
```

### 3.2 エンゲージメントAPI設計
```bash
# 記事エンゲージメント記録
curl -X POST -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     "http://localhost:8003/api/articles/engagement" \
     -d '{
       "article_id": "article_123",
       "action": "view",           // view, like, share, read_full
       "duration": 30000,          // 滞在時間（ミリ秒）
       "timestamp": "2025-01-27T10:00:00Z"
     }'

# エンゲージメントスコア取得
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8003/api/articles/article_123/engagement-score"
```

### 3.3 緊急情報API設計（外部API統合）
```bash
# 気象庁API モック（開発環境）
curl "http://localhost:8003/api/emergency/weather?region=tokyo"

# J-ALERT API モック
curl "http://localhost:8003/api/emergency/j-alert?prefecture=tokyo"

# 統合緊急情報エンドポイント
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8003/api/emergency/unified?location=tokyo"
```

## ⚠️ Phase 4: エラーハンドリング・フォールバック検証

### 4.1 ネットワーク障害シミュレーション
```bash
# データベース接続エラーシミュレーション
# → MongoDB停止状態でのAPI動作確認

# 外部RSS取得エラーシミュレーション
# → 存在しないRSS URLでの動作確認

# 期待動作: エラーレスポンス + キャッシュデータ返却
```

### 4.2 不正リクエスト検証
```bash
# 無効な認証トークン
curl -H "Authorization: Bearer invalid_token" \
     "http://localhost:8003/api/articles/curated"
# 期待: HTTP 401 Unauthorized

# 不正なパラメータ
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8003/api/articles/curated?limit=999999"
# 期待: HTTP 400 Bad Request + エラーメッセージ
```

### 4.3 レート制限検証
```bash
# 短時間大量リクエスト
for i in {1..50}; do
  curl -s -H "Authorization: Bearer $JWT_TOKEN" \
       "http://localhost:8003/api/articles/curated" > /dev/null &
done
wait

# 期待: HTTP 429 Too Many Requests（実装されている場合）
```

## 🛠️ Phase 5: 開発環境セットアップ検証

### 5.1 必要な環境変数確認
```bash
# Backend環境変数チェック
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend
cat .env

# 必須項目:
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=audion_db
# OPENAI_API_KEY=sk-...
# JWT_SECRET=your_secret_key
```

### 5.2 MongoDB接続確認
```bash
# MongoDB起動状態確認
brew services list | grep mongodb
# または
systemctl status mongod

# データベース接続テスト
mongosh audion_db --eval "db.runCommand({connectionStatus: 1})"
```

### 5.3 フロントエンド・バックエンド連携確認
```bash
# フロントエンド設定確認
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app-fresh
cat config/api.ts

# API Base URL確認
# 期待: http://localhost:8003 または ネットワークIP:8003
```

## 📋 検証チェックリスト

### 基本機能検証
- [ ] バックエンドサーバー正常起動（ポート8003）
- [ ] JWT認証フロー完全動作
- [ ] 記事取得API（curated）正常レスポンス
- [ ] RSS ソース管理API正常動作
- [ ] フロントエンド・バックエンド通信成功

### パフォーマンス検証
- [ ] 記事取得レスポンス時間 < 2秒（50件）
- [ ] 同時10リクエスト処理可能
- [ ] メモリ使用量 < 500MB
- [ ] CPU使用率正常範囲内

### エラーハンドリング検証
- [ ] 無効トークンで適切な401エラー
- [ ] ネットワーク障害時のフォールバック動作
- [ ] 不正パラメータで適切なバリデーションエラー
- [ ] データベース障害時のエラー処理

### 新機能API要件確認
- [ ] 記事分類エンドポイント設計完了
- [ ] エンゲージメント記録API設計完了
- [ ] 緊急情報API統合方針確定
- [ ] フロントエンド型定義との整合性確認

## 🚨 障害時対応手順

### 重大障害（API全停止）
```bash
# 1. バックエンド再起動
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo
./start-dev-fixed.sh

# 2. MongoDB再起動
brew services restart mongodb-community
# または
sudo systemctl restart mongod

# 3. ログ確認
tail -f backend/logs/app.log
```

### 部分障害（特定API不調）
```bash
# ヘルスチェックエンドポイント実行
curl http://localhost:8003/api/health/detailed

# 問題のあるエンドポイント特定
curl -v http://localhost:8003/api/articles/curated
```

### フロントエンド接続不良
```bash
# ネットワーク接続確認
ping 192.168.1.xxx  # バックエンドサーバーIP

# API設定確認・修正
cd audion-app-fresh
grep -r "localhost:8003" config/
grep -r "192.168" config/
```

---

**この検証手順により、Home UI強化実装前の完全なAPI動作確認と、実装中・実装後の継続的品質保証を実現します。**