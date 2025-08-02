
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiService } from '../services/ApiService';

// Define the shape of the context data
interface AuthContextData {
  user: any; // Replace 'any' with a proper user type later
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
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    // Initialize API service with auth error handler
    apiService.setAuthErrorHandler(handleAuthError);
  }, []);

  // Check if user has RSS sources to determine if they're new
  const checkUserOnboardStatus = async (userToken: string) => {
    try {
      const response = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      // If user has RSS sources, they're not new
      if (response.data.length > 0) {
        setIsNewUser(false);
      } else {
        setIsNewUser(true);
      }
    } catch (error) {
      console.log('Could not check user onboard status:', error);
      setIsNewUser(false); // Default to existing user if check fails
    }
  };

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          apiService.setAuthToken(storedToken);
          // TODO: Fetch user profile from backend to verify token and get user data
          // For now, we'll set a placeholder user
          setUser({ placeholder: true });
          
          // Check if user needs onboarding
          await checkUserOnboardStatus(storedToken);
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
    } catch (error: any) {
      console.error('Login failed:', error.response?.data?.detail || error.message);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
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
    } catch (error: any) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
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
    console.log('=== FORCE LOGOUT TRIGGERED ===');
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
      console.log('Auth storage cleared successfully');
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
    
    // Force reload by setting loading state
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log('Force logout completed');
    }, 100);
  };

  const handleAuthError = async () => {
    console.log('=== HANDLING AUTH ERROR - FORCE LOGOUT ===');
    try {
      // Clear all auth-related data
      await AsyncStorage.multiRemove([
        'token',
        'user',
        'isNewUser',
        'feed_selected_articles'
      ]);
      
      // Clear axios auth header
      delete axios.defaults.headers.common['Authorization'];
      apiService.setAuthToken(null);
      
      // Reset state
      setToken(null);
      setUser(null);
      setIsNewUser(false);
      
      // Force reload/navigation
      if (typeof window !== 'undefined') {
        window.location.reload();
      } else {
        // For native, trigger re-render by updating loading state
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
        }, 100);
      }
    } catch (error) {
      console.error('Error during auth error handling:', error);
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
