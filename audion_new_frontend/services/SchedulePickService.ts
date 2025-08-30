/**
 * SchedulePick Service
 * スケジュール音声生成機能のフロントエンドサービス
 */

import { authService } from './AuthService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.11.34:8003';

// Types
export interface SchedulePreferences {
  max_articles: number;
  preferred_genres?: string[];
  excluded_genres?: string[];
  preferred_sources?: string[];
  excluded_sources?: string[];
  keywords?: string[];
  voice_language: string;
  voice_name: string;
  prompt_style: string;
  custom_prompt?: string;
}

export interface Schedule {
  id: string;
  schedule_name: string;
  generation_time: string; // HH:MM format
  generation_days: DayOfWeek[];
  timezone: string;
  status: 'active' | 'inactive' | 'paused';
  preferences: SchedulePreferences;
  last_generated_at?: string;
  last_generated_playlist_id?: string;
  next_generation_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreateRequest {
  schedule_name: string;
  generation_time: string;
  generation_days: DayOfWeek[];
  timezone?: string;
  preferences?: Partial<SchedulePreferences>;
}

export interface ScheduleUpdateRequest {
  schedule_name?: string;
  generation_time?: string;
  generation_days?: DayOfWeek[];
  timezone?: string;
  status?: 'active' | 'inactive' | 'paused';
  preferences?: Partial<SchedulePreferences>;
}

export interface ScheduledPlaylist {
  id: string;
  schedule_id: string;
  playlist_title: string;
  audio_url?: string;
  duration?: number;
  script?: string;
  articles_count: number;
  chapters?: Chapter[];
  generation_status: string;
  generated_at: string;
  expires_at?: string;
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  start_time: number;
  end_time: number;
  original_url: string;
  originalUrl: string;
}

export interface AudioGenerationResponse {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  script: string;
  voice_language: string;
  voice_name: string;
  chapters?: Chapter[];
  articles_count: number;
  generation_mode: string;
  created_at: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface SchedulerStatus {
  running: boolean;
  available: boolean;
  reason?: string;
  error?: string;
  jobs_count?: number;
  jobs?: SchedulerJob[];
}

export interface SchedulerJob {
  id: string;
  name: string;
  next_run_time?: string;
  trigger: string;
}

class SchedulePickService {
  private getHeaders(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * スケジューラー状態確認
   */
  async getSchedulerStatus(): Promise<SchedulerStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/scheduler/status`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Scheduler status check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get scheduler status:', error);
      throw error;
    }
  }

  /**
   * スケジュール作成
   */
  async createSchedule(request: ScheduleCreateRequest): Promise<Schedule> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/schedules`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Schedule creation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  }

  /**
   * スケジュール一覧取得
   */
  async getSchedules(): Promise<Schedule[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/schedules`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get schedules:', error);
      throw error;
    }
  }

  /**
   * スケジュール詳細取得
   */
  async getSchedule(scheduleId: string): Promise<Schedule> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/schedules/${scheduleId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get schedule:', error);
      throw error;
    }
  }

  /**
   * スケジュール更新
   */
  async updateSchedule(scheduleId: string, request: ScheduleUpdateRequest): Promise<Schedule> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Schedule update failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  }

  /**
   * スケジュール削除
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Schedule deletion failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }

  /**
   * スケジュール手動実行
   */
  async manuallyTriggerSchedule(scheduleId: string): Promise<AudioGenerationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/schedules/${scheduleId}/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Manual schedule trigger failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to manually trigger schedule:', error);
      throw error;
    }
  }

  /**
   * スケジュール生成プレイリスト取得
   */
  async getSchedulePlaylists(scheduleId: string, limit: number = 10): Promise<ScheduledPlaylist[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/audio/schedules/${scheduleId}/playlists?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schedule playlists: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get schedule playlists:', error);
      throw error;
    }
  }

  /**
   * 曜日の日本語表示名を取得
   */
  getDayDisplayName(day: DayOfWeek): string {
    const dayNames: Record<DayOfWeek, string> = {
      monday: '月',
      tuesday: '火',
      wednesday: '水',
      thursday: '木',
      friday: '金',
      saturday: '土',
      sunday: '日',
    };
    return dayNames[day] || day;
  }

  /**
   * 曜日の完全な日本語表示名を取得
   */
  getDayFullName(day: DayOfWeek): string {
    const dayNames: Record<DayOfWeek, string> = {
      monday: '月曜日',
      tuesday: '火曜日',
      wednesday: '水曜日',
      thursday: '木曜日',
      friday: '金曜日',
      saturday: '土曜日',
      sunday: '日曜日',
    };
    return dayNames[day] || day;
  }

  /**
   * スケジュール状態の日本語表示名を取得
   */
  getStatusDisplayName(status: string): string {
    const statusNames: Record<string, string> = {
      active: '有効',
      inactive: '無効',
      paused: '一時停止',
    };
    return statusNames[status] || status;
  }

  /**
   * 時刻文字列をフォーマット（HH:MM → HH:MM形式確認）
   */
  formatTime(time: string): string {
    // HH:MM形式の確認
    if (/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time)) {
      return time;
    }
    
    // 不正な形式の場合はデフォルト値
    return '07:00';
  }

  /**
   * デフォルトのスケジュール設定を取得
   */
  getDefaultSchedulePreferences(): SchedulePreferences {
    return {
      max_articles: 5,
      voice_language: 'ja-JP',
      voice_name: 'alloy',
      prompt_style: 'standard',
      preferred_genres: [],
      excluded_genres: [],
      preferred_sources: [],
      excluded_sources: [],
      keywords: [],
    };
  }
}

export const schedulePickService = new SchedulePickService();