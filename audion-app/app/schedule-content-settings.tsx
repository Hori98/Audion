import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SubscriptionService from '../services/SubscriptionService';

interface ScheduleSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'custom';
  timeSlots: string[];
  sources: string[];
  genres: string[];
  maxArticles: number;
  audioLength: 'short' | 'medium' | 'long';
  
  // 🎯 Core Personalization Settings
  contentPersonalization: {
    summaryDepth: 'brief' | 'detailed' | 'comprehensive';
    insightLevel: 'none' | 'basic' | 'advanced' | 'expert';
    contextualAdaptation: boolean;
    timeBasedTone: boolean; // Morning vs Evening tone
  };
  
  // 🎨 Content Structure & Delivery
  deliveryFormat: {
    introOutro: boolean;
    betweenArticleTransitions: boolean;
    genreGrouping: boolean;
    priorityOrdering: 'chronological' | 'importance' | 'personalized';
    includeSourceAttribution: boolean;
  };
  
  notifications: {
    enabled: boolean;
    preNotification: boolean;
    completionNotification: boolean;
  };
  
  // 📊 Advanced Personalization
  personalization: {
    learningEnabled: boolean;
    genreBalance: 'auto' | 'manual';
    diversityControl: number; // 0-1 scale
    freshnessPriority: number; // 0-1 scale
  };
}

const defaultSettings: ScheduleSettings = {
  enabled: false,
  frequency: 'daily',
  timeSlots: ['08:00'],
  sources: [],
  genres: ['All'],
  maxArticles: 10,
  audioLength: 'medium',
  
  contentPersonalization: {
    summaryDepth: 'detailed',
    insightLevel: 'basic',
    contextualAdaptation: true,
    timeBasedTone: true,
  },
  
  deliveryFormat: {
    introOutro: true,
    betweenArticleTransitions: true,
    genreGrouping: true,
    priorityOrdering: 'personalized',
    includeSourceAttribution: true,
  },
  
  notifications: {
    enabled: true,
    preNotification: false,
    completionNotification: true,
  },
  
  personalization: {
    learningEnabled: true,
    genreBalance: 'auto',
    diversityControl: 0.7,
    freshnessPriority: 0.6,
  },
};

const timeSlotOptions = [
  { value: '06:00', label: '6:00 AM - Early Morning' },
  { value: '08:00', label: '8:00 AM - Morning' },
  { value: '12:00', label: '12:00 PM - Lunch Time' },
  { value: '17:00', label: '5:00 PM - Evening' },
  { value: '20:00', label: '8:00 PM - Night' },
];

const frequencyOptions = [
  { value: 'daily', label: 'Daily', description: 'Every day at selected times' },
  { value: 'weekly', label: 'Weekly', description: 'Once per week' },
  { value: 'custom', label: 'Custom', description: 'Advanced scheduling' },
];

const audioLengthOptions = [
  { value: 'short', label: 'Short (5-10 min)', description: 'Quick daily updates' },
  { value: 'medium', label: 'Medium (10-20 min)', description: 'Balanced content' },
  { value: 'long', label: 'Long (20-30 min)', description: 'Comprehensive coverage' },
];

const maxArticleOptions = [5, 10, 15, 20, 25];

const summaryDepthOptions = [
  { value: 'brief', label: 'Brief', description: 'Key points only (30s per article)', icon: 'flash-outline' },
  { value: 'detailed', label: 'Detailed', description: 'Full coverage (60s per article)', icon: 'document-text-outline' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'In-depth analysis (90s per article)', icon: 'library-outline' },
];

const insightLevelOptions = [
  { value: 'none', label: 'No Insights', description: 'News facts only' },
  { value: 'basic', label: 'Basic Insights', description: 'Simple context & implications' },
  { value: 'advanced', label: 'Advanced Insights', description: 'Historical context & analysis' },
  { value: 'expert', label: 'Expert Insights', description: 'Deep analysis & predictions' },
];

const priorityOrderingOptions = [
  { value: 'chronological', label: 'Chronological', description: 'Newest articles first' },
  { value: 'importance', label: 'Importance', description: 'Breaking news priority' },
  { value: 'personalized', label: 'Personalized', description: 'Your interests first' },
];

export default function ScheduleContentSettings() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [maxAllowedArticles, setMaxAllowedArticles] = useState(3); // プラン別の動的上限

  useEffect(() => {
    loadSettings();
    loadMaxArticlesLimit();
  }, [token]);

  const loadMaxArticlesLimit = async () => {
    if (!token) return;
    try {
      const limit = await SubscriptionService.getInstance().getMaxArticlesLimit(token);
      console.log('🎯 Schedule Settings: Max articles limit loaded:', limit);
      setMaxAllowedArticles(limit);
    } catch (error) {
      console.error('Failed to load max articles limit:', error);
      setMaxAllowedArticles(3); // フォールバック
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('schedule_delivery_settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    }
  };

  const saveSettings = async (newSettings: ScheduleSettings) => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('schedule_delivery_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // TODO: Send to backend to setup actual scheduling
      // await setupBackendSchedule(newSettings);
      
      Alert.alert('Success', 'Schedule settings saved successfully!');
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof ScheduleSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  const updateNestedSetting = (parentKey: keyof ScheduleSettings, childKey: string, value: any) => {
    const newSettings = {
      ...settings,
      [parentKey]: {
        ...(settings[parentKey] as any),
        [childKey]: value,
      },
    };
    setSettings(newSettings);
  };

  const toggleTimeSlot = (timeSlot: string) => {
    const currentSlots = settings.timeSlots;
    const newSlots = currentSlots.includes(timeSlot)
      ? currentSlots.filter(slot => slot !== timeSlot)
      : [...currentSlots, timeSlot];
    
    updateSetting('timeSlots', newSlots);
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>
        Schedule Delivery
      </Text>
      <TouchableOpacity
        onPress={() => saveSettings(settings)}
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Save schedule settings"
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );

  const renderToggleSection = (
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    icon: string
  ) => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name={icon as any} size={24} color={theme.primary} style={styles.sectionIcon} />
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>{description}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.textMuted, true: theme.primary }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderContentPersonalizationSection = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="bulb-outline" size={24} color={theme.primary} style={styles.sectionIcon} />
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Content Personalization</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Customize content analysis and depth for scheduled delivery
            </Text>
          </View>
        </View>
      </View>

      {/* Prompt Settings Link */}
      <View style={styles.optionGroup}>
        <TouchableOpacity
          onPress={() => router.push('/prompt-settings')}
          style={[styles.promptSettingsLink, { backgroundColor: theme.accent, borderColor: theme.primary }]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
          <Text style={[styles.promptSettingsText, { color: theme.primary }]}>
            Configure Prompt Settings for Schedule Delivery
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Depth */}
      <View style={styles.optionGroup}>
        <Text style={[styles.optionGroupTitle, { color: theme.text }]}>Summary Depth</Text>
        {summaryDepthOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              {
                backgroundColor: settings.contentPersonalization.summaryDepth === option.value ? theme.accent : theme.surface,
                borderColor: settings.contentPersonalization.summaryDepth === option.value ? theme.primary : theme.border,
              },
            ]}
            onPress={() => updateNestedSetting('contentPersonalization', 'summaryDepth', option.value)}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Ionicons name={option.icon as any} size={20} color={theme.primary} />
                <Text style={[styles.optionTitle, { color: theme.text }]}>{option.label}</Text>
              </View>
              <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>{option.description}</Text>
            </View>
            {settings.contentPersonalization.summaryDepth === option.value && (
              <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Insight Level */}
      <View style={styles.optionGroup}>
        <Text style={[styles.optionGroupTitle, { color: theme.text }]}>Insight Level</Text>
        {insightLevelOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              {
                backgroundColor: settings.contentPersonalization.insightLevel === option.value ? theme.accent : theme.surface,
                borderColor: settings.contentPersonalization.insightLevel === option.value ? theme.primary : theme.border,
              },
            ]}
            onPress={() => updateNestedSetting('contentPersonalization', 'insightLevel', option.value)}
          >
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>{option.label}</Text>
              <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>{option.description}</Text>
            </View>
            {settings.contentPersonalization.insightLevel === option.value && (
              <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Advanced Options */}
      <View style={styles.optionGroup}>
        <Text style={[styles.optionGroupTitle, { color: theme.text }]}>Advanced Options</Text>
        <View style={styles.subOption}>
          <Text style={[styles.subOptionText, { color: theme.text }]}>Contextual adaptation</Text>
          <Switch
            value={settings.contentPersonalization.contextualAdaptation}
            onValueChange={(value) => updateNestedSetting('contentPersonalization', 'contextualAdaptation', value)}
            trackColor={{ false: theme.textMuted, true: theme.primary }}
            thumbColor={settings.contentPersonalization.contextualAdaptation ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.subOption}>
          <Text style={[styles.subOptionText, { color: theme.text }]}>Time-based tone adjustment</Text>
          <Switch
            value={settings.contentPersonalization.timeBasedTone}
            onValueChange={(value) => updateNestedSetting('contentPersonalization', 'timeBasedTone', value)}
            trackColor={{ false: theme.textMuted, true: theme.primary }}
            thumbColor={settings.contentPersonalization.timeBasedTone ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  const renderDeliveryFormatSection = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="construct-outline" size={24} color={theme.primary} style={styles.sectionIcon} />
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Format</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Structure and organize your audio content delivery
            </Text>
          </View>
        </View>
      </View>

      {/* Priority Ordering */}
      <View style={styles.optionGroup}>
        <Text style={[styles.optionGroupTitle, { color: theme.text }]}>Article Priority</Text>
        {priorityOrderingOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              {
                backgroundColor: settings.deliveryFormat.priorityOrdering === option.value ? theme.accent : theme.surface,
                borderColor: settings.deliveryFormat.priorityOrdering === option.value ? theme.primary : theme.border,
              },
            ]}
            onPress={() => updateNestedSetting('deliveryFormat', 'priorityOrdering', option.value)}
          >
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>{option.label}</Text>
              <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>{option.description}</Text>
            </View>
            {settings.deliveryFormat.priorityOrdering === option.value && (
              <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Format Options */}
      <View style={styles.optionGroup}>
        <Text style={[styles.optionGroupTitle, { color: theme.text }]}>Format Options</Text>
        <View style={styles.subOption}>
          <Text style={[styles.subOptionText, { color: theme.text }]}>Include intro/outro</Text>
          <Switch
            value={settings.deliveryFormat.introOutro}
            onValueChange={(value) => updateNestedSetting('deliveryFormat', 'introOutro', value)}
            trackColor={{ false: theme.textMuted, true: theme.primary }}
            thumbColor={settings.deliveryFormat.introOutro ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.subOption}>
          <Text style={[styles.subOptionText, { color: theme.text }]}>Article transitions</Text>
          <Switch
            value={settings.deliveryFormat.betweenArticleTransitions}
            onValueChange={(value) => updateNestedSetting('deliveryFormat', 'betweenArticleTransitions', value)}
            trackColor={{ false: theme.textMuted, true: theme.primary }}
            thumbColor={settings.deliveryFormat.betweenArticleTransitions ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.subOption}>
          <Text style={[styles.subOptionText, { color: theme.text }]}>Group by genre</Text>
          <Switch
            value={settings.deliveryFormat.genreGrouping}
            onValueChange={(value) => updateNestedSetting('deliveryFormat', 'genreGrouping', value)}
            trackColor={{ false: theme.textMuted, true: theme.primary }}
            thumbColor={settings.deliveryFormat.genreGrouping ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.subOption}>
          <Text style={[styles.subOptionText, { color: theme.text }]}>Source attribution</Text>
          <Switch
            value={settings.deliveryFormat.includeSourceAttribution}
            onValueChange={(value) => updateNestedSetting('deliveryFormat', 'includeSourceAttribution', value)}
            trackColor={{ false: theme.textMuted, true: theme.primary }}
            thumbColor={settings.deliveryFormat.includeSourceAttribution ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  // Other render functions (frequency, timeSlot, audioLength, maxArticles) remain the same...
  const renderFrequencySection = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Frequency</Text>
      {frequencyOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionButton,
            {
              backgroundColor: settings.frequency === option.value ? theme.accent : theme.surface,
              borderColor: settings.frequency === option.value ? theme.primary : theme.border,
            },
          ]}
          onPress={() => updateSetting('frequency', option.value)}
        >
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>{option.label}</Text>
            <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>{option.description}</Text>
          </View>
          {settings.frequency === option.value && (
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTimeSlotSection = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Times</Text>
      <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
        Select when you want to receive your scheduled audio content
      </Text>
      {timeSlotOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.timeSlotButton,
            {
              backgroundColor: settings.timeSlots.includes(option.value) ? theme.accent : theme.surface,
              borderColor: settings.timeSlots.includes(option.value) ? theme.primary : theme.border,
            },
          ]}
          onPress={() => toggleTimeSlot(option.value)}
        >
          <Text style={[styles.timeSlotText, { color: theme.text }]}>{option.label}</Text>
          {settings.timeSlots.includes(option.value) && (
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAudioLengthSection = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Audio Length</Text>
      {audioLengthOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionButton,
            {
              backgroundColor: settings.audioLength === option.value ? theme.accent : theme.surface,
              borderColor: settings.audioLength === option.value ? theme.primary : theme.border,
            },
          ]}
          onPress={() => updateSetting('audioLength', option.value)}
        >
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>{option.label}</Text>
            <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>{option.description}</Text>
          </View>
          {settings.audioLength === option.value && (
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMaxArticlesSection = () => {
    // プラン別の動的な選択肢を生成
    const dynamicMaxArticleOptions = [];
    for (let i = 1; i <= maxAllowedArticles; i++) {
      if ([1, 3, 5, 10, 15, 20].includes(i) || i === maxAllowedArticles) {
        dynamicMaxArticleOptions.push(i);
      }
    }
    
    return (
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Maximum Articles</Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Limit the number of articles in each scheduled delivery (Your plan allows up to {maxAllowedArticles} articles)
        </Text>
        <View style={styles.maxArticlesContainer}>
          {dynamicMaxArticleOptions.map((count) => (
          <TouchableOpacity
            key={count}
            style={[
              styles.maxArticleButton,
              {
                backgroundColor: settings.maxArticles === count ? theme.primary : theme.surface,
                borderColor: settings.maxArticles === count ? theme.primary : theme.border,
              },
            ]}
            onPress={() => updateSetting('maxArticles', count)}
          >
            <Text
              style={[
                styles.maxArticleText,
                { color: settings.maxArticles === count ? '#fff' : theme.text },
              ]}
            >
              {count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderToggleSection(
          'Enable Schedule Delivery',
          'Automatically create audio content at scheduled times',
          settings.enabled,
          (value) => updateSetting('enabled', value),
          'calendar'
        )}

        {settings.enabled && (
          <>
            {renderFrequencySection()}
            {renderTimeSlotSection()}
            {renderAudioLengthSection()}
            {renderMaxArticlesSection()}

            {renderToggleSection(
              'Smart Notifications',
              'Get notified when your scheduled audio is ready',
              settings.notifications.enabled,
              (value) => updateNestedSetting('notifications', 'enabled', value),
              'notifications'
            )}

            {settings.notifications.enabled && (
              <View style={[styles.subSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.subOption}>
                  <Text style={[styles.subOptionText, { color: theme.text }]}>Pre-delivery notification</Text>
                  <Switch
                    value={settings.notifications.preNotification}
                    onValueChange={(value) => updateNestedSetting('notifications', 'preNotification', value)}
                    trackColor={{ false: theme.textMuted, true: theme.primary }}
                    thumbColor={settings.notifications.preNotification ? '#fff' : '#f4f3f4'}
                  />
                </View>
                <View style={styles.subOption}>
                  <Text style={[styles.subOptionText, { color: theme.text }]}>Completion notification</Text>
                  <Switch
                    value={settings.notifications.completionNotification}
                    onValueChange={(value) => updateNestedSetting('notifications', 'completionNotification', value)}
                    trackColor={{ false: theme.textMuted, true: theme.primary }}
                    thumbColor={settings.notifications.completionNotification ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>
            )}

            {renderContentPersonalizationSection()}
            {renderDeliveryFormatSection()}
            
            {renderToggleSection(
              'AI Personalization',
              'Learn from your preferences to improve content selection',
              settings.personalization.learningEnabled,
              (value) => updateNestedSetting('personalization', 'learningEnabled', value),
              'bulb'
            )}

            {settings.personalization.learningEnabled && (
              <View style={[styles.subSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.subOption}>
                  <Text style={[styles.subOptionText, { color: theme.text }]}>Genre balance</Text>
                  <TouchableOpacity
                    style={[styles.optionButton, { 
                      backgroundColor: settings.personalization.genreBalance === 'auto' ? theme.accent : theme.surface,
                      borderColor: settings.personalization.genreBalance === 'auto' ? theme.primary : theme.border,
                    }]}
                    onPress={() => updateNestedSetting('personalization', 'genreBalance', 
                      settings.personalization.genreBalance === 'auto' ? 'manual' : 'auto')}
                  >
                    <Text style={[styles.optionTitle, { color: theme.text }]}>
                      {settings.personalization.genreBalance === 'auto' ? 'Auto Balance' : 'Manual Control'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  subSection: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginTop: -8,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
  timeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  maxArticlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  maxArticleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  maxArticleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  subOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 32,
  },
  optionGroup: {
    marginTop: 16,
  },
  optionGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  promptSettingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  promptSettingsText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});