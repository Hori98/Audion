
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AudioProvider } from '../context/AudioContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, Alert } from 'react-native';
import MiniPlayer from '../components/MiniPlayer';
import FullScreenPlayer from '../components/FullScreenPlayer';
import { useSiriShortcuts } from '../hooks/useSiriShortcuts';
import { useAppIconShortcuts } from '../hooks/useAppIconShortcuts';

const InitialLayout = () => {
  const { user, loading, isNewUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Initialize Siri shortcuts and app icon shortcuts
  useSiriShortcuts();
  useAppIconShortcuts();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboard = segments[0] === 'onboard';

    if (user && isNewUser && !inOnboard) {
      // New user should go to onboarding
      router.replace('/onboard');
    } else if (user && !isNewUser && !inTabsGroup && segments[0] !== 'settings' && segments[0] !== 'sources' && segments[0] !== 'account-settings' && segments[0] !== 'audio-quality-settings' && segments[0] !== 'notification-settings' && segments[0] !== 'terms-of-service' && segments[0] !== 'privacy-policy' && segments[0] !== 'audio-player') {
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
      <MiniPlayer />
      <FullScreenPlayer />
    </View>
  );
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <InitialLayout />
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
