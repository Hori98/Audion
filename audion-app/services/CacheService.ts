import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, RSSSource } from '../types';

interface CacheData<T = unknown> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheService {
  private static instance: CacheService;
  
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private getKey(key: string): string {
    return `cache_${key}`;
  }

  async set<T>(key: string, data: T, ttlMinutes: number = 10): Promise<void> {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + (ttlMinutes * 60 * 1000)
      };
      
      await AsyncStorage.setItem(this.getKey(key), JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.getKey(key));
      if (!cached) return null;

      const cacheData: CacheData<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cacheData.expiry) {
        await this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      console.log('🗑️ CacheService - Starting comprehensive cache clear...');
      
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      console.log(`🗑️ CacheService - Found ${keys.length} total AsyncStorage keys`);
      
      // Find all cache-related keys (broader pattern to catch all cached data)
      const cacheKeys = keys.filter(key => 
        key.startsWith('cache_') || 
        key.includes('_cache') ||
        key.startsWith('articles_') ||
        key.startsWith('rss_') ||
        key.includes('personalization') ||
        key.includes('search_history') ||
        key.includes('archived_articles') ||
        key.includes('bookmarks')
      );
      
      console.log(`🗑️ CacheService - Found ${cacheKeys.length} cache keys to remove:`, cacheKeys);
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ CacheService - Successfully removed ${cacheKeys.length} cache entries`);
      } else {
        console.log('🗑️ CacheService - No cache keys found to remove');
      }
    } catch (error) {
      console.error('🗑️ CacheService - Cache clear error:', error);
      throw error;
    }
  }

  async isValid(key: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(this.getKey(key));
      if (!cached) return false;

      const cacheData: CacheData = JSON.parse(cached);
      return Date.now() <= cacheData.expiry;
    } catch (error) {
      console.error('Cache validity check error:', error);
      return false;
    }
  }

  // Specialized methods for RSS content
  async setArticles(articles: Article[], filters: { genre?: string; source?: string } = {}): Promise<void> {
    const key = this.getArticlesCacheKey(filters);
    await this.set<Article[]>(key, articles, 30); // 30 minutes cache for articles
  }

  async getArticles(filters: { genre?: string; source?: string } = {}): Promise<Article[] | null> {
    const key = this.getArticlesCacheKey(filters);
    return await this.get<Article[]>(key);
  }

  async setSources(sources: RSSSource[]): Promise<void> {
    await this.set<RSSSource[]>('rss_sources', sources, 30); // 30 minutes cache for sources
  }

  async getSources(): Promise<RSSSource[] | null> {
    return await this.get<RSSSource[]>('rss_sources');
  }

  async setAutoPickedArticles(articles: Article[] | { articles: Article[]; timestamp: number; active_sources: string[] }): Promise<void> {
    await this.set('auto_picked_articles', articles, 60); // 1 hour cache for auto-picked
  }

  async getAutoPickedArticles(): Promise<Article[] | { articles: Article[]; timestamp: number; active_sources: string[] } | null> {
    return await this.get('auto_picked_articles');
  }

  getArticlesCacheKey(filters: { genre?: string; source?: string }): string {
    const filterStr = JSON.stringify(filters);
    // Use a simple hash instead of Buffer which doesn't exist in React Native
    const hash = filterStr.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `articles_${Math.abs(hash)}`;
  }
}

export default CacheService.getInstance();