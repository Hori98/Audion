import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
  SafeAreaView,
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import NotificationService from '../services/NotificationService';
import type { NotificationSettings } from '../services/NotificationService';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const currentSettings = await NotificationService.getInstance().getNotificationSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await NotificationService.getInstance().updateNotificationSettings({ [key]: value });
      console.log('Notification setting updated:', key, value);
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      Alert.alert('Error', 'Failed to update notification setting');
      // Revert the change
      setSettings(settings);
    }
  };

  const updateQuietHoursEnabled = (enabled: boolean) => {
    if (!settings) return;
    
    const newQuietHours = { ...settings.quietHours, enabled };
    updateSetting('quietHours', newQuietHours);
  };

  const testNotification = async () => {
    try {
      await NotificationService.getInstance().testNotification('audio_ready');
      Alert.alert('Test Sent', 'Check your notification tray for the test notification');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const SettingItem = ({ 
    title, 
    subtitle, 
    icon, 
    value, 
    onToggle, 
    disabled = false 
  }: {
    title: string;
    subtitle?: string;
    icon: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color={theme.accent} style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor={Platform.OS === 'ios' ? undefined : (value ? theme.accent : theme.surface)}
      />
    </View>
  );

  if (loading || !settings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notification Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>General</Text>
          
          <SettingItem
            title="Enable Notifications"
            subtitle="Receive all types of notifications"
            icon="notifications"
            value={settings.enabled}
            onToggle={(value) => updateSetting('enabled', value)}
          />
        </View>

        {/* Audio Ready Notifications */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Audio Notifications</Text>
          
          <SettingItem
            title="Audio Ready"
            subtitle="When your podcast audio is finished creating"
            icon="play-circle"
            value={settings.audioReady}
            onToggle={(value) => updateSetting('audioReady', value)}
            disabled={!settings.enabled}
          />

          <SettingItem
            title="Schedule Delivery"
            subtitle="For scheduled podcast deliveries"
            icon="time"
            value={settings.scheduleDelivery}
            onToggle={(value) => updateSetting('scheduleDelivery', value)}
            disabled={!settings.enabled}
          />
        </View>

        {/* Sound & Vibration */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Sound & Vibration</Text>
          
          <SettingItem
            title="Sound"
            subtitle="Play sound with notifications"
            icon="volume-high"
            value={settings.soundEnabled}
            onToggle={(value) => updateSetting('soundEnabled', value)}
            disabled={!settings.enabled}
          />

          <SettingItem
            title="Vibration"
            subtitle="Vibrate device for notifications"
            icon="phone-portrait"
            value={settings.vibrationEnabled}
            onToggle={(value) => updateSetting('vibrationEnabled', value)}
            disabled={!settings.enabled}
          />
        </View>

        {/* Quiet Hours */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quiet Hours</Text>
          
          <SettingItem
            title="Enable Quiet Hours"
            subtitle={`${settings.quietHours.startTime} - ${settings.quietHours.endTime}`}
            icon="moon"
            value={settings.quietHours.enabled}
            onToggle={updateQuietHoursEnabled}
            disabled={!settings.enabled}
          />

          <Text style={[styles.quietHoursInfo, { color: theme.textSecondary }]}>
            During quiet hours, notifications will be silent and shown only as badges
          </Text>
        </View>

        {/* Test Notification */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <TouchableOpacity 
            style={[styles.testButton, { borderColor: theme.accent }]}
            onPress={testNotification}
            disabled={!settings.enabled}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={settings.enabled ? theme.accent : theme.textSecondary} 
            />
            <Text 
              style={[
                styles.testButtonText, 
                { 
                  color: settings.enabled ? theme.accent : theme.textSecondary,
                  marginLeft: 8
                }
              ]}
            >
              Send Test Notification
            </Text>
          </TouchableOpacity>
        </View>

        {/* Information */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>About Notifications</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            • Audio Ready: Notifies you when podcast creation is complete{'\n'}
            • Schedule Delivery: Alerts for automated podcast deliveries{'\n'}
            • Quiet Hours: Automatically silences notifications during specified hours{'\n'}
            • You can manage system notification permissions in your device settings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    margin: 16,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  quietHoursInfo: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});