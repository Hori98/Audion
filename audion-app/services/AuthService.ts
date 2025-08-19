/**
 * AuthService - Unified authentication management
 * Consolidates all authentication-related functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './ApiService';
import { API_CONFIG } from '../config/api';

export interface User {
  id: string;
  email: string;
  created_at: string;
  subscription_tier?: string;
  profile?: {
    name?: string;
    avatar_url?: string;
    bio?: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  // Add any additional registration fields here
}

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    isAuthenticated: false,
    token: null,
    user: null,
    isLoading: true
  };
  private listeners: Array<(state: AuthState) => void> = [];

  static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  // ================== Auth State Management ==================

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getAuthState()));
  }

  private updateAuthState(updates: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...updates };
    this.notifyListeners();
  }

  // ================== Token Management ==================

  private async storeToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
      apiService.setAuthToken(token);
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  private async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      apiService.setAuthToken(null);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // ================== User Management ==================

  private async storeUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  private async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user data:', error);
      return null;
    }
  }

  private async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  }

  // ================== Authentication Methods ==================

  async initialize(): Promise<void> {
    this.updateAuthState({ isLoading: true });

    try {
      const token = await this.getStoredToken();
      const user = await this.getStoredUser();

      if (token && user) {
        // Verify token is still valid
        apiService.setAuthToken(token);
        const response = await apiService.getEndpoint<User>('user.profile');
        
        if (response.success && response.data) {
          // Token is valid, user is authenticated
          this.updateAuthState({
            isAuthenticated: true,
            token,
            user: response.data,
            isLoading: false
          });
        } else {
          // Token is invalid, clear stored data
          await this.clearAuthData();
          this.updateAuthState({
            isAuthenticated: false,
            token: null,
            user: null,
            isLoading: false
          });
        }
      } else {
        // No stored auth data
        this.updateAuthState({
          isAuthenticated: false,
          token: null,
          user: null,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await this.clearAuthData();
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false
      });
    }

    // Set up API service auth error handler
    apiService.setAuthErrorHandler(async () => {
      await this.handleAuthError();
    });
  }

  async login(credentials: LoginCredentials): Promise<User> {
    this.updateAuthState({ isLoading: true });

    try {
      const response = await apiService.postEndpoint<{ access_token: string; user: User }>(
        'auth.login',
        credentials
      );

      if (response.success && response.data) {
        const { access_token, user } = response.data;
        
        await this.storeToken(access_token);
        await this.storeUser(user);
        
        this.updateAuthState({
          isAuthenticated: true,
          token: access_token,
          user,
          isLoading: false
        });
        
        return user;
      } else {
        this.updateAuthState({ isLoading: false });
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      this.updateAuthState({ isLoading: false });
      throw new Error(error.response?.data?.detail || error.message || 'Login failed');
    }
  }

  async register(credentials: RegisterCredentials): Promise<User> {
    this.updateAuthState({ isLoading: true });

    try {
      const response = await apiService.postEndpoint<{ access_token: string; user: User }>(
        'auth.register',
        credentials
      );

      if (response.success && response.data) {
        const { access_token, user } = response.data;
        
        await this.storeToken(access_token);
        await this.storeUser(user);
        
        this.updateAuthState({
          isAuthenticated: true,
          token: access_token,
          user,
          isLoading: false
        });
        
        return user;
      } else {
        this.updateAuthState({ isLoading: false });
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      this.updateAuthState({ isLoading: false });
      throw new Error(error.response?.data?.detail || error.message || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    this.updateAuthState({ isLoading: true });

    try {
      // Clear all auth data
      await this.clearAuthData();
      
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Still update state even if cleanup fails
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        user: null,
        isLoading: false
      });
    }
  }

  // ================== Profile Management ==================

  async updateProfile(updates: Partial<User['profile']>): Promise<User> {
    const response = await apiService.postEndpoint<User>('user.profile', updates);
    
    if (response.success && response.data) {
      const userData = response.data as User;
      await this.storeUser(userData);
      this.updateAuthState({ user: userData });
      return userData;
    }

    throw new Error(response.error || 'Failed to update profile');
  }

  async uploadAvatar(imageData: string): Promise<User> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageData,
      type: 'image/jpeg',
      name: 'avatar.jpg'
    } as any);

    const response = await apiService.post('/user/profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.success && response.data) {
      const userData = response.data as User;
      await this.storeUser(userData);
      this.updateAuthState({ user: userData });
      return userData;
    }

    throw new Error(response.error || 'Failed to upload avatar');
  }

  // ================== Utility Methods ==================

  private async clearAuthData(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      this.removeUser()
    ]);
  }

  private async handleAuthError(): Promise<void> {
    console.log('Handling authentication error - logging out user');
    await this.logout();
  }

  // ================== Public Getters ==================

  get isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  get currentUser(): User | null {
    return this.authState.user;
  }

  get authToken(): string | null {
    return this.authState.token;
  }

  get isLoading(): boolean {
    return this.authState.isLoading;
  }
}

export default AuthService.getInstance();