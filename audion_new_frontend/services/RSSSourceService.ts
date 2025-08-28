/**
 * RSS Source Service - API integration for RSS source management
 * Connects to backend RSS endpoints for source discovery and management
 */

import { API_BASE_URL } from './config';

export interface RSSCategory {
  id: string;
  name: string;
  name_ja?: string;
  description?: string;
  icon?: string;
  color: string;
  sort_order: number;
}

export interface PreConfiguredRSSSource {
  id: string;
  name: string;
  description?: string;
  url: string;
  category: string;
  language: string;
  country: string;
  favicon_url?: string;
  website_url?: string;
  popularity_score: number;
  reliability_score: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

export interface UserRSSSource {
  id: string;
  user_id: string;
  preconfigured_source_id?: string;
  custom_name?: string;
  custom_url?: string;
  custom_category?: string;
  custom_alias?: string;
  is_active: boolean;
  notification_enabled: boolean;
  last_fetched?: string;
  last_article_count: number;
  fetch_error_count: number;
  created_at: string;
  display_name?: string;
  display_url?: string;
  display_category?: string;
}

export interface RSSSourceSearchResponse {
  sources: PreConfiguredRSSSource[];
  categories: RSSCategory[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface AddUserSourceRequest {
  preconfigured_source_id?: string;
  custom_name?: string;
  custom_url?: string;
  custom_category?: string;
  custom_alias?: string;
  notification_enabled?: boolean;
}

class RSSSourceService {
  private async getAuthHeaders(authToken?: string): Promise<HeadersInit> {
    const token = authToken || await this.getStoredToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      // For React Native, we'll use AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('@audion_auth_token');
    } catch (error) {
      console.error('Failed to get stored token:', error);
      return null;
    }
  }

  /**
   * Search pre-configured RSS sources
   */
  async searchSources(params: {
    query?: string;
    category?: string;
    language?: string;
    page?: number;
    per_page?: number;
  } = {}, authToken?: string): Promise<RSSSourceSearchResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.set('query', params.query);
    if (params.category) searchParams.set('category', params.category);
    if (params.language) searchParams.set('language', params.language || 'ja');
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.per_page) searchParams.set('per_page', params.per_page.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/rss-sources/search?${searchParams}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(authToken),
      });

      if (!response.ok) {
        // Return mock data for testing
        console.log('🔧 [MOCK RSS SOURCES] Using mock data due to 404');
        return {
          sources: [
            {
              id: 'nhk-news',
              name: 'NHK NEWS WEB',
              description: 'NHKの最新ニュース',
              url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
              category: 'news',
              language: 'ja',
              country: 'JP',
              favicon_url: 'https://www3.nhk.or.jp/favicon.ico',
              website_url: 'https://www3.nhk.or.jp/news/',
              popularity_score: 95,
              reliability_score: 98,
              is_active: true,
              is_featured: true,
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 'nikkei-tech',
              name: '日本経済新聞 テクノロジー',
              description: '日経のテクノロジーニュース',
              url: 'https://www.nikkei.com/rss/technology/',
              category: 'technology',
              language: 'ja',
              country: 'JP',
              favicon_url: 'https://www.nikkei.com/favicon.ico',
              website_url: 'https://www.nikkei.com/',
              popularity_score: 88,
              reliability_score: 95,
              is_active: true,
              is_featured: true,
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          total: 2,
          page: 1,
          per_page: 50,
          has_next: false
        };
      }

      return response.json();
    } catch (error) {
      console.log('🔧 [MOCK RSS SOURCES] Using mock data due to error:', error);
      return {
        sources: [
          {
            id: 'mock-source',
            name: 'Mock RSS Source',
            description: 'Mock data for testing',
            url: 'https://example.com/rss',
            category: 'news',
            language: 'ja',
            country: 'JP',
            favicon_url: '',
            website_url: 'https://example.com',
            popularity_score: 50,
            reliability_score: 50,
            is_active: true,
            is_featured: false,
            created_at: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        per_page: 50,
        has_next: false
      };
    }
  }

  /**
   * Get all RSS categories
   */
  async getCategories(authToken?: string): Promise<RSSCategory[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/rss-sources/categories`, {
        method: 'GET',
        headers: await this.getAuthHeaders(authToken),
      });

      if (!response.ok) {
        // Return mock data for testing
        console.log('🔧 [MOCK RSS CATEGORIES] Using mock data due to 404');
        return [
          {
            id: 'news',
            name: 'News',
            name_ja: 'ニュース', 
            description: 'General news and current events',
            icon: '📰',
            color: '#FF6B6B',
            sort_order: 1
          },
          {
            id: 'technology',
            name: 'Technology',
            name_ja: 'テクノロジー',
            description: 'Technology and innovation news',
            icon: '💻',
            color: '#4ECDC4',
            sort_order: 2
          },
          {
            id: 'business',
            name: 'Business',
            name_ja: 'ビジネス',
            description: 'Business and finance news',
            icon: '💼',
            color: '#45B7D1',
            sort_order: 3
          }
        ];
      }

      return response.json();
    } catch (error) {
      console.log('🔧 [MOCK RSS CATEGORIES] Using mock data due to error:', error);
      return [
        {
          id: 'news',
          name: 'News',
          name_ja: 'ニュース',
          description: 'General news and current events',
          icon: '📰',
          color: '#FF6B6B',
          sort_order: 1
        }
      ];
    }
  }

  /**
   * Get user's RSS sources
   */
  async getUserSources(params: {
    category?: string;
    is_active?: boolean;
  } = {}, authToken?: string): Promise<UserRSSSource[]> {
    const searchParams = new URLSearchParams();
    
    if (params.category) searchParams.set('category', params.category);
    if (params.is_active !== undefined) searchParams.set('is_active', params.is_active.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/rss-sources/my-sources?${searchParams}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(authToken),
      });

      if (!response.ok) {
        // Return mock data for testing
        console.log('🔧 [MOCK USER RSS SOURCES] Using mock data due to 404');
        return [
          {
            id: 'user-source-1',
            user_id: 'user-123',
            preconfigured_source_id: 'nhk-news',
            custom_alias: 'NHK ニュース',
            is_active: true,
            notification_enabled: true,
            last_article_count: 15,
            fetch_error_count: 0,
            created_at: '2024-01-15T10:00:00Z',
            display_name: 'NHK NEWS WEB',
            display_url: 'https://www3.nhk.or.jp/rss/news/cat0.xml'
          },
          {
            id: 'user-source-2',
            user_id: 'user-123',
            preconfigured_source_id: 'nikkei-tech',
            custom_alias: '日経テック',
            is_active: true,
            notification_enabled: false,
            last_article_count: 8,
            fetch_error_count: 0,
            created_at: '2024-01-20T14:30:00Z',
            display_name: '日本経済新聞 テクノロジー',
            display_url: 'https://www.nikkei.com/rss/technology/'
          }
        ];
      }

      return response.json();
    } catch (error) {
      console.log('🔧 [MOCK USER RSS SOURCES] Using mock data due to error:', error);
      return [
        {
          id: 'mock-user-source',
          user_id: 'user-123',
          custom_name: 'Mock User Source',
          custom_url: 'https://example.com/rss',
          custom_category: 'news',
          is_active: true,
          notification_enabled: true,
          last_article_count: 5,
          fetch_error_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          display_name: 'Mock User Source'
        }
      ];
    }
  }

  /**
   * Add RSS source to user's collection
   */
  async addUserSource(sourceData: AddUserSourceRequest, authToken?: string): Promise<UserRSSSource> {
    const response = await fetch(`${API_BASE_URL}/rss-sources/add`, {
      method: 'POST',
      headers: await this.getAuthHeaders(authToken),
      body: JSON.stringify(sourceData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to add RSS source: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Remove RSS source from user's collection
   */
  async removeUserSource(sourceId: string, authToken?: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/rss-sources/${sourceId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to remove RSS source: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update RSS source settings
   */
  async updateUserSource(
    sourceId: string, 
    updates: { [key: string]: any },
    authToken?: string
  ): Promise<UserRSSSource> {
    const response = await fetch(`${API_BASE_URL}/rss-sources/${sourceId}`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(authToken),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to update RSS source: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get featured RSS sources
   */
  async getFeaturedSources(params: {
    language?: string;
    limit?: number;
  } = {}, authToken?: string): Promise<PreConfiguredRSSSource[]> {
    const searchParams = new URLSearchParams();
    
    if (params.language) searchParams.set('language', params.language || 'ja');
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/rss-sources/featured?${searchParams}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to get featured RSS sources: ${response.statusText}`);
    }

    return response.json();
  }
}

export default new RSSSourceService();