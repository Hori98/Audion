/**
 * RSS Source Service - API integration for RSS source management
 * 簡素化版: モックデータを削除し、APIエラー時は適切なエラーハンドリングを実装
 */

import { API_BASE_URL } from './config';
import { extractErrorMessageFromResponse, extractErrorMessageFromError } from '../utils/apiError';

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
  name?: string; // custom_nameのエイリアス
  url?: string; // custom_urlのエイリアス
  is_active?: boolean; // アクティブ状態の更新用
}

class RSSSourceService {
  private async getAuthHeaders(authToken?: string): Promise<HeadersInit> {
    const token = authToken || await this.getStoredToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
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
    // Mock response since backend doesn't support search/categories yet
    console.warn('[RSS Source Service] searchSources called but not implemented in backend. Returning empty response.');
    return {
      sources: [],
      categories: [],
      total: 0,
      page: 1,
      per_page: 10,
      has_next: false
    };
  }

  /**
   * Get all RSS categories
   */
  async getCategories(authToken?: string): Promise<RSSCategory[]> {
    // Mock response since backend doesn't support categories yet
    console.warn('[RSS Source Service] getCategories called but not implemented in backend. Returning empty array.');
    return [];
  }

  /**
   * Get user's RSS sources
   */
  async getUserSources(params: {
    category?: string;
    is_active?: boolean;
  } = {}, authToken?: string): Promise<UserRSSSource[]> {
    try {
      // Check if authentication token is available
      const token = authToken || await this.getStoredToken();
      if (!token) {
        console.warn('[RSS Source Service] No authentication token available, returning empty sources');
        return [];
      }

      // Use the correct backend endpoint
      const response = await fetch(`${API_BASE_URL}/api/rss-sources`, {
        method: 'GET',
        headers: await this.getAuthHeaders(authToken),
      });

      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          console.warn('[RSS Source Service] Authentication failed, returning empty sources');
          return [];
        }
        if (response.status === 422) {
          console.warn('[RSS Source Service] Request validation failed, returning empty sources');
          return [];
        }
        throw new Error(`User RSS sources fetch failed: ${response.status} ${response.statusText}`);
      }

      const sources = await response.json();
      
      // Convert backend format to frontend format
      return sources.map((source: any) => ({
        id: source.id,
        user_id: source.user_id,
        custom_name: source.name,
        custom_url: source.url,
        is_active: source.is_active,
        notification_enabled: false,
        last_article_count: 0,
        fetch_error_count: 0,
        created_at: source.created_at,
        display_name: source.name,
        display_url: source.url
      }));
    } catch (error) {
      console.error('Error fetching user RSS sources:', error);
      // Return empty array instead of throwing error for better UX
      console.warn('[RSS Source Service] Returning empty sources due to error');
      return [];
    }
  }

  /**
   * Add a new RSS source to user's collection
   */
  async addUserSource(request: AddUserSourceRequest, authToken?: string): Promise<UserRSSSource> {
    try {
      // Prefer direct name/url if provided, otherwise use flexible add endpoint
      const name = request.custom_name || request.name;
      const url = request.custom_url || request.url;
      const hasNameUrl = Boolean(name) && Boolean(url);

      const endpoint = hasNameUrl ? '/api/rss-sources' : '/api/rss-sources/add';
      const payload = hasNameUrl
        ? { name, url }
        : {
            preconfigured_source_id: request.preconfigured_source_id,
            custom_name: request.custom_name,
            custom_url: request.custom_url,
            custom_category: request.custom_category,
            custom_alias: request.custom_alias,
            is_active: request.is_active ?? true,
          };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: await this.getAuthHeaders(authToken),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const formatted = await extractErrorMessageFromResponse(response);
        throw new Error(`Failed to add RSS source: ${formatted}`);
      }

      const source = await response.json();

      // Normalize backend format to frontend format
      if (hasNameUrl) {
        return {
          id: source.id,
          user_id: source.user_id,
          custom_name: source.name,
          custom_url: source.url,
          is_active: source.is_active,
          notification_enabled: false,
          last_article_count: 0,
          fetch_error_count: 0,
          created_at: source.created_at,
          display_name: source.name,
          display_url: source.url,
        } as UserRSSSource;
      }

      // Flexible add endpoint response mapping
      return {
        id: source.id,
        user_id: source.user_id,
        custom_name: source.custom_name,
        custom_url: source.custom_url,
        is_active: source.is_active ?? true,
        notification_enabled: source.notification_enabled ?? false,
        last_article_count: source.last_article_count ?? 0,
        fetch_error_count: source.fetch_error_count ?? 0,
        created_at: source.created_at || new Date().toISOString(),
        display_name: source.display_name || source.custom_name,
        display_url: source.display_url || source.custom_url,
      } as UserRSSSource;
    } catch (error) {
      console.error('Error adding RSS source:', error);
      const errorMessage = extractErrorMessageFromError(error);
      throw new Error(`Failed to add RSS source: ${errorMessage}`);
    }
  }

  /**
   * Remove a user's RSS source
   */
  async removeUserSource(sourceId: string, authToken?: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rss-sources/${sourceId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders(authToken),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove RSS source: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error removing RSS source:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Failed to remove RSS source: ${errorMessage}`);
    }
  }

  /**
   * Update a user's RSS source
   */
  async updateUserSource(sourceId: string, request: Partial<AddUserSourceRequest>, authToken?: string): Promise<UserRSSSource> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rss-sources/${sourceId}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(authToken),
        body: JSON.stringify({
          name: request.custom_name || request.name,
          url: request.custom_url || request.url,
          is_active: request.is_active
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to update RSS source: ${response.status} ${response.statusText}`);
      }

      const source = await response.json();
      
      // Convert backend format to frontend format
      return {
        id: source.id,
        user_id: source.user_id,
        custom_name: source.name,
        custom_url: source.url,
        is_active: source.is_active,
        notification_enabled: false,
        last_article_count: 0,
        fetch_error_count: 0,
        created_at: source.created_at,
        display_name: source.name,
        display_url: source.url
      };
    } catch (error) {
      console.error('Error updating RSS source:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Failed to update RSS source: ${errorMessage}`);
    }
  }

  /**
   * Delete a user's RSS source (alias for removeUserSource for consistency)
   */
  async deleteUserSource(sourceId: string, authToken?: string): Promise<void> {
    return this.removeUserSource(sourceId, authToken);
  }
}

export default new RSSSourceService();
