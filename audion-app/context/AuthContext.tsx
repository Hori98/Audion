
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiService } from '../services/ApiService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import ConnectionService from '../services/ConnectionService';
import { User } from '../types';

// Define the shape of the context data
interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  
  const connectionService = ConnectionService.getInstance();
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    // Initialize API service with auth error handler
    apiService.setAuthErrorHandler(handleAuthError);
    
    // Initialize connection service
    initializeConnection();
  }, []);

  const initializeConnection = async () => {
    try {
      await connectionService.ensureConnection();
    } catch (error) {
      console.warn('⚠️ Backend connection failed, continuing in offline mode:', error?.message || error);
      // Continue with app initialization in offline mode
    }
  };

  // Check if user has RSS sources to determine if they're new
  const checkUserOnboardStatus = async (userToken: string) => {
    // Don't check if no token provided
    if (!userToken || userToken.trim() === '') {
      setIsNewUser(true);
      return;
    }
    
    try {
      // Ensure backend connection before making API request
      await connectionService.ensureConnection();
      
      const sources = await connectionService.get('/rss-sources', {
        headers: { Authorization: `Bearer ${userToken}` }
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
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          // First, verify the token is still valid by checking onboard status
          try {
            // Test token validity by making an authenticated request
            await checkUserOnboardStatus(storedToken);
            
            // Token is valid, set up authentication
            setToken(storedToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            apiService.setAuthToken(storedToken);
            // TODO: Fetch user profile from backend to verify token and get user data
            // For now, we'll set a placeholder user
            setUser({ 
              id: 'placeholder', 
              email: 'placeholder@email.com', 
              created_at: new Date().toISOString() 
            });
          } catch (tokenError) {
            // Token is invalid, clear stored auth data
            await AsyncStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setIsNewUser(false);
            delete axios.defaults.headers.common['Authorization'];
            apiService.setAuthToken(null);
          }
        }
      } catch (e) {
        console.error("Failed to load auth data", e);
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      apiService.setAuthToken(access_token);
      await AsyncStorage.setItem('token', access_token);
      
      // Check if existing user needs onboarding
      await checkUserOnboardStatus(access_token);
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Login failed:', error);
      ErrorHandlingService.showError(error, { 
        action: 'login',
        source: 'AuthContext'
      });
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as any)?.data?.detail || 'Login failed'
        : 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { email, password });
      const { access_token, user } = response.data;
      setToken(access_token);
      setUser(user);
      setIsNewUser(true); // Mark as new user for onboarding
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      apiService.setAuthToken(access_token);
      await AsyncStorage.setItem('token', access_token);
      return { success: true };
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      ErrorHandlingService.showError(error, { 
        action: 'register',
        source: 'AuthContext'
      });
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as any)?.data?.detail || 'Registration failed'
        : 'Registration failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setIsNewUser(false);
    delete axios.defaults.headers.common['Authorization'];
    apiService.setAuthToken(null);
    await AsyncStorage.removeItem('token');
  };

  const forceLogout = async () => {
    setToken(null);
    setUser(null);
    setIsNewUser(false);
    delete axios.defaults.headers.common['Authorization'];
    apiService.setAuthToken(null);
    
    // Clear all AsyncStorage auth-related items
    try {
      await AsyncStorage.multiRemove([
        'token',
        'user',
        'isNewUser',
        'feed_selected_articles'
      ]);
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
    
    // Force reload by setting loading state
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 100);
  };

  const handleAuthError = async () => {
    try {
      // Clear storage with error handling
      await AsyncStorage.multiRemove([
        'token',
        'user', 
        'isNewUser',
        'feed_selected_articles'
      ]).catch(err => console.warn('Storage clear error:', err));
      
      // Clear headers safely
      delete axios.defaults.headers.common['Authorization'];
      apiService.setAuthToken(null);
      
      // Reset state
      setToken(null);
      setUser(null);
      setIsNewUser(false);
      
    } catch (error) {
      console.error('Critical auth error handling failure:', error);
    }
  };

  const value = {
    user,
    token,
    loading,
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
