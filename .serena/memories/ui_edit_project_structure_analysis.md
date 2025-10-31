# UI 編集作業 - プロジェクト構造分析レポート

## 問題の本質

**2つの異なるアプリフォルダが存在し、コードベースが分散している状態**

```
/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/
├── audion-app/              ← 🟢 実際のアプリ本体（Home/Feed実装済み）
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── feed.tsx     ✅ Feed 実装あり
│   │   │   ├── discover.tsx ✅ Discover 実装あり
│   │   │   └── library.tsx  ✅ Library 実装あり
│   │   └── index.tsx        ✅ Home 実装あり
│   └── components/
│       ├── Feed/            ✅ Feed コンポーネント群
│       │   ├── ArticleCard.tsx
│       │   ├── GenreFilter.tsx
│       │   └── SelectionManager.tsx
│       └── [その他のコンポーネント]
│
└── audion-app-fresh/        ← ⚠️ スケルトンフォルダ（実装不完全）
    └── components/
        └── common/
            └── SectionPlaceholder.tsx  ← 作成済み（でも本体が違うフォルダ）
```

## 現在の状況

| 項目 | 状態 | 詳細 |
|------|------|------|
| **本体アプリ** | `audion-app/` | Expo Router、Feed UI、すべてのコンポーネント実装済み |
| **SectionPlaceholder** | `audion-app-fresh/components/common/` | 作成済みだが本体ではないフォルダに存在 |
| **Home/Feed ファイル** | `audion-app/app/(tabs)/` と `audion-app/components/Feed/` | 本体にあるが、fresh フォルダには無い |
| **ブランチ管理** | `feature/home-ui-enhancement` | 本来は `main` との関係を整理すべき |

## 根本原因

1. **ブランチ切り替え時に発生**
   - `feature/home-ui-enhancement` ブランチで作業中
   - しかし、このブランチの `audion-app-fresh/` は「スケルトン化」されている
   - 一方、`audion-app/` が完全な実装を持つ

2. **作業フォルダの指定が曖昧だった**
   - SectionPlaceholder を `audion-app-fresh/` に作成したが、本体は `audion-app/`
   - つまり、「プレースホルダだけ作成して、差し込み先が見つからない」状態

3. **git ブランチ内のディレクトリ構造の不一致**
   - `feature/home-ui-enhancement` では audion-app-fresh が主フォルダ候補
   - `main` では audion-app が主フォルダ
   - ローカルが「どちらを作業対象にするか」不明確

## 対応方針

### **推奨: audion-app をメイン開発フォルダとして確定**

理由：
- ✅ 実装が完全に揃っている
- ✅ Home/Feed/Discover すべてのファイルが存在
- ✅ コンポーネント体系が整理されている
- ✅ 現在のブランチで正常に動作している可能性が高い

### **処理手順**

1. **SectionPlaceholder を audion-app に移動**
   ```
   audion-app-fresh/components/common/SectionPlaceholder.tsx
   → audion-app/components/common/SectionPlaceholder.tsx
   ```

2. **Home/Feed に差し込む**
   - `audion-app/app/(tabs)/feed.tsx` に組み込み
   - セクション常時表示 + 読み込み中にプレースホルダ表示

3. **audion-app-fresh の位置付けを決定**
   - 削除する（古いコピー）
   - または、同期用テンプレートとして保持

## ファイル一覧

### audion-app（本体）の重要ファイル

**Home/Feed 関連:**
- `audion-app/app/(tabs)/feed.tsx` - Feed 画面本体
- `audion-app/app/(tabs)/discover.tsx` - Discover 画面
- `audion-app/app/(tabs)/library.tsx` - Library 画面
- `audion-app/app/index.tsx` - Home 画面
- `audion-app/app/_layout.tsx` - Layout 管理

**Feed コンポーネント:**
- `audion-app/components/Feed/ArticleCard.tsx` - 記事カード
- `audion-app/components/Feed/GenreFilter.tsx` - ジャンルフィルター
- `audion-app/components/Feed/ActionButtons.tsx` - アクションボタン
- `audion-app/components/Feed/SelectionManager.tsx` - 選択管理
- `audion-app/components/Feed/SourceFilter.tsx` - ソースフィルター

**その他:**
- `audion-app/components/FullScreenPlayer.tsx` - 全画面プレイヤー
- `audion-app/components/MiniPlayer.tsx` - ミニプレイヤー
- `audion-app/components/ErrorBoundary.tsx` - エラーハンドリング

### audion-app-fresh（スケルトン）

- 基本的なディレクトリ構成のみ
- 実装は大部分が欠落
- SectionPlaceholder.tsx が孤立状態で存在

## 推奨行動

**今すぐやること:**
1. ✅ `audion-app/` を本体フォルダとして確定
2. ✅ SectionPlaceholder.tsx を `audion-app/components/common/` に移動
3. ✅ `audion-app/app/(tabs)/feed.tsx` に組み込み準備

**オプション:**
- audion-app-fresh を削除するか、テンプレートとして保持するかを決定
- ブランチ整理（feature/home-ui-enhancement と main の同期）
