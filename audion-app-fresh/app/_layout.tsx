import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { AutoPickProvider } from '../context/AutoPickContext';
import { GlobalAudioProvider } from '../context/GlobalAudioContext';
import { AudioMetadataProvider } from '../context/AudioMetadataProvider';
import { ArticleProvider } from '../context/ArticleContext';
import NotificationPlaybackBridge from '../components/NotificationPlaybackBridge';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch((error) => {
        console.warn('SplashScreen.hideAsync failed:', error);
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SettingsProvider>
            <ArticleProvider>
              <AutoPickProvider>
                <GlobalAudioProvider>
                  <AudioMetadataProvider>
                    {/* NotificationPlaybackBridge: GlobalAudioProvider配下で通知応答を処理 */}
                    <NotificationPlaybackBridge />
                    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <Stack>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="player" options={{ 
                        presentation: 'modal',
                        headerShown: false
                      }} />
                      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="test-api" options={{
                        title: 'API接続テスト',
                        presentation: 'modal'
                      }} />
                      <Stack.Screen name="auth/login" options={{
                        title: 'ログイン',
                        headerShown: false
                      }} />
                      <Stack.Screen name="auth/register" options={{
                        title: '新規登録',
                        headerShown: false
                      }} />
                    </Stack>
                  </ThemeProvider>
                  </AudioMetadataProvider>
                </GlobalAudioProvider>
              </AutoPickProvider>
            </ArticleProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
