
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AudioProvider } from '../context/AudioContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, Alert } from 'react-native';
import MiniPlayer from '../components/MiniPlayer';
import FullScreenPlayer from '../components/FullScreenPlayer';

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (user && !inTabsGroup) {
      router.replace('/(tabs)/feed');
    } else if (!user && inTabsGroup) {
      router.replace('/');
    }
  }, [user, loading, segments, router]);

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
    <AuthProvider>
      <AudioProvider>
        <InitialLayout />
      </AudioProvider>
    </AuthProvider>
  );
}
