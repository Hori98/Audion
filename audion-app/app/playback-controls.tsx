import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlaybackSetting {
  id: string;
  title: string;
  description: string;
  type: 'switch' | 'slider' | 'selection';
  value: any;
  icon: string;
  options?: Array<{label: string, value: any}>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

interface PlaybackCategory {
  title: string;
  description: string;
  settings: PlaybackSetting[];
}

const STORAGE_KEY = 'playback_settings';

export default function PlaybackControlsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playbackCategories, setPlaybackCategories] = useState<PlaybackCategory[]>([]);

  const styles = createStyles(theme);

  useEffect(() => {
    loadPlaybackSettings();
  }, []);

  const getDefaultPlaybackSettings = (savedSettings: any = {}): PlaybackCategory[] => [
    {
      title: 'Audio Quality & Performance',
      description: 'Optimize audio quality and performance',
      settings: [
        {
          id: 'audio_quality',
          title: 'Audio Quality',
          description: 'Balance between quality and file size',
          type: 'selection',
          value: savedSettings.audio_quality || 'high',
          icon: 'musical-notes-outline',
          options: [
            { label: 'Standard (64kbps)', value: 'standard' },
            { label: 'Good (96kbps)', value: 'good' },
            { label: 'High (128kbps)', value: 'high' },
            { label: 'Premium (192kbps)', value: 'premium' }
          ]
        },
        {
          id: 'buffer_size',
          title: 'Buffer Size',
          description: 'Larger buffer reduces interruptions but uses more memory',
          type: 'slider',
          value: savedSettings.buffer_size || 5,
          icon: 'layers-outline',
          min: 3,
          max: 15,
          step: 1,
          unit: ' seconds'
        },
        {
          id: 'preload_next',
          title: 'Preload Next Audio',
          description: 'Automatically preload next audio for seamless playback',
          type: 'switch',
          value: savedSettings.preload_next !== false,
          icon: 'download-outline'
        }
      ]
    },
    {
      title: 'Playback Behavior',
      description: 'Customize how audio plays and responds',
      settings: [
        {
          id: 'auto_play',
          title: 'Auto-Play',
          description: 'Automatically start playing when audio loads',
          type: 'switch',
          value: savedSettings.auto_play !== false,
          icon: 'play-circle-outline'
        },
        {
          id: 'loop_single',
          title: 'Loop Single Audio',
          description: 'Replay the same audio when it ends',
          type: 'switch',
          value: savedSettings.loop_single || false,
          icon: 'repeat-outline'
        },
        {
          id: 'shuffle_mode',
          title: 'Shuffle by Default',
          description: 'Enable shuffle mode for new playlists',
          type: 'switch',
          value: savedSettings.shuffle_mode || false,
          icon: 'shuffle-outline'
        },
        {
          id: 'crossfade_duration',
          title: 'Crossfade Duration',
          description: 'Smooth transition between audio tracks',
          type: 'slider',
          value: savedSettings.crossfade_duration || 0,
          icon: 'swap-horizontal-outline',
          min: 0,
          max: 10,
          step: 0.5,
          unit: ' seconds'
        }
      ]
    },
    {
      title: 'Speed & Pitch Control',
      description: 'Adjust playback speed and voice characteristics',
      settings: [
        {
          id: 'default_speed',
          title: 'Default Playback Speed',
          description: 'Starting speed for new audio',
          type: 'slider',
          value: savedSettings.default_speed || 1.0,
          icon: 'speedometer-outline',
          min: 0.5,
          max: 2.5,
          step: 0.1,
          unit: 'x'
        },
        {
          id: 'preserve_pitch',
          title: 'Preserve Pitch at Speed Changes',
          description: 'Keep natural voice tone when changing speed',
          type: 'switch',
          value: savedSettings.preserve_pitch !== false,
          icon: 'musical-note-outline'
        },
        {
          id: 'smart_speed',
          title: 'Smart Speed Adjustment',
          description: 'Automatically adjust speed for different content types',
          type: 'switch',
          value: savedSettings.smart_speed || false,
          icon: 'bulb-outline'
        }
      ]
    },
    {
      title: 'Voice & Narration',
      description: 'Customize voice settings and narration style',
      settings: [
        {
          id: 'voice_type',
          title: 'Preferred Voice Type',
          description: 'Choose default voice characteristics',
          type: 'selection',
          value: savedSettings.voice_type || 'balanced',
          icon: 'person-outline',
          options: [
            { label: 'Professional Male', value: 'male_professional' },
            { label: 'Professional Female', value: 'female_professional' },
            { label: 'Balanced Mix', value: 'balanced' },
            { label: 'Conversational', value: 'conversational' }
          ]
        },
        {
          id: 'speech_rate',
          title: 'Natural Speech Rate',
          description: 'How fast the AI speaks naturally',
          type: 'slider',
          value: savedSettings.speech_rate || 1.0,
          icon: 'chatbubble-ellipses-outline',
          min: 0.7,
          max: 1.5,
          step: 0.05,
          unit: 'x'
        },
        {
          id: 'add_pauses',
          title: 'Enhanced Pauses',
          description: 'Add natural pauses for better comprehension',
          type: 'switch',
          value: savedSettings.add_pauses !== false,
          icon: 'pause-circle-outline'
        }
      ]
    },
    {
      title: 'Background & Interruptions',
      description: 'Handle interruptions and background playback',
      settings: [
        {
          id: 'background_play',
          title: 'Background Playback',
          description: 'Continue playing when app is minimized',
          type: 'switch',
          value: savedSettings.background_play !== false,
          icon: 'phone-portrait-outline'
        },
        {
          id: 'phone_interruption',
          title: 'Pause for Phone Calls',
          description: 'Automatically pause during incoming calls',
          type: 'switch',
          value: savedSettings.phone_interruption !== false,
          icon: 'call-outline'
        },
        {
          id: 'notification_interruption',
          title: 'Pause for Notifications',
          description: 'Pause briefly when notifications arrive',
          type: 'switch',
          value: savedSettings.notification_interruption || false,
          icon: 'notifications-outline'
        },
        {
          id: 'resume_delay',
          title: 'Auto-Resume Delay',
          description: 'Delay before auto-resuming after interruption',
          type: 'slider',
          value: savedSettings.resume_delay || 3,
          icon: 'timer-outline',
          min: 0,
          max: 10,
          step: 1,
          unit: ' seconds'
        }
      ]
    },
    {
      title: 'Accessibility & Controls',
      description: 'Accessibility features and control options',
      settings: [
        {
          id: 'gesture_controls',
          title: 'Gesture Controls',
          description: 'Enable swipe and tap gestures for playback control',
          type: 'switch',
          value: savedSettings.gesture_controls !== false,
          icon: 'hand-left-outline'
        },
        {
          id: 'large_controls',
          title: 'Large Control Buttons',
          description: 'Bigger buttons for easier access',
          type: 'switch',
          value: savedSettings.large_controls || false,
          icon: 'resize-outline'
        },
        {
          id: 'skip_duration',
          title: 'Skip Forward/Backward Duration',
          description: 'Seconds to skip with forward/back buttons',
          type: 'selection',
          value: savedSettings.skip_duration || 30,
          icon: 'play-skip-forward-outline',
          options: [
            { label: '10 seconds', value: 10 },
            { label: '15 seconds', value: 15 },
            { label: '30 seconds', value: 30 },
            { label: '45 seconds', value: 45 },
            { label: '60 seconds', value: 60 }
          ]
        },
        {
          id: 'haptic_feedback',
          title: 'Haptic Feedback',
          description: 'Vibrate on button presses and gestures',
          type: 'switch',
          value: savedSettings.haptic_feedback !== false,
          icon: 'radio-outline'
        }
      ]
    }
  ];

  const loadPlaybackSettings = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const savedSettings = saved ? JSON.parse(saved) : {};
      setPlaybackCategories(getDefaultPlaybackSettings(savedSettings));
    } catch (error) {
      console.error('Error loading playback settings:', error);
      setPlaybackCategories(getDefaultPlaybackSettings());
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingId: string, value: any) => {
    setSaving(true);
    try {
      // Update local state
      setPlaybackCategories(prev => 
        prev.map(category => ({
          ...category,
          settings: category.settings.map(setting => 
            setting.id === settingId ? { ...setting, value } : setting
          )
        }))
      );

      // Save to AsyncStorage
      const currentSettings = await AsyncStorage.getItem(STORAGE_KEY);
      const settings = currentSettings ? JSON.parse(currentSettings) : {};
      settings[settingId] = value;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to save playback setting');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all playback settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setPlaybackCategories(getDefaultPlaybackSettings());
              Alert.alert('Reset Complete', 'All playback settings have been reset to defaults.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          }
        }
      ]
    );
  };

  const renderSetting = (setting: PlaybackSetting) => {
    switch (setting.type) {
      case 'switch':
        return (
          <View key={setting.id} style={[styles.settingCard, { backgroundColor: theme.card }]}>
            <View style={styles.settingHeader}>
              <View style={[styles.settingIconContainer, { backgroundColor: setting.value ? theme.primary + '20' : theme.accent }]}>
                <Ionicons 
                  name={setting.icon as any} 
                  size={20} 
                  color={setting.value ? theme.primary : theme.textMuted}
                />
              </View>
              <Switch
                value={setting.value}
                onValueChange={(value) => updateSetting(setting.id, value)}
                trackColor={{ false: theme.border, true: theme.primary + '40' }}
                thumbColor={setting.value ? theme.primary : theme.textMuted}
                disabled={saving}
              />
            </View>
            <Text style={[styles.settingTitle, { color: theme.text }]}>{setting.title}</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {setting.description}
            </Text>
          </View>
        );

      case 'slider':
        return (
          <View key={setting.id} style={[styles.settingCard, { backgroundColor: theme.card }]}>
            <View style={styles.settingHeader}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.accent }]}>
                <Ionicons 
                  name={setting.icon as any} 
                  size={20} 
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.settingValue, { color: theme.primary }]}>
                {setting.value}{setting.unit || ''}
              </Text>
            </View>
            <Text style={[styles.settingTitle, { color: theme.text }]}>{setting.title}</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {setting.description}
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>{setting.min}</Text>
              <Slider
                style={styles.slider}
                minimumValue={setting.min || 0}
                maximumValue={setting.max || 100}
                step={setting.step || 1}
                value={setting.value}
                onValueChange={(value) => updateSetting(setting.id, value)}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.border}
                thumbTintColor={theme.primary}
                disabled={saving}
              />
              <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>{setting.max}</Text>
            </View>
          </View>
        );

      case 'selection':
        return (
          <View key={setting.id} style={[styles.settingCard, { backgroundColor: theme.card }]}>
            <View style={styles.settingHeader}>
              <View style={[styles.settingIconContainer, { backgroundColor: theme.accent }]}>
                <Ionicons 
                  name={setting.icon as any} 
                  size={20} 
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.settingValue, { color: theme.primary }]}>
                {setting.options?.find(opt => opt.value === setting.value)?.label || 'Unknown'}
              </Text>
            </View>
            <Text style={[styles.settingTitle, { color: theme.text }]}>{setting.title}</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {setting.description}
            </Text>
            <View style={styles.optionsContainer}>
              {setting.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    { backgroundColor: option.value === setting.value ? theme.primary + '20' : theme.accent }
                  ]}
                  onPress={() => updateSetting(setting.id, option.value)}
                  disabled={saving}
                >
                  <Text style={[
                    styles.optionText,
                    { color: option.value === setting.value ? theme.primary : theme.text }
                  ]}>
                    {option.label}
                  </Text>
                  {option.value === setting.value && (
                    <Ionicons name="checkmark" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
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
          <Text style={styles.headerTitle}>Playback Controls</Text>
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
        <Text style={styles.headerTitle}>Playback Controls</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefaults}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {playbackCategories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <Text style={styles.sectionSubtitle}>{category.description}</Text>
            
            {category.settings.map(setting => renderSetting(setting))}
          </View>
        ))}

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
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'center',
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});