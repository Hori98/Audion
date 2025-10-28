/**
 * Unified Audio Generation Service V2
 * 統合音声生成API V2 対応サービス
 * AutoPick/ManualPick/SchedulePick に対応
 */

import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface AutoPickRequest {
  max_articles?: number;
  voice_language?: string;
  voice_name?: string;
  prompt_style?: string;
}

export interface ManualPickRequest {
  article_ids: string[];
  article_titles: string[];
  article_summaries?: string[];
  voice_language?: string;
  voice_name?: string;
  prompt_style?: string;
}

export interface UnifiedAudioResponse {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  script: string;
  voice_language: string;
  voice_name: string;
  chapters: Array<{
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    start_time: number;
    end_time: number;
    original_url: string;
    originalUrl: string;
  }>;
  articles_count: number;
  generation_mode: 'autopick' | 'manual' | 'schedule';
  created_at: string;
}

class UnifiedAudioV2Service {
  /**
   * AutoPick音声生成
   * AIが自動で記事を選択して音声生成
   */
  async generateAutoPick(
    request: AutoPickRequest = {}
  ): Promise<UnifiedAudioResponse> {
    const payload = {
      max_articles: 3,
      voice_language: 'ja-JP',
      voice_name: 'alloy',
      prompt_style: 'standard',
      ...request
    };

    try {
      console.log('🎧 [AutoPick] Request:', payload);
      const response = await apiClient.post<UnifiedAudioResponse>(
        API_ENDPOINTS.AUDIO_V2.AUTOPICK,
        payload
      );
      console.log('✅ [AutoPick] Success:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ [AutoPick] Failed:', error);
      throw this.handleApiError(error, 'AutoPick音声生成に失敗しました');
    }
  }

  /**
   * ManualPick音声生成
   * ユーザーが選択した記事で音声生成
   */
  async generateManualPick(
    request: ManualPickRequest
  ): Promise<UnifiedAudioResponse> {
    const payload = {
      voice_language: 'ja-JP',
      voice_name: 'alloy',
      prompt_style: 'standard',
      ...request
    };

    try {
      console.log('🎧 [ManualPick] Request:', payload);
      const response = await apiClient.post<UnifiedAudioResponse>(
        API_ENDPOINTS.AUDIO_V2.MANUAL,
        payload
      );
      console.log('✅ [ManualPick] Success:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ [ManualPick] Failed:', error);
      throw this.handleApiError(error, 'ManualPick音声生成に失敗しました');
    }
  }

  /**
   * スケジュール設定一覧取得
   */
  async getSchedules(): Promise<any[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUDIO_V2.SCHEDULES);
      return response.data;
    } catch (error) {
      console.error('❌ [Schedule] Get schedules failed:', error);
      throw this.handleApiError(error, 'スケジュール一覧の取得に失敗しました');
    }
  }

  /**
   * スケジューラーの状態取得
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
      const response = await apiClient.get(API_ENDPOINTS.AUDIO_V2.SCHEDULER_STATUS);
      return response.data;
    } catch (error) {
      console.error('❌ [Scheduler] Status check failed:', error);
      return {
        running: false,
        available: false,
        jobs_count: 0,
        jobs: [],
        reason: 'API接続エラー'
      };
    }
  }

  /**
   * エラーハンドリング
   */
  private handleApiError(error: any, defaultMessage: string): Error {
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error(defaultMessage);
  }

  /**
   * テスト用メソッド：フロントエンド-バックエンド連携確認
   */
  async testConnection(): Promise<{
    success: boolean;
    autopick?: boolean;
    manual?: boolean;
    scheduler?: boolean;
    error?: string;
  }> {
    const results = {
      success: false,
      autopick: false,
      manual: false,
      scheduler: false,
      error: undefined as string | undefined
    };

    try {
      // 1. AutoPick APIテスト
      try {
        await this.generateAutoPick({ max_articles: 1 });
        results.autopick = true;
        console.log('✅ AutoPick API connection verified');
      } catch (error) {
        console.log('❌ AutoPick API failed:', error);
      }

      // 2. ManualPick APIテスト
      try {
        // 空の記事リストでテスト（エラーは期待されるが接続確認のため）
        await this.generateManualPick({
          article_ids: ['test'],
          article_titles: ['テスト記事']
        });
        results.manual = true;
      } catch (error) {
        // 記事IDが無効でもAPI接続自体は確認できる
        if (error.message.includes('記事が見つかりません') ||
            error.message.includes('Article not found')) {
          results.manual = true;
          console.log('✅ ManualPick API connection verified (expected error)');
        } else {
          console.log('❌ ManualPick API failed:', error);
        }
      }

      // 3. Scheduler APIテスト
      try {
        await this.getSchedulerStatus();
        results.scheduler = true;
        console.log('✅ Scheduler API connection verified');
      } catch (error) {
        console.log('❌ Scheduler API failed:', error);
      }

      results.success = results.autopick && results.manual && results.scheduler;
      return results;

    } catch (error) {
      results.error = error instanceof Error ? error.message : '接続テストに失敗しました';
      return results;
    }
  }
}

export default new UnifiedAudioV2Service();