# Audion UI 編集ガイド - SectionPlaceholder 統合（実装版）

**対象**: Claude Code（Codex）での UI 編集作業
**目的**: SectionPlaceholder コンポーネントを Home/Feed（index.tsx）に統合
**ブランチ**: main（統一済み）
**最新更新**: 2025-10-28（実装構造に基づいて修正）

---

## 🎯 このガイドの目的

実装に基づいて、正確な UI 編集ガイドを提供します。

---

## 📁 実装ファイル構造（実際の構造）

```
audion-app-fresh/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx              ← Tab レイアウト定義
│   │   ├── index.tsx                ← ⭐ Home/Feed メイン画面（48KB）
│   │   │                              　 複数セクション含む
│   │   ├── articles.tsx             ← 記事詳細
│   │   ├── discover.tsx             ← Discover 画面
│   │   ├── two.tsx                  ← その他画面
│   │   ├── trending.tsx             ← トレンド
│   │   └── personalized.tsx         ← パーソナライズ
│   ├── settings/                    ← 設定関連ページ（直下）
│   │   ├── index.tsx
│   │   ├── autopick.tsx
│   │   ├── content-playback.tsx
│   │   ├── rss-sources.tsx
│   │   └── schedule.tsx
│   ├── auth/                        ← 認証ページ（直下）
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── _layout.tsx                  ← Root レイアウト
│   ├── modal.tsx
│   ├── player.tsx
│   ├── article-webview.tsx
│   ├── dev-test.tsx
│   ├── test-api.tsx
│   └── +not-found.tsx
│
├── components/
│   ├── common/
│   │   └── SectionPlaceholder.tsx    ← プレースホルダーコンポーネント ⭐
│   ├── HeroCarousel.tsx             ← ヒーロー記事カルーセル
│   ├── TrendingCarousel.tsx         ← トレンド記事カルーセル
│   ├── ArticleCard.tsx
│   ├── CompactCard.tsx
│   ├── BreakingNewsCard.tsx
│   ├── SectionHeader.tsx            ← セクションヘッダー
│   ├── UnifiedHeader.tsx
│   ├── SearchModal.tsx
│   ├── ArticleDetailModal.tsx
│   ├── FloatingAutoPickButton.tsx
│   └── その他
│
├── services/
│   ├── ArticleService.ts            ← 記事取得サービス
│   ├── AudioService.ts              ← 音声生成サービス
│   ├── AutoPickProgressService.ts
│   ├── AudioMetadataService.ts
│   ├── SubscriptionService.ts
│   └── その他
│
├── hooks/
│   ├── useCuratedFeed.ts            ← キュレーション記事フック
│   └── その他
│
├── context/
│   ├── AuthContext.tsx
│   ├── ArticleContext.tsx
│   ├── AutoPickContext.tsx
│   └── その他
│
├── app.json
├── package.json
├── tsconfig.json
└── .env.development                 ← EXPO_PUBLIC_API_TIMEOUT=60000
```

---

## 🎨 SectionPlaceholder コンポーネント

### コンポーネント定義

**ファイル**: `audion-app-fresh/components/common/SectionPlaceholder.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../styles/commonStyles';

interface SectionPlaceholderProps {
  message?: string;         // 読み込み中メッセージ（オプション）
  lines?: number;          // スケルトンバーの数（デフォルト: 1）
  insetHorizontal?: number; // 水平インセット（デフォルト: 0）
}

export default function SectionPlaceholder({
  message,
  lines = 1,
  insetHorizontal = 0
}: SectionPlaceholderProps) {
  return (
    <View style={[styles.container, insetHorizontal ? { paddingHorizontal: insetHorizontal } : null]}>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {Array.from({ length: Math.max(0, lines) }).map((_, i) => (
        <View key={i} style={styles.band} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.SCREEN_HORIZONTAL,
    paddingVertical: SPACING[2],
  },
  message: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: SPACING[1],
  },
  band: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 5,
    marginTop: SPACING[1],
  },
});
```

---

## 🔧 統合実装方針

### 統合対象: index.tsx

**ファイル**: `audion-app-fresh/app/(tabs)/index.tsx`（48KB メインファイル）

このファイルには複数のセクションがあります：
- HeroCarousel（ヒーロー記事）
- BreakingNews（速報）
- TrendingCarousel（トレンド記事）
- PersonalizedGrid（パーソナライズ記事）
- Latest Articles（最新記事）
- AudioRecommendationCarousel（音声推奨）

### 実装パターン（2種類）

#### パターン1: セクションコンテナを常時表示、読み込み中はプレースホルダー

このパターンは、セクションのコンテナを常時表示して、読み込み中はスケルトンを表示します。

```typescript
// 実装例：Trending セクション
<View style={styles.sectionContainer}>
  <SectionHeader
    type="trending"
    title="トレンド"
    articleCount={trendingArticles.length}
    showSeeMore={trendingArticles.length > 0}
    onSeeMorePress={() => router.push('/trending')}
    divider="none"
  />
  {sectionsLoading ? (
    <SectionPlaceholder message="読み込み中…" lines={1} />
  ) : trendingArticles.length > 0 ? (
    <TrendingCarousel
      articles={trendingArticles}
      onArticlePress={handleArticlePress}
      onSeeMore={() => router.push('/trending')}
      maxItems={10}
    />
  ) : (
    <SectionPlaceholder message="現在表示できるトレンドはありません" lines={0} />
  )}
  {UI_FLAGS.USE_SECTION_FOOTER_DIVIDERS && (
    <SectionDivider inset={8} topMargin={6} />
  )}
</View>
```

#### パターン2: セクションコンテナを常時表示、3状態管理

このパターンは、セクションの3つの状態（読み込み中・データあり・データなし）を明確に分離します。

```typescript
// 実装例：Personalized セクション
<View style={styles.sectionContainer}>
  <SectionHeader
    type="personalized"
    title="おすすめ"
    articleCount={personalizedArticles.length}
    showSeeMore={personalizedArticles.length > 0}
    onSeeMorePress={() => router.push('/personalized')}
    divider="none"
  />
  {sectionsLoading ? (
    <SectionPlaceholder message="読み込み中…" lines={1} />
  ) : personalizedArticles.length > 0 ? (
    <PersonalizedGrid
      articles={personalizedArticles}
      onArticlePress={handleArticlePress}
      onSeeMore={() => router.push('/personalized')}
      maxItems={4}
    />
  ) : (
    <SectionPlaceholder message="現在表示できるおすすめはありません" lines={0} />
  )}
  {UI_FLAGS.USE_SECTION_FOOTER_DIVIDERS && (
    <SectionDivider inset={8} topMargin={6} />
  )}
</View>
```

---

## 📋 実装状態（2025-10-28 時点）

### ✅ 実装完了

SectionPlaceholder は全セクションで統合済みです。

#### インポート確認

```typescript
// audion-app-fresh/app/(tabs)/index.tsx（Line 62）
import SectionPlaceholder from '../../components/common/SectionPlaceholder';
```

#### 実装済みセクション

| セクション | 状態 | 読み込み状態 | 空状態 |
|-----------|------|-----------|-------|
| Hero | ✅ | あり（lines=2） | なし |
| Breaking | ✅ | あり（lines=1） | あり |
| Trending | ✅ | あり（lines=1） | あり |
| Personalized | ✅ | あり（lines=1） | あり |
| Audio | ✅ | 組込み（AudioRecommendationCarousel） | なし |

#### コミット履歴

```
Commit: 6103108
Message: feat(ui): integrate SectionPlaceholder loading states into Home screen sections
Date: 2025-10-28 13:42:22 JST
```

### 📝 新規セクション追加時のチェックリスト

新しいセクションにSectionPlaceholderを統合する場合：

#### 【ステップ1】インポート確認

SectionPlaceholder が既にインポートされていることを確認：

```typescript
// audion-app-fresh/app/(tabs)/index.tsx（Line 62）
import SectionPlaceholder from '../../components/common/SectionPlaceholder';
```

#### 【ステップ2】読み込み状態の確認

セクション用の state が存在することを確認：

```typescript
const [sectionsLoading, setSectionsLoading] = useState(false);
// または section 固有の state
const [myCustomLoading, setMyCustomLoading] = useState(false);
```

#### 【ステップ3】UI に統合

上記の「実装パターン」を参照して、3状態管理を実装：

```typescript
{myLoading ? (
  <SectionPlaceholder message="読み込み中…" lines={1} />
) : myArticles.length > 0 ? (
  <MyCustomCarousel articles={myArticles} />
) : (
  <SectionPlaceholder message="データがありません" lines={0} />
)}
```

#### 【ステップ4】テスト

```bash
# ローカルで起動
npx expo start --clear --tunnel

# 確認項目:
# 1. 画面初期化時にプレースホルダーが表示される
# 2. データ読み込み完了後に実データが表示される
# 3. データがない場合に空状態メッセージが表示される
```

---

## ⚠️ 実装時の注意点

### 注意1: State 管理での3状態設計

SectionPlaceholder を効果的に使用するには、読み込み中・データあり・データなしの3つの状態を明確に分離する必要があります。

```typescript
// ❌ 不適切: データ有無のみで判定
{articles.length === 0 ? null : <SectionPlaceholder />}

// ✅ 推奨: 3状態を明示的に管理
{sectionsLoading ? (
  <SectionPlaceholder message="読み込み中…" lines={1} />
) : articles.length > 0 ? (
  <ArticleCarousel articles={articles} />
) : (
  <SectionPlaceholder message="データがありません" lines={0} />
)}
```

### 注意2: lines パラメータの値

`lines` パラメータは、プレースホルダーに表示する骨組みバー（スケルトン）の数です。データ構造に合わせて適切に設定してください。

```typescript
// lines の推奨値
<SectionPlaceholder lines={0} />  // メッセージのみ、バーなし（空状態用）
<SectionPlaceholder lines={1} />  // 1行プレースホルダー（カルーセル用）
<SectionPlaceholder lines={2} />  // 2行プレースホルダー（複雑なレイアウト用）
<SectionPlaceholder lines={3} />  // 3行以上（大きなセクション用）
```

### 注意3: insetHorizontal パラメータの使用

`insetHorizontal` は水平方向のパディングを追加します。デフォルト値は `SPACING.SCREEN_HORIZONTAL`（8px） です。

```typescript
// ❌ 不要: 両側パディングを重複設定
<View style={{ paddingHorizontal: 16 }}>
  <SectionPlaceholder insetHorizontal={16} />
</View>

// ✅ 推奨: 親要素か SectionPlaceholder のどちらかで設定
// 親要素で設定している場合
<SectionPlaceholder insetHorizontal={0} />

// または SectionPlaceholder で設定
<SectionPlaceholder insetHorizontal={16} />
```

### 注意4: COLORS と SPACING の確認

SectionPlaceholder は `commonStyles` から `COLORS` と `SPACING` をインポートしています。プロジェクトでこれらが正しく定義されていることを確認してください。

```typescript
// audion-app-fresh/styles/commonStyles.ts で確認
import { COLORS, SPACING } from '../../styles/commonStyles';

// 必須の SPACING キー
// SPACING.SCREEN_HORIZONTAL
// SPACING[1], SPACING[2]

// 必須の COLORS キー
// COLORS.TEXT_MUTED
```

---

## 🔍 コードレビューチェックリスト

実装完了後、以下を確認してください：

### 【コード品質】
- [ ] TypeScript の型チェック通過（`npx tsc --noEmit`）
- [ ] ESLint ルール準拠（`npx eslint app/\(tabs\)/index.tsx`）
- [ ] 不要な import が削除されている
- [ ] console.log などの debug コードがない
- [ ] SectionPlaceholder のインポートが正しい（`../../components/common/SectionPlaceholder`）

### 【機能確認】
- [ ] 初期化時にプレースホルダーが表示される
- [ ] データ読み込み完了後に実データが表示される
- [ ] エラー時に適切なメッセージが表示される
- [ ] スクロール時のプレースホルダーが表示される
- [ ] 複数セクションで同時読み込み時に各々表示される

### 【UI/UX 確認】
- [ ] プレースホルダーの色がテーマと一致
- [ ] プレースホルダーの高さが実データに近い
- [ ] アニメーション（フェード・スライドなど）が自然
- [ ] ネットワーク遅延シミュレーション時に確認

### 【パフォーマンス】
- [ ] メモリリークがない（Dev Tools で確認）
- [ ] FPS が 60 以上維持されている
- [ ] 複数セクション同時読み込み時も動作スムーズ

### 【アクセシビリティ】
- [ ] スクリーンリーダーで読み込み状態が伝わる
- [ ] キーボードナビゲーションが動作
- [ ] テキストサイズ拡大時に崩れない

---

## 📝 コミット メッセージ例

実装完了後のコミット：

```
feat: integrate SectionPlaceholder into Home/Feed (index.tsx) sections

実装内容:
- SectionPlaceholder を app/(tabs)/index.tsx に統合
- HeroCarousel セクション: 読み込み中にスケルトン表示
- TrendingCarousel セクション: 記事読み込み時にプレースホルダー表示
- PersonalizedGrid セクション: パーソナライズ記事読み込み時に表示
- Latest Articles: 下部読み込み時にプレースホルダー表示

パターン:
- セクション全体読み込み: message + lines=3 + insetHorizontal=16
- セクション内複数アイテム: lines=2
- エラー時: カスタムメッセージ表示

テスト:
- ローカル起動で各セクションのプレースホルダー確認
- ネットワーク遅延シミュレーション時に動作確認
- 複数セクション同時読み込みで正常表示確認
- TypeScript & ESLint 通過確認

🚀 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🚀 実装フロー（推奨）

### Step 1: 環境準備
```bash
git status  # main ブランチであることを確認
cd audion-app-fresh
npm install  # 必要に応じて
```

### Step 2: index.tsx 分析
- `audion-app-fresh/app/(tabs)/index.tsx` を開く
- セクション構造を理解（HeroCarousel, TrendingCarousel, PersonalizedGrid など）
- 各セクションの読み込みロジックを確認

### Step 3: 段階的実装
1. 最初のセクション（例: HeroCarousel）で実装
2. テストして動作確認
3. 次のセクション（例: TrendingCarousel）を実装
4. 全セクション完了後に GitHub push

### Step 4: テスト・レビュー
```bash
npx tsc --noEmit  # TypeScript チェック
npx eslint app/\(tabs\)/index.tsx  # ESLint チェック
npx expo start --clear --tunnel  # ローカルテスト
```

### Step 5: コミット
```bash
git add audion-app-fresh/app/\(tabs\)/index.tsx
git commit -m "feat: integrate SectionPlaceholder into Home/Feed sections"
git push origin main
```

---

## 💬 Q&A

### Q: SectionPlaceholder をカスタマイズしたい場合は？

A: `components/common/SectionPlaceholder.tsx` を直接編集：
```typescript
// 例: アニメーション追加、色カスタマイズ等
export default function SectionPlaceholder({...}) {
  // カスタムロジックを追加
}
```

### Q: 複数の読み込み状態（初期化中、更新中、エラー）をどう区別する？

A: 状態を詳細化：
```typescript
type LoadingState = 'idle' | 'loading' | 'error' | 'success';
const [state, setState] = useState<LoadingState>('loading');

{state === 'loading' && <SectionPlaceholder message="読み込み中..." />}
{state === 'error' && <ErrorMessage />}
{state === 'success' && <ContentView />}
```

### Q: index.tsx がかなり大きいファイルですが、どの部分を編集すればいい？

A: 以下を目安に：
- Line 772 付近: HeroCarousel セクション
- Line 850 付近: TrendingCarousel セクション
- Line 891 付近: PersonalizedGrid セクション
- grep で `<HeroCarousel`, `<TrendingCarousel` などを検索して該当箇所を特定

---

## ✅ 実装完了チェックリスト

最終確認用：

- [ ] index.tsx がメイン（audion-app-fresh/app/(tabs)/index.tsx）
- [ ] SectionPlaceholder が import されている
- [ ] 各セクションで読み込み状態が管理されている
- [ ] UI に条件分岐で SectionPlaceholder が統合されている
- [ ] TypeScript コンパイル通過（`npx tsc --noEmit`）
- [ ] ESLint 通過（`npx eslint app/\(tabs\)/index.tsx`）
- [ ] ローカルで動作確認（プレースホルダー表示）
- [ ] ネットワーク遅延時でも正常表示
- [ ] GitHub push 完了

---

**このガイドを参考に、SectionPlaceholder 統合を進めてください！**

質問や問題があれば、上記の Q&A や関連ドキュメントを参照してください。

