# 🚨 Audion プロジェクト デバッグチェックリスト（スタック時必読）

**目的**: 開発中に認証エラー・API接続問題が発生した際の系統的診断手順

---

## 📋 MECE診断フレームワーク

### 🌐 **1. ネットワーク・接続層（Network Layer）**

#### 1.1 サーバー起動状態
```bash
# バックエンドサーバー確認
ps aux | grep uvicorn
curl http://192.168.11.21:8003/health  # ヘルスチェック

# プロセス競合排除
pkill -f "uvicorn.*8003" 2>/dev/null || true
```

#### 1.2 API Base URL設定
**🚨 最重要**: APIパス重複問題の防止
```bash
# ❌ 間違い（/api重複が発生）
EXPO_PUBLIC_API_BASE_URL="http://192.168.11.21:8003/api"

# ✅ 正解（config/api.tsが/apiを追加）
EXPO_PUBLIC_API_BASE_URL="http://192.168.11.21:8003"
```

#### 1.3 CORS設定確認
- `backend/server.py`: CORSMiddleware設定
- `allow_origins=["*"]` または具体的なドメイン指定
- `allow_headers=["*"]` にAuthorizationが含まれるか

#### 1.4 ネットワークアドレス
```bash
# IPアドレス確認
ifconfig | grep 192.168

# 正しい起動コマンド
uvicorn server:app --reload --port 8003 --host 0.0.0.0  # 全インターフェース
```

---

### 🔐 **2. 認証・トークン層（Authentication Layer）**

#### 2.1 トークン存在確認
```typescript
// React Native デバッガーコンソール
const token = await AsyncStorage.getItem('@audion_auth_token');
console.log('Stored token:', token);
```

#### 2.2 JWTトークン内容検証
1. コンソールで取得したトークンをコピー
2. [jwt.io](https://jwt.io/) にペースト
3. ペイロード確認:
   - `sub` (user ID)
   - `exp` (有効期限) が未来の日時か
   - `email` が正しいか

#### 2.3 インターセプター動作確認
```typescript
// AuthService.ts デバッグログ有効化
console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, token ? 'WITH_AUTH' : 'NO_AUTH');
```

期待される出力:
```
[API] POST /api/auth/login NO_AUTH
[API] GET /api/auth/me WITH_AUTH
[API] GET /api/rss-sources/my-sources WITH_AUTH
```

#### 2.4 認証フロー整合性
1. **ログイン成功** → トークン保存
2. **各API呼び出し** → インターセプターで自動ヘッダー付与
3. **401エラー時** → 自動ログアウト処理

---

### 🗄️ **3. データベース・バックエンド層（Database Layer）**

#### 3.1 データベース接続状態
```bash
# バックエンドログ確認
tail -f backend/server.log

# 期待されるメッセージ
"Connected to MongoDB successfully"
"Database indexes created successfully"
```

#### 3.2 MongoDB状態確認
```bash
# MongoDB接続テスト（ローカルの場合）
mongosh
use audion_db
db.users.find().limit(3)
```

#### 3.3 サーバーログ診断
重要なエラーパターン:
- `Database not connected` → MongoDB接続失敗
- `ObjectId serialization error` → データ型変換問題
- `User not found` → 認証ユーザー存在しない

---

### 💻 **4. フロントエンド・UI層（Frontend Layer）**

#### 4.1 Expo開発サーバー
```bash
# 正しい起動コマンド
cd audion-app
EXPO_PUBLIC_API_BASE_URL="http://192.168.11.21:8003" npx expo start --clear

# キャッシュクリア
npx expo start --clear
rm -rf node_modules/.cache
```

#### 4.2 React Native デバッガー
1. **Chrome DevTools**: `Cmd+D` → "Open JS Debugger"
2. **Console確認**: API呼び出しログ
3. **Network タブ**: 実際のHTTPリクエスト/レスポンス

#### 4.3 AsyncStorage状態
```javascript
// デバッガーコンソールで実行
AsyncStorage.getAllKeys().then(keys => {
  AsyncStorage.multiGet(keys).then(result => {
    console.log('AsyncStorage contents:', result);
  });
});
```

---

### 📱 **5. アプリ状態・ライフサイクル層（App State Layer）**

#### 5.1 認証コンテキスト状態
```typescript
// AuthContext.tsx デバッグ
console.log('AuthContext state:', { user, token, isAuthenticated, isLoading });
```

#### 5.2 アプリ初期化順序
1. **AuthProvider初期化** → stored auth読み込み
2. **API設定読み込み** → config/api.ts
3. **初回API呼び出し** → インターセプター動作開始

#### 5.3 画面遷移・状態管理
- **onboarding** → **login** → **main tabs**
- 各画面での認証状態継承確認

---

### 📱 **6. Audion固有ドメイン層（Domain-Specific Layer）**

#### 6.1 RSS処理システム
```bash
# RSS取得・解析エラー
grep -E "(RSS|Feed|XML)" backend/server.log | tail -20

# 特定の問題パターン
grep -E "(encoding|parse|timeout)" backend/server.log
```

**よくある問題**:
- **文字エンコーディング**: UTF-8以外のフィード
- **XMLパースエラー**: 不正なRSSフォーマット
- **タイムアウト**: 外部RSS取得の5秒制限

#### 6.2 音声生成パイプライン
```bash
# OpenAI API関連エラー
grep -E "(OpenAI|GPT|API_KEY)" backend/server.log | tail -10

# Google TTS関連エラー  
grep -E "(TTS|Google|speech)" backend/server.log | tail -10

# AWS S3関連エラー
grep -E "(S3|AWS|upload)" backend/server.log | tail -10
```

**診断ポイント**:
- **API Key有効性**: OpenAI・Google・AWS認証情報
- **クォータ制限**: 日次・月次利用制限超過
- **ファイルサイズ**: 大容量音声ファイルのアップロード失敗

#### 6.3 MongoDB ObjectId特有問題
```bash
# ObjectId シリアライゼーションエラー
grep -E "ObjectId.*iterable|ObjectId.*__dict__" backend/server.log

# データ型変換エラー
grep -E "str\(.*ObjectId\)|ObjectId.*string" backend/server.log
```

**頻出パターン**:
```python
# ❌ よくある間違い
return {"_id": result.inserted_id}  # ObjectIdそのまま

# ✅ 正しい変換
return {"_id": str(result.inserted_id)}
```

#### 6.4 React Native AsyncStorage問題
```javascript
// React Native デバッガーで実行
AsyncStorage.getAllKeys().then(keys => {
  console.log('Stored keys:', keys);
  // 期待される結果: ['@audion_auth_token', '@audion_user_data']
});
```

**よくある問題**:
- **キー命名不一致**: `@audion_auth_token` vs `@auth_token`
- **JSON解析エラー**: 不正な文字列保存
- **容量制限**: 大量データの保存エラー

#### 6.5 Expo開発環境特有
```bash
# Expo CLI バージョン確認
npx expo --version

# React Native バージョン互換性
cat audion-app/package.json | grep -E "react-native|expo"

# キャッシュクリア（完全版）
cd audion-app
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear --reset-cache
```

---

### 🔬 **7. パフォーマンス・スケーラビリティ層（Performance Layer）**

#### 7.1 メモリ・CPU監視
```bash
# Python プロセス監視
ps aux | grep uvicorn | awk '{print $3, $4, $6, $11}'  # CPU%, MEM%, VSZ

# Node.js プロセス監視  
ps aux | grep node | awk '{print $3, $4, $6, $11}'

# メモリリーク検出
top -p $(pgrep uvicorn)
```

#### 7.2 データベース性能
```bash
# MongoDB接続数確認
mongo --eval "db.serverStatus().connections"

# スロークエリログ
grep -E "slow|timeout" backend/server.log | tail -10
```

#### 7.3 API レスポンス時間
```bash
# 各エンドポイントの応答時間測定
curl -w "@curl-format.txt" -s -o /dev/null http://192.168.11.21:8003/api/auth/me
```

`curl-format.txt`:
```
time_namelookup:  %{time_namelookup}
time_connect:     %{time_connect}
time_total:       %{time_total}
```

---

### 🛡️ **8. セキュリティ・本番対応層（Security Layer）**

#### 8.1 認証セキュリティ
```bash
# JWT秘密鍵確認（本番では絶対に出力しない）
echo "JWT_SECRET_KEY length: ${#JWT_SECRET_KEY}"

# 脆弱なパスワード検出
grep -E "(password.*123|admin.*admin)" backend/server.log
```

#### 8.2 API Key・機密情報
```bash
# 環境変数確認（値は出力しない）
env | grep -E "API_KEY|SECRET" | sed 's/=.*/=***HIDDEN***/'

# ログ内の機密情報漏洩チェック
grep -E "(sk-|AIza|AKIA)" backend/server.log || echo "No API keys in logs ✅"
```

#### 8.3 HTTPS・TLS設定
```bash
# SSL証明書確認（本番環境）
openssl s_client -connect api.audion.app:443 -servername api.audion.app

# セキュリティヘッダー確認
curl -I https://api.audion.app/api/health
```

---

## 🛠️ **問題別 即座診断コマンド**

### 🚨 401 Unauthorized エラー
```bash
# 1. バックエンドログ確認
tail -n 50 backend/server.log | grep -E "(401|Unauthorized|Invalid token)"

# 2. フロントエンド認証状態
# React Native デバッガーで:
# AsyncStorage.getItem('@audion_auth_token')

# 3. API URL確認
# config/api.ts のBASE_URL設定
```

### 🚨 500 Internal Server Error
```bash
# 1. サーバー詳細ログ
tail -n 100 backend/server.log | grep -E "(ERROR|Exception|Traceback)"

# 2. データベース接続
grep -E "Database|MongoDB" backend/server.log | tail -10

# 3. ObjectId問題
grep "ObjectId.*serialization" backend/server.log
```

### 🚨 Connection Refused / Network Error
```bash
# 1. サーバープロセス確認
lsof -i :8003

# 2. ネットワーク疎通
curl -v http://192.168.11.21:8003/api/health

# 3. EXPO_PUBLIC_API_BASE_URL確認
echo $EXPO_PUBLIC_API_BASE_URL
```

---

## 🎯 **定期メンテナンス（週1回実行推奨）**

### システム健全性チェック
```bash
# 1. 不要プロセス終了
pkill -f uvicorn
pkill -f expo

# 2. キャッシュクリア
cd audion-app && npx expo start --clear
rm -rf .expo
rm -rf node_modules/.cache

# 3. 依存関係更新チェック
npm outdated
```

### パフォーマンス確認
```bash
# メモリ使用量
ps aux | grep -E "(uvicorn|expo|node)" | awk '{print $4, $11}'

# ポート使用状況
netstat -tulpn | grep -E ":8003|:8081"
```

---

## 📝 **デバッグ時の記録テンプレート**

```
## 発生時刻: 2025-XX-XX XX:XX

### 症状
- [ ] 401 Unauthorized
- [ ] 500 Internal Server
- [ ] Connection Refused
- [ ] その他: ___________

### 確認した項目
- [ ] サーバー起動状態
- [ ] API_BASE_URL設定
- [ ] AsyncStorage内容
- [ ] インターセプターログ
- [ ] バックエンドログ

### 解決策
1. 
2. 
3. 

### 再発防止
- 
```

---

**🎯 このチェックリストを参照することで、Audionプロジェクトの95%のデバッグ問題を系統的に解決可能**