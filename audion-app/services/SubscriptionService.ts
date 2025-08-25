/**
 * SubscriptionService - User subscription and plan information management
 */

import axios from 'axios';
import DebugService from './DebugService';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic', 
  PREMIUM = 'premium'
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan: string;
  max_daily_audio_count: number;
  max_audio_articles: number;
  created_at: string;
  expires_at?: string;
}

interface DailyUsage {
  id: string;
  user_id: string;
  date: string;
  audio_count: number;
  total_articles: number;
}

interface PlanConfig {
  plan: string;
  max_daily_audio_count: number;
  max_audio_articles: number;
  description: string;
}

interface SubscriptionInfo {
  subscription: UserSubscription;
  daily_usage: DailyUsage;
  plan_config: PlanConfig;
  remaining_daily_audio: number;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private readonly API: string;
  private cachedSubscription: SubscriptionInfo | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.API = process.env.EXPO_PUBLIC_BACKEND_URL 
      ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` 
      : 'http://localhost:8003/api';
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Get user's subscription information
   */
  async getSubscriptionInfo(token: string, forceRefresh: boolean = false): Promise<SubscriptionInfo> {
    const now = Date.now();
    
    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && this.cachedSubscription && now < this.cacheExpiry) {
      // デバッグモードでforcedSubscriptionTierが設定されている場合は強制適用
      if (DebugService.isDebugModeEnabled()) {
        const forcedTier = DebugService.getForcedSubscriptionTier();
        if (forcedTier && forcedTier !== this.cachedSubscription.subscription.plan) {
          console.log('🎯 SubscriptionService: Applying forced tier to cached data:', forcedTier);
          return this.applyForcedTier(this.cachedSubscription, forcedTier);
        }
      }
      return this.cachedSubscription;
    }

    try {
      const response = await axios.get(`${this.API}/user/subscription/info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let subscriptionData = response.data;
      
      // デバッグモードでforcedSubscriptionTierが設定されている場合は強制適用
      if (DebugService.isDebugModeEnabled()) {
        const forcedTier = DebugService.getForcedSubscriptionTier();
        if (forcedTier) {
          console.log('🎯 SubscriptionService: Applying forced tier to API data:', forcedTier);
          subscriptionData = this.applyForcedTier(subscriptionData, forcedTier);
        }
      }

      this.cachedSubscription = subscriptionData;
      this.cacheExpiry = now + this.CACHE_DURATION;

      return subscriptionData;
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      
      // デバッグモードでforcedSubscriptionTierが設定されている場合
      const forcedTier = DebugService.isDebugModeEnabled() ? DebugService.getForcedSubscriptionTier() : null;
      const planName = forcedTier || 'free';
      const planLimits = this.getPlanLimits(planName as SubscriptionTier);
      
      // Return default plan if API fails (with forced tier if applicable)
      const defaultSubscription: SubscriptionInfo = {
        subscription: {
          id: 'default',
          user_id: 'unknown',
          plan: planName,
          max_daily_audio_count: planLimits.maxDailyAudio,
          max_audio_articles: planLimits.maxArticlesPerAudio,
          created_at: new Date().toISOString(),
        },
        daily_usage: {
          id: 'default',
          user_id: 'unknown',
          date: new Date().toISOString().split('T')[0],
          audio_count: 0,
          total_articles: 0,
        },
        plan_config: {
          plan: planName,
          max_daily_audio_count: planLimits.maxDailyAudio,
          max_audio_articles: planLimits.maxArticlesPerAudio,
          description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} plan`,
        },
        remaining_daily_audio: planLimits.maxDailyAudio,
      };

      console.log('🎯 SubscriptionService: Using default subscription with plan:', planName);
      return defaultSubscription;
    }
  }

  /**
   * Apply forced subscription tier to subscription data
   */
  private applyForcedTier(data: SubscriptionInfo, forcedTier: SubscriptionTier): SubscriptionInfo {
    const planLimits = this.getPlanLimits(forcedTier);
    
    return {
      ...data,
      subscription: {
        ...data.subscription,
        plan: forcedTier,
        max_daily_audio_count: planLimits.maxDailyAudio,
        max_audio_articles: planLimits.maxArticlesPerAudio,
      },
      plan_config: {
        ...data.plan_config,
        plan: forcedTier,
        max_daily_audio_count: planLimits.maxDailyAudio,
        max_audio_articles: planLimits.maxArticlesPerAudio,
        description: `${forcedTier.charAt(0).toUpperCase() + forcedTier.slice(1)} plan (Debug Mode)`,
      },
      remaining_daily_audio: planLimits.maxDailyAudio,
    };
  }

  /**
   * Get plan limits for a specific tier
   */
  private getPlanLimits(tier: SubscriptionTier) {
    switch (tier) {
      case SubscriptionTier.PREMIUM:
        return { maxArticlesPerAudio: 20, maxDailyAudio: 30 };
      case SubscriptionTier.BASIC:
        return { maxArticlesPerAudio: 10, maxDailyAudio: 10 };
      default:
        return { maxArticlesPerAudio: 3, maxDailyAudio: 3 };
    }
  }

  /**
   * Get user's max articles limit based on their plan
   */
  async getMaxArticlesLimit(token: string): Promise<number> {
    // getSubscriptionInfoは内部でエラーを処理し、
    // デバッグモードを考慮したデフォルト値を返すため、ここでのtry-catchは不要
    const subscriptionInfo = await this.getSubscriptionInfo(token);
    console.log('🎯 SubscriptionService: Max articles limit for plan', subscriptionInfo.subscription.plan, ':', subscriptionInfo.subscription.max_audio_articles);
    return subscriptionInfo.subscription.max_audio_articles;
  }

  /**
   * Check if user can create audio with specified article count
   */
  async canCreateAudio(token: string, articleCount: number): Promise<{ canCreate: boolean; reason?: string }> {
    try {
      const subscriptionInfo = await this.getSubscriptionInfo(token);
      
      // Check daily limit
      if (subscriptionInfo.remaining_daily_audio <= 0) {
        return {
          canCreate: false,
          reason: `Daily limit reached. You can create ${subscriptionInfo.subscription.max_daily_audio_count} audios per day.`
        };
      }

      // Check article count limit
      if (articleCount > subscriptionInfo.subscription.max_audio_articles) {
        return {
          canCreate: false,
          reason: `Too many articles selected. Your plan allows ${subscriptionInfo.subscription.max_audio_articles} articles per audio.`
        };
      }

      return { canCreate: true };
    } catch (error) {
      console.error('Error checking audio creation capability:', error);
      return { canCreate: true }; // Allow on error
    }
  }

  /**
   * Get current subscription tier
   */
  static getCurrentTier(): SubscriptionTier {
    // デバッグモードでforcedSubscriptionTierが設定されている場合は優先
    if (DebugService.isDebugModeEnabled()) {
      const forcedTier = DebugService.getForcedSubscriptionTier();
      if (forcedTier) {
        console.log('🎯 SubscriptionService: Using forced subscription tier:', forcedTier);
        return forcedTier;
      }
    }
    
    // デフォルトでFREEを返す（実際の実装では認証状態とAPIから取得）
    console.log('📊 SubscriptionService: Using default tier: FREE');
    return SubscriptionTier.FREE;
  }

  /**
   * Get current subscription tier (instance method)
   */
  async getCurrentTierAsync(token?: string): Promise<SubscriptionTier> {
    if (!token) {
      return SubscriptionTier.FREE;
    }
    
    try {
      const subscriptionInfo = await this.getSubscriptionInfo(token);
      const plan = subscriptionInfo.subscription.plan.toLowerCase();
      
      switch (plan) {
        case 'premium':
          return SubscriptionTier.PREMIUM;
        case 'basic':
          return SubscriptionTier.BASIC;
        default:
          return SubscriptionTier.FREE;
      }
    } catch (error) {
      console.error('Error getting current tier:', error);
      return SubscriptionTier.FREE;
    }
  }

  /**
   * Clear cached subscription data
   */
  clearCache(): void {
    this.cachedSubscription = null;
    this.cacheExpiry = 0;
  }
}

export default SubscriptionService;