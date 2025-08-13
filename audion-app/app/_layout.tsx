
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AudioProvider } from '../context/AudioContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, Alert } from 'react-native';
import MiniPlayer from '../components/MiniPlayer';
import FullScreenPlayer from '../components/FullScreenPlayer';
import ChapterSourceButton from '../components/ChapterSourceButton';
import { useAudio } from '../context/AudioContext';
import NotificationService from '../services/NotificationService';

const ChapterSourceButtonWrapper = () => {
  const { isPlaying, currentAudio, showFullScreenPlayer } = useAudio();
  return (
    <ChapterSourceButton 
      visible={isPlaying && currentAudio !== null && !showFullScreenPlayer} 
    />
  );
};
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

  // Initialize NotificationService on app startup
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await NotificationService.getInstance().initialize();
        console.log('✅ App: NotificationService initialized');
      } catch (error) {
        console.error('❌ App: Failed to initialize NotificationService:', error);
      }
    };
    
    initNotifications();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboard = segments[0] === 'onboard';

    if (user && isNewUser && !inOnboard) {
      // New user should go to onboarding
      router.replace('/onboard');
    } else if (user && !isNewUser && !inTabsGroup && segments[0] !== 'settings' && segments[0] !== 'sources' && segments[0] !== 'account-settings' && segments[0] !== 'audio-quality-settings' && segments[0] !== 'notification-settings' && segments[0] !== 'terms-of-service' && segments[0] !== 'privacy-policy' && segments[0] !== 'audio-player' && segments[0] !== 'auto-pick-settings' && segments[0] !== 'genre-preferences' && segments[0] !== 'download-settings' && segments[0] !== 'storage-usage' && segments[0] !== 'data-collection-settings' && segments[0] !== 'feed-autopick-settings' && segments[0] !== 'playback-controls' && segments[0] !== 'text-font-settings' && segments[0] !== 'export-backup' && segments[0] !== 'content-filters' && segments[0] !== 'schedule-content-settings' && segments[0] !== 'prompt-settings') {
      // Existing user should go to main app (but allow settings and sources navigation)
      router.replace('/(tabs)/feed');
    } else if (!user && (inTabsGroup || inOnboard)) {
      // Not logged in should go to login
      router.replace('/');
    }
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
      <ChapterSourceButtonWrapper />
      <MiniPlayer />
      <FullScreenPlayer />
    </View>
  );
};

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AudioProvider>
            <InitialLayout />
          </AudioProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
