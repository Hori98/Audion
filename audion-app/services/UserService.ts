/**
 * UserService - Unified user management
 * Consolidates settings, preferences, and subscription functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './ApiService';
import { API_CONFIG } from '../config/api';

export interface UserSettings {
  // Audio preferences
  default_playback_speed: number;
  auto_play_next: boolean;
  offline_download_quality: 'low' | 'medium' | 'high';
  
  // Content preferences
  preferred_genres: string[];
  excluded_sources: string[];
  max_articles_per_session: number;
  
  // Schedule settings
  auto_generate_enabled: boolean;
  auto_generate_time: string; // HH:MM format
  auto_generate_days: string[]; // ['monday', 'tuesday', ...]
  
  // Notification preferences
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  content_ready_notifications: boolean;
  
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  font_size: 'small' | 'medium' | 'large';
  
  // Privacy settings
  analytics_enabled: boolean;
  personalization_enabled: boolean;
}

export interface SubscriptionInfo {
  tier: 'free' | 'basic' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  expires_at?: string;
  limits: {
    max_audio_per_day: number;
    max_audio_duration_minutes: number;
    max_sources: number;
    offline_downloads: boolean;
    custom_voices: boolean;
    priority_generation: boolean;
  };
  usage: {
    audio_generated_today: number;
    audio_duration_today: number;
    sources_count: number;
  };
}

export interface UserPreferences {
  reading_habits: {
    average_reading_time: number;
    preferred_article_length: 'short' | 'medium' | 'long';
    active_hours: string[]; // ['09:00', '12:00', '18:00']
  };
  content_interests: {
    favorite_genres: string[];
    favorite_sources: string[];
    keyword_interests: string[];
  };
  interaction_history: {
    total_articles_read: number;
    total_audio_generated: number;
    total_listening_time: number;
    last_active: string;
  };
}

class UserService {
  private static instance: UserService;
  private settings: UserSettings | null = null;
  private subscription: SubscriptionInfo | null = null;
  private preferences: UserPreferences | null = null;

  static getInstance(): UserService {
    if (!this.instance) {
      this.instance = new UserService();
    }
    return this.instance;
  }

  // ================== Settings Management ==================

  async getSettings(): Promise<UserSettings> {
    if (this.settings) return this.settings;

    try {
      // Try to get from API first
      const response = await apiService.getEndpoint<UserSettings>('user.settings');
      
      if (response.success && response.data) {
        this.settings = response.data;
        await this.cacheSettings(response.data);
        return response.data;
      }

      // Fallback to cached settings
      const cached = await this.getCachedSettings();
      if (cached) {
        this.settings = cached;
        return cached;
      }

      // Return default settings if nothing found
      const defaultSettings = this.getDefaultSettings();
      this.settings = defaultSettings;
      return defaultSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      
      // Try cached settings on error
      const cached = await this.getCachedSettings();
      if (cached) {
        this.settings = cached;
        return cached;
      }
      
      // Return default settings as last resort
      const defaultSettings = this.getDefaultSettings();
      this.settings = defaultSettings;
      return defaultSettings;
    }
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...updates };

      const response = await apiService.postEndpoint<UserSettings>('user.settings', newSettings);
      
      if (response.success && response.data) {
        this.settings = response.data;
        await this.cacheSettings(response.data);
        return response.data;
      }

      throw new Error(response.error || 'Failed to update settings');
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  private async cacheSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('user_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error caching settings:', error);
    }
  }

  private async getCachedSettings(): Promise<UserSettings | null> {
    try {
      const cached = await AsyncStorage.getItem('user_settings');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached settings:', error);
      return null;
    }
  }

  private getDefaultSettings(): UserSettings {
    return {
      // Audio preferences
      default_playback_speed: 1.0,
      auto_play_next: true,
      offline_download_quality: 'medium',
      
      // Content preferences
      preferred_genres: [],
      excluded_sources: [],
      max_articles_per_session: 10,
      
      // Schedule settings
      auto_generate_enabled: false,
      auto_generate_time: '09:00',
      auto_generate_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      
      // Notification preferences
      push_notifications_enabled: true,
      email_notifications_enabled: false,
      content_ready_notifications: true,
      
      // UI preferences
      theme: 'system',
      language: 'ja',
      font_size: 'medium',
      
      // Privacy settings
      analytics_enabled: true,
      personalization_enabled: true,
    };
  }

  // ================== Subscription Management ==================

  async getSubscription(): Promise<SubscriptionInfo> {
    if (this.subscription) return this.subscription;

    try {
      const response = await apiService.getEndpoint<SubscriptionInfo>('user.subscription');
      
      if (response.success && response.data) {
        this.subscription = response.data;
        return response.data;
      }

      // Return default free tier if API fails
      const defaultSubscription: SubscriptionInfo = {
        tier: 'free',
        status: 'active',
        limits: {
          max_audio_per_day: 3,
          max_audio_duration_minutes: 30,
          max_sources: 5,
          offline_downloads: false,
          custom_voices: false,
          priority_generation: false,
        },
        usage: {
          audio_generated_today: 0,
          audio_duration_today: 0,
          sources_count: 0,
        },
      };
      
      this.subscription = defaultSubscription;
      return defaultSubscription;
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  async checkLimits(articleCount: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const response = await apiService.get('/user/audio-limits/check', {
        params: { article_count: articleCount }
      });
      
      if (response.success && response.data) {
        return response.data;
      }

      return { allowed: false, reason: 'Unable to check limits' };
    } catch (error) {
      console.error('Error checking limits:', error);
      return { allowed: false, reason: 'Error checking limits' };
    }
  }

  async upgradePlan(newTier: 'basic' | 'premium'): Promise<SubscriptionInfo> {
    try {
      const response = await apiService.post('/user/subscription/update-plan', {
        tier: newTier
      });
      
      if (response.success && response.data) {
        this.subscription = response.data;
        return response.data;
      }

      throw new Error(response.error || 'Failed to upgrade plan');
    } catch (error) {
      console.error('Error upgrading plan:', error);
      throw error;
    }
  }

  // ================== User Preferences ==================

  async getPreferences(): Promise<UserPreferences> {
    if (this.preferences) return this.preferences;

    try {
      const response = await apiService.get('/user/preferences');
      
      if (response.success && response.data) {
        this.preferences = response.data;
        return response.data;
      }

      // Return default preferences
      const defaultPreferences: UserPreferences = {
        reading_habits: {
          average_reading_time: 5,
          preferred_article_length: 'medium',
          active_hours: ['09:00', '12:00', '18:00'],
        },
        content_interests: {
          favorite_genres: [],
          favorite_sources: [],
          keyword_interests: [],
        },
        interaction_history: {
          total_articles_read: 0,
          total_audio_generated: 0,
          total_listening_time: 0,
          last_active: new Date().toISOString(),
        },
      };
      
      this.preferences = defaultPreferences;
      return defaultPreferences;
    } catch (error) {
      console.error('Error getting preferences:', error);
      throw error;
    }
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const currentPreferences = await this.getPreferences();
      const newPreferences = { ...currentPreferences, ...updates };

      const response = await apiService.post('/user/preferences', newPreferences);
      
      if (response.success && response.data) {
        this.preferences = response.data;
        return response.data;
      }

      throw new Error(response.error || 'Failed to update preferences');
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  // ================== Analytics and Tracking ==================

  async recordInteraction(interaction: {
    action: string;
    contentId: string;
    contentType: string;
    category?: string;
    source?: string;
    timestamp: number;
    engagementLevel?: 'low' | 'medium' | 'high';
  }): Promise<void> {\n    try {\n      const settings = await this.getSettings();\n      if (!settings.analytics_enabled) return;\n\n      await apiService.post('/analytics/interaction', interaction);\n    } catch (error) {\n      console.error('Error recording interaction:', error);\n      // Don't throw - analytics should not break app functionality\n    }\n  }\n\n  // ================== Cache Management ==================\n\n  clearCache(): void {\n    this.settings = null;\n    this.subscription = null;\n    this.preferences = null;\n  }\n\n  async clearAllUserData(): Promise<void> {\n    try {\n      await AsyncStorage.multiRemove([\n        'user_settings',\n        'user_preferences',\n        'user_subscription'\n      ]);\n      this.clearCache();\n    } catch (error) {\n      console.error('Error clearing user data:', error);\n    }\n  }\n}\n\nexport default UserService.getInstance();"}, {"old_string": "  async recordInteraction(interaction: {
    action: string;
    contentId: string;
    contentType: string;
    category?: string;
    source?: string;
    timestamp: number;
    engagementLevel?: 'low' | 'medium' | 'high';
  }): Promise<void> {", "new_string": "async recordInteraction(interaction: {\naction: string;\ncontentId: string;\ncontentType: string;\ncategory?: string;\nsource?: string;\ntimestamp: number;\nengagementLevel?: 'low' | 'medium' | 'high';\n}): Promise<void> {"}]