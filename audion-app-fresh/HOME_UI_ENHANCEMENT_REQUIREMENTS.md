# 📱 Home UI Enhancement 要件定義書 v1.0

**作成日**: 2025-01-27
**対象プロジェクト**: Audion アプリ
**開発フェーズ**: Phase 1 基盤実装

---

## 🎯 PLAN（開発計画）

- **目的**: HomeタブのUIを多様化し、ユーザーエンゲージメントを向上させる
- **影響範囲**:
  - フロントエンド: `app/(tabs)/index.tsx`, `components/`, `hooks/useCuratedFeed.ts`, `utils/genreUtils.ts`
  - バックエンド: 新規API追加（`/api/news-sources/`, `/api/engagement/`）
- **契約変更**: 新規APIエンドポイント追加（既存API変更なし）
- **テスト方針**: 新規コンポーネントの単体テスト + 統合テスト
- **非ゴール**: Feed UI の変更、既存API の破壊的変更、認証システムの変更

---

## 📋 1. プロジェクト概要

### 1.1 背景・課題
**現状の問題**:
- Homeタブが「ヒーロー・注目・一般」の3セクション構成で単調
- 全ジャンルで同一レイアウトのため、ジャンル特化時の情報効率が悪い
- 一般記事カードが120px高で情報密度が低い
- エンゲージメント機能（いいね・視聴数・コメント）が不足

**目指すUX**:
- ジャンル別に最適化された情報密度
- エンゲージメント要素の追加によるユーザー参加促進
- 視覚的多様性による飽きの防止

### 1.2 開発ガイドライン準拠事項
- **小さく頻繁に**: Phase 1（基盤）→ Phase 2（エンゲージメント）→ Phase 3（高度機能）
- **API契約の固さ**: OpenAPI準拠、既存API非破壊
- **セキュリティ**: 認証システム変更なし、新規機能は既存認証を使用
- **テスト戦略**: ユニット（多）→ コンポーネント → E2E（少）

---

## 🏗️ 2. アーキテクチャ設計

### 2.1 3層分離アーキテクチャ

```yaml
NEWS_SOURCE_LAYERS:

  # Layer 1: 緊急API（将来実装）
  EMERGENCY_LAYER:
    purpose: 緊急速報専用
    sources: [気象庁API, J-ALERT, 内閣府防災API]
    display: Breaking Newsセクション（条件付き表示）
    phase: Phase 3で実装

  # Layer 2: 固定RSS（運営管理）
  FIXED_RSS_LAYER:
    purpose: Home基本コンテンツ
    sources: [NHK, 朝日新聞, 読売新聞, 日経新聞, ITmedia, CNET]
    display: 全セクション（Hero/おすすめ/注目/一般）
    control: ユーザー設定で表示/非表示
    phase: Phase 1で実装

  # Layer 3: ユーザーRSS（個人管理）
  USER_RSS_LAYER:
    purpose: Feed専用コンテンツ
    sources: ユーザー追加RSS
    display: Feedタブのみ
    control: 完全ユーザー管理
    phase: 既存（変更なし）
```

### 2.2 UI構成パターン

```yaml
UI_PATTERNS:

  # Pattern A: 「すべて」ジャンル（多様性重視）
  ALL_GENRE_LAYOUT:
    target: ホーム画面のデフォルト表示
    sections:
      - Hero: エンゲージメント上位5記事（横スクロール・既存流用）
      - おすすめ: エンゲージメント6-9位（2×2グリッド・新規）
      - 注目: アプリ内視聴数上位（横スクロール・新規）
      - ジャンルフィルター: 一般セクション用（位置変更）
      - 一般: フィルタ適用記事（縦無限スクロール・60px縮小）

  # Pattern B: 「専門ジャンル」（効率性重視）
  SPECIFIC_GENRE_LAYOUT:
    target: 政治、テクノロジー、スポーツ等の専門ジャンル
    sections:
      - おすすめ: そのジャンル内エンゲージメント上位（2×2グリッド）
      - 注目: そのジャンル内視聴数上位（横スクロール）
      - 一般: そのジャンル記事のみ（縦無限スクロール・60px）
```

---

## 🔧 3. 技術仕様

### 3.1 フロントエンド新規コンポーネント

#### 3.1.1 CompactCard（60px高・一般記事用）
```typescript
// components/CompactCard.tsx
interface CompactCardProps {
  article: Article;
  onPress: (article: Article) => void;
  showEngagement?: boolean; // Phase 2で追加
}

// サイズ仕様
const COMPACT_CARD_HEIGHT = 60; // 現在120px → 60px
const THUMBNAIL_SIZE = 50;      // 現在120px → 50px
```

#### 3.1.2 PersonalizedGrid（2×2おすすめ用）
```typescript
// components/PersonalizedGrid.tsx
interface PersonalizedGridProps {
  articles: Article[4]; // 固定4記事
  onArticlePress: (article: Article) => void;
  showConfidenceScore?: boolean; // AI推奨度表示
}

// レイアウト仕様
const GRID_CONTAINER_HEIGHT = 200;
const GRID_ITEM_HEIGHT = 90;
const GRID_ITEM_WIDTH = "48%"; // 2×2グリッド
```

#### 3.1.3 TrendingCarousel（注目記事用）
```typescript
// components/TrendingCarousel.tsx
interface TrendingCarouselProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  showMetrics?: boolean; // 視聴数・いいね数表示
}

// 表示仕様
const TRENDING_CONTAINER_HEIGHT = 140;
const TRENDING_CARD_WIDTH = 120;
```

### 3.2 バックエンド新規API

#### 3.2.1 エンゲージメント管理API
```python
# backend/routers/engagement.py
@router.get("/articles/hero", response_model=List[ArticleResponse])
async def get_hero_articles(limit: int = 5):
    """エンゲージメント上位記事取得（Hero用）"""
    pass

@router.get("/articles/trending", response_model=List[ArticleResponse])
async def get_trending_articles(
    genre: Optional[str] = None,
    limit: int = 10
):
    """注目記事取得（アプリ内エンゲージメント上位）"""
    pass

@router.get("/articles/personalized", response_model=List[ArticleResponse])
async def get_personalized_articles(
    user: User = Depends(get_current_user),
    genre: Optional[str] = None,
    limit: int = 4
):
    """パーソナライズド記事取得（おすすめ用）"""
    pass
```

#### 3.2.2 固定RSS管理API
```python
# backend/routers/news_sources.py
@router.get("/fixed", response_model=List[FixedRSSSourceResponse])
async def get_fixed_rss_sources(
    user: User = Depends(get_current_user),
    category: Optional[str] = None
):
    """固定RSSソース一覧取得（ユーザー設定反映）"""
    pass

@router.put("/fixed/{source_id}/visibility")
async def update_fixed_rss_visibility(
    source_id: str,
    visibility: bool,
    user: User = Depends(get_current_user)
):
    """固定RSSの表示/非表示切替"""
    pass
```

### 3.3 データベース拡張

#### 3.3.1 固定RSS管理テーブル
```python
# backend/models/fixed_rss.py
class FixedRSSSource(BaseModel):
    id: str
    name: str
    url: str
    category: Literal['news', 'tech', 'economy', 'sports']
    reliability_score: float = Field(ge=0.0, le=1.0)
    is_enabled_globally: bool = True
    default_user_visibility: bool = True
    emergency_only: bool = False

class UserRSSPreference(BaseModel):
    user_id: str
    fixed_rss_id: str
    is_visible: bool = True
    priority_level: int = Field(ge=1, le=5, default=3)
```

#### 3.3.2 エンゲージメント追跡テーブル
```python
# backend/models/engagement.py
class ArticleEngagement(BaseModel):
    article_id: str
    view_count: int = 0
    audio_generation_count: int = 0
    like_count: int = 0           # Phase 2で実装
    share_count: int = 0          # Phase 2で実装
    engagement_score: float = 0.0
    last_updated: datetime
```

---

## 📊 4. 実装フェーズ

### 4.1 Phase 1: 基盤実装（3週間）【今回実装範囲】

#### Week 1: コンポーネント基盤
- ✅ CompactCard コンポーネント作成（60px高）
- ✅ PersonalizedGrid コンポーネント作成（2×2グリッド）
- ✅ TrendingCarousel コンポーネント作成（横スクロール）
- ✅ Pattern B（専門ジャンル）レイアウト実装

#### Week 2: バックエンドAPI
- ✅ engagement.py API実装
- ✅ news_sources.py API実装
- ✅ エンゲージメント計算ロジック実装
- ✅ 固定RSS管理システム実装

#### Week 3: 統合・テスト
- ✅ Pattern A（すべてジャンル）レイアウト実装
- ✅ useCuratedFeed フック更新
- ✅ 既存genreUtils統合
- ✅ 単体テスト・統合テスト実装

### 4.2 Phase 2: エンゲージメント強化（4週間）【将来実装】
- いいね・シェア機能実装
- コメントシステム実装
- ユーザープロフィール・フォロー機能
- プッシュ通知システム

### 4.3 Phase 3: 高度機能（5週間）【将来実装】
- 緊急速報システム（官公庁API連携）
- AI個人化推奨強化
- リアルタイム更新システム
- A/Bテスト・アナリティクス

---

## 🧪 5. テスト戦略

### 5.1 ユニットテスト
```typescript
// __tests__/components/CompactCard.test.tsx
describe('CompactCard', () => {
  it('should render article with correct height', () => {
    // 60px高の検証
  });

  it('should handle press events', () => {
    // タップイベントの検証
  });
});

// __tests__/components/PersonalizedGrid.test.tsx
describe('PersonalizedGrid', () => {
  it('should render 4 articles in 2x2 grid', () => {
    // 2×2レイアウトの検証
  });
});
```

### 5.2 統合テスト
```python
# tests/test_engagement_api.py
def test_get_hero_articles():
    """Hero記事取得APIのテスト"""
    response = client.get("/api/engagement/articles/hero")
    assert response.status_code == 200
    assert len(response.json()) <= 5

def test_get_trending_articles():
    """注目記事取得APIのテスト"""
    response = client.get("/api/engagement/articles/trending?genre=政治")
    assert response.status_code == 200
```

### 5.3 E2Eテスト
```typescript
// e2e/home-ui.spec.ts
describe('Home UI Enhancement', () => {
  it('should display different layouts for all vs specific genres', async () => {
    // 「すべて」と「政治」の表示切り替えテスト
  });

  it('should load trending articles in carousel', async () => {
    // 注目記事カルーセルの動作テスト
  });
});
```

---

## 🔒 6. セキュリティ考慮事項

### 6.1 認証・認可
- **既存認証システムを維持**: JWT Bearer認証継続使用
- **新規API認証**: 固定RSS管理・エンゲージメント取得にユーザー認証必須
- **権限分離**: 運営管理機能（固定RSS設定）と一般ユーザー機能を明確分離

### 6.2 データ保護
```python
# エンゲージメントデータのプライバシー保護
class EngagementResponse(BaseModel):
    article_id: str
    engagement_score: float  # 正規化済み数値（生データ非公開）
    # view_count等の生データは管理者のみアクセス可能
```

### 6.3 レート制限
```python
# API レート制限（DDoS対策）
@limiter.limit("100/minute")
@router.get("/articles/trending")
async def get_trending_articles():
    pass
```

---

## 📈 7. パフォーマンス目標

### 7.1 レスポンス時間
- **Hero記事取得**: < 500ms
- **注目記事取得**: < 300ms
- **個人化記事取得**: < 800ms
- **ページ全体読み込み**: < 2秒

### 7.2 UI パフォーマンス
- **CompactCard描画**: < 16ms（60FPS維持）
- **グリッドレイアウト**: < 100ms初期表示
- **カルーセルスクロール**: 滑らか（ドロップフレームなし）

### 7.3 キャッシュ戦略
```python
# Redis キャッシュ設定
CACHE_SETTINGS = {
    "hero_articles": 1800,        # 30分キャッシュ
    "trending_articles": 3600,    # 1時間キャッシュ
    "personalized_articles": 1800 # 30分キャッシュ
}
```

---

## 🚨 8. リスク分析・軽減策

### 8.1 技術リスク

| リスク | 影響度 | 発生確率 | 軽減策 |
|--------|--------|----------|--------|
| 既存API破壊 | 高 | 低 | 新規API分離、既存API変更禁止 |
| パフォーマンス劣化 | 中 | 中 | キャッシュ戦略、段階的リリース |
| UI/UX 混乱 | 中 | 中 | A/Bテスト、ユーザーフィードバック |

### 8.2 開発リスク

| リスク | 影響度 | 発生確率 | 軽減策 |
|--------|--------|----------|--------|
| スケジュール遅延 | 中 | 中 | MVP機能優先、段階的実装 |
| 品質低下 | 高 | 低 | 自動テスト、コードレビュー必須 |
| チーム間連携不足 | 中 | 中 | 定期同期、API仕様書共有 |

---

## 📋 9. 完成定義（Definition of Done）

### 9.1 機能要件
- ✅ Pattern A（すべて）とPattern B（専門）の両UI実装完了
- ✅ CompactCard（60px）で情報密度向上を実現
- ✅ PersonalizedGrid（2×2）でおすすめ記事表示
- ✅ TrendingCarousel で注目記事横スクロール表示
- ✅ 既存ジャンルフィルタリングと統合

### 9.2 非機能要件
- ✅ 全APIレスポンス時間が目標値以内
- ✅ ユニットテストカバレッジ > 80%
- ✅ E2Eテスト主要シナリオ完了
- ✅ パフォーマンステスト合格

### 9.3 品質要件
- ✅ セキュリティ監査完了
- ✅ アクセシビリティ基準準拠
- ✅ Cross-platform動作確認（iOS/Android/Web）
- ✅ ドキュメント更新完了

---

## 📞 10. 連絡先・承認者

**要件定義承認者**: プロダクトオーナー
**技術仕様承認者**: テックリード
**実装担当**: Claude Code + 開発チーム
**QA担当**: QAエンジニア

---

**承認状況**: 🟡 承認待ち
**最終更新**: 2025-01-27