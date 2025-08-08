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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

interface DataCollectionSettings {
  // Analytics
  usage_analytics: boolean;
  performance_analytics: boolean;
  feature_usage_tracking: boolean;
  
  // Crash Reporting
  crash_reports: boolean;
  detailed_crash_logs: boolean;
  
  // Data Sharing
  improve_recommendations: boolean;
  share_anonymized_data: boolean;
  marketing_analytics: boolean;
  
  // Privacy Controls
  location_data: boolean;
  device_info_collection: boolean;
  personalization_data: boolean;
}

const DEFAULT_SETTINGS: DataCollectionSettings = {
  usage_analytics: true,
  performance_analytics: true,
  feature_usage_tracking: true,
  crash_reports: true,
  detailed_crash_logs: false,
  improve_recommendations: true,
  share_anonymized_data: false,
  marketing_analytics: false,
  location_data: false,
  device_info_collection: true,
  personalization_data: true,
};

interface SettingItem {
  key: keyof DataCollectionSettings;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  category: 'essential' | 'optional' | 'marketing';
  description?: string;
}

const SETTING_ITEMS: SettingItem[] = [
  {
    key: 'usage_analytics',
    title: 'Usage Analytics',
    subtitle: 'Help improve the app by sharing how you use features',
    icon: 'analytics-outline',
    color: '#3B82F6',
    category: 'optional',
    description: 'We collect basic usage data like which features you use most, helping us improve the app experience.'
  },
  {
    key: 'performance_analytics',
    title: 'Performance Analytics',
    subtitle: 'Share app performance data to help optimize speed',
    icon: 'speedometer-outline',
    color: '#10B981',
    category: 'optional',
    description: 'Performance data helps us identify and fix slowdowns, crashes, and other technical issues.'
  },
  {
    key: 'feature_usage_tracking',
    title: 'Feature Usage Tracking',
    subtitle: 'Track which features are used to prioritize improvements',
    icon: 'finger-print-outline',
    color: '#F59E0B',
    category: 'optional',
    description: 'Anonymous tracking of feature usage helps us understand what\'s working well and what needs improvement.'
  },
  {
    key: 'crash_reports',
    title: 'Crash Reports',
    subtitle: 'Automatically send crash reports to help fix issues',
    icon: 'bug-outline',
    color: '#EF4444',
    category: 'essential',
    description: 'When the app crashes, we automatically send a report to help us fix the problem quickly.'
  },
  {
    key: 'detailed_crash_logs',
    title: 'Detailed Crash Logs',
    subtitle: 'Include more technical details in crash reports',
    icon: 'list-outline',
    color: '#8B5CF6',
    category: 'optional',
    description: 'More detailed crash information helps developers fix complex issues faster.'
  },
  {
    key: 'improve_recommendations',
    title: 'Improve Recommendations',
    subtitle: 'Use your listening data to improve AI recommendations',
    icon: 'bulb-outline',
    color: '#06B6D4',
    category: 'optional',
    description: 'Your listening patterns help train our AI to give you better content recommendations.'
  },
  {
    key: 'share_anonymized_data',
    title: 'Share Anonymized Data',
    subtitle: 'Contribute to research and industry insights',
    icon: 'share-outline',
    color: '#84CC16',
    category: 'optional',
    description: 'Completely anonymous usage patterns may be shared with researchers and industry partners.'
  },
  {
    key: 'marketing_analytics',
    title: 'Marketing Analytics',
    subtitle: 'Help us understand how you discovered and use our app',
    icon: 'megaphone-outline',
    color: '#F97316',
    category: 'marketing',
    description: 'Marketing data helps us improve our outreach and understand user acquisition channels.'
  },
  {
    key: 'location_data',
    title: 'Location Data',
    subtitle: 'Use location for personalized content and features',
    icon: 'location-outline',
    color: '#EC4899',
    category: 'optional',
    description: 'Location data can be used for location-based content recommendations and regional features.'
  },
  {
    key: 'device_info_collection',
    title: 'Device Information',
    subtitle: 'Collect basic device info for compatibility',
    icon: 'phone-portrait-outline',
    color: '#6B7280',
    category: 'essential',
    description: 'Basic device information helps ensure the app works properly on your device.'
  },
  {
    key: 'personalization_data',
    title: 'Personalization Data',
    subtitle: 'Use your data to personalize your experience',
    icon: 'person-outline',
    color: '#14B8A6',
    category: 'optional',
    description: 'Your preferences and usage patterns are used to customize the app experience for you.'
  },
];

export default function DataCollectionSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DataCollectionSettings>(DEFAULT_SETTINGS);

  const styles = createStyles(theme);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('🔍 Loading data collection settings...');
      
      // Try to load from AsyncStorage first (local settings)
      const localSettings = await AsyncStorage.getItem('dataCollectionSettings');
      let dataSettings = DEFAULT_SETTINGS;
      
      if (localSettings) {
        dataSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) };
      }
      
      // Also try to get from backend if available
      try {
        const response = await axios.get(`${API}/user/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.data.data_collection_settings) {
          dataSettings = { ...dataSettings, ...response.data.data_collection_settings };
        }
      } catch (error) {
        console.log('Backend settings not available, using local settings');
      }
      
      setSettings(dataSettings);
      
    } catch (error: any) {
      console.error('❌ Error loading data collection settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof DataCollectionSettings, value: boolean) => {
    setSaving(true);
    try {
      const updatedSettings = { ...settings, [key]: value };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('dataCollectionSettings', JSON.stringify(updatedSettings));
      
      // Try to save to backend as well
      try {
        await axios.put(`${API}/user/settings`, {
          data_collection_settings: updatedSettings,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.log('Backend update failed, saved locally');
      }
      
      setSettings(updatedSettings);
      
      // Show confirmation for important privacy changes
      if (['location_data', 'share_anonymized_data', 'marketing_analytics'].includes(key)) {
        const action = value ? 'enabled' : 'disabled';
        const item = SETTING_ITEMS.find(item => item.key === key);
        Alert.alert(
          'Setting Updated',
          `${item?.title} has been ${action}.`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error: any) {
      console.error('Error updating data collection setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Privacy Settings',
      'This will reset all data collection settings to their default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await AsyncStorage.setItem('dataCollectionSettings', JSON.stringify(DEFAULT_SETTINGS));
              setSettings(DEFAULT_SETTINGS);
              Alert.alert('Reset Complete', 'All privacy settings have been reset to defaults.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Would you like to view our privacy policy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Policy',
          onPress: () => {
            // In a real app, this would open the actual privacy policy
            Linking.openURL('https://example.com/privacy-policy');
          }
        }
      ]
    );
  };

  const viewDataExport = () => {
    Alert.alert(
      'Data Export',
      'Request a copy of all data we have collected about you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: () => {
            Alert.alert(
              'Export Requested',
              'Your data export request has been submitted. You will receive an email with your data within 30 days.'
            );
          }
        }
      ]
    );
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'essential': return 'Essential';
      case 'optional': return 'Optional';
      case 'marketing': return 'Marketing';
      default: return 'Other';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essential': return '#10B981';
      case 'optional': return '#3B82F6';
      case 'marketing': return '#F59E0B';
      default: return theme.textMuted;
    }
  };

  const groupedSettings = SETTING_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SettingItem[]>);

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
          <Text style={styles.headerTitle}>Data Collection</Text>
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
        <Text style={styles.headerTitle}>Data Collection</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefaults}
          disabled={saving}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Privacy Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Privacy Matters</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewIcon}>
              <Ionicons name="shield-checkmark" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.overviewText, { color: theme.textSecondary }]}>
              We believe in transparency about data collection. You have full control over what data is shared and how it's used to improve your experience.
            </Text>
            <View style={styles.overviewActions}>
              <TouchableOpacity
                style={[styles.policyButton, { backgroundColor: theme.accent }]}
                onPress={openPrivacyPolicy}
              >
                <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                <Text style={[styles.policyButtonText, { color: theme.primary }]}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportButton, { backgroundColor: theme.accent }]}
                onPress={viewDataExport}
              >
                <Ionicons name="download-outline" size={16} color={theme.primary} />
                <Text style={[styles.exportButtonText, { color: theme.primary }]}>Export My Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Settings by Category */}
        {Object.entries(groupedSettings).map(([category, items]) => (
          <View key={category} style={styles.section}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>
                {getCategoryName(category)}
              </Text>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(category) + '20' }]}>
                <Text style={[styles.categoryBadgeText, { color: getCategoryColor(category) }]}>
                  {items.length} {items.length === 1 ? 'setting' : 'settings'}
                </Text>
              </View>
            </View>
            
            <View style={styles.settingCard}>
              {items.map((item, index) => (
                <View key={item.key} style={[styles.settingItem, index === items.length - 1 && styles.settingItemLast]}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View style={styles.settingContent}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                      {item.description && (
                        <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Switch
                    value={settings[item.key]}
                    onValueChange={(value) => updateSetting(item.key, value)}
                    disabled={saving}
                    trackColor={{ false: theme.border, true: item.color + '40' }}
                    thumbColor={settings[item.key] ? item.color : theme.surface}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Data Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: getCategoryColor('essential') }]}>
                  {Object.values(settings).filter((value, index) => 
                    value && SETTING_ITEMS[index]?.category === 'essential'
                  ).length}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Essential</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: getCategoryColor('optional') }]}>
                  {Object.values(settings).filter((value, index) => 
                    value && SETTING_ITEMS[index]?.category === 'optional'
                  ).length}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Optional</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: getCategoryColor('marketing') }]}>
                  {Object.values(settings).filter((value, index) => 
                    value && SETTING_ITEMS[index]?.category === 'marketing'
                  ).length}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Marketing</Text>
              </View>
            </View>
            <Text style={[styles.summaryText, { color: theme.textMuted }]}>
              You have {Object.values(settings).filter(v => v).length} of {Object.keys(settings).length} data collection features enabled.
            </Text>
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
    marginBottom: 16,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  overviewIcon: {
    marginBottom: 12,
  },
  overviewText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  overviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  policyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  policyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Category Header
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Setting Cards
  settingCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
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
    marginBottom: 6,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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