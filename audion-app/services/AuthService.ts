/**
 * Authentication Service for New Audion Frontend
 * Clean service layer for authentication operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';
import { API_CONFIG, API_ENDPOINTS, getAuthHeaders } from '../config/api';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RegisterResponse,
  User,
  AuthenticationError,
  ProfileUpdateRequest,
} from '../types/auth';

// Storage Keys
const STORAGE_KEYS = {
  TOKEN: '@audion_auth_token',
  USER: '@audion_user_data',
} as const;

// Configure axios instance with retry capability
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

// Request interceptor to automatically add auth token to headers
apiClient.interceptors.request.use(
  async (config) => {
    // Public endpoints that don't require a token
    const publicEndpoints = [
      API_ENDPOINTS.AUTH.LOGIN,
      API_ENDPOINTS.AUTH.REGISTER,
    ];

    let token = null;
    if (config.url && !publicEndpoints.includes(config.url)) {
      token = await AuthService.getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, token ? 'WITH_AUTH' : 'NO_AUTH');
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Better error message extraction
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

    console.error('[API Error]', errorMessage, 'Status:', error.response?.status);
    
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      console.log('[API] Clearing auth due to 401 error');
      AuthService.clearStoredAuth();
    }
    
    throw new AuthenticationError(errorMessage, error.response?.status);
  }
);

// Retry helper function for critical authentication calls
const withRetry = async <T>(
  fn: () => Promise<T>, 
  maxRetries: number = 2, 
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      console.warn(`[Auth] Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error; // Re-throw on final attempt
      }
      
      // Exponential backoff delay
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Retry attempts exhausted');
};

export class AuthService {
  /**
   * Register a new user
   */
  static async register(
    email: string, 
    password: string, 
    displayName: string
  ): Promise<RegisterResponse> {
    const requestData: RegisterRequest = {
      email,
      password,
      display_name: displayName,
    };

    const response: AxiosResponse<RegisterResponse> = await apiClient.post(
      API_ENDPOINTS.AUTH.REGISTER,
      requestData
    );

    const { data } = response;
    
    // Store token and user data
    await this.storeAuthData(data.access_token, data.user);
    
    return data;
  }

  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    const requestData: LoginRequest = {
      email,
      password,
    };

    const response: AxiosResponse<AuthResponse> = await apiClient.post(
      API_ENDPOINTS.AUTH.LOGIN,
      requestData
    );

    const { data } = response;
    
    // Store token and user data
    await this.storeAuthData(data.access_token, data.user);
    
    return data;
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<User> {
    return await withRetry(async () => {
      const response: AxiosResponse<User> = await apiClient.get(
        API_ENDPOINTS.AUTH.ME
      );

      const userData = response.data;
      
      // Update stored user data
      await this.storeUserData(userData);
      
      return userData;
    }, 3, 1500); // 3回まで、1.5秒間隔でリトライ
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      
      if (token) {
        // Call backend logout endpoint
        await apiClient.post(
          API_ENDPOINTS.AUTH.LOGOUT,
          {}
        );
      }
    } catch (error) {
      console.warn('[Auth] Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Always clear local storage
      await this.clearStoredAuth();
    }
  }

  /**
   * Store authentication data locally
   */
  static async storeAuthData(token: string, user: User): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token),
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
    ]);
  }

  /**
   * Store user data locally
   */
  static async storeUserData(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  /**
   * Store user data locally (alias for consistency)
   */
  static async storeUser(user: User): Promise<void> {
    await this.storeUserData(user);
  }

  /**
   * Get stored authentication token
   */
  static async getStoredToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Get stored user data
   */
  static async getStoredUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Clear stored authentication data
   */
  static async clearStoredAuth(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }

  /**
   * Register push notification token with backend
   */
  static async registerPushToken(token: string, pushToken: string): Promise<void> {
    const response: AxiosResponse<{status: string, message: string}> = await apiClient.post(
      '/api/push-tokens',
      { token: pushToken }
    );

    console.log('[Auth] Push token registration response:', response.data);
  }

  /**
   * Get user's push tokens from backend
   */
  static async getPushTokens(token: string): Promise<any[]> {
    const response: AxiosResponse<{tokens: any[]}> = await apiClient.get(
      '/api/push-tokens'
    );

    return response.data.tokens;
  }

  /**
   * Delete a specific push token from backend
   */
  static async deletePushToken(token: string, pushToken: string): Promise<void> {
    await apiClient.delete(
      `/api/push-tokens/${encodeURIComponent(pushToken)}`
    );
  }

  /**
   * Update user profile information (JSON format)
   */
  static async updateUserProfile(token: string, updates: ProfileUpdateRequest): Promise<User> {
    try {
      // JSON形式でプロフィール更新リクエストを送信
      const requestData = {
        username: updates.username || null,
        email: updates.email || null,
      };

      console.log('[Auth] Sending profile update:', requestData);

      const response: AxiosResponse<{user: User, message: string}> = await apiClient.put(
        API_ENDPOINTS.USER.PROFILE,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[Auth] Profile update successful:', response.data);
      
      // ローカルストレージの更新
      await this.storeUserData(response.data.user);
      
      return response.data.user;
    } catch (error: any) {
      console.error('[Auth] Profile update failed:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new AuthenticationError('Authentication failed', 401);
      }
      throw new AuthenticationError(
        error.response?.data?.detail || 'Profile update failed',
        error.response?.status
      );
    }
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(token: string, imageUri: string): Promise<{message: string, profile_image_url: string}> {
    try {
      console.log('[Auth] Uploading profile image:', imageUri);
      
      // Create FormData for multipart/form-data upload
      const formData = new FormData();
      
      // Get filename and type from URI
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // React Native FormData format
      (formData as any).append('file', {
        uri: imageUri,
        name: filename,
        type,
      });
      
      const response: AxiosResponse<{message: string, profile_image_url: string}> = await apiClient.post(
        API_ENDPOINTS.USER.PROFILE_IMAGE,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('[Auth] Profile image upload successful:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('[Auth] Profile image upload failed:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new AuthenticationError('Authentication failed', 401);
      }
      throw new AuthenticationError(
        error.response?.data?.detail || 'Profile image upload failed',
        error.response?.status
      );
    }
  }
}

// シングルトンインスタンスをexport
export const authService = new AuthService();
