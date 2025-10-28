/**
 * RSS Data Service
 * 3層RSS統合システムの中核管理サービス
 * 緊急情報API + キュレーションRSS + ユーザーRSSの統合データフロー
 */

import { Article } from './ArticleService';
import EmergencyNewsService from './EmergencyNewsService';
import CuratedRSSService from './CuratedRSSService';
import RSSService from './RSSService';
import ArticleCategorizationService, { ClassifiedArticle } from './ArticleCategorizationService';

export interface DataSource {
  id: string;
  name: string;
  type: 'emergency' | 'curated' | 'user';
  priority: number; // 1-10 (10が最高優先度)
  enabled: boolean;
  weight: number; // 0-1 (記事選択時の重み)
}

export interface RSSMixStrategy {
  id: string;
  name: string;
  description: string;
  emergency: { enabled: boolean; weight: number; limit: number };
  curated: { enabled: boolean; weight: number; limit: number };
  user: { enabled: boolean; weight: number; limit: number };
  totalLimit: number;
  diversityScore: number; // 0-1 (多様性重視度)
  freshnessScore: number; // 0-1 (新鮮度重視度)
}

class RSSDataService {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分
  private dataSourceCache: Map<string, { articles: Article[]; ts: number }> = new Map();

  // データソース定義
  private readonly dataSources: DataSource[] = [
    {
      id: 'emergency_apis',
      name: '緊急情報API',
      type: 'emergency',
      priority: 10,
      enabled: true,
      weight: 0.3
    },
    {
      id: 'curated_rss',
      name: 'キュレーションRSS',
      type: 'curated',
      priority: 8,
      enabled: true,
      weight: 0.5
    },
    {
      id: 'user_rss',
      name: 'ユーザーRSS',
      type: 'user',
      priority: 6,
      enabled: true,
      weight: 0.2
    }
  ];

  // ミックス戦略定義
  private readonly mixStrategies: RSSMixStrategy[] = [
    {
      id: 'breaking_focus',
      name: '速報重視',
      description: '緊急情報を最優先し、リアルタイム性を重視',
      emergency: { enabled: true, weight: 0.5, limit: 8 },
      curated: { enabled: true, weight: 0.3, limit: 10 },
      user: { enabled: true, weight: 0.2, limit: 7 },
      totalLimit: 25,
      diversityScore: 0.3,
      freshnessScore: 0.9
    },
    {
      id: 'balanced_mix',
      name: 'バランス型',
      description: '全てのソースをバランス良く配信',
      emergency: { enabled: true, weight: 0.2, limit: 3 },
      curated: { enabled: true, weight: 0.5, limit: 15 },
      user: { enabled: true, weight: 0.3, limit: 12 },
      totalLimit: 30,
      diversityScore: 0.7,
      freshnessScore: 0.6
    },
    {
      id: 'personalized_focus',
      name: 'パーソナル重視',
      description: 'ユーザーの嗜好を最優先し、個人化を重視',
      emergency: { enabled: true, weight: 0.1, limit: 2 },
      curated: { enabled: true, weight: 0.3, limit: 8 },
      user: { enabled: true, weight: 0.6, limit: 20 },
      totalLimit: 30,
      diversityScore: 0.5,
      freshnessScore: 0.4
    },
    {
      id: 'quality_focus',
      name: '品質重視',
      description: 'キュレーション記事を中心とした高品質コンテンツ',
      emergency: { enabled: true, weight: 0.15, limit: 3 },
      curated: { enabled: true, weight: 0.7, limit: 22 },
      user: { enabled: true, weight: 0.15, limit: 5 },
      totalLimit: 30,
      diversityScore: 0.6,
      freshnessScore: 0.5
    }
  ];

  /**
   * 統合記事フィードの取得
   */
  public async getIntegratedFeed(
    strategyId: string = 'balanced_mix',
    userId?: string
  ): Promise<ClassifiedArticle[]> {
    console.log(`[RSSDataService] Getting integrated feed with strategy: ${strategyId}`);

    const strategy = this.mixStrategies.find(s => s.id === strategyId);
    if (!strategy) {
      console.warn(`[RSSDataService] Strategy not found: ${strategyId}, using default`);
      return this.getIntegratedFeed('balanced_mix', userId);
    }

    const allArticles: Article[] = [];

    // 1. 緊急情報の取得
    if (strategy.emergency.enabled) {
      const emergencyArticles = await this.getEmergencyArticles(strategy.emergency.limit);
      allArticles.push(...emergencyArticles);
      console.log(`[RSSDataService] Added ${emergencyArticles.length} emergency articles`);
    }

    // 2. キュレーション記事の取得
    if (strategy.curated.enabled) {
      const curatedArticles = await this.getCuratedArticles(strategy.curated.limit);
      allArticles.push(...curatedArticles);
      console.log(`[RSSDataService] Added ${curatedArticles.length} curated articles`);
    }

    // 3. ユーザーRSS記事の取得
    if (strategy.user.enabled && userId) {
      const userArticles = await this.getUserArticles(strategy.user.limit, userId);
      allArticles.push(...userArticles);
      console.log(`[RSSDataService] Added ${userArticles.length} user articles`);
    }

    // 4. 記事の分類・スコアリング
    const classifiedArticles = ArticleCategorizationService.classifyArticles(allArticles);

    // 5. 戦略に基づく記事選択・順序調整
    const finalArticles = this.applyMixStrategy(classifiedArticles, strategy);

    console.log(`[RSSDataService] Integrated feed generated: ${finalArticles.length} articles`);
    return finalArticles;
  }

  /**
   * 緊急情報記事の取得
   */
  private async getEmergencyArticles(limit: number): Promise<Article[]> {
    try {
      const cached = this.dataSourceCache.get('emergency');
      if (cached && Date.now() - cached.ts < this.CACHE_DURATION) {
        return cached.articles.slice(0, limit);
      }

      const emergencyArticles = await EmergencyNewsService.convertAlertsToArticles();

      // キャッシュ更新
      this.dataSourceCache.set('emergency', {
        articles: emergencyArticles,
        ts: Date.now()
      });

      return emergencyArticles.slice(0, limit);

    } catch (error) {
      console.error('[RSSDataService] Error getting emergency articles:', error);
      return [];
    }
  }

  /**
   * キュレーション記事の取得
   */
  private async getCuratedArticles(limit: number): Promise<Article[]> {
    try {
      const cached = this.dataSourceCache.get('curated');
      if (cached && Date.now() - cached.ts < this.CACHE_DURATION) {
        return cached.articles.slice(0, limit);
      }

      // 高品質記事とグループ別記事をミックス
      const highQualityArticles = await CuratedRSSService.getHighQualityArticles(Math.floor(limit * 0.6));
      const breakingNewsArticles = await CuratedRSSService.getArticlesByGroup('breaking_news', Math.floor(limit * 0.4));

      const curatedArticles = [...highQualityArticles, ...breakingNewsArticles];

      // 重複除去
      const uniqueArticles = this.removeDuplicateArticles(curatedArticles);

      // キャッシュ更新
      this.dataSourceCache.set('curated', {
        articles: uniqueArticles,
        ts: Date.now()
      });

      return uniqueArticles.slice(0, limit);

    } catch (error) {
      console.error('[RSSDataService] Error getting curated articles:', error);
      return [];
    }
  }

  /**
   * ユーザーRSS記事の取得
   */
  private async getUserArticles(limit: number, userId: string): Promise<Article[]> {
    try {
      const cached = this.dataSourceCache.get(`user_${userId}`);
      if (cached && Date.now() - cached.ts < this.CACHE_DURATION) {
        return cached.articles.slice(0, limit);
      }

      // 既存のArticleServiceを使用してユーザー記事を取得
      // 実際の実装では、RSSServiceまたはArticleServiceと連携
      const userArticles: Article[] = []; // プレースホルダー

      // キャッシュ更新
      this.dataSourceCache.set(`user_${userId}`, {
        articles: userArticles,
        ts: Date.now()
      });

      return userArticles.slice(0, limit);

    } catch (error) {
      console.error('[RSSDataService] Error getting user articles:', error);
      return [];
    }
  }

  /**
   * ミックス戦略の適用
   */
  private applyMixStrategy(
    articles: ClassifiedArticle[],
    strategy: RSSMixStrategy
  ): ClassifiedArticle[] {
    console.log(`[RSSDataService] Applying mix strategy: ${strategy.name}`);

    // 1. カテゴリ別に分類
    const emergencyArticles = articles.filter(a => a.classification?.category === 'emergency');
    const trendingArticles = articles.filter(a => a.classification?.category === 'trending');
    const personalizedArticles = articles.filter(a => a.classification?.category === 'personalized');
    const latestArticles = articles.filter(a => a.classification?.category === 'latest');

    const mixedArticles: ClassifiedArticle[] = [];

    // 2. 戦略に基づく記事選択
    // 緊急記事は常に最優先
    const selectedEmergency = this.selectByStrategy(emergencyArticles, strategy.emergency.limit, strategy.freshnessScore);
    mixedArticles.push(...selectedEmergency);

    // トレンド記事
    const selectedTrending = this.selectByStrategy(trendingArticles, Math.floor(strategy.totalLimit * 0.3), strategy.diversityScore);
    mixedArticles.push(...selectedTrending);

    // パーソナライズ記事
    const selectedPersonalized = this.selectByStrategy(personalizedArticles, Math.floor(strategy.totalLimit * 0.3), strategy.diversityScore);
    mixedArticles.push(...selectedPersonalized);

    // 最新記事で埋める
    const remaining = strategy.totalLimit - mixedArticles.length;
    if (remaining > 0) {
      const selectedLatest = this.selectByStrategy(latestArticles, remaining, strategy.freshnessScore);
      mixedArticles.push(...selectedLatest);
    }

    // 3. 最終ソート（緊急度 → トレンド → 新鮮度）
    return mixedArticles.sort((a, b) => {
      // 緊急度優先
      if (a.classification?.category === 'emergency' && b.classification?.category !== 'emergency') return -1;
      if (b.classification?.category === 'emergency' && a.classification?.category !== 'emergency') return 1;

      // トレンドスコア優先
      const trendA = a.classification?.trendingScore || 0;
      const trendB = b.classification?.trendingScore || 0;
      if (trendA !== trendB) return trendB - trendA;

      // 新鮮度（公開日時）
      const dateA = new Date(a.published_at || 0).getTime();
      const dateB = new Date(b.published_at || 0).getTime();
      return dateB - dateA;
    }).slice(0, strategy.totalLimit);
  }

  /**
   * 戦略的記事選択
   */
  private selectByStrategy(
    articles: ClassifiedArticle[],
    limit: number,
    scoreWeight: number
  ): ClassifiedArticle[] {
    if (articles.length === 0) return [];

    // スコアベースソート
    const scored = articles.map(article => ({
      article,
      score: this.calculateSelectionScore(article, scoreWeight)
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(item => item.article);
  }

  /**
   * 選択スコア計算
   */
  private calculateSelectionScore(article: ClassifiedArticle, scoreWeight: number): number {
    let score = 0;

    // 分類スコア
    if (article.classification) {
      score += article.classification.emergencyScore * 0.3;
      score += article.classification.trendingScore * 20 * 0.3;
      score += article.classification.categoryConfidence * 100 * 0.2;
    }

    // 新鮮度スコア
    const hoursSincePublished = article.published_at
      ? (Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60)
      : 24;
    const freshnessScore = Math.max(0, 100 - hoursSincePublished * 2);
    score += freshnessScore * scoreWeight * 0.2;

    return score;
  }

  /**
   * 重複記事の除去
   */
  private removeDuplicateArticles(articles: Article[]): Article[] {
    const seen = new Set<string>();
    const unique: Article[] = [];

    for (const article of articles) {
      // タイトルまたはリンクで重複判定
      const key = `${article.title.toLowerCase()}-${article.link}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }

    return unique;
  }

  /**
   * データソース統計の取得
   */
  public async getDataSourceStatistics(): Promise<{
    emergency: { articles: number; lastUpdate: string };
    curated: { articles: number; lastUpdate: string };
    user: { articles: number; lastUpdate: string };
    total: number;
  }> {
    const emergencyArticles = await this.getEmergencyArticles(100);
    const curatedArticles = await this.getCuratedArticles(100);
    // ユーザー記事統計は実装時に追加

    return {
      emergency: {
        articles: emergencyArticles.length,
        lastUpdate: new Date().toISOString()
      },
      curated: {
        articles: curatedArticles.length,
        lastUpdate: new Date().toISOString()
      },
      user: {
        articles: 0, // プレースホルダー
        lastUpdate: new Date().toISOString()
      },
      total: emergencyArticles.length + curatedArticles.length
    };
  }

  /**
   * 利用可能なミックス戦略の取得
   */
  public getAvailableMixStrategies(): RSSMixStrategy[] {
    return this.mixStrategies;
  }

  /**
   * 特定戦略の取得
   */
  public getMixStrategy(strategyId: string): RSSMixStrategy | undefined {
    return this.mixStrategies.find(s => s.id === strategyId);
  }

  /**
   * 緊急情報監視の開始
   */
  public async startEmergencyMonitoring(): Promise<void> {
    await EmergencyNewsService.startEmergencyMonitoring();
    console.log('[RSSDataService] Emergency monitoring started');
  }

  /**
   * 緊急情報監視の停止
   */
  public stopEmergencyMonitoring(): void {
    EmergencyNewsService.stopEmergencyMonitoring();
    console.log('[RSSDataService] Emergency monitoring stopped');
  }

  /**
   * キャッシュのクリア
   */
  public clearCache(): void {
    this.dataSourceCache.clear();
    CuratedRSSService.clearCache();
    console.log('[RSSDataService] All caches cleared');
  }

  /**
   * サービスの初期化
   */
  public async initialize(): Promise<void> {
    console.log('[RSSDataService] Initializing RSS Data Service...');

    try {
      // 緊急情報監視開始
      await this.startEmergencyMonitoring();

      // キュレーションデータの事前ロード
      await this.getCuratedArticles(20);

      console.log('[RSSDataService] Initialization completed');
    } catch (error) {
      console.error('[RSSDataService] Initialization failed:', error);
    }
  }

  /**
   * サービスのクリーンアップ
   */
  public cleanup(): void {
    this.stopEmergencyMonitoring();
    this.clearCache();
    EmergencyNewsService.cleanup();
    console.log('[RSSDataService] Cleanup completed');
  }
}

export default new RSSDataService();