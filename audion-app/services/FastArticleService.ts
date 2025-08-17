import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Article } from '../types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

/**
 * Ultra-fast article service with aggressive caching
 * Prioritizes speed over freshness for better UX
 */
class FastArticleService {
  private static instance: FastArticleService;
  private articles: Article[] = [];
  private isLoading = false;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (aggressive caching)
  private readonly STORAGE_KEY = 'fast_articles_cache';
  private readonly BACKGROUND_UPDATE_KEY = 'background_update_time';
  
  // Preload schedule
  private preloadInterval: NodeJS.Timeout | null = null;

  static getInstance(): FastArticleService {
    if (!FastArticleService.instance) {
      FastArticleService.instance = new FastArticleService();
    }
    return FastArticleService.instance;
  }

  constructor() {
    // Start background preloading
    this.initializeBackgroundUpdates();
  }

  /**
   * Initialize background updates for ultra-fast access
   */
  private initializeBackgroundUpdates(): void {
    // Update every 15 minutes in background
    this.preloadInterval = setInterval(async () => {
      console.log('🚀 Background article preload starting...');
      await this.preloadArticles();
    }, 15 * 60 * 1000);
  }

  /**
   * Preload articles in background (silent, no UI impact)
   */
  private async preloadArticles(): Promise<void> {
    try {
      // Don't interfere with active user sessions
      if (this.isLoading) return;

      const response = await axios.get(`${API}/articles`, {
        timeout: 3000, // Short timeout for background
      });

      if (response.data && Array.isArray(response.data)) {
        const cleanedArticles = this.cleanAndDeduplicateArticles(response.data);
        this.articles = cleanedArticles;
        await this.saveToStorage(cleanedArticles);
        await this.markBackgroundUpdate();
        console.log(`🚀 Background preload complete: ${cleanedArticles.length} articles`);
      }
    } catch (error) {
      console.log('🚀 Background preload failed (silent)');
    }
  }

  /**
   * Ultra-fast article retrieval (cache-first strategy)
   */
  async getArticlesFast(token?: string): Promise<Article[]> {
    console.log('⚡ FastArticleService: Getting articles...');

    // 1. Instant return if we have cached articles
    if (this.articles.length > 0) {
      console.log(`⚡ Instant cache hit: ${this.articles.length} articles`);
      this.backgroundRefreshIfNeeded(token);
      return this.articles;
    }

    // 2. Try to load from storage (still very fast)
    const cached = await this.loadFromStorage();
    if (cached.length > 0) {
      this.articles = cached;
      console.log(`⚡ Storage cache hit: ${cached.length} articles`);
      this.backgroundRefreshIfNeeded(token);
      return cached;
    }

    // 3. If no cache, do a fast fetch
    return await this.fetchArticlesFast(token);
  }

  /**
   * Background refresh if cache is getting old
   */
  private backgroundRefreshIfNeeded(token?: string): void {
    const now = Date.now();
    const cacheAge = now - this.lastFetchTime;
    
    // Refresh in background if cache is older than 10 minutes
    if (cacheAge > 10 * 60 * 1000 && !this.isLoading && token) {
      setTimeout(() => {
        this.fetchArticlesFast(token, true);
      }, 100); // Small delay to not interfere with UI
    }
  }

  /**
   * Fast fetch with optimizations
   */
  private async fetchArticlesFast(token?: string, isBackground = false): Promise<Article[]> {
    if (this.isLoading && !isBackground) {
      return this.articles; // Return cache if already loading
    }

    this.isLoading = true;

    try {
      if (!isBackground) {
        console.log('⚡ Fast fetch starting...');
      }

      const headers: any = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.get(`${API}/articles`, {
        headers: {
          ...headers,
          'Accept-Encoding': 'gzip, deflate, br',
        },
        timeout: isBackground ? 3000 : 15000, // Increased timeout for large datasets
      });

      if (response.data && Array.isArray(response.data)) {
        const cleanedArticles = this.cleanAndDeduplicateArticles(response.data);
        this.articles = cleanedArticles;
        this.lastFetchTime = Date.now();
        
        await this.saveToStorage(cleanedArticles);
        
        if (!isBackground) {
          console.log(`⚡ Fast fetch complete: ${cleanedArticles.length} articles`);
        }
        
        return cleanedArticles;
      }

      return this.articles;
    } catch (error) {
      if (!isBackground) {
        console.error('⚡ Fast fetch failed:', error);
      }
      return this.articles; // Return cache on error
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Optimized deduplication
   */
  private cleanAndDeduplicateArticles(articles: any[]): Article[] {
    if (!articles || !Array.isArray(articles)) return [];

    const seen = new Set<string>();
    const result: Article[] = [];

    // Use for loop for better performance
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      if (!article?.id) continue;
      
      if (!seen.has(article.id)) {
        seen.add(article.id);
        result.push(this.normalizeArticle(article));
      }
    }

    // Sort by date (newest first)
    result.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at || 0).getTime();
      const dateB = new Date(b.published_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }

  /**
   * Fast article normalization
   */
  private normalizeArticle(article: any): Article {
    return {
      id: article.id,
      title: article.title || 'Untitled',
      summary: article.summary || article.description || '',
      link: article.link || article.url || '',
      image_url: article.image_url || article.imageUrl || '',
      published_at: article.published_at || article.publishedAt || new Date().toISOString(),
      source_name: article.source_name || article.sourceName || 'Unknown Source',
      genre: article.genre || article.category || 'General',
      created_at: article.created_at || article.createdAt || new Date().toISOString(),
    };
  }

  /**
   * High-performance storage operations
   */
  private async loadFromStorage(): Promise<Article[]> {
    try {
      // Try different storage methods based on environment
      let stored: string | null = null;
      
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        stored = localStorage.getItem(this.STORAGE_KEY);
      } else {
        stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      }

      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        const isExpired = (Date.now() - timestamp) > this.CACHE_DURATION;
        
        if (!isExpired && Array.isArray(data)) {
          return data;
        }
      }
    } catch (error) {
      console.log('⚡ Storage load failed (silent)');
    }
    return [];
  }

  private async saveToStorage(articles: Article[]): Promise<void> {
    try {
      const dataToStore = JSON.stringify({
        data: articles,
        timestamp: Date.now(),
      });

      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, dataToStore);
      } else {
        await AsyncStorage.setItem(this.STORAGE_KEY, dataToStore);
      }
    } catch (error) {
      console.log('⚡ Storage save failed (silent)');
    }
  }

  private async markBackgroundUpdate(): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.BACKGROUND_UPDATE_KEY, timestamp);
      } else {
        await AsyncStorage.setItem(this.BACKGROUND_UPDATE_KEY, timestamp);
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Filter articles with high performance
   */
  filterArticlesFast(
    articles: Article[], 
    filters: {
      genre?: string;
      searchQuery?: string;
    }
  ): Article[] {
    let filtered = articles;

    // Early return if no filters
    if (!filters.genre || filters.genre === 'All') {
      if (!filters.searchQuery?.trim()) {
        return filtered;
      }
    }

    // Genre filter
    if (filters.genre && filters.genre !== 'All') {
      filtered = filtered.filter(article => article.genre === filters.genre);
    }

    // Search filter with optimized string matching
    if (filters.searchQuery?.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(article => {
        return (
          article.title?.toLowerCase().includes(query) ||
          article.summary?.toLowerCase().includes(query) ||
          article.source_name?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }

  /**
   * Get cached count
   */
  getCachedCount(): number {
    return this.articles.length;
  }

  /**
   * Force refresh
   */
  async forceRefresh(token: string): Promise<Article[]> {
    this.lastFetchTime = 0; // Reset cache time
    return await this.fetchArticlesFast(token);
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.preloadInterval) {
      clearInterval(this.preloadInterval);
      this.preloadInterval = null;
    }
  }
}

export default FastArticleService;