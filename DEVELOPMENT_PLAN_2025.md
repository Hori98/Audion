# 🎯 開発計画 2025 - アプリ完成への道

**作成日:** 2025-10-30
**優先度:** Priority 1 = ローカル完全動作確認 → Priority 2 = Render 本番テスト

---

## 📋 背景と現状

### **アプリの完成度**
- ✅ **8割型完成** - UI/UX、基本機能実装済み
- ❌ **機能確認が急務** - 接続問題がブロッカー
- ❌ **RSS 管理構造が未整理** - Home/Feed タブの管理方式が明確でない

### **技術スタック確定**
```
フロントエンド:    Expo + React Native
バックエンド:      Python FastAPI
DB:               MongoDB Atlas
ローカル開発 DB:   ローカル MongoDB (localhost:27017)
デプロイ方法:      EAS (Expo Application Services) + Render
```

### **RSS 管理方針（確定）**
```
システムデフォルト RSS → JSON ファイル（shared-config/rss-sources.json）
Home セクション定義   → JSON ファイル（shared-config/rss-sections-mapping.json）
ユーザー購読 RSS      → MongoDB（user_rss_subscriptions collection）
```

---

## 🚀 フェーズ 1: ローカル完全動作確認（最優先）

### **1.1 ローカル開発環境セットアップ**

- [ ] backend/.env の確認
  - [ ] MONGO_URL=mongodb://localhost:27017
  - [ ] DB_NAME=audion_atlas_DB
  - [ ] その他必須環境変数が設定されているか

- [ ] ローカル MongoDB 接続確認
  - [ ] `mongosh audion_atlas_DB --eval "db.getCollectionNames()"` を実行
  - [ ] users, user_profiles, audio_creations などのコレクション確認
  - [ ] テストユーザー（test@example.com）が存在するか

- [ ] バックエンドの起動テスト
  ```bash
  cd backend
  uvicorn server:app --host 0.0.0.0 --port 8005 --reload
  ```
  - [ ] `curl http://localhost:8005/api/health` で 200 OK を返す
  - [ ] MongoDB に正常に接続している

### **1.2 フロントエンド起動テスト**

- [ ] Expo LAN モード起動
  ```bash
  cd audion-app-fresh
  npx expo start --lan
  ```
  - [ ] Metro Bundler がエラーなくビルドできる
  - [ ] QR コード生成される

- [ ] Expo Go で iOS シミュレーター起動
  - [ ] QR コードをスキャン（またはコマンドでロード）
  - [ ] アプリが起動する

### **1.3 完全な動作確認（ローカル）**

**フロー確認:**
- [ ] **ログイン画面** が表示される
- [ ] **認証情報** を入力（test@example.com / password123）
- [ ] **ホーム画面** が表示される
- [ ] **記事コンテンツ** が表示される（API から取得できている）
  - [ ] Hero セクション
  - [ ] Breaking News セクション
  - [ ] Trending セクション
  - [ ] その他セクション

- [ ] **Feed タブ** が表示される（ユーザー RSS リーダー）
  - [ ] ユーザーが RSS を追加できる（または推奨 RSS が表示される）

- [ ] **Discover タブ** が動作する
- [ ] **Library タブ** が動作する

**エラーチェック:**
- [ ] ネットワークエラーがない
- [ ] API 接続エラーがない
- [ ] コンソールログに CRITICAL なエラーがない

---

## 🛠️ フェーズ 2: RSS 管理構造の実装確認

### **2.1 Home タブの RSS セクション確認**

- [ ] `shared-config/rss-sections-mapping.json` の構造確認
  - [ ] Hero, Breaking, Trending, Personalized などのセクション定義あり
  - [ ] 各セクションの RSS ソース指定あり
  - [ ] max_articles, refresh_interval_minutes などの設定あり

- [ ] バックエンド API が各セクションの RSS を取得できるか確認
  ```bash
  curl http://localhost:8005/api/articles?section=hero
  ```
  - [ ] JSON データが返される
  - [ ] 記事が正しくフォーマットされている

### **2.2 Feed タブの RSS リーダー実装確認**

**期待される機能:**
- [ ] ユーザーが RSS URL を追加できる UI がある
- [ ] 追加した RSS が購読リストに表示される
- [ ] 購読中の RSS から記事一覧が表示される
- [ ] 記事をタップすると詳細が表示される
- [ ] 削除機能がある

**データベース:**
- [ ] user_rss_subscriptions collection に ユーザーの購読 RSS が格納されている

---

## 📱 フェーズ 3: デプロイ準備

### **3.1 EAS 設定**

- [ ] EAS CLI をインストール
  ```bash
  npm install -g eas-cli
  ```

- [ ] EAS プロジェクト初期化
  ```bash
  cd audion-app-fresh
  eas build:configure
  ```

- [ ] ビルド設定の確認
  - [ ] app.json で正しい情報が指定されている
  - [ ] iOS/Android ビルド設定が完了している

### **3.2 Render 本番環境テスト**

- [ ] Render ダッシュボードで環境変数確認
  - [ ] MONGO_URL（MongoDB Atlas 接続文字列）
  - [ ] DB_NAME
  - [ ] JWT_SECRET_KEY
  - [ ] その他の必須変数

- [ ] Render バックエンド起動確認
  ```bash
  curl https://audion.onrender.com/api/health
  ```
  - [ ] 200 OK を返す

- [ ] フロントエンド接続確認（Tunnel モード）
  - [ ] Expo Tunnel モードで起動
  - [ ] API が Render バックエンドに接続できている
  - [ ] すべての機能が Render でも動作する

---

## 🔍 バックグラウンドプロセス問題の分析

### **現在の状況**

**実行中のバックグラウンドシェル (14個):**
```
796158  : npx expo start --lan --clear
965610  : npx expo start --ios --lan
d6b907  : npx expo start --clear --tunnel
61c7c0  : npx expo start --clear --tunnel
0acf5f  : python3 test_server.py
6fb7a6  : bash check_connections.sh
c31d6a  : curl https://audion.onrender.com/api/health
ee12cc  : uvicorn server:app --port 8005 + curl
cab1fe  : npx expo start --lan --clear
ed526f  : uvicorn server:app --host 0.0.0.0 --port 8005 --reload
7b9a66  : uvicorn server:app --host 0.0.0.0 --port 8005 --reload + curl
309e17  : npx expo start --lan --clear
75fd13  : npx expo start --lan --clear
6f51d8  : npx expo start --lan
```

### **原因分析**

**Why? 複数プロセス実行の理由:**

1. **Expo の複数インスタンス** (796158, 965610, d6b907, 61c7c0, cab1fe, 309e17, 75fd13, 6f51d8 = 8個)
   - LAN モードで複数回起動
   - Tunnel モードで複数回起動
   - iOS モード指定で起動
   - 原因: キャッシュクリアや再起動を何度も試行したため

2. **Uvicorn の複数インスタンス** (ee12cc, ed526f, 7b9a66 = 3個)
   - ポート 8005 で複数起動を試みた
   - 原因: 接続テストを繰り返したため

3. **テストスクリプト** (0acf5f, 6fb7a6, c31d6a = 3個)
   - ローカルと Render の接続確認テスト
   - 原因: 接続問題の診断目的

### **問題点は何か？**

1. **ポート競合**
   - ポート 8005 に複数の uvicorn が バインドしようとしている
   - バックエンド起動時に「Address already in use」エラーが発生

2. **Expo のメモリ使用**
   - 8個の Expo インスタンスが Metro Bundler を実行
   - システムメモリが圧迫される可能性

3. **混乱の原因**
   - 複数のプロセスが同時に動作すると、どの出力がどのプロセスからか不明確
   - デバッグが困難になる

4. **実際の機能への影響**
   - ❌ バックエンド起動時にポート競合でエラー
   - ❌ フロントエンド起動が遅延
   - ❌ API テストの結果が不明確

### **どうすべきか？**

**推奨される対応:**

1. **直ちに実施**
   - [ ] すべてのバックグラウンドシェルを停止（新しい Bash で実行）
   - [ ] ポート 8005, 8081 が解放されたことを確認

2. **以降の作業ルール**
   - [ ] **一度に1つのプロセスのみ起動**
   - [ ] バックエンド起動 → テスト完了 → 停止
   - [ ] フロントエンド起動 → テスト完了 → 停止
   - [ ] 複数同時起動しない

3. **スクリプト化**
   - [ ] `scripts/start-local-dev.sh` を作成
   - [ ] バックエンド + フロントエンドを制御可能な形で起動
   - [ ] 一つのターミナルウィンドウで両方の出力を確認

---

## ✅ チェックリスト（全体）

### フェーズ 1
- [ ] ローカル環境セットアップ完了
- [ ] ローカル MongoDB 接続確認
- [ ] バックエンド起動テスト OK
- [ ] フロントエンド起動テスト OK
- [ ] ログイン → ホーム → コンテンツ表示 の完全フロー OK

### フェーズ 2
- [ ] Home タブ RSS セクション動作確認 OK
- [ ] Feed タブ RSS リーダー動作確認 OK
- [ ] DB に正しくデータが格納されている確認

### フェーズ 3
- [ ] EAS セットアップ完了
- [ ] Render 本番環境で動作確認 OK
- [ ] AppStore/Google Play デプロイ準備完了

### バックグラウンド問題
- [ ] すべてのバックグラウンドシェル停止
- [ ] ポート 8005, 8081 解放確認
- [ ] 新規クリーン環境で再開始

---

**次ステップ:** フェーズ 1.1 から実行を開始します
