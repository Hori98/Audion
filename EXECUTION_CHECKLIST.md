# ハードコーディング違反修正 - 実行チェックリスト

## Phase 1: CRITICAL 3件修正（推定 1-2時間）

### Task 1-1: JWT Secret デフォルト削除
- [ ] `backend/server.py:150` を確認
- [ ] デフォルト値を削除
- [ ] RuntimeError を追加
- [ ] `.env` に `JWT_SECRET_KEY` 設定済み確認
- [ ] Render Dashboard に設定済み確認
- **検証:**
  - [ ] KeyError が発生しないこと確認
  - [ ] 環境変数が正しく読み込まれること確認

### Task 1-2: OpenAI API 検証実装
- [ ] `backend/services/ai_service.py` を確認
- [ ] `validate_openai_api()` 関数を作成
- [ ] Line 29, 73, 129, 232 で呼び出し
- [ ] RuntimeError メッセージを確認
- [ ] `.env` に `OPENAI_API_KEY` 設定済み確認
- **検証:**
  - [ ] キー不正時にエラー発生
  - [ ] キー正常時にパス

### Task 1-3: AWS 認証情報検証実装
- [ ] `backend/services/storage_service.py` を確認
- [ ] `validate_aws_credentials()` 関数を作成
- [ ] Line 39, 255 で呼び出し
- [ ] RuntimeError メッセージを確認
- [ ] `.env` に `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 設定済み確認
- **検証:**
  - [ ] キー不正時にエラー発生
  - [ ] キー正常時にパス

---

## Phase 2: 設定ファイル統一（推定 1-2時間）

### Task 2-1: settings.py に全定数を集約
- [ ] `backend/config/settings.py` を開く
- [ ] 以下の変数グループを追加:
  - [ ] **セキュリティ**: JWT, OPENAI, AWS (3個)
  - [ ] **AWS設定**: REGION, BUCKET (2個)
  - [ ] **ネットワーク**: CORS, FILE_SERVER, AUDIO_URL (3個)
  - [ ] **タイムアウト**: DB_PING, DB_OP, DB_BATCH (3個)
  - [ ] **キャッシング**: CACHE_EXPIRY (1個)
  - [ ] **コンテンツ**: WORD_COUNT (2個)
  - [ ] **OpenAI**: CHAT_MODEL, TTS_MODEL, VOICE, TEST_MODEL (4個)
  - [ ] **DB**: DB_NAME (1個)
- **確認:**
  - [ ] 全変数が os.environ.get() で取得
  - [ ] デフォルト値は非必須変数のみ
  - [ ] コメントで必須/オプション区別
  - [ ] インポートが可能

### Task 2-2: .env.example 作成
- [ ] `backend/.env.example` を作成
- [ ] 全環境変数をリスト化
- [ ] コメントで説明追加
- [ ] 本番値と開発値の違いを記載
- **確認:**
  - [ ] 全変数がカバーされている
  - [ ] 説明が明確

---

## Phase 3: バックエンド各ファイル修正（推定 3-4時間）

### Task 3-1: server.py - CORS修正
- [ ] Line 202-211 を確認
- [ ] `from config.settings import CORS_ALLOWED_ORIGINS` 追加
- [ ] `ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS` に変更
- [ ] 他の hardcoded URL がないか grep で確認
- **検証:**
  - [ ] Linting エラーなし: `flake8`
  - [ ] imports 正確

### Task 3-2: storage_service.py - ファイルサーバーURL修正
- [ ] Line 160 を確認
- [ ] `from config.settings import FILE_SERVER_URL` 追加
- [ ] `http://localhost:8001` を `FILE_SERVER_URL` に置換
- [ ] 他の hardcoded localhost がないか確認
- **検証:**
  - [ ] Linting エラーなし: `flake8`
  - [ ] URL生成ロジック確認

### Task 3-3: ai_service.py - 複数修正
- [ ] **オーディオURL (Line 204, 220):**
  - [ ] `from config.settings import MOCK_AUDIO_URL_BASE` 追加
  - [ ] `http://localhost:8001` を置換
- [ ] **モデル名 (Line 48, 102, 136, 240):**
  - [ ] `from config.settings import OPENAI_CHAT_MODEL, OPENAI_TTS_MODEL, OPENAI_TTS_VOICE, OPENAI_TEST_MODEL` 追加
  - [ ] 各 model= を置換
- [ ] **API検証 (Line 29, 73, 129, 232):**
  - [ ] `validate_openai_api()` を呼び出し追加
- [ ] 他の hardcoded 値がないか確認
- **検証:**
  - [ ] Linting エラーなし: `flake8`
  - [ ] インポート順序正確
  - [ ] 全置換完了

### Task 3-4: database.py - タイムアウト修正
- [ ] Line 30 を確認
- [ ] `from config.settings import DB_PING_TIMEOUT, DB_OPERATION_TIMEOUT, DB_BATCH_TIMEOUT` 追加
- [ ] すべての `timeout=5.0`, `timeout=10.0` を置換
- [ ] server.py のタイムアウトも確認
- [ ] grep で他の timeout がないか確認: `grep -n "timeout=" backend/`
- **検証:**
  - [ ] Linting エラーなし: `flake8`
  - [ ] 全置換完了

### Task 3-5: server.py - その他修正
- [ ] 残り hardcoded 値を確認:
  - [ ] Cache expiry: `RSS_CACHE_EXPIRY_SECONDS`
  - [ ] Word count: `RECOMMENDED_WORD_COUNT`, `INSIGHT_WORD_COUNT`
  - [ ] その他 magic number がないか
- [ ] 各プロンプト文字列を確認
- **検証:**
  - [ ] 全置換完了
  - [ ] Linting エラーなし

---

## Phase 4: バックエンド検証（推定 1-2時間）

### Task 4-1: テスト実行
```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend
python backend_test.py
```
- [ ] テスト実行開始
- [ ] **テスト項目確認:**
  - [ ] Authentication flows テスト成功
  - [ ] RSS processing テスト成功
  - [ ] AI integration テスト成功
  - [ ] Database CRUD テスト成功
  - [ ] Error scenarios テスト成功
- [ ] **結果:**
  - [ ] 全テスト成功: ✅
  - [ ] エラー: ❌ (ある場合は修正)

### Task 4-2: サーバー起動確認
```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo
uvicorn backend.server:app --reload --port 8001
```
- [ ] サーバー起動開始
- [ ] **ログ確認:**
  - [ ] "🚀 AUDION BACKEND STARTUP" 出現
  - [ ] "🔐 JWT_SECRET_KEY configured: True" 出現
  - [ ] "Connected to MongoDB successfully" 出現
  - [ ] "Uvicorn running on" 出現
  - [ ] エラー/警告: 0件
- [ ] **エンドポイント確認:**
  - [ ] `curl http://localhost:8001/health`
  - [ ] レスポンス: `{"status": "healthy", "database": "connected"}`
- [ ] **結果:**
  - [ ] 起動成功: ✅
  - [ ] エラー: ❌ (ある場合は修正)

### Task 4-3: コード品質確認
```bash
# オプション：利用可能な場合
flake8 backend/
black --check backend/
mypy backend/ (if available)
```
- [ ] Linting 実行
- [ ] フォーマット確認
- [ ] Type checking 実行
- **結果:**
  - [ ] エラー: 0件
  - [ ] 警告: 最小限

---

## Phase 5: フロントエンド修正（推定 1-2時間）

### Task 5-1: audion-app/.env.user 修正
- [ ] `audion-app/.env.user` を開く
- [ ] Line 2: `EXPO_PUBLIC_BACKEND_URL=http://192.168.11.60:8000`
- [ ] 修正後: `EXPO_PUBLIC_BACKEND_URL=http://localhost:8000`
- [ ] または削除して動的解決に依存
- **確認:**
  - [ ] ハードコードIP削除: ✅
  - [ ] ローカルホストに変更: ✅

### Task 5-2: audion-app-fresh/config/api.ts 修正
- [ ] `audion-app-fresh/config/api.ts` を開く
- [ ] **Line 44 (本番URL):**
  - [ ] 修正前確認
  - [ ] `process.env.EXPO_PUBLIC_PROD_API_URL` に変更
  - [ ] デフォルト: `https://audion.onrender.com`
- [ ] **Line 49 (開発ポート):**
  - [ ] 修正前確認
  - [ ] `process.env.EXPO_PUBLIC_DEV_API_PORT` に変更
  - [ ] デフォルト: `8003`
- [ ] **Line 55 (タイムアウト):**
  - [ ] 修正前確認
  - [ ] 名前付き定数 `DEFAULT_API_TIMEOUT_MS = 30000` 追加
  - [ ] `process.env.EXPO_PUBLIC_API_TIMEOUT` で上書き可能
- **確認:**
  - [ ] 全置換完了
  - [ ] フォールバック値正確
  - [ ] TypeScript エラーなし

### Task 5-3: audion-app-fresh/.env.development 更新
- [ ] `audion-app-fresh/.env.development` を開く
- [ ] **追加する行:**
  ```env
  EXPO_PUBLIC_PROD_API_URL=https://audion.onrender.com
  EXPO_PUBLIC_DEV_API_PORT=8003
  EXPO_PUBLIC_API_TIMEOUT=30000
  EXPO_PUBLIC_APP_VERSION=1.0.0-dev
  ```
- [ ] **既存の行との重複確認:**
  - [ ] 重複値の削除
  - [ ] 値の一貫性確認
- **確認:**
  - [ ] 全新規変数追加: ✅
  - [ ] 既存変数との競合: 0件

### Task 5-4: 追加修正（LOW優先度）
- [ ] **app version (オプション):**
  - [ ] `package.json` から version 読み込み可能か確認
  - [ ] 実装: `import { version } from './package.json'`
  - [ ] `.env` から `EXPO_PUBLIC_APP_VERSION` 削除可能か確認
- [ ] **database names (LOW優先度):**
  - [ ] `.env` から `DB_NAME=audion_prod_db` に変更
  - [ ] `.env.development` に `DB_NAME=audion_dev_db` 追加
  - [ ] Render Dashboard で `audion_prod_db` に設定

---

## Phase 6: フロントエンド検証（推定 1-2時間）

### Task 6-1: TypeScript チェック
```bash
cd audion-app-fresh
npx tsc --noEmit
```
- [ ] TypeScript コマンド実行
- [ ] **結果確認:**
  - [ ] エラー: 0件
  - [ ] 警告: 0件
- **失敗時:**
  - [ ] エラーメッセージ記録
  - [ ] コード修正実施
  - [ ] 再実行

### Task 6-2: Linting チェック
```bash
npm run lint
```
- [ ] ESLint コマンド実行
- [ ] **結果確認:**
  - [ ] エラー: 0件
  - [ ] 警告: 0件またはアクセプト可能
- **失敗時:**
  - [ ] エラーメッセージ記録
  - [ ] コード修正実施
  - [ ] 再実行

### Task 6-3: Expo 起動確認
```bash
npx expo start --clear --tunnel
```
- [ ] Expo サーバー起動
- [ ] **起動ログ確認:**
  - [ ] "Metro Bundler" 起動: ✅
  - [ ] "Tunnel ready" 表示: ✅
  - [ ] エラー/警告: 最小限
- [ ] **アプリ動作確認（iOS/Android/Web）:**
  - [ ] アプリ起動: ✅
  - [ ] コンソールエラー: 0件
  - [ ] API接続: ✅
  - [ ] ナビゲーション: ✅
  - [ ] RSS読み込み: ✅
- **失敗時:**
  - [ ] エラーメッセージ記録
  - [ ] コード修正実施
  - [ ] 再実行

---

## Phase 7: デプロイ前最終確認（推定 1時間）

### Task 7-1: Render Dashboard 環境変数セット

**Render Dashboard > audion-backend > Environment:**

**必須変数（デフォルト値なし）:**
- [ ] `JWT_SECRET_KEY` = _________________ (強力なランダム値)
- [ ] `OPENAI_API_KEY` = _________________ (有効なAPIキー)
- [ ] `AWS_ACCESS_KEY_ID` = _________________ (有効なキー)
- [ ] `AWS_SECRET_ACCESS_KEY` = _________________ (有効なシークレット)
- [ ] `AWS_REGION` = ap-southeast-2
- [ ] `S3_BUCKET_NAME` = audion-audio-files または audion-prod-audio-files

**推奨変数:**
- [ ] `CORS_ALLOWED_ORIGINS` = https://audion.onrender.com,exp://localhost:19000,...
- [ ] `FILE_SERVER_URL` = https://audion.onrender.com (本番URL)
- [ ] `MOCK_AUDIO_URL_BASE` = https://audion.onrender.com
- [ ] `DB_PING_TIMEOUT` = 5.0
- [ ] `DB_OPERATION_TIMEOUT` = 10.0
- [ ] `DB_BATCH_TIMEOUT` = 5.0
- [ ] `RSS_CACHE_EXPIRY_SECONDS` = 1800 (本番では30分に増加)
- [ ] `RECOMMENDED_WORD_COUNT` = 250
- [ ] `INSIGHT_WORD_COUNT` = 350
- [ ] `OPENAI_CHAT_MODEL` = gpt-4o
- [ ] `OPENAI_TTS_MODEL` = tts-1
- [ ] `OPENAI_TTS_VOICE` = alloy
- [ ] `OPENAI_TEST_MODEL` = gpt-3.5-turbo
- [ ] `DB_NAME` = audion_prod_db

**確認:**
- [ ] 全必須変数設定済み
- [ ] 本番値が本開発値と異なることを確認（セキュリティ）
- [ ] Render Dashboard 保存: ✅

### Task 7-2: ローカル本番シミュレーション
```bash
# .env に本番相当の値を設定
ENVIRONMENT=production OPENAI_API_KEY=<test> AWS_ACCESS_KEY_ID=<test> AWS_SECRET_ACCESS_KEY=<test> uvicorn backend.server:app --reload --port 8001
```
- [ ] サーバー起動
- [ ] **確認:**
  - [ ] 起動成功: ✅
  - [ ] エラー/警告: 0件
  - [ ] 全機能動作: ✅

---

## Phase 8: コミット＆デプロイ（推定 0.5-1時間）

### Task 8-1: コミット準備
```bash
git status
git add backend/ audion-app-fresh/ audion-app/
```
- [ ] 修正ファイル確認
- [ ] 不要なファイル除外
- [ ] ステージング確認

### Task 8-2: コミット実行
```bash
git commit -m "🔧 Extract all hardcoded values to environment variables

Fixes all 17 hardcoding violations identified in analysis:

CRITICAL FIXES (3):
- JWT_SECRET_KEY: Now required via environment, no fallback
- OpenAI API validation: Implemented at startup
- AWS credential validation: Implemented at startup

HIGH PRIORITY FIXES (7):
- CORS allowed origins: Moved to CORS_ALLOWED_ORIGINS env var
- File server URL: Moved to FILE_SERVER_URL env var
- Audio URLs: Moved to MOCK_AUDIO_URL_BASE env var
- Database timeouts: Moved to DB_*_TIMEOUT env vars
- Cache expiry: Made configurable via RSS_CACHE_EXPIRY_SECONDS
- Word counts: Moved to WORD_COUNT env vars
- OpenAI models: Moved to OPENAI_*_MODEL env vars

MEDIUM PRIORITY FIXES (4):
- Frontend IP: Removed hardcoded 192.168.11.60
- Frontend API URLs: Moved to EXPO_PUBLIC_* env vars
- Frontend timeouts: Created named constant
- AWS region/bucket: Made required env vars

LOW PRIORITY FIXES (2):
- Database names: Environment-specific (audion_dev_db vs audion_prod_db)
- App version: Prepared for reading from package.json

All modifications maintain Development Checklist compliance:
✅ No hardcoded credentials
✅ No sensitive data in commits
✅ All environment variables documented
✅ Backward compatible defaults
✅ Production-safe configuration

Related Documentation:
- HARDCODING_VIOLATIONS_ANALYSIS.md
- HARDCODING_REMEDIATION_PLAN.md
- IMPLEMENTATION_PLAN.md
- EXECUTION_CHECKLIST.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```
- [ ] コミット実行

### Task 8-3: Push確認
```bash
git push
```
- [ ] Push 成功確認
- [ ] リモートブランチ確認: `git log --oneline -3`
- [ ] GitHub で反映確認

### Task 8-4: Render デプロイ確認
- [ ] **Render Dashboard を確認:**
  - [ ] ビルド開始: ✅
  - [ ] ビルド進捗: モニタリング
  - [ ] ビルド成功: ✅ または ❌
- [ ] **起動ログ確認:**
  - [ ] "successfully installed" 表示: ✅
  - [ ] "🚀 AUDION BACKEND STARTUP" 出現: ✅
  - [ ] "Connected to MongoDB successfully" 出現: ✅
  - [ ] エラー: 0件
- [ ] **ヘルスチェック:**
  ```bash
  curl https://audion.onrender.com/health
  ```
  - [ ] レスポンス: `{"status": "healthy", "database": "connected"}`

---

## 📋 完了確認

### コード修正 (8 ファイル)
- [ ] backend/server.py
- [ ] backend/config/settings.py
- [ ] backend/config/database.py
- [ ] backend/services/ai_service.py
- [ ] backend/services/storage_service.py
- [ ] audion-app-fresh/config/api.ts
- [ ] audion-app-fresh/.env.development
- [ ] audion-app/.env.user

### テスト (4 テスト)
- [ ] `python backend_test.py` ✅
- [ ] `uvicorn server:app` ✅
- [ ] `npx tsc --noEmit` ✅
- [ ] `npm run lint` ✅

### ドキュメント
- [ ] `.env.example` 作成
- [ ] CLAUDE.md 更新
- [ ] 実装計画完了

### デプロイ
- [ ] git commit ✅
- [ ] git push ✅
- [ ] Render 環境変数セット ✅
- [ ] Render デプロイ成功 ✅
- [ ] 本番エンドポイント確認 ✅

---

## 🎉 完了宣言

**すべてのタスク完了日:** _________________

**実装者:** _________________

**レビュアー:** _________________

**最終確認:** ✅ 本番デプロイ完了、全機能動作確認済み

---

**開始日:** 2025-10-29
**推定作業時間:** 14-18時間
**実際の作業時間:** _________________ 時間
