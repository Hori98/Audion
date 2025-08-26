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

    const response = await fetch(`${API_BASE_URL}/api/v1/rss-sources/search?${searchParams}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to search RSS sources: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all RSS categories
   */
  async getCategories(authToken?: string): Promise<RSSCategory[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/rss-sources/categories`, {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to get RSS categories: ${response.statusText}`);
    }

    return response.json();
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

    const response = await fetch(`${API_BASE_URL}/api/v1/rss-sources/my-sources?${searchParams}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      throw new Error(`Failed to get user RSS sources: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Add RSS source to user's collection
   */
  async addUserSource(sourceData: AddUserSourceRequest, authToken?: string): Promise<UserRSSSource> {
    const response = await fetch(`${API_BASE_URL}/api/v1/rss-sources/add`, {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/rss-sources/${sourceId}`, {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/rss-sources/${sourceId}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/v1/rss-sources/featured?${searchParams}`, {
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