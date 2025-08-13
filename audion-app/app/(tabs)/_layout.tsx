import { Tabs } from 'expo-router';
import { Home } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TouchableOpacity, View, Image, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';

// TODO: Future Twitter-like UI enhancements
// 1. Add tab selection UI between header and content (similar to Twitter's Home/Following tabs)
// 2. Consider profile/avatar in top-right for user identification
// 3. Add notification indicators for social features
// 4. Implement pull-to-refresh on content areas

// Custom Header Component
const CustomHeader = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';
  
  const handleSettingsPress = () => {
    console.log('User avatar pressed - navigating to settings');
    try {
      router.push('/settings');
      console.log('Successfully navigated to settings');
    } catch (error) {
      console.error('Error navigating to settings:', error);
    }
  };

  // Fetch user profile image from backend
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]); // fetchUserProfile is defined inline, so it's safe to omit

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.profile_image) {
        setUserProfileImage(response.data.profile_image);
      }
    } catch (error: any) {
      console.error('Error fetching user profile for header:', error);
      // Profile endpoint might not exist yet, ignore error
    }
  };

  return (
    <View style={{
      paddingTop: Platform.OS === 'ios' ? insets.top : 0,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        minHeight: 50,
      }}>
      {/* User Avatar (Left) */}
      <TouchableOpacity 
        onPress={handleSettingsPress}
        style={{ 
          padding: 4,
          borderRadius: 20,
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Profile Settings"
        accessibilityRole="button"
      >
        {userProfileImage ? (
          <Image 
            source={{ uri: userProfileImage }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.accent,
            }}
          />
        ) : (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: theme.accent,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name="person" size={18} color={theme.textMuted} />
          </View>
        )}
      </TouchableOpacity>

      {/* Audion Logo (Center) */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {/* Audion Text Logo */}
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: theme.primary,
          letterSpacing: 1,
        }}>
          Audion
        </Text>
      </View>

        {/* Right side placeholder for future features */}
        <View style={{ width: 32 }} />
      </View>
    </View>
  );
};

export default function AppLayout() {
  const { theme } = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.border,
        },
        header: () => <CustomHeader />,
        headerTitle: '', // Remove tab names from header
        headerShown: true,
      }}>
      <Tabs.Screen
        name="main"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          tabBarLabel: 'Archive',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarLabel: 'Recent',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}