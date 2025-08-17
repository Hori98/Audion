import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Article } from '../types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

class ArticleManagerService {
  private static instance: ArticleManagerService;
  private articles: Article[] = [];
  private isLoading = false;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'unified_articles_cache';

  static getInstance(): ArticleManagerService {
    if (!ArticleManagerService.instance) {
      ArticleManagerService.instance = new ArticleManagerService();
    }
    return ArticleManagerService.instance;
  }

  /**
   * Main method to get articles with intelligent caching
   */
  async getArticles(token: string, forceRefresh = false): Promise<Article[]> {
    const now = Date.now();
    const cacheValid = (now - this.lastFetchTime) < this.CACHE_DURATION;

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cacheValid && this.articles.length > 0) {
      return this.articles;
    }

    // Prevent multiple simultaneous fetches
    if (this.isLoading) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading) {
            clearInterval(checkInterval);
            resolve(this.articles);
          }
        }, 100);
      });
    }

    this.isLoading = true;

    try {
      // Always try to load from storage first for better UX
      const cached = await this.loadFromStorage();
      if (cached.length > 0) {
        this.articles = cached;
        
        // If not forcing refresh and we have cached data, return it
        if (!forceRefresh) {
          this.isLoading = false;
          return cached;
        }
      }

      // Fetch fresh data from API with shorter timeout
      const response = await axios.get(`${API}/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000, // Reduced to 5 seconds
      });

      if (response.data && Array.isArray(response.data)) {
        
        // Clean and deduplicate articles
        const cleanedArticles = this.cleanAndDeduplicateArticles(response.data);
        
        this.articles = cleanedArticles;
        this.lastFetchTime = now;
        
        // Save to storage
        await this.saveToStorage(cleanedArticles);
        
        return cleanedArticles;
      } else {
        console.warn('📰 Invalid API response format');
        return this.articles; // Return cached data
      }

    } catch (error) {
      console.error('📰 Failed to fetch articles:', error);
      
      // Try to load from storage as fallback
      if (this.articles.length === 0) {
        const fallback = await this.loadFromStorage();
        if (fallback.length > 0) {
          this.articles = fallback;
        } else {
          // If no cache available, create some mock data for development
          console.warn('📰 No cached data available, creating mock articles for development');
          this.articles = this.createMockArticles();
        }
      }
      
      return this.articles;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Clean and deduplicate articles
   */
  private cleanAndDeduplicateArticles(articles: any[]): Article[] {
    if (!articles || !Array.isArray(articles)) {
      console.warn('📰 Invalid articles array provided');
      return [];
    }

    const seen = new Set<string>();
    const cleanedArticles: Article[] = [];
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const article of articles) {
      // Validate article structure
      if (!this.isValidArticle(article)) {
        invalidCount++;
        continue;
      }

      // Create unique key based on multiple fields for better deduplication
      const uniqueKey = this.createUniqueKey(article);
      
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        cleanedArticles.push(this.normalizeArticle(article));
      } else {
        duplicateCount++;
      }
    }

    
    // Sort by publication date (newest first)
    return cleanedArticles.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at || 0).getTime();
      const dateB = new Date(b.published_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Validate if article has required fields
   */
  private isValidArticle(article: any): boolean {
    return article && 
           typeof article.id === 'string' && 
           article.id.length > 0 &&
           typeof article.title === 'string' && 
           article.title.length > 0 &&
           typeof article.link === 'string' && 
           article.link.length > 0;
  }

  /**
   * Create unique key for deduplication
   */
  private createUniqueKey(article: any): string {
    // Use multiple fields to create a robust unique key
    return `${article.id}`;
  }

  /**
   * Normalize article data structure
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
   * Create mock articles for development when no data is available
   */
  private createMockArticles(): Article[] {
    const mockArticles: Article[] = [
      {
        id: 'mock-1',
        title: 'Welcome to Audion - Your Podcast News App',
        summary: 'Start by adding RSS sources in the Sources tab to see your personalized news feed here.',
        link: 'https://example.com/welcome',
        image_url: '',
        published_at: new Date().toISOString(),
        source_name: 'Audion System',
        genre: 'Technology',
        created_at: new Date().toISOString(),
      },
      {
        id: 'mock-2',
        title: 'How to Get Started',
        summary: 'Add your favorite news sources and let AI create personalized podcasts from the latest articles.',
        link: 'https://example.com/howto',
        image_url: '',
        published_at: new Date(Date.now() - 60000).toISOString(),
        source_name: 'Audion Guide',
        genre: 'General',
        created_at: new Date(Date.now() - 60000).toISOString(),
      },
      {
        id: 'mock-3',
        title: 'Server Connection Issue',
        summary: 'We are unable to connect to the news server. Please check your internet connection and try again.',
        link: 'https://example.com/connection',
        image_url: '',
        published_at: new Date(Date.now() - 120000).toISOString(),
        source_name: 'Audion Status',
        genre: 'System',
        created_at: new Date(Date.now() - 120000).toISOString(),
      },
    ];
    
    return mockArticles;
  }

  /**
   * Load articles from local storage
   */
  private async loadFromStorage(): Promise<Article[]> {
    try {
      // Check if we're in a web environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Use localStorage for web
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const isExpired = (Date.now() - timestamp) > this.CACHE_DURATION;
          
          if (!isExpired && Array.isArray(data)) {
            return data;
          }
        }
      } else {
        // Use AsyncStorage for mobile
        const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const isExpired = (Date.now() - timestamp) > this.CACHE_DURATION;
          
          if (!isExpired && Array.isArray(data)) {
            return data;
          }
        }
      }
    } catch (error) {
      console.error('📰 Error loading from storage:', error);
      // Return empty array on storage errors
    }
    return [];
  }

  /**
   * Save articles to local storage
   */
  private async saveToStorage(articles: Article[]): Promise<void> {
    try {
      const dataToStore = JSON.stringify({
        data: articles,
        timestamp: Date.now(),
      });

      // Check if we're in a web environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Use localStorage for web
        localStorage.setItem(this.STORAGE_KEY, dataToStore);
      } else {
        // Use AsyncStorage for mobile
        await AsyncStorage.setItem(this.STORAGE_KEY, dataToStore);
      }
    } catch (error) {
      console.error('📰 Error saving to storage:', error);
    }
  }

  /**
   * Filter articles by various criteria
   */
  filterArticles(
    articles: Article[], 
    filters: {
      genre?: string;
      source?: string;
      searchQuery?: string;
      readingFilter?: 'all' | 'unread' | 'read';
      readingHistory?: Map<string, Date>;
    }
  ): Article[] {
    let filtered = [...articles];

    // Genre filter
    if (filters.genre && filters.genre !== 'All') {
      filtered = filtered.filter(article => article.genre === filters.genre);
    }

    // Source filter
    if (filters.source && filters.source !== 'All') {
      filtered = filtered.filter(article => article.source_name === filters.source);
    }

    // Search filter
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(article =>
        article.title?.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.source_name?.toLowerCase().includes(query)
      );
    }

    // Reading status filter
    if (filters.readingFilter && filters.readingFilter !== 'all' && filters.readingHistory) {
      const isRead = (articleId: string) => filters.readingHistory!.has(articleId);
      
      if (filters.readingFilter === 'unread') {
        filtered = filtered.filter(article => !isRead(article.id));
      } else if (filters.readingFilter === 'read') {
        filtered = filtered.filter(article => isRead(article.id));
      }
    }

    return filtered;
  }

  /**
   * Get cached article count
   */
  getCachedCount(): number {
    return this.articles.length;
  }

  /**
   * Check if currently loading
   */
  isCurrentlyLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.articles = [];
    this.lastFetchTime = 0;
    
    try {
      // Check if we're in a web environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Use localStorage for web
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        // Use AsyncStorage for mobile
        await AsyncStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('📰 Error clearing cache:', error);
    }
    
  }

  /**
   * Get articles by IDs (for manual selection)
   */
  getArticlesByIds(ids: string[]): Article[] {
    return this.articles.filter(article => ids.includes(article.id));
  }
}

export default ArticleManagerService;