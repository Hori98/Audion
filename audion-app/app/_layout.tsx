
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { UnifiedAudioProvider } from '../context/UnifiedAudioContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, Alert } from 'react-native';
import AudioPlayerManager from '../components/audio/core/AudioPlayerManager';
import NotificationService from '../services/NotificationService';
import { useSiriShortcuts } from '../hooks/useSiriShortcuts';
import { useAppIconShortcuts } from '../hooks/useAppIconShortcuts';
import '../i18n'; // Initialize i18n

const InitialLayout = () => {
  const { user, loading, isNewUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Initialize Siri shortcuts and app icon shortcuts
  useSiriShortcuts();
  useAppIconShortcuts();

  // Initialize services on app startup
  useEffect(() => {
    const initServices = async () => {
      try {
        // Initialize Debug Service first (loads settings)
        const { default: DebugService } = await import('../services/DebugService');
        await DebugService.loadDebugSettings();
        console.log('✅ App: DebugService initialized');
        
        // Initialize NotificationService
        await NotificationService.getInstance().initialize();
        console.log('✅ App: NotificationService initialized');
      } catch (error) {
        console.error('❌ App: Failed to initialize services:', error);
      }
    };
    
    initServices();
  }, []);

  useEffect(() => {
    if (loading) return;

    const checkAuthAndRoute = async () => {
      const inTabsGroup = segments[0] === '(tabs)';
      const inOnboard = segments[0] === 'onboard';
      
      // Check if debug mode allows auth bypass
      try {
        const { default: DebugService } = await import('../services/DebugService');
        const shouldBypassAuth = DebugService.isDebugModeEnabled() && DebugService.getCurrentSettings().skipOnboardingRequirements;
        
        if (shouldBypassAuth && !inTabsGroup) {
          console.log('🔓 Debug Mode: Bypassing authentication, going to main app');
          router.replace('/(tabs)/');
          return;
        }
      } catch (error) {
        console.warn('Failed to check debug mode for auth bypass:', error);
      }

      // Normal auth flow
      if (user && isNewUser && !inOnboard) {
        // New user should go to onboarding
        router.replace('/onboard');
      } else if (user && !isNewUser && !inTabsGroup && segments[0] !== 'settings' && segments[0] !== 'sources' && segments[0] !== 'account-settings' && segments[0] !== 'audio-quality-settings' && segments[0] !== 'notification-settings' && segments[0] !== 'terms-of-service' && segments[0] !== 'privacy-policy' && segments[0] !== 'audio-player' && segments[0] !== 'auto-pick-settings' && segments[0] !== 'genre-preferences' && segments[0] !== 'download-settings' && segments[0] !== 'storage-usage' && segments[0] !== 'data-collection-settings' && segments[0] !== 'feed-autopick-settings' && segments[0] !== 'playback-controls' && segments[0] !== 'text-font-settings' && segments[0] !== 'export-backup' && segments[0] !== 'content-filters' && segments[0] !== 'schedule-content-settings' && segments[0] !== 'prompt-settings') {
        // Existing user should go to main app (Home tab is default)
        router.replace('/(tabs)/');
      } else if (!user && (inTabsGroup || inOnboard)) {
        // Not logged in should go to login
        router.replace('/');
      }
    };

    checkAuthAndRoute();
  }, [user, loading, isNewUser, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <AudioPlayerManager />
    </View>
  );
};

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <UnifiedAudioProvider>
            <InitialLayout />
          </UnifiedAudioProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
