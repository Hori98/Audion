/**
 * API Configuration for New Audion Frontend
 * Centralized configuration with dynamic IP detection
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Helper function to resolve development host
const resolveDevHost = (): string | null => {
  try {
    const m: any = (Constants as any);

    // 🔍 DEBUG: Log Constants structure
    if (__DEV__) {
      console.log('[DEBUG resolveDevHost] Constants.manifest2:', m.manifest2);
      console.log('[DEBUG resolveDevHost] Constants.manifest:', m.manifest);
      console.log('[DEBUG resolveDevHost] Constants.expoConfig:', m.expoConfig);
      console.log('[DEBUG resolveDevHost] Constants.expoConfig?.hostUri:', m.expoConfig?.hostUri);
      console.log('[DEBUG resolveDevHost] Constants.manifest?.debuggerHost:', m.manifest?.debuggerHost);
      console.log('[DEBUG resolveDevHost] Constants.manifest2?.extra?.expoGo?.debuggerHost:', m.manifest2?.extra?.expoGo?.debuggerHost);
    }

    const dbg = m.manifest2?.extra?.expoGo?.debuggerHost || m.manifest?.debuggerHost || m.expoConfig?.hostUri;

    if (__DEV__) {
      console.log('[DEBUG resolveDevHost] Selected debuggerHost value:', dbg);
    }

    if (!dbg) return null;
    const host = String(dbg).split(':')[0];

    if (__DEV__) {
      console.log('[DEBUG resolveDevHost] Extracted host:', host);
    }

    return host || null;
  } catch (error) {
    if (__DEV__) {
      console.error('[DEBUG resolveDevHost] Error:', error);
    }
    return null;
  }
};

// Dynamic Backend Detection
const detectBackendUrl = (): string => {
  // Prefer explicit env vars
  let envUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    // Normalize by removing trailing /api to avoid duplication
    envUrl = envUrl.replace(/\/api\/?$/, '');
    // Only replace localhost with dev host IP on native (Expo Go/Dev Client), not on web
    if (__DEV__ && envUrl.includes('localhost') && Platform.OS !== 'web') {
      const host = resolveDevHost();
      if (host && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        envUrl = envUrl.replace('localhost', host);
      }
    }
    return envUrl;
  }

  // Production fallback
  if (!__DEV__) {
    return 'https://api.audion.app';
  }

  // Development sensible default: match current backend port
  const host = resolveDevHost();
  return `http://${host || 'localhost'}:8003`;
};

// API Base Configuration
export const API_CONFIG = {
  BASE_URL: detectBackendUrl(),
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),
} as const;

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

// 🚨 DEBUG: API Configuration Status (after all definitions)
if (__DEV__) {
  console.log('🔧 [API Config] BASE_URL:', API_CONFIG.BASE_URL);
  console.log('🔧 [API Config] TIMEOUT:', API_CONFIG.TIMEOUT);
  console.log('🔧 [API Config] ENV_VAR:', process.env.EXPO_PUBLIC_API_BASE_URL);
  console.log('🔧 [API Config] Sample URL:', buildApiUrl(API_ENDPOINTS.AUTH.LOGIN));
}
