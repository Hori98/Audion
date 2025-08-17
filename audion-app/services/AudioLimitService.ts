/**
 * Audio Limit Management Service
 * Handles subscription limits and validation for audio creation
 */

import axios from 'axios';
import DebugService from './DebugService';

export interface SubscriptionInfo {
  subscription: {
    id: string;
    user_id: string;
    plan: string;
    max_daily_audio_count: number;
    max_audio_articles: number;
    created_at: string;
    expires_at?: string;
  };
  daily_usage: {
    id: string;
    user_id: string;
    date: string;
    audio_count: number;
    total_articles_processed: number;
    created_at: string;
    updated_at: string;
  };
  plan_config: {
    plan: string;
    max_daily_audio_count: number;
    max_audio_articles: number;
    description: string;
  };
  remaining_daily_audio: number;
}

export interface LimitCheckResult {
  can_create: boolean;
  error_message: string;
  usage_info: {
    plan: string;
    max_daily_audio_count: number;
    max_audio_articles: number;
    daily_audio_count: number;
    remaining_daily_audio: number;
    can_create_audio: boolean;
    article_limit_exceeded: boolean;
    daily_limit_exceeded: boolean;
  };
}

class AudioLimitService {
  private static instance: AudioLimitService;
  private baseURL: string;
  
  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_BACKEND_URL 
      ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
      : 'http://localhost:8003/api';
  }

  static getInstance(): AudioLimitService {
    if (!AudioLimitService.instance) {
      AudioLimitService.instance = new AudioLimitService();
    }
    return AudioLimitService.instance;
  }

  /**
   * Get user's subscription info and current usage
   */
  async getSubscriptionInfo(token: string): Promise<SubscriptionInfo> {
    const response = await axios.get(`${this.baseURL}/user/subscription`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  /**
   * Check if user can create audio with specified number of articles
   */
  async checkAudioLimits(token: string, articleCount: number): Promise<LimitCheckResult> {
    // 🧪 Debug: Bypass subscription limits if enabled
    if (DebugService.shouldBypassSubscriptionLimits()) {
      return {
        can_create: true,
        error_message: '',
        usage_info: {
          plan: 'DEBUG',
          max_daily_audio_count: 999,
          max_audio_articles: 999,
          daily_audio_count: 0,
          remaining_daily_audio: 999,
          can_create_audio: true,
          article_limit_exceeded: false,
          daily_limit_exceeded: false,
        }
      };
    }

    const response = await axios.get(`${this.baseURL}/user/audio-limits/check`, {
      params: { article_count: articleCount },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  /**
   * Update user's plan (for testing/admin purposes)
   */
  async updatePlan(token: string, plan: string): Promise<void> {
    await axios.post(
      `${this.baseURL}/user/subscription/update-plan`, 
      { plan },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  /**
   * Get maximum articles allowed for user's current plan
   */
  async getMaxArticlesForUser(token: string): Promise<number> {
    // 🧪 Debug: Bypass subscription limits if enabled
    if (DebugService.shouldBypassSubscriptionLimits()) {
      return 999;
    }

    try {
      const subscriptionInfo = await this.getSubscriptionInfo(token);
      return subscriptionInfo.plan_config.max_audio_articles;
    } catch (error) {
      console.error('Failed to get max articles limit:', error);
      return 3; // Default fallback
    }
  }

  /**
   * Validate article count against user limits before creation
   */
  async validateAudioCreation(token: string, articleCount: number): Promise<{
    isValid: boolean;
    errorMessage?: string;
    maxAllowed?: number;
    remainingDaily?: number;
  }> {
    
    // Load debug settings to ensure they are current
    await DebugService.loadDebugSettings();
    
    try {
      const result = await this.checkAudioLimits(token, articleCount);
      
      if (result.can_create) {
        return {
          isValid: true,
          maxAllowed: result.usage_info.max_audio_articles,
          remainingDaily: result.usage_info.remaining_daily_audio
        };
      } else {
        return {
          isValid: false,
          errorMessage: result.error_message,
          maxAllowed: result.usage_info.max_audio_articles,
          remainingDaily: result.usage_info.remaining_daily_audio
        };
      }
    } catch (error: any) {
      console.error('Audio limit validation failed:', error);
      return {
        isValid: false,
        errorMessage: 'Unable to verify audio limits. Please try again.',
        maxAllowed: 3
      };
    }
  }

  /**
   * Get friendly plan name for display
   */
  getPlanDisplayName(plan: string): string {
    const planNames: { [key: string]: string } = {
      'free': 'Free',
      'premium': 'Premium',
      'pro': 'Pro',
      'test_3': 'Test (3 articles)',
      'test_5': 'Test (5 articles)', 
      'test_10': 'Test (10 articles)',
      'test_15': 'Test (15 articles)',
      'test_30': 'Test (30 articles)',
      'test_60': 'Test (60 articles)'
    };
    return planNames[plan] || plan;
  }

  /**
   * Available test plans for validation
   */
  getTestPlans(): Array<{plan: string, display: string, articles: number}> {
    return [
      { plan: 'test_3', display: 'Test: 3 articles', articles: 3 },
      { plan: 'test_5', display: 'Test: 5 articles', articles: 5 },
      { plan: 'test_10', display: 'Test: 10 articles', articles: 10 },
      { plan: 'test_15', display: 'Test: 15 articles', articles: 15 },
      { plan: 'test_30', display: 'Test: 30 articles', articles: 30 },
      { plan: 'test_60', display: 'Test: 60 articles', articles: 60 }
    ];
  }
}

export default AudioLimitService.getInstance();