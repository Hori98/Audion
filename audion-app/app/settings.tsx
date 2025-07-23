import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  badge?: string;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  
  const [darkMode, setDarkMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Profile Settings',
          subtitle: 'Edit your profile information',
          icon: 'person-outline',
          type: 'navigation',
          onPress: () => {
            // TODO: Navigate to profile settings
            Alert.alert('Coming Soon', 'Profile settings will be available soon');
          }
        },
        {
          id: 'account',
          title: 'Account Settings',
          subtitle: 'Password, email, security',
          icon: 'shield-outline',
          type: 'navigation',
          onPress: () => {
            // TODO: Navigate to account settings
            Alert.alert('Coming Soon', 'Account settings will be available soon');
          }
        }
      ]
    },
    {
      title: 'Audio & Playback',
      items: [
        {
          id: 'audio-quality',
          title: 'Audio Quality',
          subtitle: 'Standard quality, playback speed',
          icon: 'musical-notes-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Audio settings will be available soon');
          }
        },
        {
          id: 'auto-play',
          title: 'Auto-play Next',
          subtitle: 'Automatically play next audio in queue',
          icon: 'play-forward-outline',
          type: 'toggle',
          value: autoPlay,
          onToggle: setAutoPlay
        },
        {
          id: 'downloads',
          title: 'Download Settings',
          subtitle: 'Offline playback, storage management',
          icon: 'download-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Download settings will be available soon');
          }
        }
      ]
    },
    {
      title: 'Content',
      items: [
        {
          id: 'rss-sources',
          title: 'RSS Sources',
          subtitle: 'Manage your news sources',
          icon: 'radio-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/sources');
          }
        },
        {
          id: 'interests',
          title: 'Interests & Genres',
          subtitle: 'Customize your content preferences',
          icon: 'heart-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Interest settings will be available soon');
          }
        },
        {
          id: 'notifications',
          title: 'Notifications',
          subtitle: 'New content, recommendations',
          icon: 'notifications-outline',
          type: 'toggle',
          value: notifications,
          onToggle: setNotifications
        }
      ]
    },
    {
      title: 'App Settings',
      items: [
        {
          id: 'theme',
          title: 'Dark Mode',
          subtitle: 'Switch between light and dark theme',
          icon: 'moon-outline',
          type: 'toggle',
          value: darkMode,
          onToggle: setDarkMode
        },
        {
          id: 'language',
          title: 'Language',
          subtitle: 'English',
          icon: 'language-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Language settings will be available soon');
          }
        },
        {
          id: 'storage',
          title: 'Storage Management',
          subtitle: 'Manage downloaded content',
          icon: 'server-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Storage management will be available soon');
          }
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & FAQ',
          subtitle: 'Get help and find answers',
          icon: 'help-circle-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Help section will be available soon');
          }
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          subtitle: 'Help us improve Audion',
          icon: 'chatbubble-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Feedback feature will be available soon');
          }
        },
        {
          id: 'about',
          title: 'About Audion',
          subtitle: 'Version 1.0.0',
          icon: 'information-circle-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('About Audion', 'Audion v1.0.0\nAI-powered news audio platform');
          }
        }
      ]
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          title: 'Logout',
          subtitle: 'Sign out of your account',
          icon: 'log-out-outline',
          type: 'action',
          onPress: handleLogout
        }
      ]
    }
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingItem}
        onPress={item.onPress}
        disabled={item.type === 'toggle'}
      >
        <View style={styles.settingItemLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon as any} size={22} color="#4f46e5" />
          </View>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingItemTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.settingItemSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.settingItemRight}>
          {item.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          
          {item.type === 'toggle' ? (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: '#d1d5db', true: '#a3a3ff' }}
              thumbColor={item.value ? '#4f46e5' : '#f4f3f4'}
            />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Settings List */}
      <ScrollView style={styles.scrollContainer}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}
        
        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#f0f0ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    height: 40,
  },
});