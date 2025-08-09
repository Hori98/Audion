import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserInteraction {
  action: 'play' | 'pause' | 'skip' | 'like' | 'share' | 'complete';
  contentId: string;
  contentType: string;
  category: string;
  timestamp: number;
  duration?: number; // For play/pause events
  position?: number; // Playback position when action occurred
}

export interface UserPreferences {
  favoriteCategories: { [category: string]: number };
  playbackPatterns: {
    averageSessionLength: number;
    preferredTimeOfDay: string[];
    skipRate: number;
    completionRate: number;
  };
  contentPreferences: {
    preferredLength: 'short' | 'medium' | 'long';
    preferredStyle: string[];
    topicInterests: { [topic: string]: number };
  };
  lastUpdated: number;
}

export interface PersonalizationContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  sessionDuration: number;
  recentInteractions: UserInteraction[];
}

class PersonalizationService {
  private static readonly STORAGE_KEY = 'user_personalization';
  private static readonly INTERACTIONS_KEY = 'user_interactions';
  private static readonly MAX_INTERACTIONS = 1000; // Keep last 1000 interactions
  
  private static currentPreferences: UserPreferences | null = null;
  private static interactions: UserInteraction[] = [];

  // Initialize default preferences
  private static getDefaultPreferences(): UserPreferences {
    return {
      favoriteCategories: {},
      playbackPatterns: {
        averageSessionLength: 180, // 3 minutes default
        preferredTimeOfDay: [],
        skipRate: 0,
        completionRate: 0,
      },
      contentPreferences: {
        preferredLength: 'medium',
        preferredStyle: [],
        topicInterests: {},
      },
      lastUpdated: Date.now(),
    };
  }

  // Load user preferences from storage
  static async loadPreferences(): Promise<UserPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentPreferences = JSON.parse(stored);
        return this.currentPreferences!;
      }
    } catch (error) {
      console.error('Error loading personalization preferences:', error);
    }
    
    this.currentPreferences = this.getDefaultPreferences();
    return this.currentPreferences;
  }

  // Save preferences to storage
  static async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      preferences.lastUpdated = Date.now();
      this.currentPreferences = preferences;
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving personalization preferences:', error);
    }
  }

  // Load interaction history
  static async loadInteractions(): Promise<UserInteraction[]> {
    try {
      const stored = await AsyncStorage.getItem(this.INTERACTIONS_KEY);
      if (stored) {
        this.interactions = JSON.parse(stored);
        return this.interactions;
      }
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
    
    this.interactions = [];
    return this.interactions;
  }

  // Record a user interaction
  static async recordInteraction(interaction: UserInteraction): Promise<void> {
    try {
      await this.loadInteractions();
      
      // Add new interaction
      this.interactions.unshift(interaction);
      
      // Limit interactions to MAX_INTERACTIONS
      if (this.interactions.length > this.MAX_INTERACTIONS) {
        this.interactions = this.interactions.slice(0, this.MAX_INTERACTIONS);
      }
      
      // Save interactions
      await AsyncStorage.setItem(this.INTERACTIONS_KEY, JSON.stringify(this.interactions));
      
      // Update preferences based on this interaction
      await this.updatePreferencesFromInteraction(interaction);
      
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  // Update preferences based on interaction
  private static async updatePreferencesFromInteraction(interaction: UserInteraction): Promise<void> {
    const preferences = await this.loadPreferences();
    
    // Update category preferences
    if (interaction.category) {
      if (!preferences.favoriteCategories[interaction.category]) {
        preferences.favoriteCategories[interaction.category] = 0;
      }
      
      // Weight different actions differently
      let weight = 0;
      switch (interaction.action) {
        case 'like':
          weight = 3;
          break;
        case 'complete':
          weight = 2;
          break;
        case 'play':
          weight = 1;
          break;
        case 'share':
          weight = 2;
          break;
        case 'skip':
          weight = -1;
          break;
      }
      
      preferences.favoriteCategories[interaction.category] += weight;
    }
    
    // Update playback patterns
    this.updatePlaybackPatterns(preferences, interaction);
    
    // Update time-of-day preferences
    this.updateTimePreferences(preferences);
    
    await this.savePreferences(preferences);
  }

  // Update playback patterns
  private static updatePlaybackPatterns(preferences: UserPreferences, interaction: UserInteraction): void {
    const currentHour = new Date().getHours();
    let timeOfDay = 'morning';
    if (currentHour >= 12 && currentHour < 17) timeOfDay = 'afternoon';
    else if (currentHour >= 17 && currentHour < 21) timeOfDay = 'evening';
    else if (currentHour >= 21 || currentHour < 6) timeOfDay = 'night';
    
    if (!preferences.playbackPatterns.preferredTimeOfDay.includes(timeOfDay)) {
      preferences.playbackPatterns.preferredTimeOfDay.push(timeOfDay);
    }
    
    // Update completion and skip rates
    if (interaction.action === 'complete') {
      preferences.playbackPatterns.completionRate = 
        (preferences.playbackPatterns.completionRate * 0.9) + (1 * 0.1);
    } else if (interaction.action === 'skip') {
      preferences.playbackPatterns.skipRate = 
        (preferences.playbackPatterns.skipRate * 0.9) + (1 * 0.1);
    }
  }

  // Update time preferences
  private static updateTimePreferences(preferences: UserPreferences): void {
    // Keep only the most recent time preferences (last 10 sessions)
    if (preferences.playbackPatterns.preferredTimeOfDay.length > 10) {
      preferences.playbackPatterns.preferredTimeOfDay = 
        preferences.playbackPatterns.preferredTimeOfDay.slice(-10);
    }
  }

  // Get current personalization context
  static getCurrentContext(): PersonalizationContext {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else if (hour >= 21 || hour < 6) timeOfDay = 'night';
    
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    return {
      timeOfDay,
      dayOfWeek,
      sessionDuration: 0, // Will be updated during session
      recentInteractions: this.interactions.slice(0, 10), // Last 10 interactions
    };
  }

  // Get content recommendations based on preferences
  static async getContentRecommendations(): Promise<any[]> {
    const preferences = await this.loadPreferences();
    const context = this.getCurrentContext();
    
    // Get top categories by preference score
    const topCategories = Object.entries(preferences.favoriteCategories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
    
    // Simulate content recommendations based on preferences
    const recommendations = [
      {
        type: 'trending',
        category: topCategories[0] || 'Technology',
        reason: `Based on your interest in ${topCategories[0] || 'Technology'}`,
        weight: 0.9,
      },
      {
        type: 'time_based',
        category: 'General',
        reason: `Perfect for ${context.timeOfDay} listening`,
        weight: 0.7,
      },
      {
        type: 'discovery',
        category: topCategories[1] || 'Politics',
        reason: 'Expand your interests',
        weight: 0.6,
      },
    ];
    
    return recommendations;
  }

  // Get personalized content length preference
  static async getPreferredContentLength(): Promise<'short' | 'medium' | 'long'> {
    const preferences = await this.loadPreferences();
    
    // Adjust based on completion rate
    if (preferences.playbackPatterns.completionRate > 0.8) {
      return preferences.contentPreferences.preferredLength;
    } else if (preferences.playbackPatterns.skipRate > 0.5) {
      return 'short'; // User tends to skip, prefer shorter content
    }
    
    return preferences.contentPreferences.preferredLength;
  }

  // Reset all personalization data
  static async resetPersonalization(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.INTERACTIONS_KEY);
      this.currentPreferences = null;
      this.interactions = [];
    } catch (error) {
      console.error('Error resetting personalization:', error);
    }
  }

  // Get analytics data for debugging
  static async getAnalyticsData(): Promise<any> {
    const preferences = await this.loadPreferences();
    const interactions = await this.loadInteractions();
    const context = this.getCurrentContext();
    
    return {
      preferences,
      interactions: interactions.slice(0, 20), // Last 20 for debugging
      context,
      stats: {
        totalInteractions: interactions.length,
        mostPlayedCategory: Object.entries(preferences.favoriteCategories)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None',
        averageSessionLength: preferences.playbackPatterns.averageSessionLength,
        completionRate: Math.round(preferences.playbackPatterns.completionRate * 100),
        skipRate: Math.round(preferences.playbackPatterns.skipRate * 100),
      },
    };
  }
}

export default PersonalizationService;