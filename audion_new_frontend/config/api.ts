/**
 * API Configuration for New Audion Frontend
 * Clean centralized configuration for backend communication
 */

// API Base Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? process.env.EXPO_PUBLIC_BACKEND_URL + '/api' || 'http://192.168.11.30:8003/api'  // Development - use env variable
    : 'https://api.audion.app/api',    // Production
  TIMEOUT: 10000,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login', 
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  
  // Articles (Future)
  ARTICLES: {
    LIST: '/articles',
    GET: '/articles/{id}',
  },
  
  // Audio (Future)
  AUDIO: {
    CREATE: '/audio/create',
    LIST: '/audio/library',
    GET: '/audio/{id}',
    DELETE: '/audio/{id}',
  },
} as const;

// Request Headers
export const getAuthHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` }),
});

// Environment Detection
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;