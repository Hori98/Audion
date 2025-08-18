import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Background Audio Types
interface AudioMetadata {
  title: string;
  artist: string;
  artwork?: string;
  duration: number;
  audioId: string;
}

interface PlaybackState {
  isPlaying: boolean;
  position: number;
  duration: number;
  rate: number;
}

interface BackgroundNotificationAction {
  id: string;
  title: string;
  icon?: string;
}

class BackgroundAudioService {
  private static instance: BackgroundAudioService;
  private isInitialized: boolean = false;
  private currentMetadata: AudioMetadata | null = null;
  private notificationId: string | null = null;

  private constructor() {}

  public static getInstance(): BackgroundAudioService {
    if (!BackgroundAudioService.instance) {
      BackgroundAudioService.instance = new BackgroundAudioService();
    }
    return BackgroundAudioService.instance;
  }

  /**
   * Initialize background audio capabilities
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure notification permissions
      await this.setupNotifications();
      
      // Configure audio session for background playback
      await this.setupAudioSession();
      
      this.isInitialized = true;
      console.log('🎵 BackgroundAudioService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize BackgroundAudioService:', error);
      throw error;
    }
  }

  /**
   * Setup push notification permissions and configuration
   */
  private async setupNotifications(): Promise<void> {
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      return;
    }

    // Configure notification categories for media controls (only on native platforms)
    if (Platform.OS !== 'web') {
      await Notifications.setNotificationCategoryAsync('MEDIA_PLAYBACK', [
        {
          identifier: 'PLAY_PAUSE',
          buttonTitle: '⏯️',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SKIP_FORWARD',
          buttonTitle: '⏭️',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SKIP_BACKWARD',
          buttonTitle: '⏮️',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    }

    // Handle notification responses (media control actions)
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationAction.bind(this));
  }

  /**
   * Configure audio session for background playback
   */
  private async setupAudioSession(): Promise<void> {
    try {
      // Use the correct enum values for SDK 53
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true, // Enable background audio
        interruptionModeIOS: 1, // INTERRUPTION_MODE_IOS_DO_NOT_MIX
        playsInSilentModeIOS: true, // Play even when phone is on silent
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
        playThroughEarpieceAndroid: false,
      });

      console.log('🎵 Audio session configured for background playback');
    } catch (error) {
      console.error('❌ Error configuring audio session:', error);
      // Try with simpler configuration as fallback
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        });
        console.log('🎵 Audio session configured with fallback settings');
      } catch (fallbackError) {
        console.error('❌ Fallback audio configuration also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Update now playing metadata (for lock screen and control center)
   */
  async updateNowPlaying(metadata: AudioMetadata): Promise<void> {
    this.currentMetadata = metadata;

    try {
      // For iOS: Update MPNowPlayingInfoCenter
      if (Platform.OS === 'ios') {
        // This would typically require react-native-track-player or similar
        // For now, we'll use notification-based approach
        await this.updatePlaybackNotification(metadata, { isPlaying: true, position: 0, duration: metadata.duration, rate: 1.0 });
      }

      // For Android: Update MediaSession
      if (Platform.OS === 'android') {
        await this.updatePlaybackNotification(metadata, { isPlaying: true, position: 0, duration: metadata.duration, rate: 1.0 });
      }

      console.log('🎵 Now playing info updated:', metadata.title);
    } catch (error) {
      console.error('❌ Failed to update now playing info:', error);
    }
  }

  /**
   * Show/update playback notification with media controls
   */
  async updatePlaybackNotification(metadata: AudioMetadata, playbackState: PlaybackState): Promise<void> {
    try {
      const notificationContent = {
        title: metadata.title,
        body: `${metadata.artist} • ${playbackState.isPlaying ? '▶️ Playing' : '⏸️ Paused'}`,
        categoryIdentifier: 'MEDIA_PLAYBACK',
        data: {
          audioId: metadata.audioId,
          action: 'MEDIA_CONTROL',
        },
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sticky: true, // Keep notification persistent
        autoDismiss: false, // Keep showing until manually dismissed
        // For proper lock screen display
        sound: false, // Don't play sound for updates
      };

      if (this.notificationId) {
        // Update existing notification
        await Notifications.dismissNotificationAsync(this.notificationId);
      }

      const notificationRequest = {
        identifier: `media_${metadata.audioId}`,
        content: notificationContent,
        trigger: null, // Show immediately
      };

      await Notifications.scheduleNotificationAsync(notificationRequest);
      this.notificationId = notificationRequest.identifier;

      console.log('🔔 Playback notification updated');
    } catch (error) {
      console.error('❌ Failed to update playback notification:', error);
    }
  }

  /**
   * Handle notification action responses (play/pause/skip)
   */
  private async handleNotificationAction(response: Notifications.NotificationResponse): Promise<void> {
    const { actionIdentifier, notification } = response;
    const audioId = notification.request.content.data?.audioId;

    if (!audioId) return;

    try {
      switch (actionIdentifier) {
        case 'PLAY_PAUSE':
          // Emit event to AudioContext to toggle playback
          this.emitMediaAction('TOGGLE_PLAYBACK', audioId);
          break;
        case 'SKIP_FORWARD':
          this.emitMediaAction('SKIP_FORWARD', audioId);
          break;
        case 'SKIP_BACKWARD':
          this.emitMediaAction('SKIP_BACKWARD', audioId);
          break;
        default:
          console.log('🎵 Unhandled notification action:', actionIdentifier);
      }
    } catch (error) {
      console.error('❌ Error handling notification action:', error);
    }
  }

  /**
   * Emit media control actions to be handled by AudioContext
   */
  private emitMediaAction(action: string, audioId: string): void {
    // This would typically use EventEmitter or similar
    // For now, we'll use a simple callback approach
    console.log(`🎵 Media action: ${action} for audio ${audioId}`);
    
    // Trigger custom event that AudioContext can listen to
    if (typeof (global as any).audioContextMediaHandler === 'function') {
      (global as any).audioContextMediaHandler(action, audioId);
    }
  }

  /**
   * Clear now playing info and dismiss notification
   */
  async clearNowPlaying(): Promise<void> {
    try {
      if (this.notificationId) {
        await Notifications.dismissNotificationAsync(this.notificationId);
        this.notificationId = null;
      }

      this.currentMetadata = null;
      console.log('🎵 Now playing info cleared');
    } catch (error) {
      console.error('❌ Failed to clear now playing info:', error);
    }
  }

  /**
   * Update playback position (for scrubber in lock screen)
   */
  async updatePlaybackPosition(position: number, duration: number): Promise<void> {
    if (!this.currentMetadata) return;

    try {
      // Update the notification with current playback progress
      // This is a simplified approach - proper implementation would use
      // platform-specific media session APIs
      console.log(`🎵 Playback position: ${Math.floor(position/1000)}s / ${Math.floor(duration/1000)}s`);
    } catch (error) {
      console.error('❌ Failed to update playback position:', error);
    }
  }

  /**
   * Set up media control event handlers
   */
  setMediaActionHandler(handler: (action: string, audioId: string) => void): void {
    (global as any).audioContextMediaHandler = handler;
  }

  /**
   * Get current background audio capabilities
   */
  getCapabilities(): {
    backgroundPlayback: boolean;
    lockScreenControls: boolean;
    notificationControls: boolean;
  } {
    return {
      backgroundPlayback: this.isInitialized,
      lockScreenControls: Platform.OS === 'ios', // More advanced on iOS
      notificationControls: this.isInitialized,
    };
  }

  /**
   * Cleanup background audio service
   */
  async cleanup(): Promise<void> {
    try {
      await this.clearNowPlaying();
      
      // Remove notification listeners
      Notifications.removeAllNotificationListeners();
      
      this.isInitialized = false;
      console.log('🎵 BackgroundAudioService cleaned up');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

export default BackgroundAudioService;
export type { AudioMetadata, PlaybackState, BackgroundNotificationAction };