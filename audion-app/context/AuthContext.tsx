import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService, { User, AuthState } from '../services/AuthService';
import { apiService } from '../services/ApiService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import ConnectionService from '../services/ConnectionService';

// Define the shape of the context data
interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  forceLogout: () => void; // Force logout for debugging
  handleAuthError: () => Promise<void>; // Common 401 error handler
  setIsNewUser: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps the app
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false
  });
  const [isNewUser, setIsNewUser] = useState(false);
  
  const connectionService = ConnectionService.getInstance();

  useEffect(() => {
    const initializeAuth = async () => {
      await AuthService.initialize();
    };
    
    initializeAuth();
    
    // Subscribe to auth state changes
    const unsubscribe = AuthService.subscribe((newState) => {
      setAuthState(newState);
    });
    
    // Set initial state
    setAuthState(AuthService.getAuthState());
    
    // Initialize connection service
    initializeConnection();
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const initializeConnection = async () => {
    try {
      await connectionService.ensureConnection();
    } catch (error: any) {
      console.warn('Backend connection failed, continuing in offline mode:', error?.message || error);
      // Continue with app initialization in offline mode
    }
  };

  // Check if user has RSS sources to determine if they're new
  const checkUserOnboardStatus = async () => {
    if (!authState.isAuthenticated || !authState.token) {
      setIsNewUser(true);
      return;
    }
    
    try {
      // Ensure backend connection before making API request
      await connectionService.ensureConnection();
      
      const sources = await connectionService.get('/rss-sources', {
        headers: { Authorization: `Bearer ${authState.token}` }
      });
      // If user has RSS sources, they're not new
      if (sources.length > 0) {
        setIsNewUser(false);
      } else {
        setIsNewUser(true);
      }
    } catch (error: any) {
      // Handle authentication errors (401, 403) and 404 errors which might be auth-related
      if (error?.response?.status === 401 || error?.response?.status === 403 || 
          error?.response?.status === 404) {
        await handleAuthError();
        return;
      }
      
      // For other errors (network, server issues), default to existing user
      setIsNewUser(false);
    }
  };

  useEffect(() => {
    // Check user onboard status when auth state changes
    if (authState.isAuthenticated) {
      checkUserOnboardStatus();
    }
  }, [authState.isAuthenticated]);

  const login = async (email: string, password: string) => {
    try {
      await connectionService.ensureConnection();
      
      await AuthService.login({ email, password });
      
      // Check if user is new after successful login
      await checkUserOnboardStatus();
      
      return { success: true };
    } catch (error: any) {
      let errorMessage = 'Login failed';
      
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Login error:', errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await connectionService.ensureConnection();
      
      await AuthService.register({ email, password });
      
      // New user after registration
      setIsNewUser(true);
      
      return { success: true };
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Registration error:', errorMessage);
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setIsNewUser(false);
      
      // Clear additional app-specific storage
      await AsyncStorage.multiRemove(['feed_selected_articles']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const forceLogout = async () => {
    // Used for debugging - force logout and clear all data
    try {
      await AuthService.logout();
      setIsNewUser(false);
      
      // Clear all AsyncStorage auth-related items
      await AsyncStorage.multiRemove([
        'isNewUser',
        'feed_selected_articles'
      ]);
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
  };

  const handleAuthError = async () => {
    try {
      // AuthService handles auth token cleanup
      await AuthService.logout();
      
      // Clear app-specific storage
      await AsyncStorage.multiRemove([
        'isNewUser',
        'feed_selected_articles'
      ]).catch(err => console.warn('Storage clear error:', err));
      
      // Reset app-specific state
      setIsNewUser(false);
      
    } catch (error) {
      console.error('Critical auth error handling failure:', error);
    }
  };

  const value = {
    user: authState.user,
    token: authState.token,
    loading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    isNewUser,
    login,
    register,
    logout,
    forceLogout,
    handleAuthError,
    setIsNewUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};