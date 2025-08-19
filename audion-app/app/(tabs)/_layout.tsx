import { Tabs, useSegments } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TouchableOpacity, View, Image, Text, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import GlobalEventService from '../../services/GlobalEventService';

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
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('index');
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';
  
  const handleSettingsPress = () => {
    router.push('/settings');
  };

  const handleSearchPress = () => {
    const eventService = GlobalEventService.getInstance();
    if (currentTab === 'index') {
      eventService.triggerHomeSearch();
    } else if (currentTab === 'feed') {
      eventService.triggerFeedSearch();
    } else if (currentTab === 'discover') {
      eventService.triggerDiscoverSearch();
    }
  };

  const handleFilterPress = () => {
    if (currentTab === 'feed') {
      GlobalEventService.getInstance().triggerFeedFilter();
    }
  };

  // Track current tab from segments
  useEffect(() => {
    const tabSegment = segments[segments.length - 1];
    if (tabSegment) {
      setCurrentTab(tabSegment);
    }
  }, [segments]);

  // Ensure currentTab is always set correctly
  useFocusEffect(
    useCallback(() => {
      const tabSegment = segments[segments.length - 1];
      if (tabSegment) {
        setCurrentTab(tabSegment);
      }
    }, [segments])
  );

  // Fetch user profile image from backend
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.profile_image) {
        setUserProfileImage(response.data.profile_image);
      }
    } catch (error: any) {
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
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: theme.primary,
          letterSpacing: 1,
        }}>
          Audion
        </Text>
      </View>

        {/* Right side - Dynamic icons based on current tab */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Feed Filter Menu Button - Only show on Feed tab */}
          {currentTab === 'feed' && (
            <TouchableOpacity
              onPress={handleFilterPress}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.surface,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open filter menu"
              accessibilityHint="Access reading status filters"
            >
              <Ionicons name="menu" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Search Button - Show on Home, Feed, and Discover tabs */}
          {(currentTab === 'index' || currentTab === 'feed' || currentTab === 'discover') && (
            <TouchableOpacity
              onPress={handleSearchPress}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.surface,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Search"
              accessibilityHint="Open search modal"
            >
              <Ionicons name="search" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          
          {/* Placeholder for tabs without icons */}
          {!(currentTab === 'index' || currentTab === 'feed' || currentTab === 'discover') && (
            <View style={{ width: 32 }} />
          )}
        </View>
      </View>
    </View>
  );
};

export default function AppLayout() {
  const { theme } = useTheme();
  
  return (
    <Tabs
      initialRouteName="index"
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
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
          href: '/(tabs)/'
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" color={color} size={size} />,
          href: '/(tabs)/feed'
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color} size={size} />,
          href: '/(tabs)/discover'
        }}
      />
      <Tabs.Screen
        name="playlist"
        options={{
          title: 'Playlist',
          tabBarLabel: 'Playlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-outline" color={color} size={size} />,
          href: '/(tabs)/playlist'
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'Archive',
          tabBarLabel: 'Archive',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" color={color} size={size} />,
          href: '/(tabs)/archive'
        }}
      />
    </Tabs>
  );
}