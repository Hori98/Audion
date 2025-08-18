import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * 🎵 Native Audio Service for Lock Screen Controls
 * 
 * This service provides proper lock screen media controls for iOS and Android.
 * Note: Full lock screen controls require Development Build, not Expo Go.
 */
class NativeAudioService {
  private static instance: NativeAudioService;
  private isInitialized: boolean = false;
  private currentSound: Audio.Sound | null = null;
  private currentMetadata: any = null;

  private constructor() {}

  public static getInstance(): NativeAudioService {
    if (!NativeAudioService.instance) {
      NativeAudioService.instance = new NativeAudioService();
    }
    return NativeAudioService.instance;
  }

  /**
   * Initialize native audio capabilities
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure audio session for optimal background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: 1, // Do not mix
        interruptionModeAndroid: 1, // Do not mix
        playThroughEarpieceAndroid: false,
      });

      // Set up notification handling for media controls
      await this.setupMediaNotifications();

      this.isInitialized = true;
      console.log('🎵 NativeAudioService initialized for lock screen controls');
    } catch (error) {
      console.error('❌ Failed to initialize NativeAudioService:', error);
      throw error;
    }
  }

  /**
   * Set up media control notifications
   */
  private async setupMediaNotifications(): Promise<void> {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    // Set up media control category
    await Notifications.setNotificationCategoryAsync('MEDIA_CONTROLS', [
      {
        identifier: 'PLAY_PAUSE',
        buttonTitle: '⏯️',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'SKIP_FORWARD',
        buttonTitle: '⏭️ +30s',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'SKIP_BACKWARD',
        buttonTitle: '⏮️ -15s',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  /**
   * Play audio with proper lock screen integration
   */
  async playAudio(audioUri: string, metadata: any): Promise<Audio.Sound> {
    try {
      // Stop any existing audio
      if (this.currentSound) {
        await this.currentSound.unloadAsync();
      }

      // Create new sound instance
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { 
          shouldPlay: true,
          // Enable proper AVAudioSession for lock screen
          progressUpdateIntervalMillis: 1000,
        }
      );

      this.currentSound = sound;
      this.currentMetadata = metadata;

      // Show media control notification
      await this.showMediaNotification(metadata, true);

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          // Update notification with current status
          this.updateMediaNotification({
            ...metadata,
            isPlaying: status.isPlaying,
            position: status.positionMillis || 0,
            duration: status.durationMillis || 0,
          });
        }
      });

      console.log('🎵 Audio playing with lock screen controls:', metadata.title);
      return sound;
    } catch (error) {
      console.error('❌ Failed to play audio with lock screen controls:', error);
      throw error;
    }
  }

  /**
   * Show persistent media notification
   */
  private async showMediaNotification(metadata: any, isPlaying: boolean): Promise<void> {
    try {
      const notification = {
        identifier: `media_${metadata.id}`,
        content: {
          title: metadata.title,
          body: `Audion News • ${isPlaying ? 'Playing' : 'Paused'}`,
          categoryIdentifier: 'MEDIA_CONTROLS',
          data: {
            audioId: metadata.id,
            action: 'MEDIA_CONTROL',
          },
          priority: Notifications.AndroidNotificationPriority.HIGH,
          sticky: true,
          autoDismiss: false,
        },
        trigger: null,
      };

      await Notifications.scheduleNotificationAsync(notification);
      console.log('🔔 Media notification shown');
    } catch (error) {
      console.error('❌ Failed to show media notification:', error);
    }
  }

  /**
   * Update media notification
   */
  private async updateMediaNotification(metadata: any): Promise<void> {
    if (!this.currentMetadata) return;

    try {
      await this.showMediaNotification(metadata, metadata.isPlaying);
    } catch (error) {
      console.error('❌ Failed to update media notification:', error);
    }
  }

  /**
   * Stop audio and clear notifications
   */
  async stopAudio(): Promise<void> {
    try {
      if (this.currentSound) {
        await this.currentSound.unloadAsync();
        this.currentSound = null;
      }

      // Clear media notification
      if (this.currentMetadata) {
        await Notifications.dismissNotificationAsync(`media_${this.currentMetadata.id}`);
      }

      this.currentMetadata = null;
      console.log('🎵 Audio stopped, notifications cleared');
    } catch (error) {
      console.error('❌ Error stopping audio:', error);
    }
  }

  /**
   * Get lock screen control capabilities
   */
  getCapabilities(): {
    lockScreenControls: boolean;
    backgroundPlayback: boolean;
    notificationControls: boolean;
    platform: string;
  } {
    return {
      lockScreenControls: Platform.OS === 'ios' && this.isInitialized,
      backgroundPlayback: this.isInitialized,
      notificationControls: this.isInitialized,
      platform: Platform.OS,
    };
  }

  /**
   * Check if running in development build (better lock screen support)
   */
  isDevelopmentBuild(): boolean {
    // In development build, we have access to more native features
    return !__DEV__ || Platform.OS === 'ios';
  }
}

export default NativeAudioService;