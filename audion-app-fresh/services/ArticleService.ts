import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';

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

  async getCuratedArticles(genre?: string, maxArticles?: number): Promise<Article[]> {
    console.log(`[ArticleService] Getting curated articles - genre: ${genre}, max: ${maxArticles}`);

    const requestParams: Record<string, any> = {};
    if (genre && genre !== 'すべて') {
      requestParams.genre = genre;
    }
    if (maxArticles) {
      requestParams.max_articles = maxArticles;
    }

    const response = await apiClient.get<Article[]>('/api/articles/curated', { params: requestParams });

    // バックエンドからのデータを正規化
    const normalizedArticles = response.data.map(article => ({
      ...article,
      published_at: article.published || article.published_at,
      id: article.id || `${article.source_id || 'unknown'}-${Date.now()}-${Math.random()}`,
    }));

    console.log(`[ArticleService] Successfully fetched ${normalizedArticles.length} curated articles`);
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
    read_filter?: 'all' | 'unread' | 'read' | 'saved';
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
    if (params?.read_filter && params.read_filter !== 'all') {
      filteredArticles = articlesWithStatus.filter(article =>
        article.read_status === params.read_filter
      );
    }

    return {
      ...response,
      articles: filteredArticles
    };
  }
}

export default new ArticleService();
