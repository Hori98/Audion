/**
 * Engagement Score Service
 * ユーザーエンゲージメントの追跡とスコア算出を行うサービス
 * 記事の人気度・エンゲージメントスコアを計算してトレンド判定に活用
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from './ArticleService';

export interface EngagementEvent {
  articleId: string;
  eventType: 'view' | 'read' | 'like' | 'share' | 'audio_play' | 'audio_complete';
  duration?: number; // 滞在時間（ミリ秒）
  timestamp: number;
  userId?: string;
}

export interface ArticleEngagement {
  articleId: string;
  viewCount: number;
  readCount: number; // 最後まで読んだ回数
  likeCount: number;
  shareCount: number;
  audioPlayCount: number;
  audioCompleteCount: number;
  totalDuration: number; // 総滞在時間
  averageDuration: number; // 平均滞在時間
  engagementScore: number; // 0-100のスコア
  lastUpdated: number;
}

export interface UserEngagementProfile {
  userId: string;
  totalEngagements: number;
  genrePreferences: Record<string, number>; // ジャンル別エンゲージメント
  sourcePreferences: Record<string, number>; // ソース別エンゲージメント
  timePreferences: Record<string, number>; // 時間帯別エンゲージメント
  averageReadTime: number;
  lastUpdated: number;
}

class EngagementScoreService {
  private readonly STORAGE_KEY_ENGAGEMENTS = 'article_engagements';
  private readonly STORAGE_KEY_USER_PROFILE = 'user_engagement_profile';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

  /**
   * エンゲージメントイベントを記録
   */
  public async recordEngagement(event: EngagementEvent): Promise<void> {
    try {
      // 既存のエンゲージメントデータを取得
      const engagements = await this.getAllEngagements();

      // 該当記事のエンゲージメントを更新
      let articleEngagement = engagements[event.articleId] || this.createDefaultEngagement(event.articleId);

      // イベントタイプに応じて更新
      switch (event.eventType) {
        case 'view':
          articleEngagement.viewCount++;
          break;
        case 'read':
          articleEngagement.readCount++;
          break;
        case 'like':
          articleEngagement.likeCount++;
          break;
        case 'share':
          articleEngagement.shareCount++;
          break;
        case 'audio_play':
          articleEngagement.audioPlayCount++;
          break;
        case 'audio_complete':
          articleEngagement.audioCompleteCount++;
          break;
      }

      // 滞在時間の更新
      if (event.duration) {
        articleEngagement.totalDuration += event.duration;
        articleEngagement.averageDuration =
          articleEngagement.totalDuration / Math.max(articleEngagement.viewCount, 1);
      }

      // エンゲージメントスコアを再計算
      articleEngagement.engagementScore = this.calculateEngagementScore(articleEngagement);
      articleEngagement.lastUpdated = Date.now();

      // 保存
      engagements[event.articleId] = articleEngagement;
      await AsyncStorage.setItem(this.STORAGE_KEY_ENGAGEMENTS, JSON.stringify(engagements));

      // ユーザープロファイルも更新
      if (event.userId) {
        await this.updateUserProfile(event);
      }

    } catch (error) {
      console.error('Failed to record engagement:', error);
    }
  }

  /**
   * 記事のエンゲージメントスコアを計算
   */
  private calculateEngagementScore(engagement: ArticleEngagement): number {
    let score = 0;

    // 基本的な重み付け
    score += engagement.viewCount * 1;           // 表示: 1点
    score += engagement.readCount * 5;           // 読了: 5点
    score += engagement.likeCount * 10;          // いいね: 10点
    score += engagement.shareCount * 15;         // シェア: 15点
    score += engagement.audioPlayCount * 8;      // 音声再生: 8点
    score += engagement.audioCompleteCount * 12; // 音声完了: 12点

    // 滞在時間のボーナス（30秒以上で追加点）
    if (engagement.averageDuration > 30000) {
      score += Math.min(engagement.averageDuration / 1000 / 10, 20); // 最大20点
    }

    // 読了率のボーナス
    if (engagement.viewCount > 0) {
      const readRate = engagement.readCount / engagement.viewCount;
      score += readRate * 25; // 読了率ボーナス最大25点
    }

    // 音声完了率のボーナス
    if (engagement.audioPlayCount > 0) {
      const completeRate = engagement.audioCompleteCount / engagement.audioPlayCount;
      score += completeRate * 20; // 完了率ボーナス最大20点
    }

    // 新鮮度による減衰（1日経つごとに5%減衰）
    const daysSinceUpdate = (Date.now() - engagement.lastUpdated) / (24 * 60 * 60 * 1000);
    const freshnessFactor = Math.max(0.1, Math.pow(0.95, daysSinceUpdate));
    score *= freshnessFactor;

    return Math.min(Math.round(score), 100); // 0-100に正規化
  }

  /**
   * デフォルトのエンゲージメントオブジェクトを作成
   */
  private createDefaultEngagement(articleId: string): ArticleEngagement {
    return {
      articleId,
      viewCount: 0,
      readCount: 0,
      likeCount: 0,
      shareCount: 0,
      audioPlayCount: 0,
      audioCompleteCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      engagementScore: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * 全エンゲージメントデータを取得
   */
  private async getAllEngagements(): Promise<Record<string, ArticleEngagement>> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY_ENGAGEMENTS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get engagements:', error);
      return {};
    }
  }

  /**
   * 特定記事のエンゲージメントを取得
   */
  public async getArticleEngagement(articleId: string): Promise<ArticleEngagement | null> {
    const engagements = await this.getAllEngagements();
    return engagements[articleId] || null;
  }

  /**
   * エンゲージメントスコア順に記事をソート
   */
  public async sortArticlesByEngagement(articles: Article[]): Promise<Article[]> {
    const engagements = await this.getAllEngagements();

    return [...articles].sort((a, b) => {
      const scoreA = engagements[a.id]?.engagementScore || 0;
      const scoreB = engagements[b.id]?.engagementScore || 0;
      return scoreB - scoreA; // 降順
    });
  }

  /**
   * トレンド記事を取得（エンゲージメントスコア上位）
   */
  public async getTrendingArticles(articles: Article[], limit: number = 10): Promise<Article[]> {
    const sorted = await this.sortArticlesByEngagement(articles);
    return sorted.slice(0, limit);
  }

  /**
   * ユーザーエンゲージメントプロファイルを更新
   */
  private async updateUserProfile(event: EngagementEvent): Promise<void> {
    if (!event.userId) return;

    try {
      const profile = await this.getUserProfile(event.userId);

      profile.totalEngagements++;

      // 時間帯別エンゲージメント更新
      const hour = new Date(event.timestamp).getHours();
      const timeSlot = this.getTimeSlot(hour);
      profile.timePreferences[timeSlot] = (profile.timePreferences[timeSlot] || 0) + 1;

      // 平均読書時間更新（読了イベントの場合）
      if (event.eventType === 'read' && event.duration) {
        const totalReadTime = profile.averageReadTime * Math.max(profile.totalEngagements - 1, 0);
        profile.averageReadTime = (totalReadTime + event.duration) / profile.totalEngagements;
      }

      profile.lastUpdated = Date.now();

      await AsyncStorage.setItem(this.STORAGE_KEY_USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to update user profile:', error);
    }
  }

  /**
   * ユーザープロファイルを取得
   */
  private async getUserProfile(userId: string): Promise<UserEngagementProfile> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY_USER_PROFILE);
      const profile = data ? JSON.parse(data) : null;

      if (profile && profile.userId === userId) {
        return profile;
      }
    } catch (error) {
      console.error('Failed to get user profile:', error);
    }

    // デフォルトプロファイルを返す
    return {
      userId,
      totalEngagements: 0,
      genrePreferences: {},
      sourcePreferences: {},
      timePreferences: {},
      averageReadTime: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * 時間帯をスロットに変換
   */
  private getTimeSlot(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * パーソナライズ記事を取得
   */
  public async getPersonalizedArticles(
    articles: Article[],
    userId: string,
    limit: number = 10
  ): Promise<Article[]> {
    const profile = await this.getUserProfile(userId);

    // 基本的なスコアリング（この実装では簡単な例）
    const scoredArticles = articles.map(article => {
      let score = 0;

      // ジャンル嗜好によるスコア
      if (article.genre && profile.genrePreferences[article.genre]) {
        score += profile.genrePreferences[article.genre] * 10;
      }

      // ソース嗜好によるスコア
      if (article.source_name && profile.sourcePreferences[article.source_name]) {
        score += profile.sourcePreferences[article.source_name] * 5;
      }

      return { article, score };
    });

    return scoredArticles
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.article);
  }

  /**
   * エンゲージメントデータをクリア（開発用）
   */
  public async clearEngagementData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY_ENGAGEMENTS);
      await AsyncStorage.removeItem(this.STORAGE_KEY_USER_PROFILE);
    } catch (error) {
      console.error('Failed to clear engagement data:', error);
    }
  }
}

export default new EngagementScoreService();