/**
 * Clear Cache Script - Run this in React Native app to clear all cached data
 */

// AsyncStorage clear script for React Native
// Paste this into your app's console or add as a dev button

import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllCache = async () => {
  try {
    console.log('🔥 Clearing all AsyncStorage cache...');
    await AsyncStorage.clear();
    console.log('✅ AsyncStorage cleared successfully');

    // If you have any other cache mechanisms, clear them here
    console.log('🔄 Please restart the app to see fresh data');

    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
};

// Auto-execute when this script is imported
clearAllCache();