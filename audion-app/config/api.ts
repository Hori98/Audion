/**
 * Unified API Configuration
 * Centralizes all API-related configuration to eliminate redundancy
 */

export const API_CONFIG = {
  // Base URLs
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003',
  get apiURL() {
    return `${this.baseURL}/api`;
  },
  
  // Timeouts
  timeout: 10000,
  shortTimeout: 3000, // For background requests
  
  // Retry configuration
  retryAttempts: 3,
  retryDelay: 1000,
  
  // Headers
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Endpoints
  endpoints: {
    // Authentication
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      refresh: '/auth/refresh',
    },
    
    // User management
    user: {
      profile: '/user/profile',
      settings: '/user/settings',
      avatar: '/user/profile-image',
      insights: '/user/insights',
      limits: '/user/audio-limits/check',
      subscription: '/user/subscription',
    },
    
    // RSS and Articles
    content: {
      sources: '/rss-sources',
      articles: '/articles',
      autopick: '/auto-pick',
    },
    
    // Audio
    audio: {
      create: '/audio/create',
      library: '/audio/library',
      directTTS: '/audio/direct-tts',
      streamTTS: '/audio/stream-tts', // Future streaming endpoint
    },
    
    // Archive and Bookmarks
    archive: {
      articles: '/archive/articles',
      folders: '/archive/folders',
      stats: '/archive/stats',
    },
    
    bookmarks: '/bookmarks',
    
    // Analytics and Interactions
    analytics: {
      interaction: '/user-interaction',
      feedback: '/feedback/misreading',
      scheduleDelivery: '/analytics/schedule-delivery',
    },
    
    // Health check
    health: '/health',
  }
} as const;

// Helper function to build full URLs
export const buildURL = (endpoint: string): string => {
  return `${API_CONFIG.apiURL}${endpoint}`;
};

// Helper function to get endpoint by path
export const getEndpoint = (path: string): string => {
  const pathArray = path.split('.');
  let current: any = API_CONFIG.endpoints;
  
  for (const key of pathArray) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      throw new Error(`Endpoint not found: ${path}`);
    }
  }
  
  if (typeof current !== 'string') {
    throw new Error(`Invalid endpoint path: ${path}`);
  }
  
  return current;
};

// Helper function to build full URL from endpoint path
export const buildEndpointURL = (path: string): string => {
  return buildURL(getEndpoint(path));
};