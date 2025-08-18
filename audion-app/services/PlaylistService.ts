import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Share } from 'react-native';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';

// Interfaces
interface Playlist {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  audio_ids: string[];
  user_id: string;
  is_public: boolean;
  cover_image?: string;
  audio_count?: number;
}

interface RecentAudioItem {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  created_at: string;
  summary?: string;
  articles?: any[];
  promptMetadata?: {
    promptMode: string;
    promptStyle: string;
    creationMethod: string;
    customPrompt?: string;
  };
}

interface PlaylistMenuAction {
  share: (audioItem: RecentAudioItem) => Promise<void>;
  addToPlaylist: (audioItem: RecentAudioItem) => Promise<void>;
  removeFromPlaylist: (audioItem: RecentAudioItem, playlistId: string) => Promise<void>;
  addToQueue: (audioItem: RecentAudioItem) => Promise<void>;
  goToCreator: (audioItem: RecentAudioItem) => Promise<void>;
  showSources: (audioItem: RecentAudioItem) => Promise<void>;
  report: (audioItem: RecentAudioItem) => Promise<void>;
}

interface ReportReason {
  id: string;
  name: string;
  description: string;
}

class PlaylistService {
  private static instance: PlaylistService;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): PlaylistService {
    if (!PlaylistService.instance) {
      PlaylistService.instance = new PlaylistService();
    }
    return PlaylistService.instance;
  }

  public setAuthToken(token: string | null) {
    this.token = token;
  }

  // =====================================
  // Playlist Management Functions
  // =====================================

  /**
   * Get all playlists for current user
   */
  async getPlaylists(): Promise<Playlist[]> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      // Try to get from cache first
      const cachedPlaylists = await this.getCachedPlaylists();
      if (cachedPlaylists) {
        return cachedPlaylists;
      }

      const response = await axios.get(`${API_BASE}/api/playlists`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      const playlists = response.data || [];
      
      // Cache the results
      await this.setCachedPlaylists(playlists);
      
      return playlists;
    } catch (error) {
      console.error('Error fetching playlists:', error);
      
      // Return default playlist if API fails
      return [{
        id: 'default',
        name: 'Recent',
        description: 'Recently created audio files',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        audio_ids: [],
        user_id: 'current',
        is_public: false,
        audio_count: 0
      }];
    }
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(playlist: Omit<Playlist, 'id' | 'created_at' | 'updated_at' | 'audio_ids'>): Promise<Playlist> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await axios.post(`${API_BASE}/api/playlists`, playlist, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      // Clear cache after creating new playlist
      await this.clearPlaylistsCache();
      
      return response.data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Add audio to playlist
   */
  async addToPlaylist(playlistId: string, audioId: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      await axios.post(`${API_BASE}/api/playlists/${playlistId}/add`, {
        audio_id: audioId
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      // Clear cache after modification
      await this.clearPlaylistsCache();
      
    } catch (error) {
      console.error('Error adding to playlist:', error);
      throw error;
    }
  }

  /**
   * Remove audio from playlist
   */
  async removeFromPlaylist(playlistId: string, audioId: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      await axios.delete(`${API_BASE}/api/playlists/${playlistId}/remove/${audioId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      // Clear cache after modification
      await this.clearPlaylistsCache();
      
    } catch (error) {
      console.error('Error removing from playlist:', error);
      throw error;
    }
  }

  // =====================================
  // 3-Dot Menu Actions
  // =====================================

  /**
   * Share audio via native share functionality
   */
  async shareAudio(audioItem: RecentAudioItem): Promise<void> {
    try {
      const shareContent = {
        title: audioItem.title,
        message: `Check out this AI-generated podcast: "${audioItem.title}"\n\nCreated with Audion - AI News to Podcast`,
        url: audioItem.audio_url
      };

      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        // Analytics: Track share action
        console.log('Audio shared successfully:', audioItem.id);
      }
      
    } catch (error) {
      console.error('Error sharing audio:', error);
      Alert.alert('Error', 'Failed to share audio. Please try again.');
    }
  }

  /**
   * Add audio to queue for next playback
   */
  async addToQueue(audioItem: RecentAudioItem): Promise<void> {
    try {
      // This will be implemented when AudioContext queue functionality is added
      // For now, store in AsyncStorage as pending queue
      
      const queueKey = 'audio_playback_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      // Check if already in queue
      const alreadyInQueue = queue.some((item: RecentAudioItem) => item.id === audioItem.id);
      
      if (!alreadyInQueue) {
        queue.push(audioItem);
        await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
        
        Alert.alert('Added to Queue', `"${audioItem.title}" has been added to your playback queue.`);
      } else {
        Alert.alert('Already in Queue', 'This audio is already in your playback queue.');
      }
      
    } catch (error) {
      console.error('Error adding to queue:', error);
      Alert.alert('Error', 'Failed to add to queue. Please try again.');
    }
  }

  /**
   * Show sources (articles) used in the audio
   */
  async showSources(audioItem: RecentAudioItem): Promise<void> {
    try {
      const articles = audioItem.articles || [];
      
      if (articles.length === 0) {
        Alert.alert('No Sources', 'No source articles available for this audio.');
        return;
      }

      // Store articles for modal display
      // This will be handled by the UI component that calls this function
      await AsyncStorage.setItem('temp_audio_sources', JSON.stringify(articles));
      
      return; // UI component will handle modal display
      
    } catch (error) {
      console.error('Error showing sources:', error);
      Alert.alert('Error', 'Failed to load sources. Please try again.');
    }
  }

  /**
   * Report inappropriate content
   */
  async reportContent(audioItem: RecentAudioItem, reason: string, description?: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      await axios.post(`${API_BASE}/api/reports`, {
        audio_id: audioItem.id,
        reason,
        description
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review this content and take appropriate action.'
      );
      
    } catch (error) {
      console.error('Error reporting content:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  }

  /**
   * Navigate to creator profile (placeholder for future social features)
   */
  async goToCreator(audioItem: RecentAudioItem): Promise<void> {
    try {
      // For now, show creator information
      // In the future, this will navigate to user profile
      
      const creatorInfo = audioItem.promptMetadata ? {
        mode: audioItem.promptMetadata.promptMode,
        style: audioItem.promptMetadata.promptStyle,
        method: audioItem.promptMetadata.creationMethod
      } : null;

      const message = creatorInfo 
        ? `Audio created with:\nMode: ${creatorInfo.mode}\nStyle: ${creatorInfo.style}\nMethod: ${creatorInfo.method}`
        : 'Audio creator information not available.';

      Alert.alert('Creator Info', message);
      
    } catch (error) {
      console.error('Error showing creator info:', error);
      Alert.alert('Error', 'Failed to load creator information.');
    }
  }

  // =====================================
  // Helper Functions
  // =====================================

  /**
   * Get available report reasons
   */
  getReportReasons(): ReportReason[] {
    return [
      { id: 'spam', name: 'Spam', description: 'Unwanted or repetitive content' },
      { id: 'inappropriate', name: 'Inappropriate Content', description: 'Content that violates community guidelines' },
      { id: 'misreading', name: 'Poor Audio Quality', description: 'Incorrect pronunciation or poor TTS quality' },
      { id: 'copyright', name: 'Copyright Issue', description: 'Unauthorized use of copyrighted material' },
      { id: 'other', name: 'Other', description: 'Other issues not listed above' }
    ];
  }

  /**
   * Get playback queue
   */
  async getPlaybackQueue(): Promise<RecentAudioItem[]> {
    try {
      const queueData = await AsyncStorage.getItem('audio_playback_queue');
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting playback queue:', error);
      return [];
    }
  }

  /**
   * Clear playback queue
   */
  async clearPlaybackQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem('audio_playback_queue');
    } catch (error) {
      console.error('Error clearing playback queue:', error);
    }
  }

  // =====================================
  // Cache Management
  // =====================================

  private async getCachedPlaylists(): Promise<Playlist[] | null> {
    try {
      const cached = await AsyncStorage.getItem('cached_playlists');
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Cache valid for 5 minutes
        if (now - data.timestamp < 5 * 60 * 1000) {
          return data.playlists;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached playlists:', error);
      return null;
    }
  }

  private async setCachedPlaylists(playlists: Playlist[]): Promise<void> {
    try {
      const cacheData = {
        playlists,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('cached_playlists', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching playlists:', error);
    }
  }

  private async clearPlaylistsCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('cached_playlists');
    } catch (error) {
      console.error('Error clearing playlists cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      await Promise.all([
        this.clearPlaylistsCache(),
        AsyncStorage.removeItem('audio_playback_queue'),
        AsyncStorage.removeItem('temp_audio_sources')
      ]);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
}

export default PlaylistService;
export type { Playlist, RecentAudioItem, PlaylistMenuAction, ReportReason };