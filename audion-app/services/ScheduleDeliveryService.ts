import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const SCHEDULE_DELIVERY_TASK = 'SCHEDULE_DELIVERY_TASK';

export interface ScheduleSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  timeSlots: string[];
  sources: string[];
  genres: string[];
  maxArticles: number;
  audioLength: 'short' | 'medium' | 'long';
  notifications: {
    enabled: boolean;
    preNotification: boolean;
    completionNotification: boolean;
  };
  personalization: {
    learningEnabled: boolean;
    contextAdaptation: boolean;
  };
}

export interface ScheduleDeliveryResult {
  success: boolean;
  audioId?: string;
  audioTitle?: string;
  articleCount?: number;
  error?: string;
}

class ScheduleDeliveryService {
  private static instance: ScheduleDeliveryService;

  static getInstance(): ScheduleDeliveryService {
    if (!ScheduleDeliveryService.instance) {
      ScheduleDeliveryService.instance = new ScheduleDeliveryService();
    }
    return ScheduleDeliveryService.instance;
  }

  async initialize() {
    try {
      // Setup notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Register background task
      if (TaskManager.isTaskDefined(SCHEDULE_DELIVERY_TASK)) {
        TaskManager.unregisterTaskAsync(SCHEDULE_DELIVERY_TASK);
      }

      TaskManager.defineTask(SCHEDULE_DELIVERY_TASK, async ({ data, error }) => {
        if (error) {
          console.error('Schedule delivery task error:', error);
          return;
        }

        try {
          await this.executeScheduledDelivery();
        } catch (taskError) {
          console.error('Failed to execute scheduled delivery:', taskError);
        }
      });

      console.log('ScheduleDeliveryService initialized');
    } catch (error) {
      console.error('Failed to initialize ScheduleDeliveryService:', error);
    }
  }

  async setupSchedules() {
    try {
      const settings = await this.getScheduleSettings();
      
      if (!settings.enabled) {
        await this.cancelAllSchedules();
        return;
      }

      // Cancel existing schedules
      await this.cancelAllSchedules();

      // Setup new schedules based on settings
      for (const timeSlot of settings.timeSlots) {
        await this.scheduleDelivery(timeSlot, settings);
      }

      console.log('Schedules setup successfully for time slots:', settings.timeSlots);
    } catch (error) {
      console.error('Error setting up schedules:', error);
    }
  }

  private async scheduleDelivery(timeSlot: string, settings: ScheduleSettings) {
    try {
      const [hour, minute] = timeSlot.split(':').map(Number);
      
      let trigger: any = {
        hour,
        minute,
        repeats: true,
      };

      // Configure trigger based on frequency
      switch (settings.frequency) {
        case 'daily':
          // Already configured for daily
          break;
        case 'weekly':
          trigger.weekday = 1; // Monday
          break;
        case 'custom':
          // TODO: Implement custom scheduling logic
          break;
      }

      // Schedule pre-notification if enabled
      if (settings.notifications.preNotification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Scheduled Audio Incoming',
            body: 'Your daily audio digest will be ready in 5 minutes',
            data: { type: 'pre_notification' },
          },
          trigger: {
            ...trigger,
            minute: minute - 5 >= 0 ? minute - 5 : minute + 55,
            hour: minute - 5 >= 0 ? hour : hour - 1,
          },
        });
      }

      // Schedule main delivery
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Creating Your Audio Digest',
          body: 'Preparing your personalized audio content...',
          data: { 
            type: 'schedule_delivery',
            timeSlot,
            settings: JSON.stringify(settings),
          },
        },
        trigger,
      });

      console.log(`Scheduled delivery for ${timeSlot} with ID:`, notificationId);
    } catch (error) {
      console.error(`Error scheduling delivery for ${timeSlot}:`, error);
    }
  }

  async executeScheduledDelivery() {
    try {
      const settings = await this.getScheduleSettings();
      const token = await AsyncStorage.getItem('userToken');

      if (!settings.enabled || !token) {
        return;
      }

      console.log('Executing scheduled delivery...');

      // Get user preferences and apply AI personalization
      const requestBody = await this.buildScheduleRequest(settings, token);
      
      // Create audio via backend
      const audioResult = await this.createScheduledAudio(requestBody, token);
      
      if (audioResult.success) {
        // Send completion notification if enabled
        if (settings.notifications.completionNotification) {
          await this.sendCompletionNotification(audioResult);
        }

        // Record analytics
        await this.recordScheduleDeliveryAnalytics(audioResult);
      } else {
        // Send error notification
        await this.sendErrorNotification(audioResult.error);
      }

      return audioResult;
    } catch (error) {
      console.error('Error executing scheduled delivery:', error);
      await this.sendErrorNotification(error.message);
    }
  }

  private async buildScheduleRequest(settings: ScheduleSettings, token: string) {
    const requestBody: any = {
      max_articles: settings.maxArticles,
      audio_length_preference: settings.audioLength,
      scheduled_delivery: true,
    };

    // Apply personalization if enabled
    if (settings.personalization.learningEnabled) {
      try {
        // Get user's historical preferences
        const preferences = await this.getUserPreferences(token);
        requestBody.preferred_genres = preferences.topGenres;
        requestBody.preferred_sources = preferences.topSources;
      } catch (error) {
        console.warn('Could not load user preferences:', error);
      }
    }

    // Apply context adaptation
    if (settings.personalization.contextAdaptation) {
      requestBody.context_adaptation = true;
      // TODO: Add location/calendar/weather context
    }

    // Apply explicit genre/source filters if set
    if (settings.genres.length > 0 && !settings.genres.includes('All')) {
      requestBody.preferred_genres = settings.genres;
    }

    if (settings.sources.length > 0) {
      requestBody.active_source_ids = settings.sources;
    }

    return requestBody;
  }

  private async createScheduledAudio(requestBody: any, token: string): Promise<ScheduleDeliveryResult> {
    try {
      const response = await axios.post(
        `${API}/auto-pick`,
        requestBody,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000, // 2 minute timeout for scheduled deliveries
        }
      );

      const articles = response.data;
      
      if (articles.length === 0) {
        return { success: false, error: 'No suitable articles found for scheduled delivery' };
      }

      // Create audio from selected articles
      const audioResponse = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: articles.map((a: any) => a.id),
          article_titles: articles.map((a: any) => a.title),
          article_urls: articles.map((a: any) => a.link),
          prompt_style: 'standard', // TODO: Make configurable
          custom_prompt: '',
          scheduled_delivery: true,
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 300000, // 5 minute timeout for audio creation
        }
      );

      return {
        success: true,
        audioId: audioResponse.data.id,
        audioTitle: audioResponse.data.title,
        articleCount: articles.length,
      };
    } catch (error: any) {
      console.error('Error creating scheduled audio:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create scheduled audio',
      };
    }
  }

  private async getUserPreferences(token: string) {
    try {
      const response = await axios.get(
        `${API}/user/preferences`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.warn('Could not fetch user preferences:', error);
      return { topGenres: [], topSources: [] };
    }
  }

  private async sendCompletionNotification(result: ScheduleDeliveryResult) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎧 Audio Ready!',
          body: `Your ${result.articleCount}-article digest "${result.audioTitle}" is ready to listen`,
          data: {
            type: 'audio_ready',
            audioId: result.audioId,
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  private async sendErrorNotification(errorMessage?: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Schedule Delivery Failed',
          body: errorMessage || 'Could not create your scheduled audio. Please check your settings.',
          data: { type: 'schedule_error' },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending error notification:', error);
    }
  }

  private async recordScheduleDeliveryAnalytics(result: ScheduleDeliveryResult) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      await axios.post(
        `${API}/analytics/schedule-delivery`,
        {
          success: result.success,
          article_count: result.articleCount,
          audio_id: result.audioId,
          timestamp: new Date().toISOString(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.warn('Could not record schedule delivery analytics:', error);
    }
  }

  async cancelAllSchedules() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled');
    } catch (error) {
      console.error('Error cancelling schedules:', error);
    }
  }

  async getScheduleSettings(): Promise<ScheduleSettings> {
    try {
      const savedSettings = await AsyncStorage.getItem('schedule_delivery_settings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    }

    // Return default settings if none found
    return {
      enabled: false,
      frequency: 'daily',
      timeSlots: ['08:00'],
      sources: [],
      genres: ['All'],
      maxArticles: 10,
      audioLength: 'medium',
      notifications: {
        enabled: true,
        preNotification: false,
        completionNotification: true,
      },
      personalization: {
        learningEnabled: true,
        contextAdaptation: false,
      },
    };
  }

  async testScheduleDelivery(): Promise<ScheduleDeliveryResult> {
    console.log('Testing schedule delivery...');
    return await this.executeScheduledDelivery();
  }

  // Debug method to check scheduled notifications
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Currently scheduled notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}

export default ScheduleDeliveryService;