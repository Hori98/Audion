/**
 * Unified Audio Generation Service - 共通化された音声生成ロジック
 * CLAUDE.md指針：共通化ファースト・保守性重視
 */

import { Alert } from 'react-native';
import AudioService, { AudioGenerationResponse, AudioStatusResponse } from './AudioService';
import { API_CONFIG, FEATURE_FLAGS } from './config';

export interface AudioGenerationConfig {
  articleId: string;
  articleTitle: string;
  articleContent?: string;
  language?: string;
  voice_type?: string;
  onProgress?: (status: AudioStatusResponse) => void;
  onSuccess?: (audioUrl: string) => void;
  onError?: (error: string) => void;
  showUserAlerts?: boolean;
}

class UnifiedAudioGenerationService {
  private readonly debugMode: boolean = API_CONFIG.debugMode;
  private readonly logLevel: string = API_CONFIG.logLevel;
  
  // ✅ パフォーマンス問題：大量リクエスト防止のためのキャッシュ
  private audioCache: Map<string, { audio_url: string | null; timestamp: number }> = new Map();
  private readonly cacheExpiryMs = 10 * 60 * 1000; // 10分間キャッシュ（延長）
  
  // ✅ 同時リクエスト防止のための Promise キャッシュ
  private pendingRequests: Map<string, Promise<string | null>> = new Map();

  /**
   * 統一された音声生成フロー
   * useRSSFeedとUnifiedAudioPlayerで共通利用
   * 環境設定に基づいたエラーハンドリングとログ出力
   */
  async generateAudioWithProgress(
    config: AudioGenerationConfig,
    authToken: string
  ): Promise<AudioGenerationResponse | null> {
    const {
      articleId,
      articleTitle,
      articleContent,
      language = 'ja',
      voice_type = 'standard',
      onProgress,
      onSuccess,
      onError,
      showUserAlerts = true
    } = config;

    if (showUserAlerts) {
      return new Promise((resolve, reject) => {
        Alert.alert(
          '音声生成',
          `"${articleTitle}"の音声を生成しますか？`,
          [
            { text: 'キャンセル', style: 'cancel', onPress: () => resolve(null) },
            {
              text: '生成開始',
              onPress: async () => {
                try {
                  const result = await this.performGeneration({
                    articleId,
                    articleTitle,
                    articleContent,
                    language,
                    voice_type,
                    onProgress,
                    onSuccess,
                    onError
                  }, authToken);
                  resolve(result);
                } catch (error) {
                  reject(error);
                }
              }
            }
          ]
        );
      });
    } else {
      return this.performGeneration(config, authToken);
    }
  }

  private async performGeneration(
    config: AudioGenerationConfig,
    authToken: string
  ): Promise<AudioGenerationResponse> {
    const {
      articleId,
      articleTitle,
      articleContent,
      language,
      voice_type,
      onProgress,
      onSuccess,
      onError
    } = config;

    try {
      // 音声生成開始
      const response = await AudioService.generateAudio({
        article_id: articleId,
        title: articleTitle,
        language,
        voice_type
      }, authToken);

      this.logInfo('音声生成開始:', { audioId: response.id, articleTitle });
      Alert.alert('成功', '音声生成を開始しました。完了まで数分お待ちください。');

      // ポーリングでステータス監視
      this.pollGenerationStatus(response.id, authToken, onProgress, onSuccess, onError);

      return response;
    } catch (error) {
      const errorMessage = this.handleError(error, '音声生成に失敗しました');
      if (onError) onError(errorMessage);
      Alert.alert('エラー', errorMessage);
      throw error;
    }
  }

  private pollGenerationStatus(
    audioId: string,
    authToken: string,
    onProgress?: (status: AudioStatusResponse) => void,
    onSuccess?: (audioUrl: string) => void,
    onError?: (error: string) => void,
    pollingInterval: number = 3000
  ) {
    AudioService.pollAudioStatus(audioId, authToken, onProgress, pollingInterval)
      .then(async (finalStatus) => {
        if (finalStatus.status === 'completed') {
          try {
            const audioContent = await AudioService.getAudioContent(audioId, authToken);
            if (audioContent.audio_url) {
              if (onSuccess) onSuccess(audioContent.audio_url);
              Alert.alert('完了', '音声生成が完了しました！');
            }
          } catch (error) {
            const errorMessage = this.handleError(error, '音声コンテンツの取得に失敗しました');
            if (onError) onError(errorMessage);
            Alert.alert('エラー', errorMessage);
          }
        }
      })
      .catch((error) => {
        const errorMessage = this.handleError(error, '音声生成に失敗しました');
        if (onError) onError(errorMessage);
        Alert.alert('エラー', errorMessage);
      });
  }

  /**
   * ログ出力メソッド群
   */
  private logInfo(message: string, data?: any) {
    // ログを表示したい場合のみコメントアウトを外す
    // if (this.debugMode && (this.logLevel === 'debug' || this.logLevel === 'info')) {
    //   console.log(`[UnifiedAudioService] ${message}`, data || '');
    // }
  }

  private logError(message: string, error?: any) {
    if (this.logLevel !== 'silent') {
      console.error(`[UnifiedAudioService] ${message}`, error || '');
    }
  }

  /**
   * 統一エラーハンドリング
   */
  private handleError(error: unknown, defaultMessage: string): string {
    let errorMessage = defaultMessage;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      this.logError('API Error:', error);
    } else if (typeof error === 'string') {
      errorMessage = error;
      this.logError('String Error:', error);
    } else {
      this.logError('Unknown Error:', error);
    }
    
    return errorMessage;
  }

  /**
   * 既存音声の確認（キャッシュ最適化版）
   * ❌ 修正前：毎回per_page=100で全件取得 → 大量リクエスト問題
   * ✅ 修正後：キャッシュ利用 + 最小限のAPI呼び出し
   */
  async checkExistingAudio(articleId: string, authToken: string): Promise<string | null> {
    try {
      // 期限切れキャッシュの自動削除
      this.cleanupExpiredCache();
      
      // キャッシュチェック
      const cached = this.audioCache.get(articleId);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.cacheExpiryMs) {
        if (this.debugMode) {
          console.log(`🚀 Cache hit for articleId: ${articleId}`);
        }
        return cached.audio_url;
      }

      // ✅ 同時リクエスト防止：既に実行中の場合は既存のPromiseを返す
      const pendingRequest = this.pendingRequests.get(articleId);
      if (pendingRequest) {
        if (this.debugMode) {
          console.log(`⏳ Pending request reuse for articleId: ${articleId}`);
        }
        return pendingRequest;
      }

      // ✅ 新規リクエスト作成
      const requestPromise = this.performAudioCheck(articleId, authToken, now);
      this.pendingRequests.set(articleId, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // リクエスト完了後、pendingRequestsから削除
        this.pendingRequests.delete(articleId);
      }
    } catch (error) {
      console.error(`❌ checkExistingAudio failed for ${articleId}:`, error);
      return null;
    }
  }

  private async performAudioCheck(articleId: string, authToken: string, timestamp: number): Promise<string | null> {
    try {
      // ❌ 修正前：全件取得で大量リクエスト
      // const library = await AudioService.getAudioLibrary({ per_page: 100 }, authToken);
      
      // ✅ 修正後：最小限の件数で確認（最新5件のみ）
      const library = await AudioService.getAudioLibrary({ per_page: 5 }, authToken);
      
      // 防御的プログラミング: audio_contentsが存在し配列であることを確認
      if (!library || !library.audio_contents || !Array.isArray(library.audio_contents)) {
        // キャッシュに結果を保存（音声なし）
        this.audioCache.set(articleId, { audio_url: null, timestamp });
        return null;
      }
      
      const existingAudio = library.audio_contents.find(
        audio => audio && audio.article_id === articleId
      );
      
      const audioUrl = existingAudio?.audio_url || null;
      
      // キャッシュに結果を保存
      this.audioCache.set(articleId, { audio_url: audioUrl, timestamp });
      
      if (this.debugMode) {
        console.log(`🔍 Audio check for articleId ${articleId}: ${audioUrl ? 'Found' : 'Not found'}`);
      }
      
      return audioUrl;
    } catch (error) {
      this.logError('Failed to check existing audio:', error);
      return null;
    }
  }

  /**
   * オーディオキャッシュのクリア
   * 新しい音声が生成された時や、手動でキャッシュをリセットしたい時に使用
   */
  clearAudioCache(articleId?: string): void {
    if (articleId) {
      this.audioCache.delete(articleId);
      if (this.debugMode) {
        console.log(`🗑️  Cache cleared for articleId: ${articleId}`);
      }
    } else {
      this.audioCache.clear();
      if (this.debugMode) {
        console.log('🗑️  All audio cache cleared');
      }
    }
  }

  /**
   * 期限切れキャッシュの自動削除
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [articleId, cached] of this.audioCache.entries()) {
      if ((now - cached.timestamp) >= this.cacheExpiryMs) {
        this.audioCache.delete(articleId);
        removedCount++;
      }
    }
    
    if (this.debugMode && removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
  }
}

export default new UnifiedAudioGenerationService();