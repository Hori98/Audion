import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { AutoPickProvider } from '../context/AutoPickContext';
import { GlobalAudioProvider } from '../context/GlobalAudioContext';
import { AudioMetadataProvider } from '../context/AudioMetadataProvider';
import { ArticleProvider } from '../context/ArticleContext';

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
      SplashScreen.hideAsync();
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
    <AuthProvider>
      <SettingsProvider>
        <ArticleProvider>
          <AutoPickProvider>
            <GlobalAudioProvider>
              <AudioMetadataProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
  );
}
