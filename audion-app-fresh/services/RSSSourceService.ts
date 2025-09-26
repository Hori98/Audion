/**
 * RSS Source Service - API integration for RSS source management
 * 簡素化版: モックデータを削除し、APIエラー時は適切なエラーハンドリングを実装
 */

import { API_CONFIG, API_ENDPOINTS, buildApiUrl } from '../config/api';
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
  name: string;                    // バックエンドから直接提供される
  url: string;                     // バックエンドから直接提供される
  is_active: boolean;
  notification_enabled: boolean;
  last_article_count: number;
  fetch_error_count: number;
  created_at: string;

  // 後方互換性のための追加プロパティ（オプション）
  preconfigured_source_id?: string;
  custom_name?: string;
  custom_url?: string;
  custom_category?: string;
  custom_alias?: string;
  last_fetched?: string;
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
   * Clear backend RSS cache
   */
  async clearCache(authToken?: string): Promise<void> {
    try {
      const res = await fetch(buildApiUrl('/api/rss-sources/cache/clear'), {
        method: 'DELETE',
        headers: await this.getAuthHeaders(authToken),
      });
      if (!res.ok) {
        const msg = await extractErrorMessageFromResponse(res);
        throw new Error(msg);
      }
    } catch (e) {
      console.warn('[RSS Source Service] Failed to clear RSS cache:', e);
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
    if (__DEV__) {
      console.log('[RSS Source Service] getCategories called but not implemented in backend. Returning empty array.');
    }
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
      const response = await fetch(buildApiUrl(API_ENDPOINTS.RSS.LIST), {
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
        name: source.name,            // 直接マッピング
        url: source.url,              // 直接マッピング
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
      const token = authToken || await this.getStoredToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      const name = request.custom_name || request.name;
      const url = request.custom_url || request.url;

      if (!name || !url) {
        throw new Error('Name and URL are required to add a new RSS source.');
      }

      const payload = { name, url };

      const response = await fetch(buildApiUrl(API_ENDPOINTS.RSS.ADD), {
        method: 'POST',
        headers: await this.getAuthHeaders(token),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const formatted = await extractErrorMessageFromResponse(response);
        throw new Error(`Failed to add RSS source: ${formatted}`);
      }

      const source = await response.json();

      // Normalize backend format to frontend format
      return {
        id: source.id,
        user_id: source.user_id,
        name: source.name,
        url: source.url,
        is_active: source.is_active,
        notification_enabled: false,
        last_article_count: 0,
        fetch_error_count: 0,
        created_at: source.created_at,
        display_name: source.name,
        display_url: source.url,
      } as UserRSSSource;
    } catch (error) {
      console.error('Error adding RSS source:', error);
      const errorMessage = extractErrorMessageFromError(error);
      throw new Error(`Failed to add RSS source: ${errorMessage}`);
    }
  }

  /**
   * Remove a user's RSS source
   * 現在は削除の代わりに非アクティブ化を使用（バックエンドの削除APIに問題があるため）
   */
  async removeUserSource(sourceId: string, authToken?: string): Promise<void> {
    try {
      console.log(`[RSS Source Service] Attempting to delete RSS source: ${sourceId}`);

      // 1) まずは正規の削除エンドポイントを試す
      const deleteUrl = buildApiUrl(API_ENDPOINTS.RSS.DELETE_ID.replace('{id}', sourceId));
      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: await this.getAuthHeaders(authToken),
      });

      if (delRes.ok) {
        console.log(`[RSS Source Service] Successfully deleted RSS source: ${sourceId}`);
        return;
      }

      // 2) 削除が不可（405/404など）の場合は非アクティブ化にフォールバック
      console.warn('[RSS Source Service] Delete failed, falling back to deactivation');
      await this.updateUserSource(sourceId, { is_active: false }, authToken);
      console.log(`[RSS Source Service] Successfully deactivated RSS source: ${sourceId}`);
    } catch (error) {
      console.error('Error removing RSS source:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Failed to remove RSS source: ${errorMessage}`);
    }
  }

  /**
   * Update a user's RSS source (only is_active status)
   */
  async updateUserSource(sourceId: string, request: { is_active: boolean }, authToken?: string): Promise<void> {
    try {
      const token = authToken || (await this.getStoredToken());
      if (!token) {
        throw new Error('Authentication required');
      }

      // バックエンドが要求する形式に合わせる
      const payload = {
        credentials: { scheme: 'Bearer', credentials: token },
        update_data: { is_active: request.is_active }
      };

      const updateUrl = buildApiUrl(API_ENDPOINTS.RSS.UPDATE_ID.replace('{id}', sourceId));
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: await this.getAuthHeaders(token),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Failed to update RSS source: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((err: any) => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
            } else {
              errorMessage = JSON.stringify(errorData.detail);
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

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
