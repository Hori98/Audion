import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

export interface Article {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  source_name: string;
  published_at: string;
  category?: string;
  thumbnail_url?: string;
  reading_time: number;
  audio_available: boolean;
  created_at: string;
  updated_at: string;
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
  private async getAuthToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('@audion_auth_token');
    console.log('🔑 [ArticleService DEBUG] Token from AsyncStorage:', token ? 'EXISTS' : 'MISSING');
    if (token) {
      console.log('🔑 [ArticleService DEBUG] Token preview:', token.substring(0, 20) + '...');
    }
    return token;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    console.log('🌐 [ArticleService DEBUG] Making request to:', `${API_BASE_URL}${endpoint}`);
    console.log('🌐 [ArticleService DEBUG] With auth token:', token ? 'YES' : 'NO');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    console.log('🌐 [ArticleService DEBUG] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('❌ [ArticleService DEBUG] Request failed:', errorData);
      throw new Error(errorData.detail || 'Request failed');
    }

    return response.json();
  }

  async getArticles(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    genre?: string;
    search?: string;
    source_name?: string;
    source?: string;
  }): Promise<ArticleListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.genre) searchParams.append('genre', params.genre);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.source_name) searchParams.append('source_name', params.source_name);
    if (params?.source) searchParams.append('source', params.source);

    const queryString = searchParams.toString();
    const endpoint = `/articles${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<ArticleListResponse>(endpoint);
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
    return this.makeRequest<{ sources: string[] }>('/articles/sources/list');
  }

  async getArticleCategories(): Promise<{ categories: string[] }> {
    return this.makeRequest<{ categories: string[] }>('/articles/categories/list');
  }
}

export default new ArticleService();