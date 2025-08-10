import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScrollPosition {
  y: number;
  timestamp: number;
}

class ScrollPositionService {
  private static readonly STORAGE_KEY_PREFIX = 'scroll_position_';
  private static readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Save scroll position for a specific screen
   * @param screenKey Unique identifier for the screen (e.g., 'settings', 'feed-autopick-settings')
   * @param position The scroll position (y coordinate)
   */
  static async saveScrollPosition(screenKey: string, position: number): Promise<void> {
    try {
      const scrollData: ScrollPosition = {
        y: position,
        timestamp: Date.now()
      };
      
      const key = this.STORAGE_KEY_PREFIX + screenKey;
      await AsyncStorage.setItem(key, JSON.stringify(scrollData));
    } catch (error) {
      console.error('Failed to save scroll position:', error);
    }
  }

  /**
   * Load scroll position for a specific screen
   * @param screenKey Unique identifier for the screen
   * @returns The scroll position or 0 if not found/expired
   */
  static async loadScrollPosition(screenKey: string): Promise<number> {
    try {
      const key = this.STORAGE_KEY_PREFIX + screenKey;
      const stored = await AsyncStorage.getItem(key);
      
      if (!stored) {
        return 0;
      }

      const scrollData: ScrollPosition = JSON.parse(stored);
      const now = Date.now();

      // Check if the stored position is still valid (not expired)
      if (now - scrollData.timestamp > this.MAX_AGE) {
        // Clean up expired data
        await AsyncStorage.removeItem(key);
        return 0;
      }

      return scrollData.y;
    } catch (error) {
      console.error('Failed to load scroll position:', error);
      return 0;
    }
  }

  /**
   * Clear scroll position for a specific screen
   * @param screenKey Unique identifier for the screen
   */
  static async clearScrollPosition(screenKey: string): Promise<void> {
    try {
      const key = this.STORAGE_KEY_PREFIX + screenKey;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear scroll position:', error);
    }
  }

  /**
   * Clear all expired scroll positions
   */
  static async cleanupExpiredPositions(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const scrollKeys = allKeys.filter(key => key.startsWith(this.STORAGE_KEY_PREFIX));
      const now = Date.now();

      for (const key of scrollKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const scrollData: ScrollPosition = JSON.parse(stored);
          if (now - scrollData.timestamp > this.MAX_AGE) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired scroll positions:', error);
    }
  }
}

export default ScrollPositionService;