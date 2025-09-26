/**
 * SchedulePick Service
 * スケジュール音声生成機能のサービス層
 */

import { apiClient } from './apiClient';
import { ScheduleProfile } from '../context/SettingsContext';

// バックエンドAPIとの互換性のための型定義
export interface BackendScheduleCreateRequest {
  schedule_name: string;
  generation_time: string; // "HH:MM"
  generation_days: string[]; // ["monday", "tuesday", ...]
  timezone: string;
  preferences?: {
    max_articles: number;
    preferred_genres?: string[];
    excluded_genres?: string[];
    preferred_sources?: string[];
    excluded_sources?: string[];
    voice_language: string;
    voice_name: string;
    prompt_style: string;
    custom_prompt?: string;
  };
}

export interface BackendScheduleUpdateRequest {
  schedule_name?: string;
  generation_time?: string;
  generation_days?: string[];
  timezone?: string;
  status?: 'active' | 'inactive' | 'paused';
  preferences?: {
    max_articles?: number;
    preferred_genres?: string[];
    excluded_genres?: string[];
    preferred_sources?: string[];
    excluded_sources?: string[];
    voice_language?: string;
    voice_name?: string;
    prompt_style?: string;
    custom_prompt?: string;
  };
}

export interface BackendScheduleResponse {
  id: string;
  schedule_name: string;
  generation_time: string;
  generation_days: string[];
  timezone: string;
  status: 'active' | 'inactive' | 'paused';
  preferences: {
    max_articles: number;
    preferred_genres?: string[];
    excluded_genres?: string[];
    preferred_sources?: string[];
    excluded_sources?: string[];
    voice_language: string;
    voice_name: string;
    prompt_style: string;
    custom_prompt?: string;
  };
  last_generated_at?: string;
  last_generated_playlist_id?: string;
  next_generation_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPlaylistResponse {
  id: string;
  schedule_id: string;
  playlist_title: string;
  audio_url?: string;
  duration?: number;
  script?: string;
  articles_count: number;
  chapters?: Array<{ title: string; start_time: number; end_time: number }>;
  generation_status: string;
  generated_at: string;
  expires_at?: string;
}

class SchedulePickService {
  private readonly ENDPOINTS = {
    SCHEDULES: '/api/schedules',
    SCHEDULE_BY_ID: (id: string) => `/api/schedules/${id}`,
    SCHEDULED_PLAYLISTS: '/api/scheduled-playlists',
    SCHEDULER_STATUS: '/api/scheduler/status',
  };

  /**
   * フロントエンドScheduleProfileからバックエンド形式に変換
   */
  private convertToBackendFormat(profile: Omit<ScheduleProfile, 'id'>): BackendScheduleCreateRequest {
    // 曜日の変換：数値インデックス → 文字列
    const dayMapping = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const generation_days = profile.days?.map(dayIndex => dayMapping[dayIndex]) || [];

    return {
      schedule_name: profile.name,
      generation_time: profile.time,
      generation_days,
      timezone: 'Asia/Tokyo',
      preferences: {
        max_articles: profile.maxArticles,
        preferred_genres: profile.genres.length > 0 ? profile.genres : undefined,
        voice_language: 'ja-JP',
        voice_name: 'alloy',
        prompt_style: 'standard',
        custom_prompt: profile.promptTemplate,
      },
    };
  }

  /**
   * バックエンド形式からフロントエンドScheduleProfileに変換
   */
  private convertFromBackendFormat(backendSchedule: BackendScheduleResponse): ScheduleProfile {
    // 曜日の変換：文字列 → 数値インデックス
    const dayMapping = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    const days = backendSchedule.generation_days.map(day => dayMapping[day as keyof typeof dayMapping]);

    // 頻度の推定
    let frequency: 'daily' | 'weekly' | 'custom' = 'custom';
    if (days.length === 7) {
      frequency = 'daily';
    } else if (days.length > 0 && days.length <= 6) {
      frequency = 'weekly';
    }

    return {
      id: backendSchedule.id,
      enabled: backendSchedule.status === 'active',
      name: backendSchedule.schedule_name,
      frequency,
      days,
      time: backendSchedule.generation_time,
      genres: backendSchedule.preferences.preferred_genres || [],
      sources: backendSchedule.preferences.preferred_sources || [],
      maxArticles: backendSchedule.preferences.max_articles,
      promptTemplate: backendSchedule.preferences.custom_prompt,
    };
  }

  /**
   * ユーザーのスケジュール一覧を取得
   */
  async getUserSchedules(): Promise<ScheduleProfile[]> {
    try {
      const response = await apiClient.get<BackendScheduleResponse[]>(this.ENDPOINTS.SCHEDULES);
      return response.data.map(schedule => this.convertFromBackendFormat(schedule));
    } catch (error) {
      console.error('[SchedulePickService] Failed to get user schedules:', error);
      // バックエンド未実装時はローカルストレージから取得
      return [];
    }
  }

  /**
   * 新しいスケジュールを作成
   */
  async createSchedule(profile: Omit<ScheduleProfile, 'id'>): Promise<string> {
    try {
      const backendRequest = this.convertToBackendFormat(profile);
      const response = await apiClient.post<BackendScheduleResponse>(
        this.ENDPOINTS.SCHEDULES,
        backendRequest
      );
      return response.data.id;
    } catch (error) {
      console.error('[SchedulePickService] Failed to create schedule:', error);
      // バックエンド未実装時はローカルIDを生成
      return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * スケジュールを更新
   */
  async updateSchedule(id: string, updates: Partial<ScheduleProfile>): Promise<void> {
    try {
      const updateRequest: BackendScheduleUpdateRequest = {};

      if (updates.name !== undefined) updateRequest.schedule_name = updates.name;
      if (updates.time !== undefined) updateRequest.generation_time = updates.time;
      if (updates.enabled !== undefined) {
        updateRequest.status = updates.enabled ? 'active' : 'inactive';
      }

      if (updates.days !== undefined) {
        const dayMapping = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        updateRequest.generation_days = updates.days.map(dayIndex => dayMapping[dayIndex]);
      }

      if (updates.maxArticles !== undefined || updates.genres !== undefined || updates.promptTemplate !== undefined) {
        updateRequest.preferences = {};
        if (updates.maxArticles !== undefined) updateRequest.preferences.max_articles = updates.maxArticles;
        if (updates.genres !== undefined) updateRequest.preferences.preferred_genres = updates.genres;
        if (updates.promptTemplate !== undefined) updateRequest.preferences.custom_prompt = updates.promptTemplate;
      }

      await apiClient.put(this.ENDPOINTS.SCHEDULE_BY_ID(id), updateRequest);
    } catch (error) {
      console.error('[SchedulePickService] Failed to update schedule:', error);
      // バックエンド未実装時は無視（ローカルストレージで管理）
    }
  }

  /**
   * スケジュールを削除
   */
  async deleteSchedule(id: string): Promise<void> {
    try {
      await apiClient.delete(this.ENDPOINTS.SCHEDULE_BY_ID(id));
    } catch (error) {
      console.error('[SchedulePickService] Failed to delete schedule:', error);
      // バックエンド未実装時は無視（ローカルストレージで管理）
    }
  }

  /**
   * スケジュール生成履歴を取得
   */
  async getScheduledPlaylists(scheduleId?: string): Promise<ScheduledPlaylistResponse[]> {
    try {
      const params = scheduleId ? { schedule_id: scheduleId } : {};
      const response = await apiClient.get<ScheduledPlaylistResponse[]>(
        this.ENDPOINTS.SCHEDULED_PLAYLISTS,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('[SchedulePickService] Failed to get scheduled playlists:', error);
      return [];
    }
  }

  /**
   * スケジューラーサービスの状態を取得
   */
  async getSchedulerStatus(): Promise<{
    running: boolean;
    available: boolean;
    jobs_count: number;
    jobs: Array<{
      id: string;
      name: string;
      next_run_time: string | null;
      trigger: string;
    }>;
    reason?: string;
  }> {
    try {
      const response = await apiClient.get(this.ENDPOINTS.SCHEDULER_STATUS);
      return response.data;
    } catch (error) {
      console.error('[SchedulePickService] Failed to get scheduler status:', error);
      return {
        running: false,
        available: false,
        jobs_count: 0,
        jobs: [],
        reason: 'Backend not available'
      };
    }
  }

  /**
   * 手動でスケジュール実行をトリガー（デバッグ用）
   */
  async triggerSchedule(scheduleId: string): Promise<void> {
    try {
      await apiClient.post(`${this.ENDPOINTS.SCHEDULE_BY_ID(scheduleId)}/trigger`);
    } catch (error) {
      console.error('[SchedulePickService] Failed to trigger schedule:', error);
      throw error;
    }
  }
}

export default new SchedulePickService();