/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

// TODO: Replace with environment-specific URLs
// For development: local backend server
// For production: production backend URL

const DEV_API_URL = 'http://localhost:8002';
const PROD_API_URL = 'https://api.audion.app'; // TODO: Replace with actual production URL

// Determine if we're running in development mode
const __DEV__ = process.env.NODE_ENV !== 'production';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Authentication token storage key
export const AUTH_TOKEN_KEY = '@audion_auth_token';

// Default language and locale settings
export const DEFAULT_LANGUAGE = 'ja';
export const DEFAULT_COUNTRY = 'JP';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;