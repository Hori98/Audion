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
} from '../types/auth';

// Storage Keys
const STORAGE_KEYS = {
  TOKEN: 'audion_auth_token',
  USER: 'audion_user_data',
} as const;

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

// Request interceptor to add auth headers
apiClient.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      AuthService.clearStoredAuth();
    }
    
    throw new AuthenticationError(
      error.response?.data?.detail || error.message,
      error.response?.status
    );
  }
);

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
    const token = await this.getStoredToken();
    
    if (!token) {
      throw new AuthenticationError('No authentication token found');
    }

    const response: AxiosResponse<User> = await apiClient.get(
      API_ENDPOINTS.AUTH.ME,
      { headers: getAuthHeaders(token) }
    );

    const userData = response.data;
    
    // Update stored user data
    await this.storeUserData(userData);
    
    return userData;
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
          {},
          { headers: getAuthHeaders(token) }
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
}