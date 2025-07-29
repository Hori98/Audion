import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // UI colors
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border and divider colors
  border: string;
  divider: string;
  
  // Shadow colors
  shadow: string;
  
  // Tab bar colors
  tabBarBackground: string;
  tabBarInactive: string;
  
  // Player colors
  playerBackground: string;
  playerCard: string;
  
  // Lyrics sync colors
  lyricsDefault: string;
  lyricsCurrent: string;
  lyricsRead: string;
  lyricsNext: string;
  lyricsCurrentBg: string;
}

const lightTheme: ThemeColors = {
  // Background colors
  background: '#f9fafb',
  surface: '#ffffff',
  card: '#ffffff',
  
  // Text colors
  text: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  
  // UI colors
  primary: '#4f46e5',
  primaryLight: '#a3a3ff',
  secondary: '#e0e7ff',
  accent: '#f0f0ff',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Border and divider colors
  border: '#e5e7eb',
  divider: '#f3f4f6',
  
  // Shadow colors
  shadow: '#000000',
  
  // Tab bar colors
  tabBarBackground: '#ffffff',
  tabBarInactive: '#6b7280',
  
  // Player colors
  playerBackground: '#ffffff',
  playerCard: '#f9fafb',
  
  // Lyrics sync colors
  lyricsDefault: '#9ca3af',     // Unread words (light gray)
  lyricsCurrent: '#1f2937',     // Current word (dark text)
  lyricsRead: '#6b7280',        // Read words (medium gray)
  lyricsNext: '#4b5563',        // Next word (darker gray)
  lyricsCurrentBg: '#f3f4f6',   // Subtle light background
};

const darkTheme: ThemeColors = {
  // Background colors
  background: '#111827',
  surface: '#1f2937',
  card: '#374151',
  
  // Text colors
  text: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  
  // UI colors
  primary: '#6366f1',
  primaryLight: '#a5b4fc',
  secondary: '#4338ca',
  accent: '#312e81',
  
  // Status colors
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  
  // Border and divider colors
  border: '#4b5563',
  divider: '#374151',
  
  // Shadow colors
  shadow: '#000000',
  
  // Tab bar colors
  tabBarBackground: '#1f2937',
  tabBarInactive: '#9ca3af',
  
  // Player colors
  playerBackground: '#1f2937',
  playerCard: '#374151',
  
  // Lyrics sync colors
  lyricsDefault: '#6b7280',     // Unread words (medium gray)
  lyricsCurrent: '#f9fafb',     // Current word (bright white)
  lyricsRead: '#9ca3af',        // Read words (lighter gray)
  lyricsNext: '#d1d5db',        // Next word (light gray)
  lyricsCurrentBg: '#374151',   // Subtle dark background
};

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  
  // Determine if dark mode should be active
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  // Load theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);

  // Save theme preference to storage
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Toggle between light and dark (not system)
  const toggleTheme = () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    isDark,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { ThemeColors, ThemeMode };