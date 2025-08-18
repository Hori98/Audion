import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';

// User Profile Interfaces
interface UserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  location?: string;
  website?: string;
  created_at: string;
  updated_at: string;
  
  // Social Stats
  followers_count: number;
  following_count: number;
  audio_count: number;
  total_plays: number;
  total_downloads: number;
  
  // Verification & Status
  is_verified: boolean;
  is_public: boolean;
  account_type: 'user' | 'creator' | 'official' | 'premium';
  
  // Privacy Settings
  privacy_settings: {
    profile_visibility: 'public' | 'followers' | 'private';
    audio_visibility: 'public' | 'followers' | 'private';
    allow_messages: boolean;
    allow_follows: boolean;
    show_online_status: boolean;
  };
  
  // Preferences
  preferences: {
    language: string;
    timezone: string;
    notification_settings: NotificationSettings;
    content_preferences: ContentPreferences;
  };
}

interface NotificationSettings {
  push_notifications: boolean;
  email_notifications: boolean;
  new_followers: boolean;
  audio_likes: boolean;
  audio_comments: boolean;
  mentions: boolean;
  breaking_news: boolean;
  weekly_summary: boolean;
}

interface ContentPreferences {
  preferred_genres: string[];
  content_language: string[];
  content_length_preference: 'short' | 'medium' | 'long' | 'any';
  auto_download_followed_creators: boolean;
  hide_explicit_content: boolean;
}

interface SocialInteraction {
  user_id: string;
  target_user_id: string;
  interaction_type: 'follow' | 'block' | 'mute';
  created_at: string;
}

interface UserStats {
  total_audio_created: number;
  total_audio_liked: number;
  total_audio_shared: number;
  total_listening_time: number; // in seconds
  streak_days: number;
  last_active: string;
  registration_date: string;
}

class UserProfileService {
  private static instance: UserProfileService;
  private token: string | null = null;
  private currentProfile: UserProfile | null = null;

  private constructor() {}

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  public setAuthToken(token: string | null) {
    this.token = token;
  }

  // =====================================
  // Profile Management
  // =====================================

  /**
   * Get current user's profile
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      // Check cache first
      const cachedProfile = await this.getCachedProfile();
      if (cachedProfile && this.currentProfile) {
        return this.currentProfile;
      }

      const response = await axios.get(`${API_BASE}/api/user/profile`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      this.currentProfile = response.data;
      await this.setCachedProfile(this.currentProfile);
      
      return this.currentProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // Return default profile structure if API fails
      return this.getDefaultProfile();
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await axios.put(`${API_BASE}/api/user/profile`, updates, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      this.currentProfile = response.data;
      await this.setCachedProfile(this.currentProfile);
      
      return this.currentProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(): Promise<string | null> {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to update your avatar.');
        return null;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) {
        return null;
      }

      const imageUri = result.assets[0].uri;
      
      // Upload to server
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await axios.post(`${API_BASE}/api/user/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const avatarUrl = response.data.avatar_url;
      
      // Update profile cache
      if (this.currentProfile) {
        this.currentProfile.avatar_url = avatarUrl;
        await this.setCachedProfile(this.currentProfile);
      }

      return avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
      return null;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await axios.get(`${API_BASE}/api/user/profile/${userId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // =====================================
  // Social Features
  // =====================================

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<boolean> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      await axios.post(`${API_BASE}/api/user/follow`, {
        user_id: userId
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      // Update following count in cache
      if (this.currentProfile) {
        this.currentProfile.following_count += 1;
        await this.setCachedProfile(this.currentProfile);
      }

      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<boolean> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      await axios.delete(`${API_BASE}/api/user/follow/${userId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      // Update following count in cache
      if (this.currentProfile) {
        this.currentProfile.following_count = Math.max(0, this.currentProfile.following_count - 1);
        await this.setCachedProfile(this.currentProfile);
      }

      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  /**
   * Check if following a user
   */
  async isFollowing(userId: string): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await axios.get(`${API_BASE}/api/user/following/${userId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      return response.data.is_following;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId?: string, limit: number = 20, offset: number = 0): Promise<UserProfile[]> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      const targetUserId = userId || 'me';
      const response = await axios.get(`${API_BASE}/api/user/${targetUserId}/followers`, {
        headers: { Authorization: `Bearer ${this.token}` },
        params: { limit, offset }
      });

      return response.data.followers || [];
    } catch (error) {
      console.error('Error fetching followers:', error);
      return [];
    }
  }

  /**
   * Get user's following
   */
  async getFollowing(userId?: string, limit: number = 20, offset: number = 0): Promise<UserProfile[]> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      const targetUserId = userId || 'me';
      const response = await axios.get(`${API_BASE}/api/user/${targetUserId}/following`, {
        headers: { Authorization: `Bearer ${this.token}` },
        params: { limit, offset }
      });

      return response.data.following || [];
    } catch (error) {
      console.error('Error fetching following:', error);
      return [];
    }
  }

  // =====================================
  // User Statistics
  // =====================================

  /**
   * Get user statistics
   */
  async getUserStats(userId?: string): Promise<UserStats | null> {
    if (!this.token) {
      throw new Error('Authentication required');
    }

    try {
      const targetUserId = userId || 'me';
      const response = await axios.get(`${API_BASE}/api/user/${targetUserId}/stats`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }

  /**
   * Update user activity (listening time, etc.)
   */
  async updateUserActivity(activity: {
    audio_id?: string;
    activity_type: 'play' | 'download' | 'share' | 'like';
    duration?: number;
  }): Promise<void> {
    if (!this.token) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/user/activity`, activity, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
    } catch (error) {
      console.error('Error updating user activity:', error);
      // Don't throw error for activity tracking
    }
  }

  // =====================================
  // Helper Functions
  // =====================================

  private getDefaultProfile(): UserProfile {
    return {
      id: 'temp_user',
      email: 'user@example.com',
      username: 'user',
      display_name: 'User',
      bio: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      followers_count: 0,
      following_count: 0,
      audio_count: 0,
      total_plays: 0,
      total_downloads: 0,
      is_verified: false,
      is_public: true,
      account_type: 'user',
      privacy_settings: {
        profile_visibility: 'public',
        audio_visibility: 'public',
        allow_messages: true,
        allow_follows: true,
        show_online_status: true,
      },
      preferences: {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        notification_settings: {
          push_notifications: true,
          email_notifications: true,
          new_followers: true,
          audio_likes: true,
          audio_comments: false,
          mentions: true,
          breaking_news: true,
          weekly_summary: true,
        },
        content_preferences: {
          preferred_genres: ['tech', 'news'],
          content_language: ['ja', 'en'],
          content_length_preference: 'medium',
          auto_download_followed_creators: false,
          hide_explicit_content: false,
        },
      },
    };
  }

  // =====================================
  // Cache Management
  // =====================================

  private async getCachedProfile(): Promise<UserProfile | null> {
    try {
      const cached = await AsyncStorage.getItem('user_profile_cache');
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Cache valid for 30 minutes
        if (now - data.timestamp < 30 * 60 * 1000) {
          return data.profile;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached profile:', error);
      return null;
    }
  }

  private async setCachedProfile(profile: UserProfile): Promise<void> {
    try {
      const cacheData = {
        profile,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('user_profile_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching profile:', error);
    }
  }

  private async clearProfileCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user_profile_cache');
      this.currentProfile = null;
    } catch (error) {
      console.error('Error clearing profile cache:', error);
    }
  }

  /**
   * Clear all user data (logout)
   */
  async clearAllUserData(): Promise<void> {
    try {
      await Promise.all([
        this.clearProfileCache(),
        AsyncStorage.removeItem('user_activity_cache'),
        AsyncStorage.removeItem('social_interactions_cache')
      ]);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }
}

export default UserProfileService;
export type { 
  UserProfile, 
  NotificationSettings, 
  ContentPreferences, 
  SocialInteraction, 
  UserStats 
};