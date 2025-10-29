# ハードコーディング違反修正 - 実装計画

## 📋 開発チェックリストとの整合性確認

### ✅ チェックリスト要件との対応

| チェックリスト項目 | 要件 | 修正対応 | 確認 |
|------------------|------|---------|------|
| **Line 12** | No hardcoded credentials | CRITICAL 3件 + 関連部分を修正 | ✅ |
| **Line 156** | No sensitive info in commits | 環境変数化で実現 | ✅ |
| **Line 24** | Verify environment variables | 全環境変数をドキュメント化 | ✅ |
| **Line 22-25** | Server verification | 修正後に`uvicorn`で検証 | ✅ |
| **Line 35-39** | Frontend code quality | TypeScript/Lintチェック | ✅ |
| **Line 55** | Expo testing | `npx expo start`で検証 | ✅ |

---

## 🔄 依存関係分析

### Phase 1: 基盤設定（CRITICAL - 必須）
```
JWT Secret修正
├─ backend/server.py:150 削除
├─ Render Dashboard で必須化
└─ → Phase 2 の前提条件
```

### Phase 2: 設定ファイル整備（共通）
```
backend/config/settings.py 拡張
├─ 全環境変数をここに集約
├─ デフォルト値の定義
└─ → Phase 3, 4, 5 で参照
```

### Phase 3: バックエンド修正（7つのHIGH）
```
CORS, URLs, Timeouts修正
├─ server.py (CORS)
├─ storage_service.py (File Server URL)
├─ ai_service.py (Audio URLs, Models)
├─ database.py (Timeouts)
└─ → テスト可能
```

### Phase 4: バックエンド検証
```
python backend_test.py
uvicorn server:app --reload
├─ 全テスト合格
└─ → Phase 5 進める
```

### Phase 5: フロントエンド修正（MEDIUM 4件）
```
API設定, IP削除
├─ audion-app-fresh/config/api.ts
├─ audion-app-fresh/.env.development
├─ audion-app/.env.user
└─ → テスト可能
```

### Phase 6: フロントエンド検証
```
npx tsc --noEmit
npm run lint
npx expo start
├─ ビルド成功
└─ → Phase 7 進める
```

### Phase 7: デプロイ前最終確認
```
Render環境変数セット
├─ 全必須変数確認
└─ デプロイ
```

---

## 🛠️ 詳細実装手順

### Phase 1: CRITICAL 3件 修正

#### Step 1-1: JWT Secret Default 削除
**ファイル:** `backend/server.py:150`
```python
# ❌ 現在の状態
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-do-not-use-in-production')

# ✅ 修正後
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    raise RuntimeError('JWT_SECRET_KEY environment variable must be set')
```

**確認:**
- [ ] エラーメッセージが出力される
- [ ] 開発環境では`.env`に設定済み
- [ ] Render では設定済み

---

#### Step 1-2: OpenAI API 検証を実装
**ファイル:** `backend/services/ai_service.py:29, 73, 129, 232`
```python
# ❌ 現在の状態
if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
    return (fallback)

# ✅ 修正後（起動時に検証）
def validate_openai_api():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key or api_key == "your-openai-key":
        raise RuntimeError('OPENAI_API_KEY not properly configured')
    return api_key
```

**確認:**
- [ ] モジュール読み込み時にエラー発生
- [ ] 環境変数が設定されていることを確認

---

#### Step 1-3: AWS 認証情報検証を実装
**ファイル:** `backend/services/storage_service.py:39, 255`
```python
# ❌ 現在の状態
if AWS_ACCESS_KEY_ID == "your-aws-access-key":
    raise ValueError(...)

# ✅ 修正後（起動時に検証）
def validate_aws_credentials():
    access_key = os.environ.get('AWS_ACCESS_KEY_ID')
    secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
    if not access_key or access_key == "your-aws-access-key":
        raise RuntimeError('AWS_ACCESS_KEY_ID not properly configured')
    if not secret_key:
        raise RuntimeError('AWS_SECRET_ACCESS_KEY not properly configured')
```

**確認:**
- [ ] モジュール読み込み時にエラー発生
- [ ] 環境変数が設定されていることを確認

---

### Phase 2: 設定ファイル統一

#### Step 2-1: settings.py に全定数を集約
**ファイル:** `backend/config/settings.py`

追加する変数（優先順位順）:
```python
# セキュリティ（必須）
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')  # REQUIRED
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')  # REQUIRED
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')  # REQUIRED
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')  # REQUIRED

# AWS設定（必須）
AWS_REGION = os.environ.get('AWS_REGION')  # REQUIRED
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')  # REQUIRED

# ネットワーク設定
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://audion.onrender.com').split(',')
FILE_SERVER_URL = os.environ.get('FILE_SERVER_URL', 'http://localhost:8001')
MOCK_AUDIO_URL_BASE = os.environ.get('MOCK_AUDIO_URL_BASE', 'http://localhost:8001')

# タイムアウト設定
DB_PING_TIMEOUT = float(os.environ.get('DB_PING_TIMEOUT', '5.0'))
DB_OPERATION_TIMEOUT = float(os.environ.get('DB_OPERATION_TIMEOUT', '10.0'))
DB_BATCH_TIMEOUT = float(os.environ.get('DB_BATCH_TIMEOUT', '5.0'))

# キャッシング
RSS_CACHE_EXPIRY_SECONDS = int(os.environ.get('RSS_CACHE_EXPIRY_SECONDS', '300'))

# コンテンツ設定
RECOMMENDED_WORD_COUNT = int(os.environ.get('RECOMMENDED_WORD_COUNT', '250'))
INSIGHT_WORD_COUNT = int(os.environ.get('INSIGHT_WORD_COUNT', '350'))

# OpenAI設定
OPENAI_CHAT_MODEL = os.environ.get('OPENAI_CHAT_MODEL', 'gpt-4o')
OPENAI_TTS_MODEL = os.environ.get('OPENAI_TTS_MODEL', 'tts-1')
OPENAI_TTS_VOICE = os.environ.get('OPENAI_TTS_VOICE', 'alloy')
OPENAI_TEST_MODEL = os.environ.get('OPENAI_TEST_MODEL', 'gpt-3.5-turbo')

# データベース
DB_NAME = os.environ.get('DB_NAME', 'audion_dev_db')
```

**確認:**
- [ ] 全変数がsettings.pyで定義
- [ ] デフォルト値は必須でないもののみ
- [ ] コメントで必須/オプションを区別

---

### Phase 3: バックエンド各ファイルの修正

#### Step 3-1: server.py - CORS設定修正
**ファイル:** `backend/server.py:202-211`

修正内容:
```python
# ❌ 現在
ALLOWED_ORIGINS = ["https://audion.onrender.com", "http://localhost:3000", ...]

# ✅ 修正後
from config.settings import CORS_ALLOWED_ORIGINS
ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS
```

**確認:**
- [ ] ローカル開発でCORS動作確認
- [ ] Render デプロイで設定反映確認

---

#### Step 3-2: storage_service.py - ファイルサーバーURL修正
**ファイル:** `backend/services/storage_service.py:160`

修正内容:
```python
# ❌ 現在
local_url = f"http://localhost:8001/profile-images/{image_filename}"

# ✅ 修正後
from config.settings import FILE_SERVER_URL
local_url = f"{FILE_SERVER_URL}/profile-images/{image_filename}"
```

**確認:**
- [ ] 開発環境：`http://localhost:8001`で動作
- [ ] 本番環境：Render URLで動作

---

#### Step 3-3: ai_service.py - 複数の修正
**ファイル:** `backend/services/ai_service.py`

修正対象：
1. **Line 204, 220**: オーディオURL
2. **Line 48, 102, 136, 240**: モデル名
3. **Line 29, 73, 129, 232**: API検証（CRITICAL対応）

```python
# ❌ 現在
dummy_audio_url = "http://localhost:8001/audio_files/..."
model="gpt-4o"

# ✅ 修正後
from config.settings import MOCK_AUDIO_URL_BASE, OPENAI_CHAT_MODEL
dummy_audio_url = f"{MOCK_AUDIO_URL_BASE}/audio_files/..."
model=OPENAI_CHAT_MODEL
```

**確認:**
- [ ] 音声ファイルURL設定反映
- [ ] モデル名設定反映
- [ ] API検証エラーがcatched

---

#### Step 3-4: database.py - タイムアウト修正
**ファイル:** `backend/config/database.py:30`

修正内容:
```python
# ❌ 現在
await asyncio.wait_for(db.command('ping'), timeout=5.0)

# ✅ 修正後
from config.settings import DB_PING_TIMEOUT, DB_OPERATION_TIMEOUT
await asyncio.wait_for(db.command('ping'), timeout=DB_PING_TIMEOUT)
```

**確認:**
- [ ] database.py内の全timeout参照を更新
- [ ] server.py内のtimeout参照も確認

---

### Phase 4: バックエンド検証

#### Step 4-1: テスト実行
```bash
cd backend
python backend_test.py
```

**確認:**
- [ ] 全テスト合格
- [ ] API認証テスト合格
- [ ] RSS処理テスト合格
- [ ] AI統合テスト合格

---

#### Step 4-2: サーバー起動確認
```bash
uvicorn server:app --reload --port 8001
```

**確認:**
- [ ] サーバー起動成功（エラーなし）
- [ ] "🚀 AUDION BACKEND STARTUP"ログ出現
- [ ] "Connected to MongoDB successfully"ログ出現
- [ ] CORS設定が反映
- [ ] 全環境変数が読み込まれている

---

### Phase 5: フロントエンド修正

#### Step 5-1: audion-app/.env.user 修正
**ファイル:** `audion-app/.env.user:2`

修正内容:
```bash
# ❌ 現在
EXPO_PUBLIC_BACKEND_URL=http://192.168.11.60:8000

# ✅ 修正後
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
# または削除（動的解決に任せる）
```

**確認:**
- [ ] ローカルホストで接続確認
- [ ] IPアドレスが削除されている

---

#### Step 5-2: audion-app-fresh/config/api.ts 修正
**ファイル:** `audion-app-fresh/config/api.ts:44, 49, 55`

修正内容:
```typescript
// ❌ 現在
const PROD_API_URL = 'https://api.audion.app';
const DEV_API_PORT = 8003;
TIMEOUT: 30000,

// ✅ 修正後
const PROD_API_URL = process.env.EXPO_PUBLIC_PROD_API_URL || 'https://audion.onrender.com';
const DEV_API_PORT = process.env.EXPO_PUBLIC_DEV_API_PORT || '8003';
const DEFAULT_API_TIMEOUT_MS = 30000;
TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || String(DEFAULT_API_TIMEOUT_MS)),
```

**確認:**
- [ ] 環境変数読み込み確認
- [ ] 本番URL正確
- [ ] デフォルト値適正

---

#### Step 5-3: audion-app-fresh/.env.development 更新
**ファイル:** `audion-app-fresh/.env.development`

追加する環境変数:
```env
EXPO_PUBLIC_PROD_API_URL=https://audion.onrender.com
EXPO_PUBLIC_DEV_API_PORT=8003
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_APP_VERSION=1.0.0-dev
```

**確認:**
- [ ] 全新しい環境変数が設定されている
- [ ] デフォルト値と一致

---

### Phase 6: フロントエンド検証

#### Step 6-1: TypeScript チェック
```bash
cd audion-app-fresh
npx tsc --noEmit
```

**確認:**
- [ ] TypeScriptエラー：0件
- [ ] 型チェック：OK

---

#### Step 6-2: Linting チェック
```bash
npm run lint
```

**確認:**
- [ ] ESLintエラー：0件
- [ ] ESLint警告：0件

---

#### Step 6-3: Expo 起動確認
```bash
npx expo start --clear --tunnel
```

**確認:**
- [ ] Expoサーバー起動成功
- [ ] コンソールエラー：0件
- [ ] API接続OK
- [ ] ナビゲーション動作OK

---

### Phase 7: デプロイ前最終確認

#### Step 7-1: Render 環境変数セット確認

**Render Dashboard で以下を確認:**

必須変数（デフォルト値なし）:
- [ ] `JWT_SECRET_KEY` - 設定済み
- [ ] `OPENAI_API_KEY` - 設定済み
- [ ] `AWS_ACCESS_KEY_ID` - 設定済み
- [ ] `AWS_SECRET_ACCESS_KEY` - 設定済み
- [ ] `AWS_REGION` - 設定済み
- [ ] `S3_BUCKET_NAME` - 設定済み

推奨変数:
- [ ] `CORS_ALLOWED_ORIGINS` - 設定済み
- [ ] `FILE_SERVER_URL` - 設定済み（本番URL）
- [ ] `MOCK_AUDIO_URL_BASE` - 設定済み
- [ ] `DB_*_TIMEOUT` - 設定済み
- [ ] `RSS_CACHE_EXPIRY_SECONDS` - 設定済み
- [ ] `RECOMMENDED_WORD_COUNT` - 設定済み
- [ ] `INSIGHT_WORD_COUNT` - 設定済み
- [ ] `OPENAI_CHAT_MODEL` - 設定済み
- [ ] `OPENAI_TTS_MODEL` - 設定済み
- [ ] `OPENAI_TTS_VOICE` - 設定済み
- [ ] `OPENAI_TEST_MODEL` - 設定済み
- [ ] `DB_NAME` - 設定済み（`audion_prod_db`）

---

#### Step 7-2: ローカルテスト
```bash
# .env に本番相当の環境変数を設定
ENVIRONMENT=production uvicorn server:app --reload --port 8001
```

**確認:**
- [ ] サーバー起動OK
- [ ] ログにエラーなし
- [ ] 全機能動作OK

---

#### Step 7-3: コミット
```bash
git add backend/ audion-app-fresh/
git commit -m "🔧 Extract all hardcoded values to environment variables"
git push
```

**確認:**
- [ ] コミット成功
- [ ] リモート push 成功
- [ ] Render 自動デプロイ開始

---

## ⚠️ リスク管理

### 修正時の注意点

| リスク | 影響 | 対策 |
|--------|------|------|
| 環境変数未設定 | サーバー起動失敗 | 起動時にエラー発生で検出 |
| デフォルト値の誤り | 予期しない動作 | ローカル検証で発見 |
| URL変更忘れ | 本番で404エラー | チェックリストで確認 |
| TypeScript エラー | ビルド失敗 | `npx tsc --noEmit` で先に検出 |
| テスト失敗 | 機能破損 | `python backend_test.py` で検証 |

### ロールバック計画
修正後に問題発見時:
1. 前のコミットに戻す: `git revert`
2. 原因を特定
3. 再修正

---

## 📊 完了確認リスト

### コード修正完了
- [ ] backend/server.py
- [ ] backend/config/settings.py
- [ ] backend/config/database.py
- [ ] backend/services/ai_service.py
- [ ] backend/services/storage_service.py
- [ ] audion-app-fresh/config/api.ts
- [ ] audion-app-fresh/.env.development
- [ ] audion-app/.env.user

### テスト完了
- [ ] `python backend_test.py` - 全テスト合格
- [ ] `uvicorn server:app` - 起動成功
- [ ] `npx tsc --noEmit` - エラー0件
- [ ] `npm run lint` - エラー0件
- [ ] `npx expo start` - 起動成功

### ドキュメント完了
- [ ] `.env.example` 作成・更新
- [ ] `CLAUDE.md` 更新
- [ ] 環境変数の説明文書

### デプロイ完了
- [ ] git commit & push
- [ ] Render 環境変数セット
- [ ] Render デプロイ成功
- [ ] 本番エンドポイント確認

---

**計画作成日:** 2025-10-29
**推定実装時間:** 14-18時間
**チェックリスト対応:** ✅ 完全準拠
**リスク評価:** 低～中（適切な検証で回避可能）
