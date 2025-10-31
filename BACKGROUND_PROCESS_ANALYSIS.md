# 🔍 バックグラウンドプロセス問題の分析レポート

**作成日:** 2025-10-30
**ステータス:** 分析完了 - 対応方針検討中

---

## 📊 1. 現在の状況

### 実行中のバックグラウンドシェル（14個）

| Shell ID | コマンド | 意図 | 開始時刻 |
|----------|---------|------|---------|
| **796158** | `npx expo start --lan --clear` | LAN モード試験 | 前セッション |
| **965610** | `npx expo start --ios --lan` | iOS モード試験 | 前セッション |
| **d6b907** | `npx expo start --clear --tunnel` | Tunnel モード試験 | 前セッション |
| **61c7c0** | `npx expo start --clear --tunnel` | Tunnel モード再試験 | 前セッション |
| **0acf5f** | `python3 test_server.py` | バックエンド接続テスト | 前セッション |
| **6fb7a6** | `bash /tmp/check_connections.sh` | 接続確認スクリプト | 前セッション |
| **c31d6a** | `curl https://audion.onrender.com/api/health` | Render 接続テスト | 前セッション |
| **ee12cc** | `uvicorn server:app --port 8005` + curl | バックエンド起動テスト | 前セッション |
| **cab1fe** | `npx expo start --lan --clear` | LAN モード再試験 | 前セッション |
| **ed526f** | `uvicorn server:app --host 0.0.0.0 --port 8005 --reload` | バックエンド起動 | 前セッション |
| **7b9a66** | `uvicorn server:app --host 0.0.0.0 --port 8005 --reload` + curl | バックエンド再起動テスト | 前セッション |
| **309e17** | `npx expo start --lan --clear` | LAN モード再々試験 | 前セッション |
| **75fd13** | `npx expo start --lan --clear` | LAN モード再々々試験 | 前セッション |
| **6f51d8** | `npx expo start --lan` | LAN モード最後の試験 | 前セッション |

---

## 🔴 2. 原因分析：「なぜこうなった?」

### 2.1 根本原因

**私（Claude Code Agent）が、接続問題を診断・解決するために、同じコマンドを何度も実行してしまった。**

### 2.2 具体的な経緯

**時系列:**
```
1. ローカルで接続エラー発生
   → ユーザーに「ログイン画面が表示されるが、コンテンツが取得できない」と報告される

2. 私の診断プロセス:
   - 原因を特定するため → `npx expo start --lan --clear` を実行
   - キャッシュクリアを試みて → `npx expo start --clear --tunnel` を実行
   - iOS シミュレーター確認のため → `npx expo start --ios --lan` を実行
   - キャッシュ削除後の再試験 → `npx expo start --lan --clear` を再実行 （3回）

3. バックエンド側:
   - 「ポート 8005 がすでに使用中」エラー対応のため → uvicorn を何度も起動
   - API 接続テストのため → curl コマンドを複数回実行

4. 接続確認:
   - ローカルテスト → `test_server.py` 実行
   - 接続スクリプト → `check_connections.sh` 実行
   - Render 接続確認 → curl で Render へのリクエスト実行

結果: 同じプロセスが複数実行中の状態が蓄積
```

### 2.3 なぜ蓄積されたのか?

**理由:**
1. **`run_in_background=true` フラグを繰り返し使用**
   - バックグラウンドシェルを開いたまま、新しいシェルを開き続けた
   - 古いシェルを停止せずに次のコマンドを実行

2. **KillShell ツールが機能していない**
   - KillShell で停止しようとしても、管理システムが反応しない
   - システムが「killed」「completed」と報告しても、実際には実行中

3. **手動での停止意図がない設計**
   - バックグラウンドプロセスを逐一停止する仕組みがなかった
   - 連続的にコマンド実行すると、蓄積される設計になっていた

---

## ⚠️ 3. これが問題である理由：「なぜ問題?」

### 3.1 技術的な問題

**1. ポート競合**
```
ポート 8005 に複数の uvicorn インスタンスが バインドしようとしている
→ 「Address already in use」エラー発生
→ 正常なバックエンド起動ができない
```

**2. メモリ圧迫**
```
8個の Expo インスタンス（各 Metro Bundler）が同時実行
→ 各インスタンスが 500MB 以上のメモリ消費
→ 総メモリ使用量が数 GB に達する可能性
→ システムの動作が遅延
```

**3. プロセスの干渉**
```
複数の uvicorn インスタンス:
- インスタンス A が MongoDB に接続
- インスタンス B が同じポートでリッスンしようとする
- ファイルディスクリプタが競合

結果: API リクエストが不安定になる
```

### 3.2 デバッグ上の問題

**1. ログが混在する**
```
複数の Expo インスタンスが出力を混在させる
→ どの出力がどのプロセスからか不明確
→ エラーの原因特定が困難
```

**2. テスト結果が不確実**
```
API テストを実行しても:
- インスタンス A からの応答か
- インスタンス B からの応答か
- キャッシュされた古い応答か
が不明確

結果: 本当の問題が隠れる
```

### 3.3 開発効率上の問題

**1. CPU/メモリ負荷**
```
不要なプロセスが CPU を消費し続ける
→ 開発環境の反応性が低下
→ ホットリロードなどの機能が遅延
```

**2. 管理の複雑化**
```
どのプロセスがどの役割か不明確
→ 次の開発を始める際に、まず全プロセスを停止する必要がある
→ 開発フローが中断される
```

---

## ✅ 4. どうすべきか：「対応方針」

### 4.1 短期対応（今すぐやるべき）

#### **Step 1: 全バックグラウンドプロセスを停止する**

```bash
# OS レベルで強制停止
killall -9 expo
killall -9 node
killall -9 uvicorn
killall -9 python3

# ポート解放確認
lsof -i :8005
lsof -i :8081
```

**理由:**
- 古いプロセスが干渉しないクリーン状態で開発を再開する必要がある

#### **Step 2: ポート確認と解放**

```bash
# ポート 8005, 8081 が解放されたか確認
netstat -an | grep -E "8005|8081"
```

**理由:**
- 次のプロセス起動時にポート競合を避ける

#### **Step 3: キャッシュクリア**

```bash
# Expo キャッシュクリア
cd audion-app-fresh
rm -rf .expo .expo-shared node_modules/.cache

# バックエンド (あれば)
cd ../backend
rm -rf __pycache__
```

**理由:**
- 古いキャッシュが新しいプロセスに干渉しないようにする

---

### 4.2 中期対応（今後のワークフロー）

#### **新しいワークフロー: 「一度に1つのプロセスのみ」**

```
1️⃣  バックエンド起動
   cd backend
   uvicorn server:app --host 0.0.0.0 --port 8005 --reload

   ✅ テスト: curl http://localhost:8005/api/health
   ✅ 成功を確認したら CTRL+C で停止

2️⃣  フロントエンド起動
   cd audion-app-fresh
   npx expo start --lan

   ✅ テスト: QR コードをスキャン
   ✅ アプリが起動したら CTRL+C で停止

3️⃣  問題が発生したら調査
   (新しいターミナルウィンドウで追加テストを実行)
```

**理由:**
- 各プロセスの出力が明確
- 問題が発生したら原因特定が容易
- 次のテストに影響しない

#### **バックグラウンド実行は最後の手段**

- デバッグ困難 (出力が混在)
- プロセス管理が複雑
- **絶対に必要な場合のみ、1つだけ実行**

---

### 4.3 長期対応（プロセス管理の仕組み化）

#### **Option 1: スクリプト化**

```bash
# scripts/start-local-dev.sh
#!/bin/bash

# 既存プロセスを停止
killall -9 expo node uvicorn python3 2>/dev/null || true
sleep 2

# バックエンド起動
echo "🔹 Starting backend..."
cd backend
uvicorn server:app --host 0.0.0.0 --port 8005 --reload &
BACKEND_PID=$!

# フロントエンド起動
echo "🔹 Starting frontend..."
cd ../audion-app-fresh
npx expo start --lan &
FRONTEND_PID=$!

echo "✅ Both services started"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop, press CTRL+C or run: kill $BACKEND_PID $FRONTEND_PID"

# プロセス終了まで待機
wait
```

**メリット:**
- 1コマンドで両方起動
- プロセス ID が明確
- 簡単に停止可能

#### **Option 2: Docker Compose**

```yaml
version: '3'
services:
  backend:
    build: ./backend
    ports:
      - "8005:8005"
    environment:
      - MONGO_URL=mongodb://mongo:27017
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"

  frontend:
    build: ./audion-app-fresh
    ports:
      - "8081:8081"
```

**メリット:**
- 環境が完全に隔離される
- 複数プロセスの管理が自動化される
- CI/CD との統合が容易

---

## 📋 5. 推奨される対応順序

### **今すぐ**
1. [ ] 全バックグラウンドプロセスを停止（OS レベル）
2. [ ] ポート 8005, 8081 が解放されたか確認
3. [ ] キャッシュをクリア

### **次のセッション開始時**
4. [ ] 新しいワークフロー「一度に1つのプロセス」を実施
5. [ ] バックエンド起動 → テスト → 停止
6. [ ] フロントエンド起動 → テスト → 停止

### **将来的に**
7. [ ] `scripts/start-local-dev.sh` を作成（スクリプト化）
8. [ ] または Docker Compose で環境を整備

---

## 🎯 6. 今後の指針

### **Do's（やるべき）**
- ✅ 開発する前に「何をするのか」を明確にする
- ✅ バックグラウンドプロセスは「緊急時のみ」
- ✅ テスト完了後は必ずプロセスを停止する
- ✅ 新しいテストを開始する前に「前のプロセスは停止したか?」を確認

### **Don'ts（避けるべき）**
- ❌ 同じコマンドを複数回バックグラウンドで実行
- ❌ プロセス停止せずに新しいプロセスを起動
- ❌ 「とりあえず実行してみる」という試行錯誤
- ❌ バックグラウンド出力を無視して次のテストに進む

---

## 📝 7. まとめ

| 項目 | 内容 |
|------|------|
| **原因** | 接続問題診断のため、同じコマンドを複数回実行した |
| **問題点** | ポート競合、メモリ圧迫、ログ混在、デバッグ困難 |
| **対応策** | 全プロセス停止 → 新ワークフロー採用 → スクリプト化 |
| **学習** | バックグラウンド実行は計画的に、プロセス管理を明確に |

---

**このレポートに基づいて、次のアクションを決定します。**
