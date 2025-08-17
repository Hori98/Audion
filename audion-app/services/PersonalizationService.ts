import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserInteraction {
  action: 'play' | 'pause' | 'skip' | 'like' | 'share' | 'complete' | 'bookmark' | 'read_later' | 'archive';
  contentId: string;
  contentType: string;
  category: string;
  timestamp: number;
  duration?: number; // For play/pause events
  position?: number; // Playback position when action occurred
  source?: string; // Content source
  readingTime?: number; // Time spent reading (for articles)
  wordsRead?: number; // Estimated words read
  engagementLevel?: 'low' | 'medium' | 'high'; // User engagement level
}

export interface UserPreferences {
  favoriteCategories: { [category: string]: number };
  playbackPatterns: {
    averageSessionLength: number;
    preferredTimeOfDay: string[];
    skipRate: number;
    completionRate: number;
    readingSpeed: number; // Words per minute
    engagementScore: number; // Overall engagement (0-1)
  };
  contentPreferences: {
    preferredLength: 'short' | 'medium' | 'long';
    preferredStyle: string[];
    topicInterests: { [topic: string]: number };
    sourceReliability: { [source: string]: number }; // Trust score for sources
    recencyBias: number; // Preference for newer vs older content (0-1)
  };
  readingHabits: {
    dailyGoalMinutes: number;
    weeklyGoalArticles: number;
    preferredReadingTimes: { hour: number; frequency: number }[];
    consistency: number; // How consistent reading habits are (0-1)
    streakDays: number; // Current reading streak
    bestStreak: number; // Longest reading streak
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
  private static readonly READING_SESSIONS_KEY = 'reading_sessions';
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
        readingSpeed: 200, // Average reading speed WPM
        engagementScore: 0.5,
      },
      contentPreferences: {
        preferredLength: 'medium',
        preferredStyle: [],
        topicInterests: {},
        sourceReliability: {},
        recencyBias: 0.7, // Slight preference for newer content
      },
      readingHabits: {
        dailyGoalMinutes: 30,
        weeklyGoalArticles: 10,
        preferredReadingTimes: [],
        consistency: 0,
        streakDays: 0,
        bestStreak: 0,
      },
      lastUpdated: Date.now(),
    };
  }

  // Load user preferences from storage
  static async loadPreferences(): Promise<UserPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        const defaults = this.getDefaultPreferences();
        this.currentPreferences = {
          ...defaults,
          ...parsed,
          playbackPatterns: {
            ...defaults.playbackPatterns,
            ...parsed.playbackPatterns,
          },
          contentPreferences: {
            ...defaults.contentPreferences,
            ...parsed.contentPreferences,
          },
          readingHabits: {
            ...defaults.readingHabits,
            ...parsed.readingHabits,
          },
        };
        return this.currentPreferences;
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
      // Ensure interaction has required properties
      if (!interaction.contentId || !interaction.action || !interaction.contentType) {
        console.warn('Invalid interaction data:', interaction);
        return;
      }

      await this.loadInteractions();
      
      // Add new interaction with defaults for missing properties
      const fullInteraction: UserInteraction = {
        action: interaction.action,
        contentId: interaction.contentId,
        contentType: interaction.contentType,
        category: interaction.category || 'General',
        timestamp: interaction.timestamp || Date.now(),
        duration: interaction.duration,
        position: interaction.position,
        source: interaction.source,
        readingTime: interaction.readingTime,
        wordsRead: interaction.wordsRead,
        engagementLevel: interaction.engagementLevel || 'medium',
      };

      this.interactions.unshift(fullInteraction);
      
      // Limit interactions to MAX_INTERACTIONS
      if (this.interactions.length > this.MAX_INTERACTIONS) {
        this.interactions = this.interactions.slice(0, this.MAX_INTERACTIONS);
      }
      
      // Save interactions
      await AsyncStorage.setItem(this.INTERACTIONS_KEY, JSON.stringify(this.interactions));
      
      // Update preferences based on this interaction
      await this.updatePreferencesFromInteraction(fullInteraction);
      
      // Update reading habits
      await this.updateReadingHabits(fullInteraction);
      
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
        case 'bookmark':
          weight = 2.5;
          break;
        case 'read_later':
          weight = 1.5;
          break;
        case 'skip':
          weight = -1;
          break;
        case 'archive':
          weight = -0.5;
          break;
      }
      
      preferences.favoriteCategories[interaction.category] += weight;
    }
    
    // Update source reliability
    if (interaction.source) {
      if (!preferences.contentPreferences.sourceReliability[interaction.source]) {
        preferences.contentPreferences.sourceReliability[interaction.source] = 5; // Start with neutral
      }
      
      // Adjust source reliability based on user engagement
      if (interaction.action === 'complete' || interaction.action === 'like') {
        preferences.contentPreferences.sourceReliability[interaction.source] += 0.1;
      } else if (interaction.action === 'skip') {
        preferences.contentPreferences.sourceReliability[interaction.source] -= 0.1;
      }
      
      // Keep reliability score between 1-10
      preferences.contentPreferences.sourceReliability[interaction.source] = Math.max(1, 
        Math.min(10, preferences.contentPreferences.sourceReliability[interaction.source]));
    }
    
    // Update playback patterns
    this.updatePlaybackPatterns(preferences, interaction);
    
    // Update time-of-day preferences
    this.updateTimePreferences(preferences);
    
    // Update reading speed if available
    if (interaction.readingTime && interaction.wordsRead) {
      const currentSpeed = (interaction.wordsRead / interaction.readingTime) * 60; // WPM
      preferences.playbackPatterns.readingSpeed = 
        (preferences.playbackPatterns.readingSpeed * 0.9) + (currentSpeed * 0.1);
    }
    
    // Update engagement score
    this.updateEngagementScore(preferences, interaction);
    
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

  // Update engagement score based on interaction
  private static updateEngagementScore(preferences: UserPreferences, interaction: UserInteraction): void {
    let engagementDelta = 0;
    
    switch (interaction.engagementLevel) {
      case 'high':
        engagementDelta = 0.1;
        break;
      case 'medium':
        engagementDelta = 0.05;
        break;
      case 'low':
        engagementDelta = -0.05;
        break;
    }
    
    // Also factor in specific actions
    if (interaction.action === 'complete' || interaction.action === 'like') {
      engagementDelta += 0.05;
    } else if (interaction.action === 'skip') {
      engagementDelta -= 0.05;
    }
    
    preferences.playbackPatterns.engagementScore = Math.max(0, Math.min(1,
      preferences.playbackPatterns.engagementScore + engagementDelta));
  }

  // Update reading habits analysis
  private static async updateReadingHabits(interaction: UserInteraction): Promise<void> {
    try {
      const preferences = await this.loadPreferences();
      const now = new Date();
      const hour = now.getHours();
      
      // Ensure readingHabits exists
      if (!preferences.readingHabits) {
        preferences.readingHabits = this.getDefaultPreferences().readingHabits;
      }
      
      // Ensure preferredReadingTimes array exists
      if (!preferences.readingHabits.preferredReadingTimes) {
        preferences.readingHabits.preferredReadingTimes = [];
      }
      
      // Update preferred reading times
      const existingTime = preferences.readingHabits.preferredReadingTimes.find(t => t.hour === hour);
      if (existingTime) {
        existingTime.frequency += 1;
      } else {
        preferences.readingHabits.preferredReadingTimes.push({ hour, frequency: 1 });
      }
      
      // Sort and keep top 5 preferred times
      preferences.readingHabits.preferredReadingTimes.sort((a, b) => b.frequency - a.frequency);
      preferences.readingHabits.preferredReadingTimes = 
        preferences.readingHabits.preferredReadingTimes.slice(0, 5);
      
      // Update daily reading streak
      await this.updateReadingStreak(preferences);
      
      // Calculate consistency (how regularly user reads)
      await this.calculateReadingConsistency(preferences);
      
      await this.savePreferences(preferences);
    } catch (error) {
      console.error('Error updating reading habits:', error);
    }
  }

  // Update reading streak
  private static async updateReadingStreak(preferences: UserPreferences): Promise<void> {
    try {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      const sessionsData = await AsyncStorage.getItem(this.READING_SESSIONS_KEY);
      const sessions = sessionsData ? JSON.parse(sessionsData) : {};
      
      // Record today's session
      sessions[today] = (sessions[today] || 0) + 1;
      
      // Ensure readingHabits exists and has default values
      if (!preferences.readingHabits) {
        preferences.readingHabits = this.getDefaultPreferences().readingHabits;
      }
      
      if (typeof preferences.readingHabits.streakDays !== 'number') {
        preferences.readingHabits.streakDays = 0;
      }
      
      if (typeof preferences.readingHabits.bestStreak !== 'number') {
        preferences.readingHabits.bestStreak = 0;
      }
      
      // Check if streak continues
      if (sessions[yesterday] && sessions[today]) {
        // Streak continues
        preferences.readingHabits.streakDays += 1;
      } else if (!sessions[yesterday] && preferences.readingHabits.streakDays > 0) {
        // Streak broken, reset
        preferences.readingHabits.streakDays = 1;
      } else {
        // Starting new streak
        preferences.readingHabits.streakDays = 1;
      }
      
      // Update best streak
      if (preferences.readingHabits.streakDays > preferences.readingHabits.bestStreak) {
        preferences.readingHabits.bestStreak = preferences.readingHabits.streakDays;
      }
      
      await AsyncStorage.setItem(this.READING_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error updating reading streak:', error);
    }
  }

  // Calculate reading consistency
  private static async calculateReadingConsistency(preferences: UserPreferences): Promise<void> {
    try {
      const sessionsData = await AsyncStorage.getItem(this.READING_SESSIONS_KEY);
      if (!sessionsData) return;
      
      const sessions = JSON.parse(sessionsData);
      const last30Days = [];
      
      // Get last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toDateString();
        last30Days.push(sessions[date] || 0);
      }
      
      // Calculate consistency as ratio of active days
      const activeDays = last30Days.filter(sessions => sessions > 0).length;
      
      // Ensure readingHabits exists
      if (!preferences.readingHabits) {
        preferences.readingHabits = this.getDefaultPreferences().readingHabits;
      }
      
      preferences.readingHabits.consistency = activeDays / 30;
      
    } catch (error) {
      console.error('Error calculating reading consistency:', error);
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

    // Get top sources by reliability
    const topSources = Object.entries(preferences.contentPreferences.sourceReliability)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([source]) => source);
    
    // Generate sophisticated recommendations
    const recommendations = [
      {
        type: 'trending',
        category: topCategories[0] || 'Technology',
        reason: `Based on your strong interest in ${topCategories[0] || 'Technology'}`,
        weight: 0.9 * preferences.playbackPatterns.engagementScore,
        sources: topSources.slice(0, 2),
      },
      {
        type: 'habit_based',
        category: 'General',
        reason: `Perfect for your ${context.timeOfDay} reading routine`,
        weight: 0.8 * preferences.readingHabits.consistency,
        timeOptimal: true,
      },
      {
        type: 'discovery',
        category: topCategories[1] || 'Politics',
        reason: 'Expand your interests with quality sources',
        weight: 0.6,
        sources: topSources.slice(2, 3),
      },
      {
        type: 'streak_motivation',
        category: topCategories[0] || 'Technology',
        reason: `Keep your ${preferences.readingHabits.streakDays}-day streak going!`,
        weight: 0.7,
        streakBonus: preferences.readingHabits.streakDays > 0,
      },
    ];
    
    return recommendations.filter(rec => rec.weight > 0.3);
  }

  // Get personalized content length preference
  static async getPreferredContentLength(): Promise<'short' | 'medium' | 'long'> {
    const preferences = await this.loadPreferences();
    
    // Adjust based on completion rate and reading speed
    if (preferences.playbackPatterns.completionRate > 0.8 && preferences.playbackPatterns.readingSpeed > 250) {
      return 'long'; // Fast reader who completes content
    } else if (preferences.playbackPatterns.skipRate > 0.5 || preferences.playbackPatterns.readingSpeed < 150) {
      return 'short'; // Slow reader or tends to skip
    }
    
    return preferences.contentPreferences.preferredLength;
  }

  // Get reading habit insights
  static async getReadingHabitInsights(): Promise<any> {
    try {
      const preferences = await this.loadPreferences();
      const insights = [];
      
      // Ensure readingHabits exists
      if (!preferences.readingHabits) {
        preferences.readingHabits = this.getDefaultPreferences().readingHabits;
        await this.savePreferences(preferences);
      }
      
      // Streak insights
      if (preferences.readingHabits.streakDays > 7) {
        insights.push({
          type: 'achievement',
          message: `Amazing! You're on a ${preferences.readingHabits.streakDays}-day reading streak!`,
          action: 'Keep it up with today\'s recommended articles',
        });
      } else if (preferences.readingHabits.streakDays === 0) {
        insights.push({
          type: 'motivation',
          message: 'Start a new reading streak today!',
          action: 'Read one article to begin',
        });
      }
      
      // Consistency insights
      if (preferences.readingHabits.consistency > 0.8) {
        insights.push({
          type: 'praise',
          message: 'You have excellent reading consistency!',
          action: 'Consider increasing your daily goal',
        });
      } else if (preferences.readingHabits.consistency < 0.3) {
        insights.push({
          type: 'suggestion',
          message: 'Try setting a smaller daily reading goal',
          action: 'Start with 10 minutes per day',
        });
      }
      
      // Time preference insights
      const topTime = preferences.readingHabits.preferredReadingTimes?.[0];
      if (topTime) {
        const timeStr = `${topTime.hour}:00`;
        insights.push({
          type: 'pattern',
          message: `You read most often around ${timeStr}`,
          action: 'Set a reminder for your optimal reading time',
        });
      }
      
      return insights;
    } catch (error) {
      console.error('Error getting reading habit insights:', error);
      return [];
    }
  }

  // Get personalized notification timing
  static async getOptimalNotificationTime(): Promise<number | null> {
    const preferences = await this.loadPreferences();
    
    if (preferences.readingHabits.preferredReadingTimes.length > 0) {
      // Return the most frequent reading time minus 30 minutes for reminder
      const topTime = preferences.readingHabits.preferredReadingTimes[0];
      return Math.max(0, topTime.hour - 0.5); // 30 minutes before
    }
    
    return null;
  }

  // Reset all personalization data
  static async resetPersonalization(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.INTERACTIONS_KEY);
      await AsyncStorage.removeItem(this.READING_SESSIONS_KEY);
      this.currentPreferences = null;
      this.interactions = [];
    } catch (error) {
      console.error('Error resetting personalization:', error);
    }
  }

  // Get analytics data for debugging
  static async getAnalyticsData(): Promise<any> {
    try {
      const preferences = await this.loadPreferences();
      const interactions = await this.loadInteractions();
      const context = this.getCurrentContext();
      
      // Ensure all nested objects exist
      const safePreferences = {
        ...this.getDefaultPreferences(),
        ...preferences,
        playbackPatterns: {
          ...this.getDefaultPreferences().playbackPatterns,
          ...preferences.playbackPatterns,
        },
        readingHabits: {
          ...this.getDefaultPreferences().readingHabits,
          ...preferences.readingHabits,
        },
      };
      
      return {
        preferences: safePreferences,
        interactions: interactions.slice(0, 20), // Last 20 for debugging
        context,
        stats: {
          totalInteractions: interactions.length,
          mostPlayedCategory: Object.entries(safePreferences.favoriteCategories)
            .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'None',
          averageSessionLength: safePreferences.playbackPatterns.averageSessionLength || 180,
          completionRate: Math.round((safePreferences.playbackPatterns.completionRate || 0) * 100),
          skipRate: Math.round((safePreferences.playbackPatterns.skipRate || 0) * 100),
          engagementScore: Math.round((safePreferences.playbackPatterns.engagementScore || 0.5) * 100),
          readingSpeed: Math.round(safePreferences.playbackPatterns.readingSpeed || 200),
          currentStreak: safePreferences.readingHabits.streakDays || 0,
          bestStreak: safePreferences.readingHabits.bestStreak || 0,
          consistency: Math.round((safePreferences.readingHabits.consistency || 0) * 100),
        },
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      // Return safe defaults
      const defaults = this.getDefaultPreferences();
      return {
        preferences: defaults,
        interactions: [],
        context: this.getCurrentContext(),
        stats: {
          totalInteractions: 0,
          mostPlayedCategory: 'None',
          averageSessionLength: 180,
          completionRate: 0,
          skipRate: 0,
          engagementScore: 50,
          readingSpeed: 200,
          currentStreak: 0,
          bestStreak: 0,
          consistency: 0,
        },
      };
    }
  }
}

export default PersonalizationService;