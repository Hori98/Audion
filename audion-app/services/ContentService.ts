/**
 * ContentService - Unified content management
 * Consolidates article, RSS, and audio-related functionality
 */

import { apiService } from './ApiService';
import { CacheService } from './CacheService';
import { API_CONFIG } from '../config/api';
import axios from 'axios';

export interface Article {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  published_at: string;
  source_name: string;
  source_id: string;
  genre?: string;
  image_url?: string;
  reading_time?: number;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  created_at: string;
  last_fetched?: string;
  article_count?: number;
}

export interface AudioItem {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  created_at: string;
  script?: string;
  chapters?: Array<{
    title: string;
    start_time: number;
    end_time: number;
    original_url?: string;
  }>;
}

export interface AutoPickOptions {
  max_articles?: number;
  preferred_genres?: string[];
  exclude_sources?: string[];
}

class ContentService {
  private static instance: ContentService;
  private cacheService = CacheService.getInstance();

  static getInstance(): ContentService {
    if (!this.instance) {
      this.instance = new ContentService();
    }
    return this.instance;
  }

  // ================== RSS Sources ==================
  
  async getSources(): Promise<RSSSource[]> {
    // Try cache first
    const cached = await this.cacheService.getSources();
    if (cached) return cached;

    const response = await apiService.getEndpoint<RSSSource[]>('content.sources');
    if (response.success && response.data) {
      await this.cacheService.setSources(response.data);
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch sources');
  }

  async addSource(name: string, url: string): Promise<RSSSource> {
    const response = await apiService.postEndpoint<RSSSource>('content.sources', {
      name: name.trim(),
      url: url.trim()
    });

    if (response.success && response.data) {
      // Clear cache to force refresh
      await this.cacheService.remove('sources');
      return response.data;
    }

    throw new Error(response.error || 'Failed to add source');
  }

  async deleteSource(sourceId: string): Promise<void> {
    const response = await apiService.delete(`/rss-sources/${sourceId}`);
    
    if (response.success) {
      // Clear cache to force refresh
      await this.cacheService.remove('sources');
      return;
    }

    throw new Error(response.error || 'Failed to delete source');
  }

  // ================== Articles ==================

  async getArticles(filters?: { genre?: string; source?: string }): Promise<Article[]> {
    // Try cache first
    const cached = await this.cacheService.getArticles(filters || {});
    if (cached && cached.length > 0) {
      console.log(`ContentService: Loaded ${cached.length} articles from cache`);
      return cached;
    }

    // Fetch from API
    const params: any = {};
    if (filters?.genre && filters.genre !== 'All') {
      params.genre = filters.genre;
    }
    if (filters?.source && filters.source !== 'All') {
      params.source = filters.source;
    }

    const response = await apiService.get<Article[]>('/articles', { params });
    
    if (response.success && response.data) {
      console.log(`ContentService: Loaded ${response.data.length} articles from API`);
      await this.cacheService.setArticles(response.data, filters || {});
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch articles');
  }

  async autoPickArticles(options: AutoPickOptions): Promise<Article[]> {
    // Check cache first
    const cached = await this.cacheService.getAutoPickedArticles();
    if (cached && cached.length > 0) {
      return cached;
    }

    const response = await apiService.postEndpoint<Article[]>('content.autopick', options);
    
    if (response.success && response.data) {
      await this.cacheService.setAutoPickedArticles(response.data);
      return response.data;
    }

    throw new Error(response.error || 'Failed to auto-pick articles');
  }

  // ================== Audio Generation ==================

  async createAudioFromArticles(articles: Article[]): Promise<AudioItem> {
    const response = await apiService.postEndpoint<AudioItem>('audio.create', { articles });
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create audio');
  }

  async createDirectTTS(article: Article, voiceOptions?: {
    voice_language?: string;
    voice_name?: string;
  }): Promise<AudioItem> {
    const requestData = {
      article_id: article.id,
      title: article.title,
      content: article.summary || article.title,
      voice_language: voiceOptions?.voice_language || 'ja-JP',
      voice_name: voiceOptions?.voice_name || 'nova'
    };

    const response = await apiService.postEndpoint<AudioItem>('audio.directTTS', requestData);
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create direct TTS');
  }

  async getAudioLibrary(): Promise<AudioItem[]> {
    const response = await apiService.getEndpoint<AudioItem[]>('audio.library');
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch audio library');
  }

  // ================== Search & Filters ==================

  searchArticles(articles: Article[], query: string): Article[] {
    if (!query.trim()) return articles;
    
    const lowercaseQuery = query.toLowerCase();
    return articles.filter(article => 
      article.title?.toLowerCase().includes(lowercaseQuery) ||
      article.summary?.toLowerCase().includes(lowercaseQuery) ||
      article.source_name?.toLowerCase().includes(lowercaseQuery)
    );
  }

  filterArticlesByGenre(articles: Article[], genre: string): Article[] {
    if (!genre || genre === 'All') return articles;
    return articles.filter(article => article.genre === genre);
  }

  filterArticlesBySource(articles: Article[], sourceId: string): Article[] {
    if (!sourceId || sourceId === 'All') return articles;
    return articles.filter(article => article.source_id === sourceId);
  }

  // ================== Cache Management ==================

  async clearCache(): Promise<void> {
    await this.cacheService.clear(['articles', 'sources', 'auto_picked_articles']);
  }

  async refreshArticles(filters?: { genre?: string; source?: string }): Promise<Article[]> {
    // Clear relevant cache
    await this.cacheService.remove(this.cacheService.getArticlesCacheKey(filters || {}));
    
    // Fetch fresh data
    return this.getArticles(filters);
  }
}

export default ContentService.getInstance();