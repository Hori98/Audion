/**
 * RSS Source Service - API integration for RSS source management
 * 簡素化版: モックデータを削除し、APIエラー時は適切なエラーハンドリングを実装
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
        throw new Error(`RSS sources search failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error searching RSS sources:', error);
      throw new Error(`Failed to search RSS sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        throw new Error(`RSS categories fetch failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching RSS categories:', error);
      throw new Error(`Failed to fetch RSS categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        throw new Error(`User RSS sources fetch failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching user RSS sources:', error);
      throw new Error(`Failed to fetch user RSS sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a new RSS source to user's collection
   */
  async addUserSource(request: AddUserSourceRequest, authToken?: string): Promise<UserRSSSource> {
    try {
      const response = await fetch(`${API_BASE_URL}/rss-sources/my-sources`, {
        method: 'POST',
        headers: await this.getAuthHeaders(authToken),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to add RSS source: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error adding RSS source:', error);
      throw new Error(`Failed to add RSS source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a user's RSS source
   */
  async removeUserSource(sourceId: string, authToken?: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/rss-sources/my-sources/${sourceId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders(authToken),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove RSS source: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error removing RSS source:', error);
      throw new Error(`Failed to remove RSS source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new RSSSourceService();