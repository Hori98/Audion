import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { extractErrorMessageFromResponse } from '../utils/apiError';

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
  // Enhanced caching system for progressive loading
  private cache: Map<string, { data: ArticleListResponse; ts: number }> = new Map();
  private cacheTTL = 300_000; // 5 minutes - extended for better performance
  private persistentCachePrefix = '@audion_articles_cache_';

  // Progressive loading configuration
  private progressiveLoadingEnabled = true;

  /**
   * Save articles to persistent cache (AsyncStorage)
   */
  private async saveToPersistentCache(cacheKey: string, data: ArticleListResponse): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      await AsyncStorage.setItem(
        `${this.persistentCachePrefix}${cacheKey}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn('Failed to save to persistent cache:', error);
    }
  }

  /**
   * Load articles from persistent cache (AsyncStorage)
   */
  private async loadFromPersistentCache(cacheKey: string): Promise<ArticleListResponse | null> {
    try {
      const cachedString = await AsyncStorage.getItem(`${this.persistentCachePrefix}${cacheKey}`);
      if (!cachedString) return null;

      const cached = JSON.parse(cachedString);
      const now = Date.now();

      // Check if cache is still valid (24 hours for persistent cache)
      if (now - cached.timestamp > 86400000) { // 24 hours
        await AsyncStorage.removeItem(`${this.persistentCachePrefix}${cacheKey}`);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Failed to load from persistent cache:', error);
      return null;
    }
  }

  /**
   * Clear all persistent cache entries
   */
  async clearPersistentCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.persistentCachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared ${cacheKeys.length} persistent cache entries`);
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  private async getAuthToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('@audion_auth_token');
    // Token validation completed
    return token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    // API request: ${API_BASE_URL}${endpoint}

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });


    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      console.error('❌ API request failed:', msg);
      throw new Error(msg);
    }

    return response.json();
  }

  /**
   * Enhanced getArticles with progressive loading support
   * Returns cached data immediately, then optionally fetches fresh data
   */
  async getArticles(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    genre?: string;
    search?: string;
    source_name?: string;
    source?: string;
    forceRefresh?: boolean;
    progressiveMode?: boolean; // Enable progressive loading
  }): Promise<ArticleListResponse | Article[]> {
    const token = await this.getAuthToken();
    const url = new URL(`${API_BASE_URL}/api/articles`);
    if (params?.genre) url.searchParams.set('genre', params.genre);
    if (params?.source || params?.source_name) {
      url.searchParams.set('source', params.source || params.source_name!);
    }
    if (params?.search) url.searchParams.set('search', params.search);

    const cacheKey = this.generateCacheKey(url.toString());
    const now = Date.now();

    // Progressive loading: Return cached data immediately if available
    if (this.progressiveLoadingEnabled && params?.progressiveMode && !params?.forceRefresh) {
      // Check memory cache first
      const memoryCache = this.cache.get(cacheKey);
      if (memoryCache && now - memoryCache.ts < this.cacheTTL) {
        console.log('📱 [Progressive] Serving from memory cache');
        // Start background refresh for next time (don't await)
        this.refreshInBackground(url.toString(), cacheKey, token);
        return memoryCache.data;
      }

      // Check persistent cache
      const persistentCache = await this.loadFromPersistentCache(cacheKey);
      if (persistentCache) {
        console.log('💾 [Progressive] Serving from persistent cache');
        // Update memory cache
        this.cache.set(cacheKey, { data: persistentCache, ts: now });
        // Start background refresh for next time (don't await)
        this.refreshInBackground(url.toString(), cacheKey, token);
        return persistentCache;
      }
    }

    // No cache available or force refresh - fetch fresh data
    console.log('🌐 [Progressive] Fetching fresh data');
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('❌ API request failed:', errorData);
      throw new Error(errorData.detail || 'Request failed');
    }

    const articles = await response.json();

    // Normalize fields minimally for the UI
    const normalized: Article[] = (articles || []).map((a: any) => ({
      ...a,
      published_at: a.published || a.published_at,
    }));

    // Create result structure
    const result: ArticleListResponse = {
      articles: normalized,
      total: normalized.length,
      page: params?.page || 1,
      per_page: params?.per_page || 50,
      has_next: false,
    };

    // Update caches
    this.cache.set(cacheKey, { data: result, ts: now });
    await this.saveToPersistentCache(cacheKey, result);

    return result;
  }

  /**
   * Background refresh for progressive loading
   */
  private async refreshInBackground(url: string, cacheKey: string, token: string | null): Promise<void> {
    try {
      console.log('🔄 [Background] Starting refresh');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const articles = await response.json();
        const normalized: Article[] = (articles || []).map((a: any) => ({
          ...a,
          published_at: a.published || a.published_at,
        }));

        const result: ArticleListResponse = {
          articles: normalized,
          total: normalized.length,
          page: 1,
          per_page: 50,
          has_next: false,
        };

        // Update caches
        this.cache.set(cacheKey, { data: result, ts: Date.now() });
        await this.saveToPersistentCache(cacheKey, result);
        console.log('✅ [Background] Refresh completed');
      }
    } catch (error) {
      console.warn('⚠️ [Background] Refresh failed:', error);
    }
  }

  /**
   * Generate normalized cache key
   */
  private generateCacheKey(url: string): string {
    // Remove base URL and normalize parameters for consistent caching
    return url.replace(API_BASE_URL, '').replace(/[^\w\-._~:/?#[\]@!$&'()*+,;=]/g, '_');
  }

  async getCuratedArticles(
    params?: {
      genre?: string;
      maxArticles?: number;
      forceRefresh?: boolean;
      progressiveMode?: boolean;
    }
  ): Promise<ArticleListResponse> {
    const url = new URL(`${API_BASE_URL}/api/articles/curated`);
    if (params?.genre && params.genre !== 'すべて') {
      url.searchParams.set('genre', params.genre);
    }
    if (params?.maxArticles) {
      url.searchParams.set('max_articles', params.maxArticles.toString());
    }

    const cacheKey = this.generateCacheKey(url.toString());
    const now = Date.now();
    const token = await this.getAuthToken();

    if (this.progressiveLoadingEnabled && params?.progressiveMode && !params?.forceRefresh) {
      const memoryCache = this.cache.get(cacheKey);
      if (memoryCache && now - memoryCache.ts < this.cacheTTL) {
        console.log('📱 [Progressive Curated] Serving from memory cache');
        this.refreshCuratedInBackground(url.toString(), cacheKey, token);
        return memoryCache.data;
      }

      const persistentCache = await this.loadFromPersistentCache(cacheKey);
      if (persistentCache) {
        console.log('💾 [Progressive Curated] Serving from persistent cache');
        this.cache.set(cacheKey, { data: persistentCache, ts: now });
        this.refreshCuratedInBackground(url.toString(), cacheKey, token);
        return persistentCache;
      }
    }

    console.log('🌐 [Progressive Curated] Fetching fresh data');
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ArticleService] Curated articles API error:', errorText);
      throw new Error(`Failed to fetch curated articles: ${response.status}`);
    }

    const articles: Article[] = await response.json();
    const normalizedArticles = articles.map(article => ({
      ...article,
      published_at: article.published || article.published_at,
      id: article.id || `${article.source_id || 'unknown'}-${Date.now()}-${Math.random()}`,
    }));

    const result: ArticleListResponse = {
      articles: normalizedArticles,
      total: normalizedArticles.length,
      page: 1,
      per_page: params?.maxArticles || 50,
      has_next: false,
    };

    this.cache.set(cacheKey, { data: result, ts: now });
    await this.saveToPersistentCache(cacheKey, result);

    return result;
  }

  private async refreshCuratedInBackground(url: string, cacheKey: string, token: string | null): Promise<void> {
    try {
      console.log('🔄 [Background Curated] Starting refresh');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const articles: Article[] = await response.json();
        const normalized: Article[] = articles.map((a: any) => ({
          ...a,
          published_at: a.published || a.published_at,
        }));

        const result: ArticleListResponse = {
          articles: normalized,
          total: normalized.length,
          page: 1,
          per_page: 50,
          has_next: false,
        };

        this.cache.set(cacheKey, { data: result, ts: Date.now() });
        await this.saveToPersistentCache(cacheKey, result);
        console.log('✅ [Background Curated] Refresh completed');
      }
    } catch (error) {
      console.warn('⚠️ [Background Curated] Refresh failed:', error);
    }
  }

  async getArticle(articleId: string): Promise<Article> {
    return this.makeRequest<Article>(`/articles/${articleId}`);
  }

  async updateArticle(
    articleId: string,
    updates: { category?: string; audio_available?: boolean }
  ): Promise<Article> {
    return this.makeRequest<Article>(`/articles/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteArticle(articleId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/articles/${articleId}`, {
      method: 'DELETE',
    });
  }

  async importFromRSS(rssUrl: string): Promise<ImportRSSResponse> {
    return this.makeRequest<ImportRSSResponse>('/articles/import-rss', {
      method: 'POST',
      body: JSON.stringify({ rss_url: rssUrl }),
    });
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