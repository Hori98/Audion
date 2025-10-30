/**
 * API Configuration for New Audion Frontend
 * Centralized configuration with dynamic IP detection
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Helper function to get the correct backend URL based on connection mode
const detectBackendUrl = (): string => {
  // Development mode
  if (__DEV__) {
    const devPort = process.env.EXPO_PUBLIC_DEV_API_PORT || '8005';

    try {
      // Try to detect if we're in Expo Tunnel mode
      const m: any = (Constants as any);
      const hostUri = m.manifest2?.extra?.expoGo?.debuggerHost ||
                      m.manifest?.debuggerHost ||
                      m.expoConfig?.hostUri;

      if (hostUri) {
        // Extract host from debuggerHost format (usually "192.168.x.x:19000" or similar)
        const host = String(hostUri).split(':')[0];

        // Check if it's a valid IP address (not a tunnel URL)
        if (host && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
          // It's a local IP address - we're in LAN mode
          console.log('🔧 LAN mode detected - using local IP:', host);
          return `http://${host}:${devPort}`;
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not detect host:', e);
    }

    // Fallback: For Tunnel mode, use Render backend (more reliable than localhost)
    // Tunnel mode cannot reliably access localhost:8005 from the simulator
    console.log('🔧 Tunnel mode detected - using Render backend');
    return process.env.EXPO_PUBLIC_PROD_API_URL || 'https://audion.onrender.com';
  }

  // Production fallback
  return process.env.EXPO_PUBLIC_PROD_API_URL || 'https://audion.onrender.com';
};

// API Base Configuration
const detectedUrl = detectBackendUrl();
export const API_CONFIG = {
  BASE_URL: detectedUrl,
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),
} as const;

// Debug: Log API configuration for troubleshooting
if (__DEV__) {
  console.log('=== API Configuration Debug ===');
  console.log('BASE_URL:', detectedUrl);
  console.log('TIMEOUT:', API_CONFIG.TIMEOUT);
  console.log('EXPO_PUBLIC_PROD_API_URL:', process.env.EXPO_PUBLIC_PROD_API_URL);
  console.log('EXPO_PUBLIC_DEV_API_PORT:', process.env.EXPO_PUBLIC_DEV_API_PORT);
  console.log('================================');
}

// API Endpoints - All paths include /api prefix to avoid duplication
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login', 
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  
  // User Management
  USER: {
    PROFILE: '/api/user/profile',
    PROFILE_IMAGE: '/api/user/profile/image',
    SUBSCRIPTION_LIMITS: '/api/user/subscription/limits',
    SUBSCRIPTION_PLAN: '/api/user/subscription/plan',
  },
  
  // Articles
  ARTICLES: {
    LIST: '/api/articles',
    GET: '/api/articles/{id}',
  },
  
  // Audio
  AUDIO: {
    CREATE: '/api/audio/create',
    LIST: '/api/audio/library',
    GET: '/api/audio/{id}',
    DELETE: '/api/audio/{id}',
  },

  // Unified Audio v2
  AUDIO_V2: {
    AUTOPICK: '/api/v2/audio/autopick',
    MANUAL: '/api/v2/audio/manual',
    SCHEDULES: '/api/v2/audio/schedules',
    SCHEDULER_STATUS: '/api/v2/audio/scheduler/status',
    SCHEDULE: '/api/v2/audio/schedules/{id}',
    SCHEDULE_GENERATE: '/api/v2/audio/schedules/{id}/generate',
    SCHEDULE_PLAYLISTS: '/api/v2/audio/schedules/{id}/playlists',
  },

  // Task-based AutoPick (RN polling)
  AUTOPICK_TASK: {
    START: '/api/auto-pick/create-audio',
    STATUS: '/api/auto-pick/task-status/{task_id}',
  },

  // RSS Sources
  RSS: {
    LIST: '/api/rss-sources',
    ADD: '/api/rss-sources',
    MY_SOURCES: '/api/rss-sources/my-sources',
    DELETE_ID: '/api/rss-sources/{id}',
    UPDATE_ID: '/api/rss-sources/{id}',
    RECOMMENDED: '/api/rss-sources/recommended',
    CATEGORIES: '/api/rss-sources/categories',
  },
} as const;

// Complete URL builder
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Replace path params like {id} with provided values
export const buildPath = (
  endpoint: string,
  params: Record<string, string | number> = {}
): string => {
  return Object.keys(params).reduce((acc, key) => {
    const value = String(params[key]);
    return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(value));
  }, endpoint);
};

// Convenience: build full URL with path params
export const url = (
  endpoint: string,
  params: Record<string, string | number> = {}
): string => buildApiUrl(buildPath(endpoint, params));

// Request Headers
export const getAuthHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` }),
});

// Environment Detection
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

// API Configuration loaded
console.log('🔗 API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
