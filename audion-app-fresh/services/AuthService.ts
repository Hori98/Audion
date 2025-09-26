/**
 * Authentication Service for New Audion Frontend
 * Clean service layer for authentication operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosResponse } from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { apiClient } from './apiClient';
import { AuthenticationError, User } from '../types/auth';

// Type definitions
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  access_token: string;
  user: User;
}

// User type is imported from ../types/auth

export interface ProfileUpdateRequest {
  username?: string;
  email?: string;
}

// Use shared AuthenticationError from ../types/auth

// Storage Keys
const STORAGE_KEYS = {
  TOKEN: '@audion_auth_token',
  USER: '@audion_user_data',
} as const;

// Retry helper function for critical authentication calls

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
    try {
      const requestData: RegisterRequest = {
        email,
        password,
        name: displayName, // displayNameをnameフィールドとして送信
      };

      const response: AxiosResponse<RegisterResponse> = await apiClient.post(
        API_ENDPOINTS.AUTH.REGISTER,
        requestData
      );

      const { data } = response;
      
      // Store token and user data
      await this.storeAuthData(data.access_token, data.user);
      
      return data;
    } catch (error: any) {
      const status = error.statusCode || error.response?.status;
      const messageFromServer = error.message || error.response?.data?.detail;
      if (status === 400) {
        throw new AuthenticationError('User with this email already exists', 400);
      }
      if (status === 422) {
        throw new AuthenticationError(messageFromServer || 'Invalid input. Please check your email and password.', 422);
      }
      throw new AuthenticationError(messageFromServer || 'Registration failed. Please try again.', status);
    }
  }

  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const requestData: LoginRequest = { email, password };

      const response: AxiosResponse<{access_token: string, token_type: string}> = await apiClient.post(
        API_ENDPOINTS.AUTH.LOGIN,
        requestData
      );

      const { data } = response;

      // Decode user info from JWT token (fallback to minimal user if decoding fails)
      let user: User;
      try {
        const base64 = data.access_token.split('.')[1];
        const payload = JSON.parse(global.atob ? global.atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
        user = {
          id: String(payload.sub || ''),
          email: String(payload.email || email),
          display_name: null,
          username: null,
          profile_image: null,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User;
      } catch {
        user = {
          id: '',
          email,
          display_name: null,
          username: null,
          profile_image: null,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User;
      }

      // Store token and user data
      await this.storeAuthData(data.access_token, user);

      return {
        access_token: data.access_token,
        token_type: data.token_type as 'bearer',
        user,
      } as AuthResponse;
    } catch (error: any) {
      const status = error.statusCode || error.response?.status;
      const messageFromServer = error.message || error.response?.data?.detail;
      if (status === 401) {
        throw new AuthenticationError('Invalid email or password', 401);
      }
      if (status === 422) {
        throw new AuthenticationError(messageFromServer || 'Invalid email format', 422);
      }
      throw new AuthenticationError(messageFromServer || 'Login failed. Please try again.', status);
    }
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
