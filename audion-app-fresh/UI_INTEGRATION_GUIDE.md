# UI Integration Guide
*Audion App 最新アーキテクチャ・統合機能ガイド*

## 🎯 Feed表示アーキテクチャ (2025年1月更新)

### 統一されたFeed表示系
```typescript
// メインFeedタブ（articles.tsx）
articles.tsx → useUserFeed → CleanFeedUI → UnifiedArticleList → ArticleCard

// Homeタブ（固定RSS）
index.tsx → useCuratedFeed → TrendingCarousel/PersonalizedGrid → CompactCard
```

### ManualPick機能 (2025年1月実装)
```typescript
// Feedタブ既読記事でのManualPick
// 条件: isFeedTab && isRead && showManualPickIcon
<ArticleCard 
  isFeedTab={true}
  showManualPickIcon={true}
  onManualPick={handleManualPickIcon}
  // ... 既読アイコンの左隣に音楽ノートアイコン表示
/>
```

## 🔄 RSS管理システム

### 軽量化されたContext
```typescript
// RSSFeedContext.tsx - useUserFeedベース
interface RSSFeedContextType {
  userSources: UserRSSSource[];
  fetchRSSData: () => Promise<void>; // fetchUserSourcesのエイリアス
}

// Settings/Schedule画面での利用
const { userSources, fetchRSSData } = useRSSFeedContext();
```

### 自動更新フロー
```typescript
// Settings変更 → Feed自動反映
Settings → RSSChangeNotifier.notify*() → useUserFeed購読 → Feed更新
```

## 📊 新機能統合API

### ArticleService - Home UI用メソッド
```typescript
// セクション別記事取得（Phase 4で使用）
const sections = await ArticleService.getIntegratedArticlesBySection('balanced_mix');

// 返り値の構造
{
  hero: ClassifiedArticle[];      // ヒーローセクション用（緊急度最高3件）
  breaking: ClassifiedArticle[];  // 速報セクション用（緊急情報5件）
  trending: ClassifiedArticle[];  // トレンドセクション用（人気記事10件）
  personalized: ClassifiedArticle[]; // パーソナルセクション用（個人化8件）
  latest: ClassifiedArticle[];    // 最新セクション用（一般記事15件）
}
```

### 戦略的フィード取得
```typescript
// 4つの配信戦略から選択
const strategies = ArticleService.getAvailableMixStrategies();
// → ['breaking_focus', 'balanced_mix', 'personalized_focus', 'quality_focus']

// 統合フィード取得
const feed = await ArticleService.getIntegratedFeed('breaking_focus', userId);
```

## 📊 分類済み記事型（ClassifiedArticle）

### 基本Article型 + 分類情報
```typescript
interface ClassifiedArticle extends Article {
  classification?: {
    emergencyLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    emergencyScore: number;      // 0-100
    trendingScore: 0 | 1 | 2 | 3 | 4 | 5;
    category: 'emergency' | 'trending' | 'personalized' | 'latest';
    categoryConfidence: number;  // 0-1
    keywords: string[];         // マッチしたキーワード
  };
}
```

### UI表示での活用方法
```typescript
// 緊急度バッジ表示
{article.classification?.emergencyLevel === 'critical' && (
  <EmergencyBadge level="critical" />
)}

// トレンドスコア表示
{article.classification?.trendingScore >= 4 && (
  <TrendingIndicator score={article.classification.trendingScore} />
)}

// カテゴリ別スタイリング
const cardStyle = getCardStyleByCategory(article.classification?.category);
```

## 🎨 UI実装のセクション対応

### Hero Carousel
- **データソース**: `sections.hero`（3件）
- **特徴**: 緊急度critical/highの記事を大きく表示
- **既存コンポーネント**: `HeroCarousel.tsx`を拡張

### Breaking News
- **データソース**: `sections.breaking`（5件）
- **特徴**: 速報・緊急情報をCompactCard形式で表示
- **新規コンポーネント**: `CompactCard.tsx`（実装済み）

### Trending
- **データソース**: `sections.trending`（10件）
- **特徴**: トレンドスコア高の記事を横スクロール
- **新規コンポーネント**: `TrendingCarousel.tsx`（実装済み）

### Personalized
- **データソース**: `sections.personalized`（8件）
- **特徴**: ユーザー嗜好に基づく記事を2列グリッド
- **新規コンポーネント**: `PersonalizedGrid.tsx`（実装済み）

### Latest
- **データソース**: `sections.latest`（15件）
- **特徴**: 一般記事を縦リスト表示
- **既存コンポーネント**: `ArticleCard.tsx`を使用

## ⚡ パフォーマンス考慮

### キャッシュ戦略
- RSS統合データ: 5分キャッシュ
- 緊急情報: 2分キャッシュ
- キュレーション記事: 30分キャッシュ

### エンゲージメント追跡
```typescript
// 記事表示時
await ArticleService.recordEngagement({
  articleId: article.id,
  eventType: 'view',
  duration: viewDuration,
  userId: currentUserId
});
```

## 🔧 開発時のトラブルシューティング

### よくある問題
1. **undefined classification**: 記事が分類前 → `getIntegratedArticlesBySection`を使用
2. **空のセクション**: 戦略設定 → `'balanced_mix'`がデフォルト推奨
3. **パフォーマンス**: 大量記事 → セクション別limit設定済み

### デバッグ用
```typescript
// データソース統計確認
const stats = await ArticleService.getDataSourceStatistics();
console.log('RSS Data Sources:', stats);

// 戦略詳細確認
const strategy = ArticleService.getMixStrategy('balanced_mix');
console.log('Mix Strategy:', strategy);
```

---
*この文書はPhase 4 UI実装中に随時更新*