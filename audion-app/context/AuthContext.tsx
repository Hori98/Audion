/**
 * Authentication Context for New Audion Frontend
 * React context for managing authentication state
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';
import NotificationService from '../services/NotificationService';
import { 
  AuthContextType, 
  User, 
  AuthenticationError,
  ProfileUpdateRequest
} from '../types/auth';

// Create the Authentication Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// 🔥 Clear all possible old storage keys that could cause conflicts
const clearOldStorageKeys = async () => {
  const oldKeys = [
    // Old token keys
    'authToken', 'token', 'userToken', 'accessToken', 'jwt_token',
    'audion_token', 'audion_auth', '@auth_token', '@user_token',
    
    // Old user keys  
    'userData', 'user', 'userInfo', 'currentUser', 'profile',
    'audion_user', '@user_data', '@current_user', '@profile',
    
    // Old API/config keys
    'apiUrl', 'baseUrl', 'serverUrl', 'backendUrl',
    'audion_api', '@api_config', '@server_config',
    
    // Old RSS/source keys
    'rssSources', 'sources', 'feeds', 'subscriptions',
    'audion_sources', '@rss_sources', '@feeds',
    
    // Any other potential old keys
    'settings', 'preferences', 'config', 'appData',
    '@audion_settings', '@app_config', '@preferences'
  ];
  
  console.log('🔥 [AuthContext] Clearing all old storage keys...');
  await Promise.all(oldKeys.map(key => AsyncStorage.removeItem(key)));
  console.log('✅ [AuthContext] Old storage keys cleared');
};

/**
 * Authentication Provider Component
 * Wraps app with authentication state management
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed state
  const isAuthenticated = !!user && !!token;

  /**
   * Initialize auth state from stored data
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 [AuthContext] Initializing authentication...');
      
      // 🔥 CRITICAL: Clear all old format storage keys
      await clearOldStorageKeys();
      
      const [storedToken, storedUser] = await Promise.all([
        AuthService.getStoredToken(),
        AuthService.getStoredUser(),
      ]);

      console.log('🔍 [AuthContext] Stored data:', { 
        hasToken: !!storedToken, 
        hasUser: !!storedUser,
        userEmail: storedUser?.email 
      });

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        console.log('✅ [AuthContext] Using stored authentication');
        
        // Optionally refresh user data from server (with better error handling)
        try {
          const currentUser = await AuthService.getCurrentUser();
          setUser(currentUser);
          console.log('✅ [AuthContext] Refreshed user data from server');
        } catch (error: any) {
          console.warn('⚠️ [AuthContext] Failed to refresh user data:', error?.message || error);
          
          // If token is invalid, clear stored auth and force re-login
          if (error?.message?.includes('token') || error?.status === 401) {
            console.log('🔄 [AuthContext] Clearing invalid stored authentication');
            await AuthService.clearStoredAuth();
            setToken(null);
            setUser(null);
          }
          // Otherwise, keep using stored user data
        }
      } else {
        console.log('❌ [AuthContext] No stored authentication found');
      }
    } catch (error) {
      console.error('🚨 [AuthContext] Failed to initialize auth:', error);
      await AuthService.clearStoredAuth();
    } finally {
      setIsLoading(false);
      console.log('🏁 [AuthContext] Authentication initialization complete');
    }
  };

  /**
   * Login user with email and password
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const authResponse = await AuthService.login(email, password);
      
      setToken(authResponse.access_token);
      setUser(authResponse.user);
      
      console.log('[Auth] Login successful:', authResponse.user.email);
      
      // ログイン成功後、プッシュ通知を登録
      await registerPushNotifications(authResponse.access_token);
      
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   */
  const register = async (
    email: string, 
    password: string, 
    displayName: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      
      const registerResponse = await AuthService.register(email, password, displayName);
      
      setToken(registerResponse.access_token);
      setUser(registerResponse.user);
      
      console.log('[Auth] Registration successful:', registerResponse.user.email);
      
      // 登録成功後、プッシュ通知を登録
      await registerPushNotifications(registerResponse.access_token);
      
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * プッシュ通知を登録（ログイン後に呼び出される）
   */
  const registerPushNotifications = async (authToken: string) => {
    try {
      console.log('[Auth] Registering push notifications...');
      
      // NotificationServiceでExpo Push Tokenを取得
      const pushToken = await NotificationService.registerForPushNotifications();
      
      if (!pushToken) {
        console.warn('[Auth] Push token registration failed - no token received');
        return;
      }

      // バックエンドにトークンを送信
      await AuthService.registerPushToken(authToken, pushToken);
      console.log('[Auth] Push token registered:', pushToken);

      // デバッグ情報をログ出力
      const debugInfo = NotificationService.getDebugInfo();
      console.log('[Auth] Notification debug info:', debugInfo);

    } catch (error) {
      console.error('[Auth] Push notification registration failed:', error);
      // プッシュ通知登録の失敗はログイン全体を失敗させない
    }
  };

  /**
   * Logout user and clear state
   */
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      await AuthService.logout();
      
      setToken(null);
      setUser(null);
      
      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout failed:', error);
      // Clear local state even if logout API call fails
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh current user data
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      console.log('[Auth] User data refreshed');
    } catch (error) {
      console.error('[Auth] Failed to refresh user:', error);
      // If refresh fails due to invalid token, logout
      if (error instanceof AuthenticationError && error.status === 401) {
        await logout();
      }
      throw error;
    }
  };

  /**
   * Update user profile information
   */
  const updateUserProfile = async (updates: ProfileUpdateRequest): Promise<void> => {
    try {
      if (!token) {
        throw new AuthenticationError('No authentication token found');
      }

      // Sequentially perform updates
      // 1. Update text-based fields
      if (updates.username || updates.email) {
        const jsonUpdates: ProfileUpdateRequest = {};
        if (updates.username) jsonUpdates.username = updates.username;
        if (updates.email) jsonUpdates.email = updates.email;
        await AuthService.updateUserProfile(token, jsonUpdates);
      }

      // 2. Update profile image
      if (updates.profile_image) {
        await AuthService.uploadProfileImage(token, updates.profile_image);
      }

      // 3. Refetch user data to get the final, consistent state
      const updatedUser = await AuthService.getCurrentUser();
      setUser(updatedUser);
      await AuthService.storeUser(updatedUser);

      console.log('[Auth] User profile updated successfully');
    } catch (error) {
      console.error('[Auth] Failed to update user profile:', error);
      throw error;
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to require authentication
 * Throws error if user is not authenticated
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  
  if (!auth.isAuthenticated) {
    throw new Error('This component requires authentication');
  }
  
  return auth;
}