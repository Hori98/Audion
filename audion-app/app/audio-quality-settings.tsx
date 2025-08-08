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

interface UserSettings {
  audio_quality: string;
  auto_play_next: boolean;
  notifications_enabled: boolean;
  push_notifications: boolean;
  schedule_enabled: boolean;
  schedule_time: string;
  schedule_count: number;
  text_size: string;
  language: string;
}

export default function AudioQualitySettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    audio_quality: 'standard',
    auto_play_next: true,
    notifications_enabled: true,
    push_notifications: true,
    schedule_enabled: false,
    schedule_time: '07:00',
    schedule_count: 3,
    text_size: 'medium',
    language: 'en'
  });

  const styles = createStyles(theme);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      console.log('🔍 Debug - API URL:', API);
      console.log('🔍 Debug - Token:', token);
      const response = await axios.get(`${API}/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ Settings response:', response.data);
      setSettings(response.data);
    } catch (error: any) {
      console.error('❌ Error fetching settings:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      // Use default settings on error
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    setSaving(true);
    try {
      await axios.put(`${API}/user/settings`, {
        [key]: value
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSettings(prev => ({ ...prev, [key]: value }));
      
    } catch (error: any) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleQualityChange = (quality: string) => {
    Alert.alert(
      'Change Audio Quality',
      `Switch to ${quality} quality audio generation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: () => updateSetting('audio_quality', quality)
        }
      ]
    );
  };

  const qualityOptions = [
    {
      id: 'standard',
      name: 'Standard Quality',
      description: 'Balanced quality and generation speed',
      icon: 'musical-notes-outline',
      detail: 'Faster generation, good for most content',
      cost: 'Lower cost'
    },
    {
      id: 'high',
      name: 'High Quality',
      description: 'Premium quality with enhanced clarity',
      icon: 'diamond-outline',
      detail: 'Slower generation, ideal for important content',
      cost: 'Higher cost'
    }
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
          <Text style={styles.headerTitle}>Audio & Playback</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading settings...</Text>
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
        <Text style={styles.headerTitle}>Audio & Playback</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Audio Quality Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Generation Quality</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the quality level for AI-generated audio content
          </Text>
          
          <View style={styles.qualityContainer}>
            {qualityOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.qualityOption,
                  settings.audio_quality === option.id && styles.qualityOptionSelected,
                  { backgroundColor: theme.card, borderColor: theme.border }
                ]}
                onPress={() => handleQualityChange(option.id)}
                disabled={saving}
              >
                <View style={styles.qualityOptionIcon}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={32} 
                    color={settings.audio_quality === option.id ? theme.primary : theme.textSecondary}
                  />
                </View>
                <View style={styles.qualityOptionContent}>
                  <Text style={[
                    styles.qualityOptionTitle,
                    { color: settings.audio_quality === option.id ? theme.primary : theme.text }
                  ]}>
                    {option.name}
                  </Text>
                  <Text style={[styles.qualityOptionDescription, { color: theme.textSecondary }]}>
                    {option.description}
                  </Text>
                  <Text style={[styles.qualityOptionDetail, { color: theme.textSecondary }]}>
                    {option.detail}
                  </Text>
                  <Text style={[styles.qualityOptionCost, { 
                    color: option.id === 'high' ? theme.warning : theme.success 
                  }]}>
                    {option.cost}
                  </Text>
                </View>
                {settings.audio_quality === option.id && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Playback Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback Settings</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="play-forward" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Auto-play Next</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Automatically play next audio in queue
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.auto_play_next}
                onValueChange={(value) => updateSetting('auto_play_next', value)}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.auto_play_next ? theme.primary : theme.surface}
              />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="notifications" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Push Notifications</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    New content, recommendations
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.push_notifications}
                onValueChange={(value) => updateSetting('push_notifications', value)}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.push_notifications ? theme.primary : theme.surface}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Audio Generation Complete</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Notify when new audio is ready
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.notifications_enabled}
                onValueChange={(value) => updateSetting('notifications_enabled', value)}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.notifications_enabled ? theme.primary : theme.surface}
              />
            </View>
          </View>
        </View>

        {/* Current Settings Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Configuration</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Audio Quality</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {qualityOptions.find(opt => opt.id === settings.audio_quality)?.name}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Auto-play</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {settings.auto_play_next ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Notifications</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {settings.push_notifications ? 'Enabled' : 'Disabled'}
              </Text>
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
  qualityContainer: {
    gap: 12,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  qualityOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '10',
  },
  qualityOptionIcon: {
    marginRight: 16,
    width: 48,
    alignItems: 'center',
  },
  qualityOptionContent: {
    flex: 1,
  },
  qualityOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  qualityOptionDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  qualityOptionDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  qualityOptionCost: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
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