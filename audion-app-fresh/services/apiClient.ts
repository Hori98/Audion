/**
 * Unified API Client for Audion App
 * Shared axios instance with authentication and error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

// Storage key for authentication token
const TOKEN_STORAGE_KEY = '@audion_auth_token';

// Create unified axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Public endpoints that don't require authentication
    const publicEndpoints = [
      API_ENDPOINTS.AUTH.LOGIN,
      API_ENDPOINTS.AUTH.REGISTER,
    ];

    let token = null;
    if (config.url && !publicEndpoints.includes(config.url)) {
      try {
        token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[API Client] Failed to get token from storage:', error);
      }
    }

    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, token ? 'WITH_AUTH' : 'NO_AUTH');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error message extraction
    let errorMessage = 'Network Error';

    const formatDetail = (detail: any): string => {
      if (!detail) return '';
      if (Array.isArray(detail)) return detail.map(d => d?.msg || JSON.stringify(d)).join('\n');
      if (typeof detail === 'string') return detail;
      if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
      return String(detail);
    };

    if (error.response) {
      const data = error.response.data || {};
      const detailMsg = formatDetail(data.detail) || data.message;
      errorMessage = detailMsg || `Server Error (${error.response.status})`;
    } else if (error.request) {
      errorMessage = 'Network Error - No response from server';
    } else {
      errorMessage = error.message || 'Unknown error';
    }

    if (__DEV__) {
      console.error('[API Error]', errorMessage, error.response?.data);
    }

    // Create enhanced error object
    const enhancedError = {
      ...error,
      message: errorMessage,
      isNetworkError: !error.response,
      statusCode: error.response?.status,
      responseData: error.response?.data,
    };

    return Promise.reject(enhancedError);
  }
);

// Helper function to get stored token
export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('[API Client] Failed to get token:', error);
    return null;
  }
};

// Helper function to store token
export const storeToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error('[API Client] Failed to store token:', error);
    throw error;
  }
};

// Helper function to remove token
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('[API Client] Failed to remove token:', error);
    throw error;
  }
};

export default apiClient;