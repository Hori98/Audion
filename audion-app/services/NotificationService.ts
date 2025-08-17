import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface NotificationSettings {
  enabled: boolean;
  scheduleDelivery: boolean;
  audioReady: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string;   // "07:00"
  };
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  scheduleDelivery: true,
  audioReady: true,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
  },
};

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const settings = await this.getNotificationSettings();
          
          // Check quiet hours
          if (settings.quietHours.enabled && this.isInQuietHours(settings.quietHours)) {
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: true,
            };
          }

          return {
            shouldShowAlert: true,
            shouldPlaySound: settings.soundEnabled,
            shouldSetBadge: true,
          };
        },
      });

      // Request permissions
      await this.requestPermissions();
      
      // Setup notification response listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  private async requestPermissions() {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Get push token for future use (if needed for remote notifications)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('schedule-delivery', {
        name: 'Schedule Delivery',
        description: 'Notifications for scheduled audio delivery',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('audio-ready', {
        name: 'Audio Ready',
        description: 'Notifications when audio content is ready',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });

      await Notifications.setNotificationChannelAsync('breaking-news', {
        name: 'Breaking News',
        description: 'Important breaking news notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FF0000',
      });

      await Notifications.setNotificationChannelAsync('bookmarks', {
        name: 'Bookmarks',
        description: 'Bookmark-related notifications',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 150],
        lightColor: '#4F46E5',
      });
    }

    return true;
  }

  private setupNotificationListeners() {
    // Handle notification tap/response
    Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      this.handleNotificationResponse(data);
    });

    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
    });
  }

  private handleNotificationResponse(data: any) {
    
    switch (data?.type) {
      case 'audio_ready':
        // Navigate to audio player or library
        this.handleAudioReadyTap(data.audioId);
        break;
      case 'schedule_error':
        // Navigate to schedule settings
        this.handleScheduleErrorTap();
        break;
      case 'pre_notification':
        // Optional: show preparing UI
        this.handlePreNotificationTap();
        break;
    }
  }

  private handleAudioReadyTap(audioId?: string) {
    // TODO: Implement navigation to audio player
  }

  private handleScheduleErrorTap() {
    // TODO: Implement navigation to schedule settings
  }

  private handlePreNotificationTap() {
  }

  async sendScheduleDeliveryNotification(
    title: string,
    body: string,
    data?: any
  ) {
    const settings = await this.getNotificationSettings();
    
    if (!settings.enabled || !settings.scheduleDelivery) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'schedule_delivery', ...data },
          sound: settings.soundEnabled,
        },
        trigger: null, // Send immediately
        options: {
          channelId: 'schedule-delivery',
        },
      });
    } catch (error) {
      console.error('Error sending schedule delivery notification:', error);
    }
  }

  async sendAudioReadyNotification(
    audioTitle: string,
    articleCount: number,
    audioId: string
  ) {
    const settings = await this.getNotificationSettings();
    
    if (!settings.enabled || !settings.audioReady) {
      return;
    }

    // Web platform doesn't support native notifications
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const title = '🎧 Your Audio is Ready!';
      const body = `"${audioTitle}" • ${articleCount} articles • Tap to listen`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'audio_ready',
            audioId,
            audioTitle,
            articleCount,
          },
          sound: settings.soundEnabled,
        },
        trigger: null,
        options: {
          channelId: 'audio-ready',
        },
      });

    } catch (error) {
      console.error('Error sending audio ready notification:', error);
    }
  }

  async sendPreDeliveryNotification(timeSlot: string, minutesBefore: number = 5) {
    const settings = await this.getNotificationSettings();
    
    if (!settings.enabled || !settings.scheduleDelivery) {
      return;
    }

    try {
      const title = '⏰ Audio Digest Coming Soon';
      const body = `Your scheduled audio will be ready in ${minutesBefore} minutes`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'pre_notification',
            timeSlot,
            minutesBefore,
          },
          sound: false, // Subtle notification
        },
        trigger: null,
        options: {
          channelId: 'schedule-delivery',
        },
      });
    } catch (error) {
      console.error('Error sending pre-delivery notification:', error);
    }
  }

  async sendErrorNotification(errorMessage: string, errorType: string = 'general') {
    const settings = await this.getNotificationSettings();
    
    if (!settings.enabled) {
      return;
    }

    try {
      let title = '❌ Something Went Wrong';
      let body = errorMessage;

      if (errorType === 'schedule_error') {
        title = '📅 Schedule Delivery Failed';
        body = `Could not create your scheduled audio: ${errorMessage}`;
      } else if (errorType === 'network_error') {
        title = '🌐 Network Error';
        body = `Connection issue: ${errorMessage}`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'error',
            errorType,
            errorMessage,
          },
          sound: settings.soundEnabled,
        },
        trigger: null,
        options: {
          channelId: 'schedule-delivery',
        },
      });
    } catch (error) {
      console.error('Error sending error notification:', error);
    }
  }

  async sendCustomNotification(
    title: string,
    body: string,
    data?: any,
    scheduleFor?: Date
  ) {
    const settings = await this.getNotificationSettings();
    
    if (!settings.enabled) {
      return;
    }

    try {
      const trigger = scheduleFor ? { date: scheduleFor } : null;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'custom', ...data },
          sound: settings.soundEnabled,
        },
        trigger,
      });
    } catch (error) {
      console.error('Error sending custom notification:', error);
    }
  }

  private isInQuietHours(quietHours: { startTime: string; endTime: string }): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const saved = await AsyncStorage.getItem('notification_settings');
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
    return defaultSettings;
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>) {
    try {
      const currentSettings = await this.getNotificationSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem('notification_settings', JSON.stringify(newSettings));
      
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // ============ NEW FEATURES ============

  async sendBreakingNewsNotification(article: any) {
    const settings = await this.getNotificationSettings();
    if (!settings.enabled) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 Breaking: ${article.source_name}`,
          body: article.title,
          data: {
            type: 'breaking_news',
            articleId: article.id,
            articleData: JSON.stringify(article),
          },
          categoryIdentifier: 'breaking-news',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending breaking news notification:', error);
    }
  }

  async sendBookmarkReminderNotification(bookmarkedArticles: any[]) {
    const settings = await this.getNotificationSettings();
    if (!settings.enabled) return;

    try {
      const count = bookmarkedArticles.length;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Reading Reminder',
          body: `You have ${count} saved article${count > 1 ? 's' : ''} waiting to be read`,
          data: {
            type: 'bookmark_reminder',
            count: count,
          },
          categoryIdentifier: 'bookmarks',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending bookmark reminder:', error);
    }
  }

  async sendShareCompleteNotification(platform: string, articleTitle: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Shared Successfully',
          body: `"${articleTitle}" was shared to ${platform}`,
          data: {
            type: 'share_complete',
            platform: platform,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending share complete notification:', error);
    }
  }

  async sendDailyDigestNotification(articleCount: number) {
    const settings = await this.getNotificationSettings();
    if (!settings.enabled) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📰 Your Daily News Digest',
          body: `${articleCount} new articles are ready for you to explore`,
          data: {
            type: 'daily_digest',
            articleCount: articleCount,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending daily digest notification:', error);
    }
  }

  async sendReadingHabitReminder(insights: any[]) {
    const settings = await this.getNotificationSettings();
    if (!settings.enabled) return;

    try {
      // Find the most actionable insight
      const motivationInsight = insights.find(i => i.type === 'motivation');
      const suggestionInsight = insights.find(i => i.type === 'suggestion');
      const achievementInsight = insights.find(i => i.type === 'achievement');
      
      const insight = motivationInsight || suggestionInsight || achievementInsight;
      
      if (insight) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📚 Reading Habit Reminder',
            body: `${insight.message} ${insight.action}`,
            data: {
              type: 'reading_habit_reminder',
              insightType: insight.type,
            },
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error sending reading habit reminder:', error);
    }
  }

  async sendStreakMotivationNotification(streakDays: number) {
    const settings = await this.getNotificationSettings();
    if (!settings.enabled) return;

    try {
      let title = '🔥 Reading Streak!';
      let body = '';
      
      if (streakDays === 0) {
        title = '📖 Start Your Reading Journey';
        body = 'Begin a new reading streak today with personalized article recommendations!';
      } else if (streakDays < 7) {
        body = `You're on a ${streakDays}-day streak! Keep the momentum going.`;
      } else if (streakDays < 30) {
        body = `Incredible ${streakDays}-day reading streak! You're building an amazing habit.`;
      } else {
        body = `Outstanding ${streakDays}-day streak! You're a reading champion! 🏆`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'streak_motivation',
            streakDays: streakDays,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending streak motivation:', error);
    }
  }

  async schedulePersonalizedReadingReminder(optimalHour: number) {
    const settings = await this.getNotificationSettings();
    if (!settings.enabled) return;

    try {
      // Cancel existing personalized reminders
      await Notifications.cancelScheduledNotificationAsync('personalized-reading-reminder');

      // Schedule at optimal time
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Perfect Reading Time',
          body: 'Based on your habits, now is your ideal time to read! Check out today\'s picks.',
          data: {
            type: 'personalized_reading_reminder',
            optimalTime: true,
          },
        },
        trigger: {
          hour: Math.floor(optimalHour),
          minute: Math.floor((optimalHour % 1) * 60),
          repeats: true,
        },
        identifier: 'personalized-reading-reminder',
      });
    } catch (error) {
      console.error('Error scheduling personalized reading reminder:', error);
    }
  }

  // Schedule recurring bookmark reminders
  async scheduleBookmarkReminders() {
    const settings = await this.getNotificationSettings();
    if (!settings.enabled) return;

    try {
      // Cancel existing bookmark reminders
      await Notifications.cancelScheduledNotificationAsync('bookmark-reminder-weekly');

      // Schedule weekly reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Weekly Reading Reminder',
          body: 'Don\'t forget to check your saved articles!',
          data: {
            type: 'bookmark_reminder_weekly',
          },
        },
        trigger: {
          weekday: 7, // Sunday
          hour: 10,
          minute: 0,
          repeats: true,
        },
        identifier: 'bookmark-reminder-weekly',
      });
    } catch (error) {
      console.error('Error scheduling bookmark reminders:', error);
    }
  }

  // Enhanced notification response handler
  private handleNotificationResponse(data: any) {
    
    switch (data?.type) {
      case 'audio_ready':
        this.handleAudioReadyTap(data.audioId);
        break;
      case 'schedule_error':
        this.handleScheduleErrorTap();
        break;
      case 'breaking_news':
        this.handleBreakingNewsTap(data.articleId, data.articleData);
        break;
      case 'bookmark_reminder':
      case 'bookmark_reminder_weekly':
        this.handleBookmarkReminderTap();
        break;
      case 'daily_digest':
        this.handleDailyDigestTap();
        break;
      default:
    }
  }

  private handleBreakingNewsTap(articleId: string, articleData?: string) {
    // Navigate to article detail
    // This should be handled by the navigation service
  }

  private handleBookmarkReminderTap() {
    // Navigate to bookmarks/library
  }

  private handleDailyDigestTap() {
    // Navigate to home screen
  }

  // Test method for development
  async testNotification(type: 'audio_ready' | 'schedule_error' | 'pre_notification' | 'breaking_news' | 'bookmark_reminder' = 'audio_ready') {
    switch (type) {
      case 'audio_ready':
        await this.sendAudioReadyNotification('Test Audio Digest', 5, 'test-audio-id');
        break;
      case 'schedule_error':
        await this.sendErrorNotification('Test error message', 'schedule_error');
        break;
      case 'pre_notification':
        await this.sendPreDeliveryNotification('08:00', 5);
        break;
      case 'breaking_news':
        await this.sendBreakingNewsNotification({
          id: 'test-123',
          title: 'Test Breaking News Article',
          source_name: 'Test Source',
        });
        break;
      case 'bookmark_reminder':
        await this.sendBookmarkReminderNotification([{}, {}, {}]); // 3 articles
        break;
    }
  }
}

export default NotificationService;