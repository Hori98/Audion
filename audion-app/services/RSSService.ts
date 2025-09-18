import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl, getAuthHeaders } from '../config/api';

export interface RSSSource {
  id: string;
  user_id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  source?: string;
  content?: string;
}

class RSSService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('@audion_auth_token');
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    const url = buildApiUrl(endpoint);
    
    console.log(`[RSS Service] Making request to: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token || undefined),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('❌ RSS Service API request failed:', errorData);
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetches all RSS sources for the current user.
   */
  async getUserRSSources(): Promise<RSSSource[]> {
    console.log('[RSS Service] Fetching user RSS sources...');
    return this.makeRequest<RSSSource[]>('/api/rss-sources');
  }

  /**
   * Adds a new RSS source for the user.
   */
  async addRSSSource(name: string, url: string): Promise<RSSSource> {
    console.log(`[RSS Service] Adding RSS source: ${name} - ${url}`);
    return this.makeRequest<RSSSource>('/api/rss-sources', {
      method: 'POST',
      body: JSON.stringify({ name, url }),
    });
  }

  /**
   * Updates an existing RSS source.
   */
  async updateRSSSource(sourceId: string, data: Partial<Pick<RSSSource, 'name' | 'url' | 'is_active'>>): Promise<{ message: string }> {
    console.log(`[RSS Service] Updating RSS source: ${sourceId}`);
    return this.makeRequest<{ message: string }>(`/api/rss-sources/${sourceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Deletes an RSS source.
   */
  async deleteRSSSource(sourceId: string): Promise<{ message: string }> {
    console.log(`[RSS Service] Deleting RSS source: ${sourceId}`);
    return this.makeRequest<{ message: string }>(`/api/rss-sources/${sourceId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get cache statistics (debug endpoint)
   */
  async getCacheStats(): Promise<any> {
    return this.makeRequest<any>('/api/rss-sources/cache/stats');
  }

  /**
   * Clear RSS cache (debug endpoint)
   */
  async clearCache(): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/api/rss-sources/cache/clear', {
      method: 'DELETE',
    });
  }
}

export default new RSSService();