# Audion UI 編集ガイド - SectionPlaceholder 統合方針

**対象**: Claude Code（Codex）での UI 編集作業
**目的**: SectionPlaceholder コンポーネントを Home/Feed に統合
**ブランチ**: main（統一済み）

---

## 🎯 このガイドの目的

ブランチ乖離により UI 編集が困難だった問題を解決するために、以下を提供します：

1. **ファイル構造の明確化**
2. **SectionPlaceholder 統合の実装方針**
3. **実装時の注意点**
4. **テスト方法**
5. **コードレビューチェックリスト**

---

## 📁 ファイル構造（統一済み）

```
audion-app-fresh/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          ← Tab レイアウト定義
│   │   ├── index.tsx            ← Home 画面
│   │   ├── feed.tsx             ← Feed 画面 ⭐ ターゲット
│   │   └── discover.tsx         ← Discover 画面
│   ├── _layout.tsx              ← Root レイアウト
│   └── +not-found.tsx           ← 404 ページ
│
├── components/
│   ├── common/
│   │   └── SectionPlaceholder.tsx  ← 対象コンポーネント ⭐
│   ├── CleanFeedUI.tsx
│   ├── ArticleCard.tsx
│   ├── HeroCarousel.tsx
│   ├── TrendingCarousel.tsx
│   ├── UnifiedHeader.tsx
│   └── SkeletonComponents.tsx
│
├── services/
│   ├── api.ts                    ← API 設定
│   ├── ArticleService.ts         ← 記事取得
│   └── AudioService.ts           ← 音声生成
│
├── config/
│   ├── api.ts                    ← API URL・タイムアウト設定
│   └── theme.ts                  ← テーマ設定
│
├── app.json
├── package.json
├── tsconfig.json
└── .env.development              ← タイムアウト設定
```

---

## 🎨 SectionPlaceholder コンポーネント

### コンポーネント定義

**ファイル**: `components/common/SectionPlaceholder.tsx`

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

interface SectionPlaceholderProps {
  message?: string;
  lines?: number;
  insetHorizontal?: number;
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

### 使用パターン

```typescript
// パターン1: メッセージ + スケルトンバー
<SectionPlaceholder message="記事を読み込み中..." lines={3} />

// パターン2: スケルトンバーのみ
<SectionPlaceholder lines={5} />

// パターン3: インセット付き（カード風）
<SectionPlaceholder message="トレンドを読み込み中..." lines={2} insetHorizontal={16} />
```

---

## 🔧 統合実装方針

### 統合対象: feed.tsx

**ファイル**: `app/(tabs)/feed.tsx`

### 実装箇所（セクション毎）

Feed 画面は通常、複数のセクション（Section）で構成されています：

1. **Header セクション** - タイトル・フィルター
2. **Trending セクション** - トレンド記事
3. **Articles セクション** - メイン記事リスト
4. **Each Article Card** - 記事カード

### 実装パターン

#### パターン1: セクション全体が読み込み中

```typescript
// Before: セクションが表示されない
{trendingArticles.length === 0 && (
  // 何も表示しない
)}

// After: プレースホルダー表示
{isLoadingTrending ? (
  <SectionPlaceholder
    message="トレンド記事を読み込み中..."
    lines={3}
    insetHorizontal={16}
  />
) : (
  <TrendingCarousel articles={trendingArticles} />
)}
```

#### パターン2: リスト内の個別アイテム

```typescript
// Before: リストが空なら何も表示
{articles.length === 0 && (
  // 何も表示しない
)}

// After: スケルトン表示
{articles.map((article) => (
  <ArticleCard key={article.id} article={article} />
))}

{isLoadingMore && (
  <View style={{ marginTop: 16 }}>
    <SectionPlaceholder lines={2} insetHorizontal={16} />
  </View>
)}
```

#### パターン3: セクション内の複数アイテム

```typescript
// Before: 最初の数個だけ表示、後から読み込み
{displayArticles.map((article) => (
  <ArticleCard key={article.id} article={article} />
))}

// After: 枠は常に表示、読み込み中はプレースホルダー
{displayArticles.length > 0 ? (
  displayArticles.map((article) => (
    <ArticleCard
      key={article.id}
      article={article}
      loading={loadingArticleIds.includes(article.id)}
    />
  ))
) : (
  // 記事がない場合のプレースホルダー
  <SectionPlaceholder
    message="記事がまだ読み込まれていません"
    lines={4}
  />
)}
```

---

## 📋 実装チェックリスト

### 【ステップ1】ファイル確認

```
feed.tsx の場所を確認:
  ✓ app/(tabs)/feed.tsx
  ✓ ブランチが main
  ✓ audion-app-fresh/ 内にある
```

### 【ステップ2】インポート追加

```typescript
// feed.tsx の先頭に追加
import SectionPlaceholder from '@/components/common/SectionPlaceholder';
```

### 【ステップ3】読み込み状態の管理

各セクションに「読み込み状態」を追跡する state を追加：

```typescript
// 例: Trending セクション
const [isLoadingTrending, setIsLoadingTrending] = useState(true);
const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);

useEffect(() => {
  setIsLoadingTrending(true);
  fetchTrendingArticles()
    .then(setTrendingArticles)
    .finally(() => setIsLoadingTrending(false));
}, []);
```

### 【ステップ4】UI に統合

各セクション毎に以下のパターンで統合：

```typescript
{isLoadingTrending ? (
  <SectionPlaceholder
    message="トレンド記事を読み込み中..."
    lines={3}
    insetHorizontal={16}
  />
) : trendingArticles.length > 0 ? (
  <TrendingCarousel articles={trendingArticles} />
) : (
  <View style={{ padding: 16 }}>
    <Text style={{ color: theme.colors.text, opacity: 0.6 }}>
      トレンド記事がありません
    </Text>
  </View>
)}
```

### 【ステップ5】テスト

```bash
# ローカルで起動
cd audion-app-fresh
npx expo start

# 確認項目:
# 1. 画面初期化時にプレースホルダーが表示される
# 2. データ読み込み完了後に実データが表示される
# 3. エラー時に適切なメッセージが表示される
# 4. スクロール時に下部のプレースホルダーが表示される
```

---

## ⚠️ 実装時の注意点

### 注意1: state 管理

```typescript
// ❌ しない: 単にデータ有無で判定
{articles.length === 0 && <SectionPlaceholder />}

// ✅ する: 明示的に読み込み状態を管理
{isLoading && !articles.length && <SectionPlaceholder />}
{isLoading && articles.length > 0 && <ArticleList />}
{!isLoading && articles.length === 0 && <EmptyState />}
```

### 注意2: テーマ設定

```typescript
// SectionPlaceholder は useTheme() を使用
// 必ず useTheme の Provider 内で使用
import { useTheme } from '@react-navigation/native';

// 別のテーマシステムを使っている場合は調整
const theme = useTheme();
// または
const colors = useContext(ThemeContext);
```

### 注意3: パフォーマンス

```typescript
// ❌ しない: 毎回新しいスタイルを作成
<SectionPlaceholder style={{ paddingHorizontal: 16 }} />

// ✅ する: 定数化またはメモ化
const placeholderStyle = useMemo(
  () => ({ paddingHorizontal: 16 }),
  []
);
<SectionPlaceholder style={placeholderStyle} />
```

### 注意4: アクセシビリティ

```typescript
// ✅ loading 状態を a11y に伝える
<View
  accessible={true}
  accessibilityLabel="読み込み中"
  accessibilityLiveRegion="polite"
>
  <SectionPlaceholder message="読み込み中..." />
</View>
```

---

## 🔍 コードレビューチェックリスト

実装完了後、以下を確認してください：

### 【コード品質】
- [ ] TypeScript の型チェック通過（`npx tsc --noEmit`）
- [ ] ESLint ルール準拠（`npx eslint app/(tabs)/feed.tsx`）
- [ ] 不要な import が削除されている
- [ ] console.log などの debug コードがない

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
- [ ] 大量記事リスト（100+）でも動作スムーズ

### 【アクセシビリティ】
- [ ] スクリーンリーダーで読み込み状態が伝わる
- [ ] キーボードナビゲーションが動作
- [ ] テキストサイズ拡大時に崩れない

---

## 📝 コミット メッセージ例

実装完了後のコミット：

```
feat: integrate SectionPlaceholder into Feed screen sections

実装内容:
- SectionPlaceholder を feed.tsx に統合
- Trending セクション: 読み込み中にスケルトン表示
- Articles セクション: 記事読み込み時にプレースホルダー表示
- Infinite scroll: 下部読み込み時にプレースホルダー表示

パターン:
- セクション全体読み込み: message + lines=3
- リストアイテム: message なし + lines=2
- エラー時: カスタムメッセージ表示

テスト:
- ローカル起動で各セクションのプレースホルダー確認
- ネットワーク遅延シミュレーション時に動作確認
- 複数セクション同時読み込みで正常表示確認
```

---

## 🚀 実装フロー（推奨）

### Step 1: 環境準備
```bash
git status  # main ブランチであることを確認
cd audion-app-fresh
npm install  # 必要に応じて
```

### Step 2: feed.tsx 分析
- feed.tsx を開く
- セクション構造を理解（何個のセクションがあるか）
- 各セクションの読み込みロジックを確認

### Step 3: 段階的実装
1. 最初のセクション（例: Trending）で実装
2. テストして動作確認
3. 次のセクション（例: Articles）を実装
4. 全セクション完了後に GitHub push

### Step 4: テスト・レビュー
```bash
npx tsc --noEmit  # TypeScript チェック
npx eslint app/(tabs)/feed.tsx  # ESLint チェック
npx expo start  # ローカルテスト
```

### Step 5: コミット
```bash
git add audion-app-fresh/app/(tabs)/feed.tsx
git commit -m "feat: integrate SectionPlaceholder into Feed sections"
git push origin main
```

---

## 📚 関連ドキュメント

- `docs/QUICK_REFERENCE.md` - 全体的なクイックリファレンス
- `docs/BRANCH_CLEANUP_AND_FIXES_SUMMARY.md` - ブランチ統一の詳細
- `docs/INCIDENT_ANALYSIS_AND_PREVENTION.md` - 問題分析と再発防止

---

## 💬 Q&A

### Q: SectionPlaceholder をカスタマイズしたい場合は？

A: `components/common/SectionPlaceholder.tsx` を直接編集：
```typescript
// 例: アニメーション追加
import { useSharedValue } from 'react-native-reanimated';

export default function SectionPlaceholder(...) {
  const opacity = useSharedValue(0.6);
  // アニメーション実装
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

### Q: 他の記事アプリではどんなプレースホルダーを使っている？

A: 一般的なパターン：
```typescript
// パターン1: Skeleton UI（スケルトンバー）- 本実装
<SectionPlaceholder lines={3} />

// パターン2: Pulse / Shimmer アニメーション
// リアルなローディング表現だが、実装複雑

// パターン3: Spinner
// シンプルだが、空間占有が異なる
```

---

## ✅ 実装完了チェックリスト

最終確認用：

- [ ] feed.tsx がメイン（audion-app-fresh/app/(tabs)/feed.tsx）
- [ ] SectionPlaceholder が import されている
- [ ] 各セクションで読み込み状態が管理されている
- [ ] UI に条件分岐で SectionPlaceholder が統合されている
- [ ] TypeScript コンパイル通過（`npx tsc --noEmit`）
- [ ] ESLint 通過（`npx eslint app/(tabs)/feed.tsx`）
- [ ] ローカルで動作確認（プレースホルダー表示）
- [ ] ネットワーク遅延時でも正常表示
- [ ] GitHub push 完了

---

**このガイドを参考に、SectionPlaceholder 統合を進めてください！**

質問や問題があれば、上記の Q&A や関連ドキュメントを参照してください。

