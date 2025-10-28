# Audion 本番問題・開発障害 インシデント分析と再発防止策

**作成日**: 2025-10-28
**対象期間**: このセッション全体
**重要度**: 🔴 高 - 本番環境と開発環境の乖離

---

## 📋 このドキュメントについて

このドキュメントは、以下の複数のインシデントを分析し、再発防止策を提示するものです：

1. **AutoPick API 401 エラー** (本番環境)
2. **API 30秒タイムアウト** (本番環境)
3. **ブランチによるファイル構造乖離** (開発環境)

---

## 🔴 インシデント1: AutoPick API が 401 エラーを返す

### 発生状況
- **環境**: Render 本番環境
- **症状**: AutoPick API が常に 401 "Invalid authentication credentials" を返す
- **期間**: 不明（セッション開始時点で既に発生）
- **影響**: AutoPick 機能が完全に使用不可

### 根本原因（複数の原因が複合）

#### 原因1: JWT_SECRET_KEY の同期不足
```
Render environment:   sk_prod_xxxxx（本番用？）
Local development:    sk_audion_dev_xxxxx（開発用）
→ 秘密鍵が一致していない
→ トークン検証時に失敗
```

**問題点**:
- 環境変数の値が異なっていることに気づきにくい
- エラーログがあいまいで原因が不明確
- デプロイ時に秘密鍵の同期確認がない

#### 原因2: Query パラメータの認識不足
```python
# FastAPI では明示的な Query(None) 宣言が必要
# これがないと、query パラメータが認識されない
@app.get("/api/auto-pick")
async def get_auto_picked(token: str):  # ❌ 認識されない
    pass

# 正しい方法
from fastapi import Query
@app.get("/api/auto-pick")
async def get_auto_picked(token: str = Query(None)):  # ✅ 認識される
    pass
```

**問題点**:
- FastAPI の暗黙的な動作が理解されていない
- エラーメッセージが "Invalid authentication credentials" となり、実は parameter が認識されていないことを隠ぺい

#### 原因3: エラーログの不足
```python
# JWT 検証時にエラーが発生しても詳細が不明
try:
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
except jwt.InvalidTokenError as e:
    logging.error(f"Invalid token: {e}")  # ❌ 詳細不足
    # JWT_SECRET_KEY が設定されているか？不一致か？
    # トークン形式は正しいか？
    # これらが全く分からない
```

**問題点**:
- エラーの原因を特定できない
- トラブルシューティングに時間がかかる
- 本番環境のログがないと解決不可

#### 原因4: ブランチ乖離
```
feature/home-ui-enhancement:  修正あり ✅ (Query + 詳細ログ)
main:                         修正なし ❌ (古いコード)
Render deployment:            main から デプロイ ❌
```

**問題点**:
- 修正が本番に反映されていない
- ブランチ戦略が不明確
- デプロイ対象ブランチと最新修正ブランチの同期がない

### 再発防止策

#### 対策1: エラーログの詳細化 ✅ 実装済み
```python
# ✅ 改善後
logging.error(f"❌ [JWT_VERIFY] Invalid token error: {type(e).__name__}: {str(e)}")
logging.error(f"❌ [JWT_VERIFY] JWT_SECRET_KEY set: {bool(JWT_SECRET_KEY)}, length: {len(JWT_SECRET_KEY) if JWT_SECRET_KEY else 0}")
```

**効果**:
- エラー型を特定できる (DecodeError vs ExpiredSignatureError)
- JWT_SECRET_KEY の設定状態が明確
- トラブルシューティングが容易

#### 対策2: スタートアップロギング ✅ 実装済み
```python
# ✅ 改善後
logging.info("🚀 AUDION BACKEND STARTUP")
logging.info(f"🔐 JWT_SECRET_KEY configured: {bool(JWT_SECRET_KEY)}")
if JWT_SECRET_KEY:
    logging.info(f"🔐 JWT_SECRET_KEY (first 20 chars): {JWT_SECRET_KEY[:20]}...")
    logging.info(f"🔐 JWT_SECRET_KEY length: {len(JWT_SECRET_KEY)}")
```

**効果**:
- デプロイ直後に秘密鍵が設定されているか確認可能
- 秘密鍵の長さで本番/開発を識別可能
- 問題発生前に設定不足に気づける

#### 対策3: Query パラメータ明示宣言 ✅ 実装済み
```python
# ✅ 改善後
from fastapi import Query
@app.get("/api/auto-pick")
async def get_auto_picked(token: str = Query(None)):
    # FastAPI が明確に token を query parameter として認識
```

**効果**:
- FastAPI が query parameter を正確に抽出
- 暗黙的なエラー（parameter 認識されないで 401）が発生しない

#### 対策4: 本番環境での安全性確保 ✅ 実装済み
```python
# ✅ 改善後
if not JWT_SECRET_KEY:
    if os.environ.get('ENVIRONMENT') == 'production':
        raise RuntimeError('JWT_SECRET_KEY must be set in production environment')
```

**効果**:
- 本番環境で秘密鍵未設定なら起動時に失敗
- 不安全なデフォルト値での運用を防止

#### 対策5: ブランチ戦略の統一 ✅ 実装済み
```
【Before】
main: 古いコード
feature/home-ui-enhancement: 修正済み
Render deployment: main から (修正なし) ❌

【After】
main: 最新コード（全修正含む） ✅
Render deployment: main から (最新) ✅
feature/...: 削除
```

**効果**:
- 本番環境が常に最新コード
- ブランチ戦略が単純化
- デプロイのミスが減少

### チェックリスト

デプロイ前確認:
- [ ] Render Dashboard で JWT_SECRET_KEY が設定されている
- [ ] ENVIRONMENT=production が設定されている
- [ ] ログで "🔐 JWT_SECRET_KEY configured: True" を確認
- [ ] JWT_SECRET_KEY の長さが 32+ (本番用の長さ)
- [ ] AutoPick API をテストして 401 が解決

---

## 🟡 インシデント2: API が 30秒でタイムアウト

### 発生状況
- **環境**: Local + Render 本番環境
- **症状**: API リクエストが正確に 30秒でタイムアウト
- **影響**: 音声生成などの長時間処理が失敗
- **検出**: セッション開始後に特定

### 根本原因

#### 原因1: ハードコードされたタイムアウト
```typescript
// ❌ 問題コード
class ApiService {
  constructor() {
    this.instance = axios.create({
      timeout: 30000,  // ハードコード！変更不可
    });
  }
}
```

**問題点**:
- 環境に応じた調整ができない
- 本番環境で長時間の処理に対応不可
- 環境変数で上書き不可能

#### 原因2: 環境変数の未利用
```typescript
// ❌ 問題コード
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
// → BACKEND_URL は環境変数対応なのに、TIMEOUT はハードコード
```

**問題点**:
- 一貫性がない
- .env ファイルの設定が活用されていない
- デプロイメント毎に異なる timeout が必要な場合に対応不可

### 再発防止策

#### 対策1: 環境変数対応 ✅ 実装済み
```typescript
// ✅ 改善後
const TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '60000', 10);
console.log('⏱️ API_TIMEOUT:', TIMEOUT);

this.instance = axios.create({
  timeout: TIMEOUT,  // 環境変数から動的に設定
});
```

**効果**:
- .env ファイルで timeout を調整可能
- デプロイメント毎に異なる設定が可能
- ローカル・ステージング・本番で個別設定可能

#### 対策2: デフォルト値の見直し
```
【Before】 30000ms (30秒)
  - 音声生成: OpenAI API + ファイル生成 → 不足
  - ネットワーク遅延: 考慮不足

【After】 60000ms (60秒)
  - 複雑な処理に対応
  - ネットワーク遅延を余裕を持って考慮
  - 環境変数で調整可能
```

**効果**:
- 本番環境での失敗が減少
- 処理時間が読めない場合も対応

#### 対策3: ログによる可視化
```typescript
// ✅ 改善後
console.log('⏱️ API_TIMEOUT:', TIMEOUT);  // アプリ起動時に表示
```

**効果**:
- アプリ起動時に timeout 値が確認可能
- 設定が正しく読み込まれているか確認可能
- トラブルシューティングが容易

### チェックリスト

デプロイ前確認:
- [ ] .env に EXPO_PUBLIC_API_TIMEOUT=60000 が設定されている
- [ ] アプリ起動時に "⏱️ API_TIMEOUT: 60000" が表示される
- [ ] 音声生成が 60秒以内に完了する
- [ ] ネットワーク遅延がある環境でもタイムアウトしない

---

## 🟠 インシデント3: ブランチによるファイル構造乖離

### 発生状況
- **環境**: Local 開発環境
- **症状**: UI 編集作業を開始しようとしたら、必要なファイルが見つからない
- **詳細**:
  ```
  main:                          audion-app-fresh に Home/Feed ファイルがない ❌
  feature/home-ui-enhancement:   audion-app-fresh に完全実装がある ✅
  ローカル:                      feature ブランチで作業中なのに main の情報で混乱
  ```
- **影響**: UI 編集タスクが開始できない、ブランチ戦略が不明確

### 根本原因

#### 原因1: ブランチ戦略の不明確さ
```
状況:
  main: 古いコード + audion-app-fresh（不完全）
  feature/home-ui-enhancement: 新しいコード + audion-app-fresh（完全）
  Render: main からデプロイ

問題点:
  - どのブランチが「本当の開発環境」か不明確
  - 複数のコードベースが並列で存在
  - feature を main にマージする仕組みがない
```

**問題点**:
- 1 人開発なのに複数ブランチ必要？
- 機能開発時に「どのブランチで作業するか」の判断が必要
- 新しい開発者が入った時に混乱

#### 原因2: ファイル構造の重複
```
main:
├── audion-app/               (レガシー、古い実装)
└── audion-app-fresh/         (スケルトン、不完全)

feature/home-ui-enhancement:
├── audion-app/               (存在しない？)
└── audion-app-fresh/         (完全実装)
```

**問題点**:
- audion-app と audion-app-fresh が両方存在
- どちらが本体か不明確
- メンテナンス負荷が高い

#### 原因3: ドキュメント不足
```
情報源:
  - 過去のコミットメッセージ（曖昧）
  - コードベースの状態（実際に見ないと分からない）
  - ブランチ戦略の文書（なし）

結果:
  - ブランチごとの違いが理解されない
  - 「Home/Feed ファイルが無い」という誤解が生じる
  - 編集作業が始められない
```

### 再発防止策

#### 対策1: ブランチ戦略の統一 ✅ 実装済み
```
【After】
main: 唯一の開発ブランチ（すべての修正を含む）
  └─ すべての新機能・修正はここに統合
  └─ Render も main からデプロイ

feature/...: 不要（1人開発なら main で十分）
```

**効果**:
- ブランチが 1 つで単純
- ファイル構造が 1 つに統一
- デプロイが確実

#### 対策2: ファイル構造の統一 ✅ 実装済み
```
audion-app-fresh/     ← メインフロントエンド（完全実装）
├── app/(tabs)/
│   ├── index.tsx      (Home)
│   ├── feed.tsx       (Feed)
│   └── discover.tsx   (Discover)
├── components/
├── services/
├── config/
└── package.json

audion-app/           ← レガシー（参考用、廃止予定）
```

**効果**:
- ファイル構造が統一
- 開発時に迷わない
- メンテナンス負荷が減少

#### 対策3: 開発ガイドドキュメント ✅ 実装済み
ドキュメント作成:
- `docs/BRANCH_CLEANUP_AND_FIXES_SUMMARY.md` - ブランチ統一の詳細
- `docs/QUICK_REFERENCE.md` - クイックリファレンス

**効果**:
- ブランチ戦略が文書化
- 新しい開発者が理解しやすい
- 過去の決定理由が記録

#### 対策4: メモリシステムの活用 ✅ 実装済み
メモリファイル作成:
- `branch_cleanup_completion_summary.md`
- `branch_cleanup_critical_finding.md`
- `ui_edit_problem_root_cause_analysis.md`

**効果**:
- 過去の問題解決方法が記録
- AI Agent が文脈を理解可能
- 再発防止に利用

### チェックリスト

開発開始前確認:
- [ ] main ブランチで作業している
- [ ] audion-app-fresh/ がメインフロントエンド
- [ ] 編集対象ファイルが audion-app-fresh/ にあることを確認
- [ ] docs/ のドキュメントを読んで理解している

---

## 🎯 全体的な再発防止方針

### 1. ブランチ戦略の原則
```
✅ DO:
  - main ブランチのみ使用（1 人開発）
  - すべての修正を main に統合
  - Render は main からデプロイ

❌ DON'T:
  - feature/... ブランチの複数並列運用
  - ブランチごとに異なるコードベース
  - どのブランチが最新か不明確な状態
```

### 2. エラーログの原則
```
✅ DO:
  - スタートアップ時に重要な設定をログ出力
  - エラー発生時に背景情報（設定値など）を含める
  - ログレベルを適切に設定（INFO/WARNING/ERROR）

❌ DON'T:
  - エラーメッセージだけで詳細情報なし
  - 本番環境でログが出ない
  - デバッグ時にしか確認できない情報
```

### 3. 環境変数の原則
```
✅ DO:
  - すべての設定値を環境変数で上書き可能に
  - デフォルト値を合理的に設定
  - 本番用の強力な値を別途設定

❌ DON'T:
  - ハードコード（環境に応じた変更不可）
  - デフォルト値が不安全（秘密鍵など）
  - 環境変数と .env の設定が混在
```

### 4. ドキュメントの原則
```
✅ DO:
  - ブランチ戦略を文書化
  - デプロイ前チェックリストを用意
  - トラブルシューティングガイドを作成
  - メモリに解決策を記録

❌ DON'T:
  - 口頭でしか説明しない
  - 過去の失敗が記録されない
  - 新しい開発者が文脈を理解できない
```

---

## 📊 改善効果の測定

### 実装前後の比較

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| **JWT_SECRET_KEY 設定の可視性** | ❌ ログなし | ✅ スタートアップロギング | 起動時に即座に確認 |
| **エラーの診断性** | ❌ "Invalid token" | ✅ エラー型+秘密鍵状態 | 原因特定が容易 |
| **API タイムアウト対応** | ❌ ハードコード 30s | ✅ 環境変数 (60s) | 環境毎に調整可能 |
| **本番環境安全性** | ❌ デフォルト値で運用 | ✅ 必須設定 + チェック | 不安全な運用を防止 |
| **ブランチ戦略** | ❌ 複数並列 | ✅ main 単一 | シンプル・確実 |
| **ドキュメント** | ❌ なし | ✅ 3 種類作成 | 新規開発者対応可能 |

---

## 🚀 実装状況

### ✅ 完了
- [x] JWT 認証強化（3ファイル修正）
- [x] API タイムアウト修正（4ファイル修正）
- [x] ブランチ統一（main のみ）
- [x] ドキュメント作成（2個）
- [x] GitHub push 完了
- [x] Render デプロイ準備完了

### 📋 デプロイ後確認待ち
- [ ] Render 自動デプロイ完了
- [ ] ログで "🚀 AUDION BACKEND STARTUP" 確認
- [ ] ログで "🔐 JWT_SECRET_KEY configured: True" 確認
- [ ] AutoPick API テストで 401 解決確認

### 🔮 今後の改善案
- [ ] 自動テスト（CI/CD）の導入
- [ ] ログ監視アラート設定
- [ ] 秘密鍵のローテーション機構
- [ ] API レスポンスタイムの監視

---

## 📞 トラブルシューティングガイド

### 症状: 401 エラーが続く
1. Render Dashboard → Settings → Environment で JWT_SECRET_KEY が設定されているか確認
2. ログで "🔐 JWT_SECRET_KEY configured: True" と表示されているか確認
3. JWT_SECRET_KEY の値が正しいか（本番用キーか、開発用キーか）確認
4. トークンの形式が正しいか確認（`Authorization: Bearer <token>`）

### 症状: API がタイムアウトする
1. .env に `EXPO_PUBLIC_API_TIMEOUT=60000` が設定されているか確認
2. アプリ起動時に "⏱️ API_TIMEOUT: 60000" が表示されているか確認
3. バックエンドのレスポンスが 60 秒以内に返ってきているか確認
4. ネットワーク遅延の可能性があれば、timeout をさらに長くする

### 症状: ファイルが見つからない
1. 現在のブランチが `main` であることを確認（`git status`）
2. ファイル構造が `audion-app-fresh/` にあることを確認
3. `git branch` で複数ブランチがないか確認
4. docs/QUICK_REFERENCE.md を読んでファイル構造を理解

---

## ✍️ 作成者のコメント

このドキュメントは、複数のセッションで発見・解決された問題を体系的にまとめたものです。特に以下の教訓を記録します：

1. **エラーログの重要性**: エラーが発生した時に、背景情報（設定値など）を含めるだけで診断性が大幅に改善
2. **環境変数の柔軟性**: ハードコード値を環境変数にすることで、デプロイメント毎の対応が可能に
3. **ドキュメント駆動**: 過去の失敗から学び、将来の開発者が同じ失敗をしないようにする
4. **シンプル性**: 複数ブランチよりも 1 つのブランチが、長期的には保守性が高い

---

**最終確認**: 2025-10-28
**状態**: ✅ すべての再発防止策が実装済み

