/**
 * AudioMetadataService - 音声メタデータの統一管理
 * 
 * 責務:
 * - 音声メタデータの取得・正規化・キャッシュ
 * - script抽出・chapters正規化の統一処理
 * - エラーハンドリングとフォールバック
 */

import AudioService from './AudioService';
import { extractScriptFromAudionXml } from '../utils/textUtils';

// キャッシュされたメタデータの型
interface CachedMetadata {
  script?: string;
  chapters?: NormalizedChapter[];
  sourceName?: string;
  publishedAt?: string;
  imageUrl?: string;
  timestamp: number;
}

// 正規化されたチャプター情報
interface NormalizedChapter {
  id: string;
  title: string;
  start_time: number;
  end_time: number;
  original_url: string;
  source_name?: string;
  thumbnail_url?: string;
}

// メタデータ取得結果
export interface AudioMetadata {
  title?: string;
  script?: string;
  chapters?: NormalizedChapter[];
  sourceName?: string;
  publishedAt?: string;
  imageUrl?: string;
}

export class AudioMetadataService {
  private static cache = new Map<string, CachedMetadata>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分
  private static readonly MAX_CACHE_SIZE = 50;

  /**
   * 音声IDからメタデータを取得（キャッシュ優先）
   */
  static async getById(audioId: string, authToken?: string): Promise<AudioMetadata | null> {
    try {
      console.log(`[AUDIO-METADATA] Fetching metadata for audio ${audioId}`);

      // キャッシュチェック
      const cached = this.getCachedMetadata(audioId);
      if (cached) {
        console.log(`[AUDIO-METADATA] Cache hit for audio ${audioId}`);
        return cached;
      }

      // API経由でデータ取得
      console.log(`[AUDIO-METADATA] Cache miss, fetching from API for audio ${audioId}`);
      // 軽量な再試行（認証/反映タイミングの一過性エラー対策）
      const maxRetries = 2;
      let lastError: any = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const audioData = await AudioService.getAudioContent(audioId, authToken);
          if (!audioData) {
            console.warn(`[AUDIO-METADATA] No data found for audio ${audioId}`);
            return null;
          }

          // メタデータ正規化
          const metadata = this.normalizeMetadata(audioData);
          // キャッシュに保存
          this.setCachedMetadata(audioId, metadata);
          console.log(`[AUDIO-METADATA] Successfully fetched and cached metadata for audio ${audioId}`);
          return metadata;
        } catch (err: any) {
          lastError = err;
          const msg = (err && err.message) ? String(err.message) : '';
          const shouldRetry = msg.includes('Not authenticated') || msg.includes('401') || msg.includes('404');
          if (attempt < maxRetries && shouldRetry) {
            const delay = 400 * Math.pow(2, attempt); // 400ms, 800ms
            await new Promise(res => setTimeout(res, delay));
            continue;
          }
          throw err;
        }
      }
      throw lastError || new Error('Failed to fetch audio metadata');

    } catch (error) {
      console.error(`[AUDIO-METADATA] Failed to fetch metadata for audio ${audioId}:`, error);
      return null;
    }
  }

  /**
   * 生データからメタデータを正規化
   */
  static normalizeMetadata(audioData: any): AudioMetadata {
    const metadata: AudioMetadata = {};

    // タイトル
    if (audioData.title) {
      metadata.title = String(audioData.title);
    }

    // スクリプト抽出
    if (audioData.script) {
      metadata.script = extractScriptFromAudionXml(audioData.script);
    }

    // チャプター正規化
    if (audioData.chapters) {
      metadata.chapters = this.normalizeChapters(audioData.chapters);
    }

    // その他メタデータ
    metadata.sourceName = audioData.voice_type || audioData.sourceName;
    metadata.publishedAt = audioData.created_at || audioData.publishedAt;
    metadata.imageUrl = audioData.image_url || audioData.imageUrl;

    return metadata;
  }

  /**
   * チャプター情報の正規化
   * 既存のライブラリ画面ロジックと同一処理
   */
  static normalizeChapters(chapters: any): NormalizedChapter[] {
    if (!Array.isArray(chapters)) {
      // 文字列の場合はJSON.parseを試行
      if (typeof chapters === 'string') {
        try {
          chapters = JSON.parse(chapters);
        } catch (e) {
          console.warn('[AUDIO-METADATA] Failed to parse chapters JSON:', e);
          return [];
        }
      } else {
        return [];
      }
    }

    return chapters.map((chapter: any, index: number) => ({
      id: chapter.id || `chapter-${index}`,
      title: chapter.title || chapter.name || `記事 ${index + 1}`,
      start_time: chapter.start_time || chapter.startTime || 0,
      end_time: chapter.end_time || chapter.endTime || 0,
      original_url: chapter.original_url || chapter.originalUrl || chapter.url || chapter.link || ''
    }));
  }

  /**
   * キャッシュからメタデータを取得
   */
  private static getCachedMetadata(audioId: string): AudioMetadata | null {
    const cached = this.cache.get(audioId);
    if (!cached) return null;

    // TTLチェック
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(audioId);
      return null;
    }

    return {
      script: cached.script,
      chapters: cached.chapters,
      sourceName: cached.sourceName,
      publishedAt: cached.publishedAt,
      imageUrl: cached.imageUrl
    };
  }

  /**
   * メタデータをキャッシュに保存
   */
  private static setCachedMetadata(audioId: string, metadata: AudioMetadata): void {
    // キャッシュサイズ制限
    this.clearOldCacheIfNeeded();

    this.cache.set(audioId, {
      ...metadata,
      timestamp: Date.now()
    });
  }

  /**
   * 古いキャッシュをクリア
   */
  private static clearOldCacheIfNeeded(): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // 古い10件を削除
      const toDelete = entries.slice(0, 10);
      toDelete.forEach(([key]) => this.cache.delete(key));
      
      console.log(`[AUDIO-METADATA] Cleared ${toDelete.length} old cache entries`);
    }
  }

  /**
   * キャッシュクリア（テスト用）
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('[AUDIO-METADATA] Cache cleared');
  }

  /**
   * キャッシュ統計情報
   */
  static getCacheStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.CACHE_TTL
    };
  }
}
