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
      console.log('NotificationService initialized successfully');
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
      console.log('Notification received in foreground:', notification);
    });
  }

  private handleNotificationResponse(data: any) {
    console.log('Notification tapped with data:', data);
    
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
    console.log('Navigate to audio player for:', audioId);
  }

  private handleScheduleErrorTap() {
    // TODO: Implement navigation to schedule settings
    console.log('Navigate to schedule settings');
  }

  private handlePreNotificationTap() {
    console.log('Pre-notification tapped - showing preparation UI');
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
      console.log('📱 Web platform: Skipping native notification for:', audioTitle);
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

      console.log('Audio ready notification sent for:', audioTitle);
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
      
      console.log('Notification settings updated:', newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cleared');
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

  // Test method for development
  async testNotification(type: 'audio_ready' | 'schedule_error' | 'pre_notification' = 'audio_ready') {
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
    }
    console.log(`Test notification sent: ${type}`);
  }
}

export default NotificationService;