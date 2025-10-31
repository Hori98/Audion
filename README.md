# Audion

Audion は RSS 記事や Web コンテンツを高品質な音声に変換する AI 搭載のオーディオニュースプラットフォームです。フロントエンドは Expo/React Native（`audion-app-fresh/`）に統一され、バックエンドは FastAPI（`backend/`）です。

重要: 旧 React Web SPA はアーカイブ済みです（`archive/legacy-web-spa/`）。現在の開発・運用は全て React Native（Expo）を使用します。

## クイックスタート

- バックエンド（推奨: ユーザー用 8003）
  1. `python -m venv venv && source venv/bin/activate`
  2. `pip install -r backend/requirements.txt`
  3. `cd backend && uvicorn server:app --reload --port 8003`

- フロントエンド（Expo/React Native）
  1. `cd audion-app-fresh`
  2. `npx expo start --tunnel`
  3. Expo Go で QR を読み取り

備考: `server-manager.js` を使うとバックエンド＋Expo をまとめて起動できます。

```
node server-manager.js start dev
```

詳細は `QUICK_START.md` と `EXPO_DEVELOPMENT_SETUP.md` を参照してください。

## リポジトリ構成

```
audion-app-fresh/   # Expo/React Native フロントエンド
backend/            # FastAPI バックエンド
server-manager.js   # まとめて起動するツール（dev/test）
render.yaml         # Render 用デプロイ設定（バックエンド）
archive/legacy-web-spa/  # 旧 Web SPA（参照用アーカイブ）
```

## 環境変数（バックエンド）

- `MONGO_URL` / `DB_NAME`
- `OPENAI_API_KEY`
- `JWT_SECRET_KEY`
- `ENVIRONMENT=development|production`
- S3 関連（本番運用時）: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET_NAME`

## フロントエンド設定

- `audion-app-fresh/config/api.ts` がローカル/トンネル/本番の接続先を自動検出します
- 明示的に指定する場合は `audion-app-fresh/.env.development` の `EXPO_PUBLIC_*` を設定

## デプロイ

- フロントエンド: Expo（ストア配信もしくは EAS）
- バックエンド: Render（`render.yaml`）

注意: `vercel.json` による旧 Web デプロイは削除済みです。
