import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Offline Audio Types
interface OfflineAudioItem {
  audioId: string;
  title: string;
  artist: string;
  audioUrl: string;
  localFilePath: string;
  fileSize: number;
  downloadDate: string;
  lastAccessDate: string;
  metadata: {
    duration: number;
    format: string;
    quality: 'high' | 'standard' | 'low';
  };
}

interface DownloadProgress {
  audioId: string;
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

interface StorageInfo {
  totalSpace: number;
  availableSpace: number;
  usedByApp: number;
  audioFileCount: number;
}

interface AutoDownloadSettings {
  enabled: boolean;
  wifiOnly: boolean;
  maxStorageUsage: number; // MB
  downloadNewFollowedCreators: boolean;
  downloadDailyNews: boolean;
  maxFilesPerCreator: number;
  deleteAfterDays: number;
}

class OfflineAudioService {
  private static instance: OfflineAudioService;
  private readonly AUDIO_DIR = `${FileSystem.documentDirectory}audion_audio/`;
  private readonly METADATA_KEY = 'offline_audio_metadata';
  private readonly SETTINGS_KEY = 'auto_download_settings';
  private readonly MAX_CONCURRENT_DOWNLOADS = 3;
  
  private downloadQueue: string[] = [];
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();
  private downloadProgressCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();

  private constructor() {
    this.initializeStorageDirectory();
  }

  public static getInstance(): OfflineAudioService {
    if (!OfflineAudioService.instance) {
      OfflineAudioService.instance = new OfflineAudioService();
    }
    return OfflineAudioService.instance;
  }

  /**
   * Initialize audio storage directory
   */
  private async initializeStorageDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.AUDIO_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.AUDIO_DIR, { intermediates: true });
        console.log('📁 Audio storage directory created');
      }
    } catch (error) {
      console.error('❌ Failed to initialize storage directory:', error);
    }
  }

  /**
   * Download audio file for offline playback
   */
  async downloadAudio(
    audioId: string,
    audioUrl: string,
    title: string,
    artist: string,
    metadata: { duration: number; format: string; quality: 'high' | 'standard' | 'low' },
    progressCallback?: (progress: DownloadProgress) => void
  ): Promise<string | null> {
    try {
      // Check if already downloaded
      const existingFile = await this.getOfflineAudio(audioId);
      if (existingFile) {
        console.log('📱 Audio already downloaded:', title);
        return existingFile.localFilePath;
      }

      // Check storage space
      const storageInfo = await this.getStorageInfo();
      const estimatedSize = this.estimateFileSize(metadata.duration, metadata.quality);
      
      if (storageInfo.availableSpace < estimatedSize * 1.5) { // 50% buffer
        throw new Error('Insufficient storage space');
      }

      // Prepare download
      const fileName = `${audioId}.${metadata.format}`;
      const localFilePath = `${this.AUDIO_DIR}${fileName}`;
      
      if (progressCallback) {
        this.downloadProgressCallbacks.set(audioId, progressCallback);
      }

      // Create download resumable
      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        localFilePath,
        {},
        (downloadProgress) => {
          const progress: DownloadProgress = {
            audioId,
            progress: (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100,
            downloadedBytes: downloadProgress.totalBytesWritten,
            totalBytes: downloadProgress.totalBytesExpectedToWrite,
            speed: this.calculateDownloadSpeed(downloadProgress),
            timeRemaining: this.calculateTimeRemaining(downloadProgress),
          };
          
          const callback = this.downloadProgressCallbacks.get(audioId);
          if (callback) {
            callback(progress);
          }
        }
      );

      this.activeDownloads.set(audioId, downloadResumable);

      // Start download
      console.log('⬇️ Starting download:', title);
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0;

        // Save metadata
        const offlineAudio: OfflineAudioItem = {
          audioId,
          title,
          artist,
          audioUrl,
          localFilePath: result.uri,
          fileSize,
          downloadDate: new Date().toISOString(),
          lastAccessDate: new Date().toISOString(),
          metadata,
        };

        await this.saveOfflineAudioMetadata(offlineAudio);
        
        // Cleanup
        this.activeDownloads.delete(audioId);
        this.downloadProgressCallbacks.delete(audioId);
        
        console.log('✅ Download completed:', title);
        return result.uri;
      } else {
        throw new Error('Download failed - no result received');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      
      // Cleanup failed download
      this.activeDownloads.delete(audioId);
      this.downloadProgressCallbacks.delete(audioId);
      
      throw error;
    }
  }

  /**
   * Get offline audio file if available
   */
  async getOfflineAudio(audioId: string): Promise<OfflineAudioItem | null> {
    try {
      const metadata = await this.getOfflineAudioMetadata();
      const offlineAudio = metadata.find(item => item.audioId === audioId);
      
      if (offlineAudio) {
        // Verify file still exists
        const fileInfo = await FileSystem.getInfoAsync(offlineAudio.localFilePath);
        if (fileInfo.exists) {
          // Update last access date
          offlineAudio.lastAccessDate = new Date().toISOString();
          await this.saveOfflineAudioMetadata(offlineAudio, true);
          return offlineAudio;
        } else {
          // File was deleted, remove from metadata
          await this.removeOfflineAudioMetadata(audioId);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting offline audio:', error);
      return null;
    }
  }

  /**
   * Get all offline audio files
   */
  async getAllOfflineAudio(): Promise<OfflineAudioItem[]> {
    try {
      const metadata = await this.getOfflineAudioMetadata();
      
      // Verify all files still exist
      const validAudio: OfflineAudioItem[] = [];
      
      for (const audio of metadata) {
        const fileInfo = await FileSystem.getInfoAsync(audio.localFilePath);
        if (fileInfo.exists) {
          validAudio.push(audio);
        } else {
          // Remove metadata for missing files
          await this.removeOfflineAudioMetadata(audio.audioId);
        }
      }
      
      return validAudio.sort((a, b) => 
        new Date(b.downloadDate).getTime() - new Date(a.downloadDate).getTime()
      );
    } catch (error) {
      console.error('❌ Error getting all offline audio:', error);
      return [];
    }
  }

  /**
   * Delete offline audio file
   */
  async deleteOfflineAudio(audioId: string): Promise<boolean> {
    try {
      const offlineAudio = await this.getOfflineAudio(audioId);
      if (!offlineAudio) {
        return false;
      }

      // Delete file
      await FileSystem.deleteAsync(offlineAudio.localFilePath, { idempotent: true });
      
      // Remove metadata
      await this.removeOfflineAudioMetadata(audioId);
      
      console.log('🗑️ Deleted offline audio:', offlineAudio.title);
      return true;
    } catch (error) {
      console.error('❌ Error deleting offline audio:', error);
      return false;
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const totalSpace = await FileSystem.getTotalDiskCapacityAsync() || 0;
      const freeSpace = await FileSystem.getFreeDiskStorageAsync() || 0;
      
      // Calculate space used by audio files
      const offlineAudios = await this.getAllOfflineAudio();
      const usedByApp = offlineAudios.reduce((total, audio) => total + audio.fileSize, 0);
      
      return {
        totalSpace,
        availableSpace: freeSpace,
        usedByApp,
        audioFileCount: offlineAudios.length,
      };
    } catch (error) {
      console.error('❌ Error getting storage info:', error);
      return {
        totalSpace: 0,
        availableSpace: 0,
        usedByApp: 0,
        audioFileCount: 0,
      };
    }
  }

  /**
   * Clean up old/unused files based on settings
   */
  async cleanupOldFiles(): Promise<number> {
    try {
      const settings = await this.getAutoDownloadSettings();
      const offlineAudios = await this.getAllOfflineAudio();
      
      let deletedCount = 0;
      const now = new Date();
      
      for (const audio of offlineAudios) {
        const daysSinceAccess = Math.floor(
          (now.getTime() - new Date(audio.lastAccessDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceAccess > settings.deleteAfterDays) {
          const deleted = await this.deleteOfflineAudio(audio.audioId);
          if (deleted) {
            deletedCount++;
          }
        }
      }
      
      console.log(`🧹 Cleaned up ${deletedCount} old audio files`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Cancel ongoing download
   */
  async cancelDownload(audioId: string): Promise<boolean> {
    try {
      const downloadResumable = this.activeDownloads.get(audioId);
      if (downloadResumable) {
        await downloadResumable.pauseAsync();
        this.activeDownloads.delete(audioId);
        this.downloadProgressCallbacks.delete(audioId);
        
        console.log('❌ Download cancelled:', audioId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error cancelling download:', error);
      return false;
    }
  }

  /**
   * Get download progress for active downloads
   */
  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }

  /**
   * Auto-download settings management
   */
  async getAutoDownloadSettings(): Promise<AutoDownloadSettings> {
    try {
      const settings = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (settings) {
        return JSON.parse(settings);
      }
      
      // Default settings
      const defaultSettings: AutoDownloadSettings = {
        enabled: false,
        wifiOnly: true,
        maxStorageUsage: 1024, // 1GB
        downloadNewFollowedCreators: false,
        downloadDailyNews: true,
        maxFilesPerCreator: 5,
        deleteAfterDays: 30,
      };
      
      await this.setAutoDownloadSettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('❌ Error getting auto-download settings:', error);
      return {
        enabled: false,
        wifiOnly: true,
        maxStorageUsage: 1024,
        downloadNewFollowedCreators: false,
        downloadDailyNews: true,
        maxFilesPerCreator: 5,
        deleteAfterDays: 30,
      };
    }
  }

  async setAutoDownloadSettings(settings: AutoDownloadSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('❌ Error setting auto-download settings:', error);
    }
  }

  // Private helper methods
  private async getOfflineAudioMetadata(): Promise<OfflineAudioItem[]> {
    try {
      const metadata = await AsyncStorage.getItem(this.METADATA_KEY);
      return metadata ? JSON.parse(metadata) : [];
    } catch (error) {
      console.error('❌ Error getting offline audio metadata:', error);
      return [];
    }
  }

  private async saveOfflineAudioMetadata(newAudio: OfflineAudioItem, isUpdate: boolean = false): Promise<void> {
    try {
      const existingMetadata = await this.getOfflineAudioMetadata();
      
      if (isUpdate) {
        const index = existingMetadata.findIndex(item => item.audioId === newAudio.audioId);
        if (index !== -1) {
          existingMetadata[index] = newAudio;
        }
      } else {
        existingMetadata.push(newAudio);
      }
      
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(existingMetadata));
    } catch (error) {
      console.error('❌ Error saving offline audio metadata:', error);
    }
  }

  private async removeOfflineAudioMetadata(audioId: string): Promise<void> {
    try {
      const existingMetadata = await this.getOfflineAudioMetadata();
      const filteredMetadata = existingMetadata.filter(item => item.audioId !== audioId);
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(filteredMetadata));
    } catch (error) {
      console.error('❌ Error removing offline audio metadata:', error);
    }
  }

  private estimateFileSize(duration: number, quality: 'high' | 'standard' | 'low'): number {
    // Estimate based on bitrate and duration
    const bitrates = {
      high: 320, // kbps
      standard: 128, // kbps
      low: 64, // kbps
    };
    
    const bitrate = bitrates[quality];
    return (bitrate * duration * 1000) / 8; // Convert to bytes
  }

  private calculateDownloadSpeed(progress: FileSystem.DownloadProgressData): number {
    // Simple speed calculation - could be improved with rolling average
    return progress.totalBytesWritten / ((Date.now() - 0) / 1000);
  }

  private calculateTimeRemaining(progress: FileSystem.DownloadProgressData): number {
    const bytesRemaining = progress.totalBytesExpectedToWrite - progress.totalBytesWritten;
    const speed = this.calculateDownloadSpeed(progress);
    return speed > 0 ? bytesRemaining / speed : 0;
  }
}

export default OfflineAudioService;
export type { 
  OfflineAudioItem, 
  DownloadProgress, 
  StorageInfo, 
  AutoDownloadSettings 
};