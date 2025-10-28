/**
 * Unified Audio Generation Service - 共通化された音声生成ロジック
 * CLAUDE.md指針：共通化ファースト・保守性重視
 */

import { Alert } from 'react-native';
import AudioService, { AudioGenerationResponse, AudioStatusResponse } from './AudioService';
import { LEGACY_API_CONFIG, FEATURE_FLAGS } from './config';

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
  private readonly debugMode: boolean = LEGACY_API_CONFIG.debugMode;
  private readonly logLevel: string = LEGACY_API_CONFIG.logLevel;
  
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
              
              // 🎵 Enhanced completion dialog with detailed information
              await this.showEnhancedCompletionDialog(audioContent, authToken);
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
   * Debug-focused completion dialog with technical information
   */
  private async showEnhancedCompletionDialog(audioContent: any, authToken: string): Promise<void> {
    try {
      // Extract debug information
      const audioId = audioContent.id || '不明';
      const totalCharacters = audioContent.total_characters || 0;
      const articleCount = audioContent.article_titles?.length || 0;
      const audioUrl = audioContent.audio_url || 'なし';
      const articleTitles = audioContent.article_titles || [];
      
      // Format timestamp
      const now = new Date();
      const timestamp = now.toLocaleString('ja-JP');
      
      const message = `🔧 音声生成完了 - デバッグ情報

📋 生成データ:
• 音声ID: ${audioId}
• 記事数: ${articleCount}本
• 総文字数: ${totalCharacters}文字
• 音声URL: ${audioUrl ? 'あり' : 'なし'}
• 完成時刻: ${timestamp}

📑 記事リスト:
${articleTitles.map((title, index) => `${index + 1}. ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`).join('\n')}

🎧 次のアクションを選択:`;

      return new Promise((resolve) => {
        Alert.alert(
          '🔧 デバッグ: 音声生成完了',
          message,
          [
            { 
              text: 'ログ出力', 
              onPress: () => {
                console.log('🔧 Audio Debug Info:', {
                  audioId,
                  articleCount,
                  totalCharacters,
                  audioUrl,
                  articleTitles,
                  timestamp
                });
                this.logInfo('Debug info logged to console');
                resolve();
              }
            },
            { 
              text: '再生テスト', 
              onPress: () => {
                this.logInfo('Debug: Audio playback test initiated');
                resolve();
              }
            }
          ]
        );
      });
    } catch (error) {
      this.logError('Debug dialog error:', error);
      Alert.alert('⚠️ デバッグエラー', `デバッグ情報の表示に失敗:\n${error}`);
    }
  }

  /**
   * Get user's daily usage statistics
   */
  private async getUserDailyStats(authToken: string): Promise<{
    todayCount: number;
    dailyLimit: number;
    totalCount: number;
  }> {
    try {
      // Get recent audio library to calculate stats
      const library = await AudioService.getAudioLibrary({ per_page: 20 }, authToken);
      
      if (!library?.audio_contents) {
        return { todayCount: 0, dailyLimit: 5, totalCount: 0 };
      }
      
      const today = new Date().toDateString();
      const todayCount = library.audio_contents.filter(audio => 
        audio?.created_at && new Date(audio.created_at).toDateString() === today
      ).length;
      
      return {
        todayCount,
        dailyLimit: 5, // Default limit, could be fetched from user subscription  
        totalCount: library.audio_contents.length
      };
    } catch (error) {
      this.logError('Failed to get user stats:', error);
      return { todayCount: 0, dailyLimit: 5, totalCount: 0 };
    }
  }

  /**
   * 期限切れキャッシュの自動削除
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    this.audioCache.forEach((cached, articleId) => {
      if ((now - cached.timestamp) >= this.cacheExpiryMs) {
        this.audioCache.delete(articleId);
        removedCount++;
      }
    });
    
    if (this.debugMode && removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
  }

  /**
   * 🧪 Test method to demonstrate enhanced completion dialog
   * Remove this method in production
   */
  async testEnhancedCompletionDialog(): Promise<void> {
    const mockAudioContent = {
      article_titles: ['テクノロジーニュース：AIの最新動向について詳しく解説する記事'],
      total_characters: 1500,
      audio_url: 'mock-url',
      created_at: new Date().toISOString()
    };
    
    const mockAuthToken = 'test-token';
    await this.showEnhancedCompletionDialog(mockAudioContent, mockAuthToken);
  }
}

export default new UnifiedAudioGenerationService();