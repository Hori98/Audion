import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';
import ArticleCategorizationService, {
  ClassifiedArticle,
  ArticleClassification,
  EmergencyLevel,
  TrendingScore,
  ArticleCategory
} from './ArticleCategorizationService';
import EngagementScoreService from './EngagementScoreService';
import RSSDataService, { RSSMixStrategy } from './RSSDataService';

// Re-export types for convenience
export {
  ClassifiedArticle,
  ArticleClassification,
  EmergencyLevel,
  TrendingScore,
  ArticleCategory,
  RSSMixStrategy
};

export interface Article {
  id: string;
  title: string;
  summary: string;
  content?: string;
  link: string;
  source_name: string;
  source_id?: string;  // バックエンドからのsource_id対応
  published_at?: string;  // フロントエンド用
  published?: string;     // バックエンド用
  category?: string;
  genre?: string;  // ジャンル情報追加（バックエンドからcategoryまたはgenreが来る）
  thumbnail_url?: string;
  reading_time?: number;
  audio_available?: boolean;
  created_at?: string;
  updated_at?: string;
  read_status?: 'unread' | 'read' | 'saved';
  read_at?: string;
}

export interface ArticleListResponse {
  articles: Article[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface ImportRSSResponse {
  message: string;
  source_name: string;
  total_articles: number;
  new_articles: number;
}

class ArticleService {
  // Simple in-memory cache with TTL
  private cache: Map<string, { data: ArticleListResponse; ts: number }> = new Map();
  private cacheTTL = 60_000; // 60 seconds

  async getArticles(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    genre?: string;
    search?: string;
    source_name?: string;
    source?: string;
    forceRefresh?: boolean;
  }): Promise<ArticleListResponse> {
    const requestParams: Record<string, any> = {};
    if (params?.page) requestParams.page = params.page;
    if (params?.per_page) requestParams.per_page = params.per_page;
    if (params?.genre) requestParams.genre = params.genre;
    if (params?.source || params?.source_name) {
      requestParams.source = params.source || params.source_name;
    }
    if (params?.search) requestParams.search = params.search;

    const cacheKey = `/api/articles?${new URLSearchParams(requestParams).toString()}`;
    const now = Date.now();
    if (!params?.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && now - cached.ts < this.cacheTTL) {
        return cached.data;
      }
    }

    const response = await apiClient.get<Article[]>('/api/articles', { params: requestParams });
    const articles = response.data;

    // Normalize fields minimally for the UI
    const normalized: Article[] = (articles || []).map((a: any) => ({
      ...a,
      published_at: a.published || a.published_at,
    }));

    // Return as list structure the hook can handle
    const result: ArticleListResponse = {
      articles: normalized,
      total: normalized.length,
      page: params?.page || 1,
      per_page: params?.per_page || 50,
      has_next: false,
    };
    this.cache.set(cacheKey, { data: result, ts: now });
    return result;
  }

  async getCuratedArticles(genre?: string, maxArticles?: number, section?: string, language?: string): Promise<Article[]> {
    // Getting curated articles from dynamic backend sources
    // Supports section-specific source filtering (hero, breaking, trending, science, etc.)
    // Now with language filtering support

    const requestParams: Record<string, any> = {};
    if (section) {
      requestParams.section = section;
    }
    if (genre && genre !== 'すべて') {
      requestParams.genre = genre;
    }
    if (maxArticles) {
      requestParams.max_articles = maxArticles;
    }
    if (language) {
      requestParams.language = language;
    }

    const response = await apiClient.get<Article[]>('/api/articles/curated', { params: requestParams });

    // バックエンドからのデータを正規化
    const normalizedArticles = response.data.map(article => ({
      ...article,
      published_at: article.published || article.published_at,
      id: article.id || `${article.source_id || 'unknown'}-${Date.now()}-${Math.random()}`,
    }));

    // Curated articles fetched successfully from dynamic sources
    return normalizedArticles;
  }

  async getArticle(articleId: string): Promise<Article> {
    const response = await apiClient.get<Article>(`/articles/${articleId}`);
    return response.data;
  }

  async updateArticle(
    articleId: string,
    updates: { category?: string; audio_available?: boolean }
  ): Promise<Article> {
    const response = await apiClient.patch<Article>(`/articles/${articleId}`, updates);
    return response.data;
  }

  async deleteArticle(articleId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/articles/${articleId}`);
    return response.data;
  }

  async importFromRSS(rssUrl: string): Promise<ImportRSSResponse> {
    const response = await apiClient.post<ImportRSSResponse>('/articles/import-rss', { rss_url: rssUrl });
    return response.data;
  }

  async getArticleSources(): Promise<{ sources: string[] }> {
    console.warn('[ArticleService] getArticleSources called but not implemented in backend. Returning empty sources.');
    return { sources: [] };
  }

  async getArticleCategories(): Promise<{ categories: string[] }> {
    console.warn('[ArticleService] getArticleCategories called but not implemented in backend. Returning empty categories.');
    return { categories: [] };
  }

  // 既読ステータス管理
  async markAsRead(articleId: string): Promise<void> {
    const readArticles = await this.getReadArticles();
    const newReadStatus = {
      id: articleId,
      read_at: new Date().toISOString(),
      status: 'read' as const
    };
    
    const updatedReadArticles = [
      ...readArticles.filter(item => item.id !== articleId),
      newReadStatus
    ];
    
    await AsyncStorage.setItem('@audion_read_articles', JSON.stringify(updatedReadArticles));
  }

  async markAsSaved(articleId: string): Promise<void> {
    const readArticles = await this.getReadArticles();
    const newSavedStatus = {
      id: articleId,
      read_at: new Date().toISOString(),
      status: 'saved' as const
    };
    
    const updatedReadArticles = [
      ...readArticles.filter(item => item.id !== articleId),
      newSavedStatus
    ];
    
    await AsyncStorage.setItem('@audion_read_articles', JSON.stringify(updatedReadArticles));
  }

  async getReadArticles(): Promise<Array<{id: string; read_at: string; status: 'read' | 'saved'}>> {
    const stored = await AsyncStorage.getItem('@audion_read_articles');
    return stored ? JSON.parse(stored) : [];
  }

  async getArticlesWithReadStatus(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    genre?: string;
    search?: string;
    source_name?: string;
    source?: string;
    read_filter?: 'unread' | 'read' | 'saved';
  }): Promise<ArticleListResponse> {
    const response = await this.getArticles(params);
    const readArticles = await this.getReadArticles();

    // 既読ステータスをマージ
    const articlesWithStatus = response.articles.map(article => {
      const readInfo = readArticles.find(r => r.id === article.id);
      return {
        ...article,
        read_status: (readInfo?.status || 'unread') as 'unread' | 'read' | 'saved',
        read_at: readInfo?.read_at
      };
    });

    // フィルタリング適用
    let filteredArticles = articlesWithStatus;
    if (params?.read_filter) {
      filteredArticles = articlesWithStatus.filter(article =>
        article.read_status === params.read_filter
      );
    }

    return {
      ...response,
      articles: filteredArticles
    };
  }

  // ========== 記事分類・エンゲージメント機能 ==========

  /**
   * 記事を分類して返す（緊急度・トレンド・カテゴリ判定）
   */
  async getClassifiedArticles(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    genre?: string;
    search?: string;
    source_name?: string;
    source?: string;
    read_filter?: 'unread' | 'read' | 'saved';
  }): Promise<{ articles: ClassifiedArticle[] } & Omit<ArticleListResponse, 'articles'>> {
    const response = await this.getArticlesWithReadStatus(params);
    const classifiedArticles = ArticleCategorizationService.classifyArticles(response.articles);

    return {
      ...response,
      articles: classifiedArticles
    };
  }

  /**
   * キュレーション記事を分類して返す
   */
  async getClassifiedCuratedArticles(params?: {
    genre?: string;
    maxArticles?: number;
  }): Promise<ClassifiedArticle[]> {
    const articles = await this.getCuratedArticles(params?.genre, params?.maxArticles);
    return ArticleCategorizationService.classifyArticles(articles);
  }

  /**
   * 緊急度によるフィルタリング
   */
  async getEmergencyArticles(minLevel: EmergencyLevel = 'medium'): Promise<ClassifiedArticle[]> {
    const classified = await this.getClassifiedCuratedArticles();
    return ArticleCategorizationService.filterByEmergencyLevel(classified, minLevel);
  }

  /**
   * トレンド記事の取得（エンゲージメントスコア順）
   */
  async getTrendingArticles(limit: number = 10): Promise<ClassifiedArticle[]> {
    const classified = await this.getClassifiedCuratedArticles();
    const trending = ArticleCategorizationService.filterByCategory(classified, 'trending');
    const sorted = ArticleCategorizationService.sortByTrendingScore(trending);
    return sorted.slice(0, limit);
  }

  /**
   * パーソナライズ記事の取得
   */
  async getPersonalizedArticles(userId: string, limit: number = 10): Promise<ClassifiedArticle[]> {
    const classified = await this.getClassifiedCuratedArticles();
    const personalized = ArticleCategorizationService.filterByCategory(classified, 'personalized');

    // エンゲージメントサービスと連携してパーソナライズ
    const articles = personalized.map(article => article as Article);
    const personalizedArticles = await EngagementScoreService.getPersonalizedArticles(articles, userId, limit);

    // 分類情報を復元
    return personalizedArticles.map(article => {
      const classifiedArticle = classified.find(c => c.id === article.id);
      return classifiedArticle || { ...article, classification: undefined };
    });
  }

  /**
   * エンゲージメントイベントの記録
   */
  async recordEngagement(event: {
    articleId: string;
    eventType: 'view' | 'read' | 'like' | 'share' | 'audio_play' | 'audio_complete';
    duration?: number;
    userId?: string;
  }): Promise<void> {
    await EngagementScoreService.recordEngagement({
      ...event,
      timestamp: Date.now()
    });
  }

  /**
   * エンゲージメントスコア順ソート
   */
  async sortArticlesByEngagement(articles: Article[]): Promise<Article[]> {
    return await EngagementScoreService.sortArticlesByEngagement(articles);
  }

  /**
   * セクション別記事取得（Home UI用）
   */
  async getArticlesBySection(): Promise<{
    emergency: ClassifiedArticle[];
    trending: ClassifiedArticle[];
    personalized: ClassifiedArticle[];
    latest: ClassifiedArticle[];
  }> {
    const classified = await this.getClassifiedCuratedArticles({ maxArticles: 50 });

    return {
      emergency: ArticleCategorizationService.filterByCategory(classified, 'emergency').slice(0, 5),
      trending: ArticleCategorizationService.filterByCategory(classified, 'trending').slice(0, 10),
      personalized: ArticleCategorizationService.filterByCategory(classified, 'personalized').slice(0, 8),
      latest: ArticleCategorizationService.filterByCategory(classified, 'latest').slice(0, 15)
    };
  }

  // ========== 3層RSS統合システム ==========

  /**
   * 統合フィードの取得（3層RSS統合）
   */
  async getIntegratedFeed(
    strategy: string = 'balanced_mix',
    userId?: string
  ): Promise<ClassifiedArticle[]> {
    return await RSSDataService.getIntegratedFeed(strategy, userId);
  }

  /**
   * 利用可能なミックス戦略の取得
   */
  getAvailableMixStrategies(): RSSMixStrategy[] {
    return RSSDataService.getAvailableMixStrategies();
  }

  /**
   * 特定戦略の詳細取得
   */
  getMixStrategy(strategyId: string): RSSMixStrategy | undefined {
    return RSSDataService.getMixStrategy(strategyId);
  }

  /**
   * 緊急情報監視の開始
   */
  async startEmergencyMonitoring(): Promise<void> {
    await RSSDataService.startEmergencyMonitoring();
  }

  /**
   * 緊急情報監視の停止
   */
  stopEmergencyMonitoring(): void {
    RSSDataService.stopEmergencyMonitoring();
  }

  /**
   * データソース統計の取得
   */
  async getDataSourceStatistics(): Promise<{
    emergency: { articles: number; lastUpdate: string };
    curated: { articles: number; lastUpdate: string };
    user: { articles: number; lastUpdate: string };
    total: number;
  }> {
    return await RSSDataService.getDataSourceStatistics();
  }

  /**
   * Home UI用の3層統合記事取得
   */
  async getIntegratedArticlesBySection(strategy: string = 'balanced_mix'): Promise<{
    hero: ClassifiedArticle[];
    breaking: ClassifiedArticle[];
    trending: ClassifiedArticle[];
    personalized: ClassifiedArticle[];
    latest: ClassifiedArticle[];
  }> {
    const integratedFeed = await this.getIntegratedFeed(strategy);

    // セクション別に分類
    const emergency = integratedFeed.filter(article =>
      article.classification?.category === 'emergency'
    );
    const trending = integratedFeed.filter(article =>
      article.classification?.category === 'trending'
    );
    const personalized = integratedFeed.filter(article =>
      article.classification?.category === 'personalized'
    );
    const latest = integratedFeed.filter(article =>
      article.classification?.category === 'latest'
    );

    return {
      hero: emergency.slice(0, 3), // ヒーローセクションは緊急度最高の記事
      breaking: emergency.slice(0, 5),
      trending: trending.slice(0, 10),
      personalized: personalized.slice(0, 8),
      latest: latest.slice(0, 15)
    };
  }

  /**
   * RSS統合システムの初期化
   */
  async initializeRSSIntegration(): Promise<void> {
    await RSSDataService.initialize();
  }

  /**
   * RSS統合システムのクリーンアップ
   */
  cleanupRSSIntegration(): void {
    RSSDataService.cleanup();
  }

  /**
   * キャッシュをクリア（RSS追加/削除時に使用）
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export default new ArticleService();
