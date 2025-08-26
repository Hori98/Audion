/**
 * Audio Service - API integration for audio generation and management
 * Connects to backend audio endpoints for content generation and playback
 */

import { API_BASE_URL } from './config';

export interface AudioCreateRequest {
  article_id: string;
  title?: string;
  language?: string;
  voice_type?: string;
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
   * Generate audio content from article
   */
  async generateAudio(
    request: AudioCreateRequest,
    authToken?: string
  ): Promise<AudioGenerationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/audio/generate`, {
      method: 'POST',
      headers: await this.getAuthHeaders(authToken),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to generate audio: ${response.statusText}`);
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
    const response = await fetch(`${API_BASE_URL}/api/v1/audio/status/${audioId}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to get audio status: ${response.statusText}`);
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
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.per_page) searchParams.set('per_page', params.per_page.toString());

    const response = await fetch(`${API_BASE_URL}/api/v1/audio/library?${searchParams}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to get audio library: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get single audio content
   */
  async getAudioContent(
    audioId: string,
    authToken?: string
  ): Promise<AudioContentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/audio/${audioId}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to get audio content: ${response.statusText}`);
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
    const response = await fetch(`${API_BASE_URL}/api/v1/audio/${audioId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(authToken),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to delete audio: ${response.statusText}`);
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
    const response = await fetch(`${API_BASE_URL}/api/v1/audio/${audioId}/play`, {
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