import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

interface NotificationSettings {
  notifications_enabled: boolean;
  push_notifications: boolean;
  audio_complete_notifications: boolean;
  schedule_notifications: boolean;
  error_notifications: boolean;
  weekly_digest: boolean;
  new_features: boolean;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    notifications_enabled: true,
    push_notifications: true,
    audio_complete_notifications: true,
    schedule_notifications: true,
    error_notifications: true,
    weekly_digest: false,
    new_features: false,
  });

  const styles = createStyles(theme);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Map backend settings to notification settings
      setSettings({
        notifications_enabled: response.data.notifications_enabled || true,
        push_notifications: response.data.push_notifications || true,
        audio_complete_notifications: response.data.audio_complete_notifications || true,
        schedule_notifications: response.data.schedule_notifications || true,
        error_notifications: response.data.error_notifications || true,
        weekly_digest: response.data.weekly_digest || false,
        new_features: response.data.new_features || false,
      });
      
    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
      // Use default settings on error
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    setSaving(true);
    try {
      // Update backend via user settings API
      await axios.put(`${API}/user/settings`, {
        [key]: value
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Show confirmation for important settings
      if (key === 'notifications_enabled' && !value) {
        Alert.alert(
          'Notifications Disabled',
          'You will no longer receive any notifications from Audion. You can re-enable them anytime in settings.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error: any) {
      console.error('Error updating notification setting:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update notification setting');
    } finally {
      setSaving(false);
    }
  };

  const handleMasterToggle = (enabled: boolean) => {
    if (!enabled) {
      Alert.alert(
        'Disable All Notifications',
        'This will turn off all notifications from Audion. You can re-enable specific notifications later.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable All',
            style: 'destructive',
            onPress: () => updateNotificationSetting('notifications_enabled', false)
          }
        ]
      );
    } else {
      updateNotificationSetting('notifications_enabled', true);
    }
  };

  const notificationTypes = [
    {
      key: 'push_notifications' as keyof NotificationSettings,
      title: 'Push Notifications',
      subtitle: 'Show notifications on your device',
      icon: 'notifications',
      important: true,
    },
    {
      key: 'audio_complete_notifications' as keyof NotificationSettings,
      title: 'Audio Generation Complete',
      subtitle: 'Notify when new audio is ready to play',
      icon: 'musical-notes',
      important: true,
    },
    {
      key: 'schedule_notifications' as keyof NotificationSettings,
      title: 'Scheduled Content',
      subtitle: 'Daily auto-pick and scheduled audio notifications',
      icon: 'time',
      important: false,
    },
    {
      key: 'error_notifications' as keyof NotificationSettings,
      title: 'Error Notifications',
      subtitle: 'Important errors and issues that need attention',
      icon: 'alert-circle',
      important: true,
    },
    {
      key: 'weekly_digest' as keyof NotificationSettings,
      title: 'Weekly Digest',
      subtitle: 'Summary of your listening activity and recommendations',
      icon: 'stats-chart',
      important: false,
    },
    {
      key: 'new_features' as keyof NotificationSettings,
      title: 'New Features',
      subtitle: 'Updates about new Audion features and improvements',
      icon: 'star',
      important: false,
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notification settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Master Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          
          <View style={styles.masterCard}>
            <View style={styles.masterToggle}>
              <View style={styles.masterToggleLeft}>
                <View style={[
                  styles.masterIcon, 
                  { backgroundColor: settings.notifications_enabled ? theme.primary + '20' : theme.error + '20' }
                ]}>
                  <Ionicons 
                    name={settings.notifications_enabled ? "notifications" : "notifications-off"} 
                    size={24} 
                    color={settings.notifications_enabled ? theme.primary : theme.error}
                  />
                </View>
                <View style={styles.masterContent}>
                  <Text style={[styles.masterTitle, { color: theme.text }]}>
                    {settings.notifications_enabled ? 'Notifications Enabled' : 'Notifications Disabled'}
                  </Text>
                  <Text style={[styles.masterSubtitle, { color: theme.textSecondary }]}>
                    {settings.notifications_enabled 
                      ? 'You will receive notifications based on your preferences below'
                      : 'All notifications are currently disabled'
                    }
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.notifications_enabled}
                onValueChange={handleMasterToggle}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.notifications_enabled ? theme.primary : theme.surface}
              />
            </View>
          </View>
        </View>

        {/* Individual Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <Text style={styles.sectionSubtitle}>
            Choose which types of notifications you want to receive
          </Text>
          
          <View style={styles.notificationCard}>
            {notificationTypes.map((notification, index) => (
              <View key={notification.key} style={styles.notificationItem}>
                <View style={styles.notificationLeft}>
                  <View style={[
                    styles.notificationIcon,
                    { 
                      backgroundColor: notification.important ? theme.accent : theme.surface,
                      opacity: settings.notifications_enabled ? 1 : 0.5
                    }
                  ]}>
                    <Ionicons 
                      name={notification.icon as any} 
                      size={20} 
                      color={notification.important ? theme.primary : theme.textSecondary}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[
                      styles.notificationTitle, 
                      { 
                        color: theme.text,
                        opacity: settings.notifications_enabled ? 1 : 0.5
                      }
                    ]}>
                      {notification.title}
                      {notification.important && (
                        <Text style={[styles.importantBadge, { color: theme.warning }]}> •</Text>
                      )}
                    </Text>
                    <Text style={[
                      styles.notificationSubtitle, 
                      { 
                        color: theme.textSecondary,
                        opacity: settings.notifications_enabled ? 1 : 0.5
                      }
                    ]}>
                      {notification.subtitle}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings[notification.key] && settings.notifications_enabled}
                  onValueChange={(value) => updateNotificationSetting(notification.key, value)}
                  disabled={saving || !settings.notifications_enabled}
                  trackColor={{ false: theme.border, true: theme.primaryLight }}
                  thumbColor={settings[notification.key] ? theme.primary : theme.surface}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Notification Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Schedule</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Notifications are delivered based on your device settings and Do Not Disturb preferences
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="phone-portrait" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                You can manage notification sounds and vibration in your device's notification settings
              </Text>
            </View>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          
          <View style={styles.statusCard}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Master Setting</Text>
              <Text style={[
                styles.statusValue, 
                { color: settings.notifications_enabled ? theme.success : theme.error }
              ]}>
                {settings.notifications_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Active Notifications</Text>
              <Text style={[styles.statusValue, { color: theme.text }]}>
                {Object.values(settings).filter(Boolean).length} of {Object.keys(settings).length}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Device Permissions</Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => Alert.alert(
                  'Notification Permissions',
                  'To receive notifications, make sure Audion has notification permissions in your device settings.\n\nGo to: Settings → Apps → Audion → Notifications',
                  [{ text: 'OK' }]
                )}
              >
                <Text style={[styles.permissionButtonText, { color: theme.primary }]}>Check Permissions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.savingText, { color: theme.primary }]}>Saving...</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
  },
  masterCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  masterContent: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  masterSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  notificationCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  importantBadge: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notificationSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  statusCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.primary + '10',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});