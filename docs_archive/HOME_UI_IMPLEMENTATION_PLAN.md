# HOME UI 強化機能 実装計画書
**作成日**: 2025年1月27日
**対象機能**: Homeタブ UI強化・3層RSS対応・エンゲージメント向上

## 📋 実装概要

### 目標
- 単調なニュース表示からセクション型UI（英雄カルーセル、速報、パーソナライズ、トレンド、最新）への移行
- 3層RSS（緊急API、固定RSS、ユーザーRSS）対応
- 依存性ループによるユーザーエンゲージメント向上

### スコープ
- **対象**: `audion-app-fresh/` フロントエンド実装のみ
- **除外**: バックエンドの破壊的変更、既存認証・サブスクリプション機能

## 🎯 段階的実装戦略

### Phase 1: 基盤コンポーネント構築 (1-2日)
**目標**: 新UIコンポーネントの作成と既存システムとの統合

#### 1.1 新規コンポーネント作成
```typescript
// 優先度: 最高
1. CompactCard.tsx - コンパクトニュースカード（速報・パーソナライズ用）
2. PersonalizedGrid.tsx - パーソナライズ記事グリッド表示
3. TrendingCarousel.tsx - トレンド記事カルーセル
4. SectionHeader.tsx - セクションヘッダー共通コンポーネント
```

#### 1.2 実装手順
```bash
# 1. ベースディレクトリ確認
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app-fresh

# 2. 既存コンポーネント分析
ls -la components/
# → ArticleCard.tsx, HeroCarousel.tsx, SmallArticleCard.tsx を参考

# 3. 新規コンポーネント作成
touch components/CompactCard.tsx
touch components/PersonalizedGrid.tsx
touch components/TrendingCarousel.tsx
touch components/SectionHeader.tsx

# 4. 型定義拡張
# types/ui.ts に新規UI型定義を追加
```

#### 1.3 検証項目
- [ ] 既存ArticleCard.tsxとの一貫性確保
- [ ] スタイル体系（StyleSheet）の継承
- [ ] 暗黒テーマ対応確認
- [ ] TypeScript型安全性検証

### Phase 2: 記事分類・スコアリングシステム (2-3日)
**目標**: 記事の自動分類とエンゲージメントスコア算出

#### 2.1 新規サービス作成
```typescript
// services/ArticleCategorizationService.ts
- 緊急度判定（キーワードベース）
- ジャンル分類精度向上
- エンゲージメントスコア算出
- パーソナライズ要因分析
```

#### 2.2 実装手順
```bash
# 1. サービスファイル作成
touch services/ArticleCategorizationService.ts
touch services/EngagementScoreService.ts

# 2. 既存ArticleService.tsxとの統合点確認
grep -r "getCuratedArticles" services/
grep -r "Article" types/

# 3. キーワード辞書定義
touch data/emergency-keywords.json
touch data/trending-keywords.json
```

#### 2.3 検証項目
- [ ] 既存Article型との互換性
- [ ] パフォーマンス影響（100件記事での処理時間）
- [ ] スコア計算精度の手動検証

### Phase 3: 3層RSS統合システム (3-4日)
**目標**: 緊急情報、固定RSS、ユーザーRSSの統合表示

#### 3.1 RSS管理システム拡張
```typescript
// services/MultiLayerRSSService.ts
interface RSSLayer {
  emergency: EmergencySource[];  // 気象庁、官公庁API
  curated: CuratedSource[];      // 運営固定RSS
  user: UserRSSSource[];         // ユーザー追加RSS
}
```

#### 3.2 実装手順
```bash
# 1. 新規サービス作成
touch services/MultiLayerRSSService.ts
touch types/rss-layers.ts

# 2. 既存RSSSourceService.tsとの統合確認
grep -r "UserRSSSource" services/
grep -r "HOME_FIXED_RSS_SOURCES" data/

# 3. 緊急API対応（モック実装）
touch services/EmergencyAPIService.ts
```

#### 3.3 検証項目
- [ ] 既存RSS機能への影響なし
- [ ] API呼び出し頻度とパフォーマンス
- [ ] エラーハンドリング（API障害時の対応）

### Phase 4: Homeタブ統合・UIテスト (2-3日)
**目標**: 全コンポーネントのHomeタブ統合とUXテスト

#### 4.1 index.tsx大幅リファクタリング
```typescript
// app/(tabs)/index.tsx
- セクション型レイアウトへの移行
- 既存useCuratedFeed.tsとの統合
- 動的セクション表示制御
```

#### 4.2 実装手順
```bash
# 1. 現状バックアップ
cp app/(tabs)/index.tsx app/(tabs)/index.tsx.backup

# 2. 段階的リファクタリング
# → 既存機能を残しながら新UIを条件分岐で導入

# 3. ユーザビリティテスト
# → 記事表示数、スクロール性能、視認性確認
```

#### 4.3 検証項目
- [ ] 既存機能の完全動作保証
- [ ] 各セクションの記事数バランス
- [ ] スクロール性能（フレームレート維持）
- [ ] アクセシビリティ対応

## 🔍 API動作確認手順

### バックエンド接続確認
```bash
# 1. バックエンドサーバー起動確認
curl http://localhost:8003/api/articles/curated?limit=10

# 2. 既存APIレスポンス検証
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8003/api/articles/curated

# 3. 記事データ構造確認
# → Article型（id, title, summary, genre, source_name等）の完全性確認
```

### フロントエンド統合テスト
```bash
# 1. 型チェック実行
cd audion-app-fresh
npx tsc --noEmit

# 2. Lintチェック
npm run lint

# 3. 実機テスト（iOS/Android/Web）
npx expo start --ios
npx expo start --android
npx expo start --web
```

## ⚠️ リスク管理・影響範囲

### 高リスク要素
1. **index.tsx大幅変更**: 既存ユーザー体験への影響
2. **パフォーマンス劣化**: 複数セクション同時レンダリング
3. **API負荷増大**: 緊急情報取得による頻繁リクエスト

### 軽減策
1. **機能フラグ制御**: 新UI有効/無効の切り替え可能
2. **段階的ロールアウト**: 開発→ステージング→本番
3. **パフォーマンス監視**: レンダリング時間とメモリ使用量測定
4. **フォールバック機能**: API障害時の既存UI表示

### 影響範囲確認
```bash
# 影響するファイル特定
grep -r "useCuratedFeed" . --include="*.tsx" --include="*.ts"
grep -r "HOME_FIXED_RSS_SOURCES" . --include="*.tsx" --include="*.ts"
grep -r "ArticleCard" . --include="*.tsx" --include="*.ts"
```

## 📊 品質保証・テスト戦略

### 単体テスト（Jest）
```bash
# 新規コンポーネントテスト作成
touch __tests__/CompactCard.test.tsx
touch __tests__/PersonalizedGrid.test.tsx
touch __tests__/ArticleCategorizationService.test.ts
```

### 統合テスト
1. **記事取得→分類→表示** のエンドツーエンドフロー
2. **ジャンルフィルタリング** の既存機能との互換性
3. **プルツーリフレッシュ** の動作確認

### パフォーマンステスト
```bash
# React Native Performance Monitor使用
npx react-native run-ios --configuration Release
# → FPS、メモリ使用量、レンダリング時間測定
```

## 🚀 デプロイ・リリース戦略

### 段階的デプロイ
1. **Phase 1**: 開発環境（localhost）での完全検証
2. **Phase 2**: TestFlight（iOS）/ Internal Testing（Android）
3. **Phase 3**: ステージング環境でのユーザーテスト
4. **Phase 4**: 本番リリース（機能フラグ制御）

### ロールバック計画
```bash
# 緊急時復元コマンド
git checkout HEAD~1 app/(tabs)/index.tsx
git checkout HEAD~1 components/
# → 新機能を無効化し、既存UIに即座復帰
```

## 📝 開発チェックリスト

### 実装前確認
- [ ] 既存`ArticleService.ts`のAPI仕様確認
- [ ] `useCuratedFeed.ts`の現在の動作確認
- [ ] `genreUtils.ts`の依存関係確認
- [ ] デザインシステム（色彩・タイポグラフィ）の継承確認

### 実装中確認
- [ ] TypeScript型安全性（`--strict`モード）
- [ ] ESLint規約準拠
- [ ] コンポーネント再利用性（props設計）
- [ ] パフォーマンス（React.memo, useCallback最適化）

### 実装後確認
- [ ] 全機能手動テスト（iOS/Android/Web）
- [ ] エラーハンドリング確認（ネットワーク障害等）
- [ ] アクセシビリティ対応（VoiceOver等）
- [ ] バックアップからの復元テスト

### 最終承認前確認
- [ ] 要件定義書との整合性確認
- [ ] 既存機能への非破壊影響確認
- [ ] パフォーマンス基準（2秒以内レスポンス）達成
- [ ] セキュリティ要件（認証、データ保護）遵守

## 🎯 成功基準

### 定量的目標
- **レンダリング時間**: 初期表示 < 1秒
- **記事分類精度**: 手動検証で85%以上
- **メモリ使用量**: 既存比110%以内
- **API応答時間**: 95%ile < 2秒

### 定性的目標
- **ユーザー体験**: 単調さの解消、視覚的魅力向上
- **保守性**: コンポーネント再利用性、テスト容易性
- **拡張性**: 新セクション・新機能の追加容易性
- **安定性**: 既存機能の完全互換性維持

---

**この実装計画により、Home UI強化を段階的かつ安全に実施し、ユーザーエンゲージメント向上とシステム安定性を両立します。**