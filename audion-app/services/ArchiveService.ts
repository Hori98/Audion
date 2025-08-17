import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

export interface ArchivedArticle {
  id: string;
  user_id: string;
  article_id: string;
  original_article_id: string;
  title: string;
  summary: string;
  content?: string;
  link: string;
  published: string;
  source_name: string;
  archived_at: string;
  folder?: string;
  notes?: string;
  is_favorite: boolean;
  read_status: string;
  genre?: string;
  image_url?: string;
}

export interface ArchiveRequest {
  article_id: string;
  title: string;
  summary: string;
  content?: string;
  link: string;
  published: string;
  source_name: string;
  folder?: string;
  notes?: string;
  genre?: string;
  image_url?: string;
}

class ArchiveService {
  private static instance: ArchiveService;
  private archivedArticlesCache: Set<string> = new Set();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ArchiveService {
    if (!ArchiveService.instance) {
      ArchiveService.instance = new ArchiveService();
    }
    return ArchiveService.instance;
  }

  async initialize(token: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadArchivedArticles(token);
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize ArchiveService:', error);
    }
  }

  async loadArchivedArticles(token: string): Promise<void> {
    try {
      const response = await axios.get(`${API}/archive/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 1000 } // Get all archived articles for quick lookup
      });
      
      const archivedIds = new Set(
        response.data.articles.map((article: ArchivedArticle) => article.original_article_id)
      );
      
      this.archivedArticlesCache = archivedIds;
      
      // Cache to AsyncStorage
      await AsyncStorage.setItem('archived_articles_cache', JSON.stringify(Array.from(archivedIds)));
    } catch (error) {
      console.warn('Error loading archived articles:', error);
      
      // Try to load from cache
      try {
        const cached = await AsyncStorage.getItem('archived_articles_cache');
        if (cached) {
          const ids = JSON.parse(cached);
          this.archivedArticlesCache = new Set(ids);
        }
      } catch (cacheError) {
        console.warn('Error loading cached archived articles:', cacheError);
      }
    }
  }

  async archiveArticle(token: string, article: any): Promise<void> {
    const archiveRequest: ArchiveRequest = {
      article_id: article.id,
      title: article.title,
      summary: article.summary,
      content: article.content,
      link: article.link,
      published: article.published,
      source_name: article.source_name,
      genre: article.genre,
      image_url: article.image_url,
    };

    try {
      await axios.post(
        `${API}/archive/article`,
        archiveRequest,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update cache
      this.archivedArticlesCache.add(article.id);
      await this.updateLocalCache();
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Article already archived
        this.archivedArticlesCache.add(article.id);
        await this.updateLocalCache();
        throw new Error('Article already archived');
      }
      throw new Error('Failed to archive article');
    }
  }

  async unarchiveArticle(token: string, articleId: string): Promise<void> {
    try {
      await axios.delete(
        `${API}/archive/article/${articleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update cache
      this.archivedArticlesCache.delete(articleId);
      await this.updateLocalCache();
    } catch (error) {
      throw new Error('Failed to unarchive article');
    }
  }

  async toggleArchiveStatus(token: string, article: any): Promise<boolean> {
    const isCurrentlyArchived = this.isArchived(article.id);
    
    if (isCurrentlyArchived) {
      await this.unarchiveArticle(token, article.id);
      return false;
    } else {
      await this.archiveArticle(token, article);
      return true;
    }
  }

  isArchived(articleId: string): boolean {
    return this.archivedArticlesCache.has(articleId);
  }

  getArchivedArticleIds(): string[] {
    return Array.from(this.archivedArticlesCache);
  }

  async getArchivedArticles(token: string, page = 1, limit = 20): Promise<ArchivedArticle[]> {
    try {
      const response = await axios.get(`${API}/archive/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit }
      });
      
      return response.data.articles;
    } catch (error) {
      console.error('Error fetching archived articles:', error);
      return [];
    }
  }

  private async updateLocalCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'archived_articles_cache', 
        JSON.stringify(Array.from(this.archivedArticlesCache))
      );
    } catch (error) {
      console.warn('Error updating archived articles cache:', error);
    }
  }

  // Clear cache (useful for logout)
  clearCache(): void {
    this.archivedArticlesCache.clear();
    this.isInitialized = false;
    AsyncStorage.removeItem('archived_articles_cache');
  }

  // Get count of archived articles
  getArchivedCount(): number {
    return this.archivedArticlesCache.size;
  }
}

export default ArchiveService;