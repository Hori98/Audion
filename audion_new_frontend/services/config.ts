/**
 * Enhanced API Configuration with Environment Variables
 * Centralized configuration for API endpoints and settings
 * Supports .env files for environment-specific settings
 */

// Environment variables with fallback values
const getEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// API Base URL from environment variables
export const API_BASE_URL = getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'http://192.168.11.34:8003/api');

// Enhanced API Configuration with environment support
export const API_CONFIG = {
  timeout: parseInt(getEnvVar('EXPO_PUBLIC_API_TIMEOUT', '15000')), // 15 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  debugMode: getEnvVar('EXPO_PUBLIC_DEBUG_MODE', 'false') === 'true',
  logLevel: getEnvVar('EXPO_PUBLIC_LOG_LEVEL', 'error'),
};

// Feature flags from environment
export const FEATURE_FLAGS = {
  mockDataFallback: getEnvVar('EXPO_PUBLIC_MOCK_DATA_FALLBACK', 'false') === 'true', // デフォルトを false に変更
  enableDevTools: getEnvVar('EXPO_PUBLIC_ENABLE_DEV_TOOLS', 'false') === 'true',
};

// App Configuration
export const APP_CONFIG = {
  name: getEnvVar('EXPO_PUBLIC_APP_NAME', 'Audion'),
  version: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.0'),
};

// Authentication token storage key
export const AUTH_TOKEN_KEY = '@audion_auth_token';

// Default language and locale settings
export const DEFAULT_LANGUAGE = 'ja';
export const DEFAULT_COUNTRY = 'JP';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;