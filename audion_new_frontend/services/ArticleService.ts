import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

export interface Article {
  id: string;
  title: string;
  summary: string;
  content?: string;
  link: string;
  source_name: string;
  published_at: string;
  category?: string;
  genre?: string;  // ジャンル情報追加（バックエンドからcategoryまたはgenreが来る）
  thumbnail_url?: string;
  reading_time: number;
  audio_available: boolean;
  created_at: string;
  updated_at: string;
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
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('❌ API request failed:', errorData);
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
        read_status: readInfo?.status || 'unread',
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