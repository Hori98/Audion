import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { AudioMetadataProvider } from '../context/AudioMetadataProvider';
import { AutoPickProvider } from '../context/AutoPickContext';
import ProgressBarLayout from '../components/ProgressBarLayout';

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

  return (
    <AuthProvider>
      <SettingsProvider>
        <AudioMetadataProvider>
          <AutoPickProvider>
            <RootLayoutNav />
          </AutoPickProvider>
        </AudioMetadataProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // 通知ハンドリングのセットアップ
  useEffect(() => {
    // アプリがフォアグラウンドのときに通知を受信した際のリスナー
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notifications] Received:', notification);
      // フォアグラウンドでの通知処理をここに実装
    });

    // ユーザーが通知をタップした際のリスナー
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notifications] Response:', response);
      const data = response.notification.request.content.data;

      // dataオブジェクトを使ってディープリンク（画面遷移）を実装
      handleNotificationNavigation(data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  /**
   * 通知タップ時のナビゲーション処理
   */
  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    try {
      switch (data.screen) {
        case 'ArticleDetail':
          if (data.articleId) {
            router.push(`/article/${data.articleId}`);
          }
          break;
        case 'AudioPlayer':
          if (data.audioId) {
            router.push(`/audio/${data.audioId}`);
          }
          break;
        case 'Feed':
          router.push('/(tabs)/');
          break;
        case 'Library':
          router.push('/(tabs)/two');
          break;
        case 'Settings':
          router.push('/settings/');
          break;
        default:
          console.log('[Notifications] Unknown screen:', data.screen);
      }
    } catch (error) {
      console.error('[Notifications] Navigation error:', error);
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ProgressBarLayout>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/rss-sources" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ProgressBarLayout>
    </ThemeProvider>
  );
}
