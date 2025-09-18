/**
 * Enhanced Authentication Context
 * Robust authentication with automatic token refresh, error recovery, and state consistency
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { AuthService } from '../services/AuthService';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { 
  AuthContextType, 
  User, 
  AuthenticationError 
} from '../types/auth';

interface EnhancedAuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  lastAuthCheck: number;
  retryCount: number;
}

interface EnhancedAuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  handleAuthError: (error: any) => Promise<void>;
}

type EnhancedAuthContextType = EnhancedAuthState & EnhancedAuthActions;

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

interface EnhancedAuthProviderProps {
  children: ReactNode;
}

const AUTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_COUNT = 3;
const TOKEN_REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes before expiry

export function EnhancedAuthProvider({ children }: EnhancedAuthProviderProps) {
  const [state, setState] = useState<EnhancedAuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    isOnline: true,
    lastAuthCheck: 0,
    retryCount: 0
  });

  const authCheckInterval = useRef<number | null>(null);
  const isInitialized = useRef(false);

  // Initialize auth state on app start
  useEffect(() => {
    if (!isInitialized.current) {
      initializeAuth();
      setupPeriodicAuthCheck();
      isInitialized.current = true;
    }

    return () => {
      if (authCheckInterval.current) {
        clearInterval(authCheckInterval.current);
      }
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const [storedToken, storedUser] = await Promise.all([
        AuthService.getStoredToken(),
        AuthService.getStoredUser(),
      ]);

      if (storedToken && storedUser) {
        // Validate token before using it
        const isValid = await validateToken(storedToken);
        
        if (isValid) {
          setState(prev => ({
            ...prev,
            token: storedToken,
            user: storedUser,
            isAuthenticated: true,
            lastAuthCheck: Date.now(),
            retryCount: 0
          }));

          // Refresh user data in background
          try {
            const currentUser = await AuthService.getCurrentUser();
            setState(prev => ({ ...prev, user: currentUser }));
          } catch (error) {
            console.warn('[EnhancedAuth] Background refresh failed:', error);
          }
        } else {
          // Token is invalid, clear stored auth
          await clearAuthState();
        }
      }
    } catch (error) {
      console.error('[EnhancedAuth] Initialization failed:', error);
      await clearAuthState();
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      // Validate by calling /api/auth/me (consistent with API config)
      const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.ME}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch (error) {
      console.warn('[EnhancedAuth] Token validation failed:', error);
      return false;
    }
  };

  const setupPeriodicAuthCheck = () => {
    authCheckInterval.current = setInterval(async () => {
      if (state.isAuthenticated && state.token) {
        await checkAuthStatus();
      }
    }, AUTH_CHECK_INTERVAL);
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      if (!state.token) return false;

      const isValid = await validateToken(state.token);
      
      if (!isValid) {
        await handleAuthError(new Error('Token validation failed'));
        return false;
      }

      setState(prev => ({
        ...prev,
        lastAuthCheck: Date.now(),
        isOnline: true,
        retryCount: 0
      }));

      return true;
    } catch (error) {
      await handleNetworkError(error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const authResponse = await AuthService.login(email, password);
      
      setState(prev => ({
        ...prev,
        token: authResponse.access_token,
        user: authResponse.user,
        isAuthenticated: true,
        lastAuthCheck: Date.now(),
        retryCount: 0,
        isOnline: true
      }));
      
      console.log('[EnhancedAuth] Login successful:', authResponse.user.email);
    } catch (error) {
      console.error('[EnhancedAuth] Login failed:', error);
      await handleAuthError(error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const register = async (
    email: string, 
    password: string, 
    displayName: string
  ): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const authResponse = await AuthService.register(email, password, displayName);
      
      setState(prev => ({
        ...prev,
        token: authResponse.access_token,
        user: authResponse.user,
        isAuthenticated: true,
        lastAuthCheck: Date.now(),
        retryCount: 0,
        isOnline: true
      }));
      
      console.log('[EnhancedAuth] Registration successful:', authResponse.user.email);
    } catch (error) {
      console.error('[EnhancedAuth] Registration failed:', error);
      await handleAuthError(error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Attempt server-side logout
      if (state.token) {
        try {
          await AuthService.logout();
        } catch (error) {
          console.warn('[EnhancedAuth] Server logout failed:', error);
          // Continue with local logout even if server fails
        }
      }
      
      await clearAuthState();
      console.log('[EnhancedAuth] Logout successful');
    } catch (error) {
      console.error('[EnhancedAuth] Logout error:', error);
      // Force local logout regardless of errors
      await clearAuthState();
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const clearAuthState = async () => {
    await AuthService.clearStoredAuth();
    setState(prev => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      lastAuthCheck: 0,
      retryCount: 0
    }));
  };

  const refreshAuth = async (): Promise<void> => {
    if (state.isLoading || !state.token) return;

    try {
      const currentUser = await AuthService.getCurrentUser();
      setState(prev => ({
        ...prev,
        user: currentUser,
        lastAuthCheck: Date.now(),
        retryCount: 0
      }));
    } catch (error) {
      await handleAuthError(error);
    }
  };

  const handleAuthError = async (error: any): Promise<void> => {
    console.error('[EnhancedAuth] Authentication error:', error);
    
    if (error?.status === 401 || error?.message?.includes('Unauthorized')) {
      // Token is invalid or expired
      await clearAuthState();
      
      Alert.alert(
        '認証エラー',
        'セッションが期限切れです。再度ログインしてください。',
        [{ text: 'OK' }]
      );
    } else {
      // Network or other errors
      await handleNetworkError(error);
    }
  };

  const handleNetworkError = async (error: any): Promise<void> => {
    const newRetryCount = state.retryCount + 1;
    
    setState(prev => ({
      ...prev,
      isOnline: false,
      retryCount: newRetryCount
    }));

    if (newRetryCount >= MAX_RETRY_COUNT) {
      Alert.alert(
        'ネットワークエラー',
        'インターネット接続を確認して、アプリを再起動してください。',
        [{ text: 'OK' }]
      );
    } else {
      console.warn(`[EnhancedAuth] Network error, retry ${newRetryCount}/${MAX_RETRY_COUNT}`);
      
      // Retry after delay
      setTimeout(() => {
        if (state.isAuthenticated) {
          checkAuthStatus();
        }
      }, Math.pow(2, newRetryCount) * 1000); // Exponential backoff
    }
  };

  const contextValue: EnhancedAuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshAuth,
    checkAuthStatus,
    handleAuthError
  };

  return (
    <EnhancedAuthContext.Provider value={contextValue}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

export const useEnhancedAuth = (): EnhancedAuthContextType => {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

/**
 * Hook for components that require authentication
 */
export const useRequireAuth = (): EnhancedAuthContextType => {
  const auth = useEnhancedAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      Alert.alert(
        'ログインが必要です',
        'この機能を使用するにはログインしてください。',
        [{ text: 'OK' }]
      );
    }
  }, [auth.isLoading, auth.isAuthenticated]);
  
  return auth;
};
