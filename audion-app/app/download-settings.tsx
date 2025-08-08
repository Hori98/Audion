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
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

interface DownloadSettings {
  // Quality Settings
  audio_quality: 'low' | 'medium' | 'high' | 'lossless';
  download_format: 'mp3' | 'aac' | 'm4a';
  
  // Storage Settings
  max_storage_mb: number;
  download_location: 'internal' | 'external';
  cleanup_after_days: number;
  
  // Auto-Download Settings
  auto_download_enabled: boolean;
  auto_download_on_wifi_only: boolean;
  auto_download_limit: number; // max files to auto-download
  auto_download_new_audio: boolean;
  
  // Offline Settings
  offline_mode_enabled: boolean;
  cache_articles_offline: boolean;
  preload_next_audio: boolean;
}

const DEFAULT_SETTINGS: DownloadSettings = {
  audio_quality: 'medium',
  download_format: 'mp3',
  max_storage_mb: 500,
  download_location: 'internal',
  cleanup_after_days: 30,
  auto_download_enabled: false,
  auto_download_on_wifi_only: true,
  auto_download_limit: 5,
  auto_download_new_audio: false,
  offline_mode_enabled: false,
  cache_articles_offline: false,
  preload_next_audio: true,
};

const QUALITY_OPTIONS = [
  { key: 'low', label: 'Low Quality', subtitle: '64 kbps • Smaller files', size: '~3 MB/hour' },
  { key: 'medium', label: 'Medium Quality', subtitle: '128 kbps • Balanced', size: '~6 MB/hour' },
  { key: 'high', label: 'High Quality', subtitle: '256 kbps • Better sound', size: '~12 MB/hour' },
  { key: 'lossless', label: 'Lossless', subtitle: 'Uncompressed • Best quality', size: '~60 MB/hour' },
];

const FORMAT_OPTIONS = [
  { key: 'mp3', label: 'MP3', subtitle: 'Universal compatibility' },
  { key: 'aac', label: 'AAC', subtitle: 'Better quality at same size' },
  { key: 'm4a', label: 'M4A', subtitle: 'Apple optimized' },
];

export default function DownloadSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DownloadSettings>(DEFAULT_SETTINGS);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0 });

  const styles = createStyles(theme);

  useEffect(() => {
    loadSettings();
    checkStorageUsage();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('🔍 Loading download settings...');
      
      // Try to load from AsyncStorage first (local settings)
      const localSettings = await AsyncStorage.getItem('downloadSettings');
      let downloadSettings = DEFAULT_SETTINGS;
      
      if (localSettings) {
        downloadSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) };
      }
      
      // Also try to get from backend if available
      try {
        const response = await axios.get(`${API}/user/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.data.download_settings) {
          downloadSettings = { ...downloadSettings, ...response.data.download_settings };
        }
      } catch (error) {
        console.log('Backend settings not available, using local settings');
      }
      
      setSettings(downloadSettings);
      
    } catch (error: any) {
      console.error('❌ Error loading download settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const checkStorageUsage = async () => {
    try {
      // Simulate storage usage check
      // In a real app, this would check actual file system usage
      const used = Math.floor(Math.random() * 200); // Random usage 0-200 MB
      setStorageUsage({ used, total: settings.max_storage_mb });
    } catch (error) {
      console.error('Error checking storage usage:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<DownloadSettings>) => {
    setSaving(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('downloadSettings', JSON.stringify(updatedSettings));
      
      // Try to save to backend as well
      try {
        await axios.put(`${API}/user/settings`, {
          download_settings: updatedSettings,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.log('Backend update failed, saved locally');
      }
      
      setSettings(updatedSettings);
      
      // Update storage usage if storage limit changed
      if (newSettings.max_storage_mb) {
        setStorageUsage(prev => ({ ...prev, total: newSettings.max_storage_mb }));
      }
      
    } catch (error: any) {
      console.error('Error updating download settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const clearDownloadedFiles = () => {
    Alert.alert(
      'Clear Downloaded Files',
      `This will free up approximately ${storageUsage.used} MB of storage. Downloaded audio files will need to be re-downloaded for offline playback.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Files',
          style: 'destructive',
          onPress: async () => {
            // In a real app, this would delete downloaded files
            setStorageUsage(prev => ({ ...prev, used: 0 }));
            Alert.alert('Success', 'Downloaded files cleared successfully');
          }
        }
      ]
    );
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all download settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => updateSettings(DEFAULT_SETTINGS)
        }
      ]
    );
  };

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
          <Text style={styles.headerTitle}>Download Settings</Text>
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
        <Text style={styles.headerTitle}>Download Settings</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefaults}
          disabled={saving}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Storage Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Overview</Text>
          <View style={styles.storageCard}>
            <View style={styles.storageHeader}>
              <View style={styles.storageStats}>
                <Text style={[styles.storageUsed, { color: theme.text }]}>
                  {storageUsage.used} MB
                </Text>
                <Text style={[styles.storageTotal, { color: theme.textSecondary }]}>
                  of {storageUsage.total} MB used
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: theme.accent }]}
                onPress={clearDownloadedFiles}
              >
                <Ionicons name="trash-outline" size={16} color={theme.primary} />
                <Text style={[styles.clearButtonText, { color: theme.primary }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: storageUsage.used / storageUsage.total > 0.8 ? '#EF4444' : theme.primary,
                      width: `${Math.min(100, (storageUsage.used / storageUsage.total) * 100)}%`
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Audio Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Quality</Text>
          <Text style={styles.sectionSubtitle}>
            Higher quality means larger file sizes but better sound
          </Text>
          
          <View style={styles.settingCard}>
            {QUALITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionItem,
                  settings.audio_quality === option.key && styles.optionSelected
                ]}
                onPress={() => updateSettings({ audio_quality: option.key as any })}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionInfo}>
                    <Text style={[
                      styles.optionTitle, 
                      { color: settings.audio_quality === option.key ? theme.primary : theme.text }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.optionRight}>
                  <Text style={[styles.optionSize, { color: theme.textMuted }]}>{option.size}</Text>
                  {settings.audio_quality === option.key && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Storage Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Management</Text>
          <Text style={styles.sectionSubtitle}>
            Control how much storage space downloads can use
          </Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="server-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Storage Limit</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    {settings.max_storage_mb} MB maximum
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>100 MB</Text>
              <Slider
                style={styles.slider}
                minimumValue={100}
                maximumValue={2000}
                step={50}
                value={settings.max_storage_mb}
                onValueChange={(value) => updateSettings({ max_storage_mb: value })}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.border}
                thumbTintColor={theme.primary}
                disabled={saving}
              />
              <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>2 GB</Text>
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="time-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Auto-Cleanup</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Delete downloads after {settings.cleanup_after_days} days
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Auto-Cleanup Period',
                    'Delete downloaded files after how many days?',
                    [
                      { text: '7 days', onPress: () => updateSettings({ cleanup_after_days: 7 }) },
                      { text: '14 days', onPress: () => updateSettings({ cleanup_after_days: 14 }) },
                      { text: '30 days', onPress: () => updateSettings({ cleanup_after_days: 30 }) },
                      { text: '90 days', onPress: () => updateSettings({ cleanup_after_days: 90 }) },
                      { text: 'Never', onPress: () => updateSettings({ cleanup_after_days: -1 }) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={[styles.settingValue, { color: theme.primary }]}>
                  {settings.cleanup_after_days === -1 ? 'Never' : `${settings.cleanup_after_days}d`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Auto-Download */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Download</Text>
          <Text style={styles.sectionSubtitle}>
            Automatically download new audio for offline listening
          </Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="download-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Enable Auto-Download</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Automatically download new audio files
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.auto_download_enabled}
                onValueChange={(value) => updateSettings({ auto_download_enabled: value })}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.auto_download_enabled ? theme.primary : theme.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="wifi-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Wi-Fi Only</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Only download when connected to Wi-Fi
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.auto_download_on_wifi_only}
                onValueChange={(value) => updateSettings({ auto_download_on_wifi_only: value })}
                disabled={saving || !settings.auto_download_enabled}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.auto_download_on_wifi_only ? theme.primary : theme.surface}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="list-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Download Limit</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Maximum {settings.auto_download_limit} files at once
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Auto-Download Limit',
                    'How many files should auto-download at once?',
                    [
                      { text: '3', onPress: () => updateSettings({ auto_download_limit: 3 }) },
                      { text: '5', onPress: () => updateSettings({ auto_download_limit: 5 }) },
                      { text: '10', onPress: () => updateSettings({ auto_download_limit: 10 }) },
                      { text: '20', onPress: () => updateSettings({ auto_download_limit: 20 }) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                disabled={!settings.auto_download_enabled}
              >
                <Text style={[
                  styles.settingValue, 
                  { color: settings.auto_download_enabled ? theme.primary : theme.textMuted }
                ]}>
                  {settings.auto_download_limit}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Offline Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Mode</Text>
          <Text style={styles.sectionSubtitle}>
            Enhanced offline playback experience
          </Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="airplane-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Offline Mode</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Show only downloaded content when offline
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.offline_mode_enabled}
                onValueChange={(value) => updateSettings({ offline_mode_enabled: value })}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.offline_mode_enabled ? theme.primary : theme.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Cache Articles</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Save article text for offline reading
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.cache_articles_offline}
                onValueChange={(value) => updateSettings({ cache_articles_offline: value })}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.cache_articles_offline ? theme.primary : theme.surface}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="play-forward-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Preload Next Audio</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Download next audio in queue automatically
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.preload_next_audio}
                onValueChange={(value) => updateSettings({ preload_next_audio: value })}
                disabled={saving}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={settings.preload_next_audio ? theme.primary : theme.surface}
              />
            </View>
          </View>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.savingText, { color: theme.primary }]}>Saving settings...</Text>
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
  resetButton: {
    padding: 8,
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
    lineHeight: 20,
  },
  
  // Storage Card
  storageCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageStats: {
    flex: 1,
  },
  storageUsed: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  storageTotal: {
    fontSize: 14,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Setting Cards
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
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Option Items (Quality Selection)
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: -1,
  },
  optionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.accent,
  },
  optionLeft: {
    flex: 1,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    lineHeight: 16,
  },
  optionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  optionSize: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Slider
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'center',
  },

  // Saving Indicator
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});