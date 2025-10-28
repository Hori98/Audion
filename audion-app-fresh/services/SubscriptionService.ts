import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface SubscriptionLimits {
  max_audio_articles: number;
  max_daily_audio_count: number;
  remaining_daily_audio: number;
  current_plan: string;
}

export interface SubscriptionInfo extends SubscriptionLimits {}

class SubscriptionService {
  async getLimits(): Promise<SubscriptionLimits> {
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.USER.SUBSCRIPTION_LIMITS);
      return data as SubscriptionLimits;
    } catch (error) {
      // Fallback to default free plan limits if API fails
      console.warn('Failed to fetch subscription limits, using default free plan:', error);
      return {
        max_audio_articles: 3,
        max_daily_audio_count: 3,
        remaining_daily_audio: 3,
        current_plan: 'free'
      };
    }
  }

  async getInfo(): Promise<SubscriptionInfo> {
    try {
      const { data } = await apiClient.get(API_ENDPOINTS.USER.SUBSCRIPTION_LIMITS);
      return data as SubscriptionInfo;
    } catch (error) {
      // Fallback to default free plan info if API fails
      console.warn('Failed to fetch subscription info, using default free plan:', error);
      return {
        max_audio_articles: 3,
        max_daily_audio_count: 3,
        remaining_daily_audio: 3,
        current_plan: 'free'
      };
    }
  }

  async updatePlan(plan: 'free' | 'basic' | 'premium') {
    const { data } = await apiClient.post(API_ENDPOINTS.USER.SUBSCRIPTION_PLAN, { plan });
    return data as SubscriptionInfo;
  }
}

export default new SubscriptionService();
