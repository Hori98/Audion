/**
 * Enhanced API Configuration with Environment Variables
 * Centralized configuration for API endpoints and settings
 * Supports .env files for environment-specific settings
 * 
 * DEPRECATED: Use ../config/api.ts instead for better organization
 */

import { API_CONFIG } from '../config/api';

// Environment variables with fallback values
const getEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// API Base URL from unified configuration
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Legacy API Configuration - Use API_CONFIG from config/api.ts for timeout
export const LEGACY_API_CONFIG = {
  timeout: API_CONFIG.TIMEOUT, // Use unified timeout
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  debugMode: getEnvVar('EXPO_PUBLIC_DEBUG_MODE', 'false') === 'true',
  logLevel: getEnvVar('EXPO_PUBLIC_LOG_LEVEL', 'error'),
};

// Feature flags from environment
export const FEATURE_FLAGS = {
  mockDataFallback: getEnvVar('EXPO_PUBLIC_MOCK_DATA_FALLBACK', 'false') === 'true', // デフォルトを false に変更
  enableDevTools: getEnvVar('EXPO_PUBLIC_ENABLE_DEV_TOOLS', 'false') === 'true',
  // Disable RSS auto-add flows (recommended/preconfigured) by default
  disableRSSAutoAdd: getEnvVar('EXPO_PUBLIC_DISABLE_RSS_AUTO_ADD', 'true') === 'true',
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
