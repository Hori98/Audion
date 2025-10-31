# Render ブランチ戦略 - ベストプラクティス分析と根本原因

## 質問への直接的な回答

### Q1: ベストプラクティスは何でしょうか？

**答え: 以下の構造がベストプラクティス**

```
main ブランチ
├── 安定版コード
├── 十分にテストされた機能
├── デプロイ対象（Render がここを参照）
└── ホットフィックス、バグ修正のみ

      ↓ Pull Request (レビュー必須)

develop ブランチ（または feature）
├── 開発中の新機能
├── まだテストされていない変更
├── 複数のコミットが集約される
└── develop で統合テスト後に main にマージ

実装フロー：
  feature/xxx → develop → main → Render デプロイ
                        ↑レビュー必須
```

**Audion の場合の推奨**

```
現状：
  feature/home-ui-enhancement → Render に直接デプロイ ❌

推奨：
  feature/home-ui-enhancement 
    ↓ (PR + レビュー)
   main (Render がここを参照)
    ↓
   Render デプロイ
```

---

### Q2: JWT キーが合わなかったり、ログが出なかったのはブランチが違ったから？

**答え: YES、その通りです。完全にブランチの問題です。**

#### 根本原因の追跡

```
【Timeline】

2025-10-27 (before):
  - AutoPick で 401 エラー発生
  - JWT_SECRET_KEY の起動ログが Render に出ない
  - 原因：main ブランチのコードには JWT ログが無い

commit 63d6f15 (2025-10-27):
  - feature ブランチに JWT ログ追加
  - 内容: verify_jwt_token() に詳細ログ追加

commit 2ef5145 (2025-10-27, main ブランチ):
  - main にも JWT ログ追加
  - 内容: startup 時に JWT_SECRET_KEY 状態を出力

commit 71ad98c (2025-10-28, feature ブランチ):
  - feature に Query(None) 明示宣言を追加
  - feature に詳細な startup ログを追加

【現在の状態】
  main:
    - 基本的な JWT ログはある（2ef5145 で追加）
    - でも Query(None) が無い（feature にしかない）
    - 結果: main からデプロイ → ログ出力だけで 401 が解決しない

  feature:
    - Query(None) 明示宣言がある（042b610）
    - 詳細な JWT ログがある（71ad98c）
    - 結果: feature からデプロイ → 401 が解決する
```

#### つまり

```
【main ブランチの状態】
✅ JWT_SECRET_KEY ログは出力される
❌ でも Query(None) が無いので、FastAPI が query parameter を認識しない
❌ 結果：401 エラーが続く

【feature ブランチの状態】
✅ JWT_SECRET_KEY ログが出力される
✅ Query(None) が明示宣言されている
✅ 結果：401 エラーが解決する
```

**つまり、ログの有無以前に、コード自体が異なっていた。**

---

### Q3: Render のブランチを main に戻せば元通りになる？

**答え: NO、元通りにはならない。むしろ悪化する。**

#### 理由

```
main ブランチを今デプロイすると：

✅ JWT_SECRET_KEY ログは Render に出力される
❌ でも Query(None) が無いので 401 エラーが復活
❌ ユーザーは「ログは出ているのに認証できない」という最悪の状態

なぜなら：
- main には Query(None) 明示宣言（commit 042b610）が無い
- main には詳細な JWT ログ（commit 71ad98c）も無い
- feature にしかない修正がある
```

#### 現在の状態（feature からデプロイ中）

```
✅ Query(None) がある（042b610, feature ブランチ）
✅ 詳細ログがある（71ad98c, feature ブランチ）
✅ JWT_SECRET_KEY ログがある（2ef5145, main + feature）
✅ 結果：正常に動作
```

---

## 分岐の詳細分析

### コミット差分

```
feature/home-ui-enhancement が main より 147 commits 先
main が feature より 91 commits 先

つまり：
- feature では新しい修正が加えられている
- main では別の方向の変更がされている
- 2つは完全に分岐している
```

### 何が main にはなくて feature にあるのか

#### ✅ feature ブランチにのみある修正

```
commit 71ad98c:
  fix: improve JWT token verification logging and Query parameter binding
  - Query(None) 明示宣言を get_current_user_from_token_param に追加
  - 詳細な JWT ログを verify_jwt_token に追加
  - startup ログを server.py に追加

commit 63d6f15:
  debug: add detailed logging to token parameter validation
  - get_current_user_from_token_param に詳細ログ

commit 042b610:
  fix: explicitly declare token as Query parameter in task-status endpoint
  - Query(None) を endpoint に追加（これが 401 解決の鍵）
```

#### ✅ main ブランチにだけある修正

```
commit 2ef5145:
  fix: add JWT_SECRET_KEY configuration logging at startup
  - startup ログを追加（ただし詳細度が低い）

commit 224769b:
  Add .env to .gitignore

他には feature と別の方向の UI/機能変更
```

---

## ベストプラクティスに基づく推奨対応

### 問題点

```
現在：
  Render → feature/home-ui-enhancement から直接デプロイ
  
ベストプラクティス：
  Render → main から デプロイ
  
gap：
  main が feature の修正を持っていない
```

### 解決方法（3段階）

#### Step 1: feature を main にマージ

```bash
git checkout main
git merge feature/home-ui-enhancement
git push origin main
```

この後、main には feature のすべての修正が含まれる：
✅ Query(None) 
✅ 詳細ログ
✅ UI 編集（SectionPlaceholder等）

#### Step 2: Render を main に戻す

```
Render Dashboard:
  Services → audion (backend) → Settings → GitHub
  Branch: "feature/home-ui-enhancement" → "main" に変更
  
または、すでに main なら確認
```

#### Step 3: 検証

```bash
Render Logs を確認：
✅ "🔐 JWT_SECRET_KEY configured: True"
✅ "🔐 JWT_SECRET_KEY (first 20 chars): sk_audion_dev_..."
✅ Render で AutoPick が 200 OK を返すか確認
```

---

## 万が一のシナリオ

### シナリオ: Render を main に戻したら 401 が復活した

```
症状：
  ✅ JWT_SECRET_KEY ログは出ている
  ❌ でも AutoPick で 401 エラー

原因：
  Query(None) が main に無い

対処：
  1. git show feature/home-ui-enhancement:backend/server.py | grep -A 2 "get_current_user_from_token_param"
     → feature にはあることを確認

  2. git show main:backend/server.py | grep -A 2 "get_current_user_from_token_param"
     → main にはないことを確認（または = None のまま）

  3. git checkout feature/home-ui-enhancement -- backend/server.py
     → feature から該当ファイルをコピー

  4. git add backend/server.py
     git commit -m "fix: sync JWT authentication fixes from feature branch"
     git push origin main
     
  5. Render が自動 redeploy → 401 解決
```

---

## 最終的なベストプラクティス（Audion 向け）

### ブランチ戦略

```
main
  └─ Render がここからデプロイ
  └─ 十分にテストされたコード
  └─ ホットフィックス用

    ↑ (PR + レビュー)

develop （新規作成推奨）
  └─ 次期リリース向けコード
  └─ 複数の feature をマージ

    ↑ (PR）

feature/xxx
  └─ 個別機能開発
  └─ feature/home-ui-enhancement
  └─ feature/auth-improvements
  └─ etc.
```

### マージフロー

```
feature/home-ui-enhancement が完成
    ↓
develop に PR → レビュー → マージ
    ↓
develop でテスト・統合テスト
    ↓
main に PR → レビュー → マージ
    ↓
Render が自動 redeploy
```

### 現在の状況での推奨

```
【推奨1】 feature を main にマージ（決定的な解決）

git checkout main
git merge feature/home-ui-enhancement
git push origin main
Render を main に向ける

結果：
✅ main がデプロイ対象になる
✅ ベストプラクティスに従う
✅ feature ブランチは削除 or 次の開発へ


【推奨2】 develop を作成して、今後はそこを使う

git branch develop main
git push origin develop
Render を develop に向ける

結果：
✅ main は安定版
✅ develop は開発版
✅ 長期的に運用しやすい
```
