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
│   │   ├── personalized.tsx         ← パーソナライズ
│   │   ├── settings/                ← 設定関連
│   │   └── auth/                    ← 認証関連
│   ├── _layout.tsx                  ← Root レイアウト
│   ├── modal.tsx
│   ├── player.tsx
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
import { View, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

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
  const theme = useTheme();

  const styles = {
    container: {
      paddingVertical: 12,
      paddingHorizontal: insetHorizontal,
      gap: 8,
    },
    message: {
      fontSize: 14,
      color: theme.colors.text,
      opacity: 0.7,
      marginBottom: 4,
    },
    band: {
      height: 12,
      backgroundColor: theme.colors.notification,
      borderRadius: 4,
      opacity: 0.6,
    },
  };

  return (
    <View style={styles.container}>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {Array.from({ length: Math.max(0, lines) }).map((_, idx) => (
        <View key={idx} style={styles.band} />
      ))}
    </View>
  );
}
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

### 実装パターン（3種類）

#### パターン1: セクション全体が読み込み中

```typescript
// Before: セクションが表示されない
{trendingArticlesData.length === 0 && (
  // 何も表示しない
)}

// After: プレースホルダー表示
{sectionsLoading ? (
  <SectionPlaceholder
    message="トレンド記事を読み込み中..."
    lines={3}
    insetHorizontal={16}
  />
) : (
  <TrendingCarousel articles={trendingArticles} />
)}
```

#### パターン2: セクションタイトル + プレースホルダー

```typescript
// Before: タイトルなし、セクション非表示
{articleCount === 0 && null}

// After: タイトル常時表示、読み込み中はプレースホルダー
<SectionHeader title="パーソナライズ記事" />
{sectionsLoading ? (
  <SectionPlaceholder
    message="記事を準備中..."
    lines={2}
    insetHorizontal={16}
  />
) : (
  <PersonalizedGrid articles={personalizedArticles} />
)}
```

#### パターン3: 複数アイテムの段階的読み込み

```typescript
// Before: リストが完成するまで待機
{displayedArticles.map((article) => (
  <ArticleCard key={article.id} article={article} />
))}

// After: 枠は常時表示、不足分はプレースホルダー
const allSlots = 10; // 常に10件の枠を表示
const placeholderCount = Math.max(0, allSlots - displayedArticles.length);

{displayedArticles.map((article) => (
  <ArticleCard key={article.id} article={article} />
))}

{placeholderCount > 0 && (
  Array.from({ length: placeholderCount }).map((_, idx) => (
    <SectionPlaceholder key={`placeholder-${idx}`} lines={2} />
  ))
)}
```

---

## 📋 実装チェックリスト

### 【ステップ1】ファイル確認

```
index.tsx の場所を確認:
  ✓ audion-app-fresh/app/(tabs)/index.tsx
  ✓ ブランチが main
  ✓ ファイルサイズ約 48KB
```

### 【ステップ2】インポート追加

`index.tsx` の先頭（他のインポートの近くに）に以下を追加：

```typescript
import SectionPlaceholder from '../../components/common/SectionPlaceholder';
```

### 【ステップ3】読み込み状態の確認

既存の state を確認（すでに存在する可能性が高い）：

```typescript
// Line 93: 既存
const [sectionsLoading, setSectionsLoading] = useState(false);

// その他の state
const [trendingArticlesData, setTrendingArticlesData] = useState<Article[]>([]);
const [personalizedArticlesData, setPersonalizedArticlesData] = useState<Article[]>([]);
```

### 【ステップ4】UI に統合

各セクション毎に以下のパターンで統合（例：HeroCarousel セクション）：

```typescript
// 既存コード付近（Line 772 あたり）
{heroLoading ? (
  <SectionPlaceholder
    message="ヒーロー記事を読み込み中..."
    lines={3}
    insetHorizontal={16}
  />
) : (
  <HeroCarousel articles={heroArticles} onArticlePress={handleArticleSelect} />
)}
```

### 【ステップ5】テスト

```bash
# ローカルで起動
npx expo start --clear --tunnel

# 確認項目:
# 1. 画面初期化時にプレースホルダーが表示される
# 2. データ読み込み完了後に実データが表示される
# 3. スクロール時の下部セクションもプレースホルダーが表示される
# 4. テーマ色がプレースホルダーに反映されている
```

---

## ⚠️ 実装時の注意点

### 注意1: state 管理

```typescript
// ❌ しない: 単にデータ有無で判定
{articles.length === 0 && <SectionPlaceholder />}

// ✅ する: 明示的に読み込み状態を管理
const [isLoading, setIsLoading] = useState(true);
useEffect(() => {
  fetchArticles().finally(() => setIsLoading(false));
}, []);

{isLoading && !articles.length && <SectionPlaceholder />}
{isLoading && articles.length > 0 && <ArticleList />}
{!isLoading && articles.length === 0 && <EmptyState />}
```

### 注意2: useTheme の使用

```typescript
// SectionPlaceholder は useTheme() を使用
// 必ず NavigationContainer または同等の Provider 内で使用

// ✅ 正しい: _layout.tsx か NavigationContainer 内コンポーネント
export default function TabLayout() {
  return (
    <NavigationContainer>
      <SectionPlaceholder ... />  // OK
    </NavigationContainer>
  );
}

// ❌ 間違い: Provider の外
<View>
  <SectionPlaceholder ... />  // useTheme がエラー
</View>
```

### 注意3: パフォーマンス

```typescript
// ❌ しない: 毎回新しいスタイルを作成
<SectionPlaceholder style={{ paddingHorizontal: 16 }} />

// ✅ する: スタイルを定数化
const placeholderStyle = { paddingHorizontal: 16 };
<SectionPlaceholder style={placeholderStyle} />

// または useCallback で関数メモ化
const renderPlaceholder = useCallback(() => (
  <SectionPlaceholder lines={3} />
), []);
```

### 注意4: セクションサイズの統一

```typescript
// プレースホルダーの高さが実データの高さと近いようにする
// 例: HeroCarousel が 200px なら、プレースホルダーも約 200px に

{isLoading ? (
  <View style={{ height: 200 }}>  // HeroCarousel と同じ高さ
    <SectionPlaceholder lines={3} />
  </View>
) : (
  <HeroCarousel articles={articles} />  // 高さ 200px
)}
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

