/**
 * Audio Service - API integration for audio generation and management
 * Connects to backend audio endpoints for content generation and playback
 */

import { API_CONFIG, API_ENDPOINTS, buildApiUrl } from '../config/api';
import { extractErrorMessageFromResponse } from '../utils/apiError';

export interface AudioCreateRequest {
  article_id: string;
  title?: string;
  language?: string;
  voice_type?: string;
}

export interface ManualPickRequest {
  article_ids: string[];
  article_titles: string[];
  article_urls?: string[];
  article_summaries?: string[];
  article_contents?: string[];
  voice_language?: string;
  voice_name?: string;
  prompt_style?: string;
  custom_prompt?: string;
}

export interface AutoPickRequest {
  max_articles?: number;
  voice_language?: string;
  voice_name?: string;
  prompt_style?: string;
  custom_prompt?: string;
  preferred_genres?: string[];
  excluded_genres?: string[];
  source_scope?: 'fixed' | 'user';
}

export interface UnifiedAudioResponse {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  script: string;
  voice_language: string;
  voice_name: string;
  chapters?: any[];
  articles_count: number;
  generation_mode: string;
  created_at: string;
}

export interface AutoPickTaskStartResponse {
  task_id: string;
  message: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface AudioGenerationResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  estimated_duration: number; // seconds
}

export interface AudioStatusResponse {
  audio_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress_percent: number;
  message: string;
}

export interface AudioContentResponse {
  id: string;
  user_id: string;
  article_id: string;
  title: string;
  original_article_title?: string;
  audio_url?: string;
  script?: string;
  duration?: number;
  file_size?: number;
  language: string;
  voice_type: string;
  status: 'processing' | 'completed' | 'failed';
  play_count: number;
  last_played_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AudioLibraryResponse {
  audio_contents: AudioContentResponse[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

class AudioService {
  // Lightweight cache for audio library
  private libraryCache: { key: string; data: AudioLibraryResponse; ts: number } | null = null;
  private libraryTTL = 10_000; // 10 seconds

  public invalidateLibraryCache(): void {
    this.libraryCache = null;
  }
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
   * Generate audio content from article
   */
  async generateAudio(
    request: AudioCreateRequest,
    authToken?: string
  ): Promise<AudioGenerationResponse> {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AUDIO.CREATE), {
      method: 'POST',
      headers: await this.getAuthHeaders(authToken),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      throw new Error(msg || `Failed to generate audio: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate audio from manually selected articles
   */
  async generateManualPickAudio(
    request: ManualPickRequest,
    authToken?: string
  ): Promise<AudioGenerationResponse> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUDIO_V2.MANUAL}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(authToken),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      throw new Error(msg || `Failed to generate manual pick audio: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate audio via Auto-Pick (unified endpoint)
   */
  async generateAutoPickAudio(
    request: AutoPickRequest,
    authToken?: string
  ): Promise<UnifiedAudioResponse> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUDIO_V2.AUTOPICK}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(authToken),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      throw new Error(msg || `Failed to generate Auto-Pick audio: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Start Auto-Pick task for progress monitoring
   */
  async startAutoPickTask(
    request: AutoPickRequest,
    authToken?: string
  ): Promise<AutoPickTaskStartResponse> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTOPICK_TASK.START}`, {
      method: 'POST',
      headers: await this.getAuthHeaders(authToken),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      throw new Error(msg || `Failed to start Auto-Pick task: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get audio generation status
   */
  async getAudioStatus(
    audioId: string,
    authToken?: string
  ): Promise<AudioStatusResponse> {
    const response = await fetch(buildApiUrl(`/api/audio/status/${audioId}`), {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      throw new Error(msg || `Failed to get audio status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's audio library
   */
  async getAudioLibrary(params: {
    page?: number;
    per_page?: number;
  } = {}, authToken?: string): Promise<AudioLibraryResponse> {
    try {
      // Check if authentication token is available
      const token = authToken || await this.getStoredToken();
      if (!token) {
        console.warn('[Audio Service] No authentication token available, returning empty library');
        return {
          audio_contents: [],
          total: 0,
          page: params.page || 1,
          per_page: params.per_page || 20,
          has_next: false
        };
      }

      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.per_page) searchParams.set('per_page', params.per_page.toString());

      const cacheKey = `${params.page || 1}-${params.per_page || 20}-${token.substring(0,8)}`;
      const now = Date.now();
      if (this.libraryCache && this.libraryCache.key === cacheKey && (now - this.libraryCache.ts) < this.libraryTTL) {
        return this.libraryCache.data;
      }

      const response = await fetch(buildApiUrl(`${API_ENDPOINTS.AUDIO.LIST}?${searchParams}`), {
        method: 'GET',
        headers: await this.getAuthHeaders(authToken),
      });

      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          console.warn('[Audio Service] Authentication failed, returning empty library');
          return {
            audio_contents: [],
            total: 0,
            page: params.page || 1,
            per_page: params.per_page || 20,
            has_next: false
          };
        }
        if (response.status === 422) {
          console.warn('[Audio Service] Request validation failed, returning empty library');
          return {
            audio_contents: [],
            total: 0,
            page: params.page || 1,
            per_page: params.per_page || 20,
            has_next: false
          };
        }
        const msg = await extractErrorMessageFromResponse(response);
        throw new Error(msg || `Failed to get audio library: ${response.statusText}`);
      }

      const data = await response.json();
      this.libraryCache = { key: cacheKey, data, ts: now };
      return data;
    } catch (error) {
      console.error('Error fetching audio library:', error);
      // Return empty library instead of throwing error for better UX
      console.warn('[Audio Service] Returning empty library due to error');
      return {
        audio_contents: [],
        total: 0,
        page: params.page || 1,
        per_page: params.per_page || 20,
        has_next: false
      };
    }
  }

  /**
   * Get single audio content
   */
  async getAudioContent(
    audioId: string,
    authToken?: string
  ): Promise<AudioContentResponse> {
    const response = await fetch(buildApiUrl(`/api/audio/${audioId}`), {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      throw new Error(msg || `Failed to get audio content: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete audio content
   */
  async deleteAudioContent(
    audioId: string,
    authToken?: string
  ): Promise<{ message: string }> {
    const response = await fetch(buildApiUrl(`/api/audio/${audioId}`), {
      method: 'DELETE',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const msg = await extractErrorMessageFromResponse(response);
      throw new Error(msg || `Failed to delete audio: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Record audio play (for analytics)
   */
  async recordAudioPlay(
    audioId: string,
    authToken?: string
  ): Promise<{ message: string; play_count: number }> {
    const response = await fetch(buildApiUrl(`/api/audio/${audioId}/play`), {
      method: 'POST',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to record play: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Poll audio generation status until completion
   * Useful for showing progress to users
   */
  async pollAudioStatus(
    audioId: string,
    authToken?: string,
    onProgress?: (status: AudioStatusResponse) => void,
    pollingInterval: number = 5000 // 5 seconds
  ): Promise<AudioStatusResponse> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getAudioStatus(audioId, authToken);
          
          if (onProgress) {
            onProgress(status);
          }
          
          if (status.status === 'completed') {
            resolve(status);
          } else if (status.status === 'failed') {
            reject(new Error(`Audio generation failed: ${status.message}`));
          } else {
            // Continue polling if still processing
            setTimeout(poll, pollingInterval);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }
}

export default new AudioService();
