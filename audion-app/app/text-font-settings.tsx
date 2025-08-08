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

interface FontSetting {
  id: string;
  title: string;
  description: string;
  type: 'slider' | 'selection' | 'switch';
  value: any;
  icon: string;
  options?: Array<{label: string, value: any, preview?: string}>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

interface FontCategory {
  title: string;
  description: string;
  settings: FontSetting[];
}

const STORAGE_KEY = 'text_font_settings';

export default function TextFontSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fontCategories, setFontCategories] = useState<FontCategory[]>([]);

  const styles = createStyles(theme);

  useEffect(() => {
    loadFontSettings();
  }, []);

  const getDefaultFontSettings = (savedSettings: any = {}): FontCategory[] => [
    {
      title: 'Reading Experience',
      description: 'Customize text appearance for better readability',
      settings: [
        {
          id: 'font_family',
          title: 'Font Family',
          description: 'Choose your preferred reading font',
          type: 'selection',
          value: savedSettings.font_family || 'system',
          icon: 'text-outline',
          options: [
            { label: 'System Default', value: 'system', preview: 'System Font' },
            { label: 'Georgia (Serif)', value: 'georgia', preview: 'Georgia Font' },
            { label: 'Helvetica (Sans-serif)', value: 'helvetica', preview: 'Helvetica Font' },
            { label: 'Courier (Monospace)', value: 'courier', preview: 'Courier Font' },
            { label: 'Times New Roman', value: 'times', preview: 'Times New Roman' },
            { label: 'Arial', value: 'arial', preview: 'Arial Font' }
          ]
        },
        {
          id: 'font_size',
          title: 'Font Size',
          description: 'Adjust text size for comfortable reading',
          type: 'slider',
          value: savedSettings.font_size || 16,
          icon: 'text-outline',
          min: 12,
          max: 28,
          step: 1,
          unit: 'px'
        },
        {
          id: 'line_height',
          title: 'Line Spacing',
          description: 'Space between lines for better readability',
          type: 'slider',
          value: savedSettings.line_height || 1.5,
          icon: 'reorder-four-outline',
          min: 1.0,
          max: 2.5,
          step: 0.1,
          unit: 'x'
        },
        {
          id: 'paragraph_spacing',
          title: 'Paragraph Spacing',
          description: 'Space between paragraphs',
          type: 'slider',
          value: savedSettings.paragraph_spacing || 1.0,
          icon: 'return-down-forward-outline',
          min: 0.5,
          max: 3.0,
          step: 0.1,
          unit: 'x'
        }
      ]
    },
    {
      title: 'Text Layout & Alignment',
      description: 'Control text alignment and layout preferences',
      settings: [
        {
          id: 'text_align',
          title: 'Text Alignment',
          description: 'How text should be aligned on the screen',
          type: 'selection',
          value: savedSettings.text_align || 'left',
          icon: 'align-left-outline',
          options: [
            { label: 'Left Aligned', value: 'left' },
            { label: 'Center Aligned', value: 'center' },
            { label: 'Right Aligned', value: 'right' },
            { label: 'Justified', value: 'justify' }
          ]
        },
        {
          id: 'margin_size',
          title: 'Reading Margins',
          description: 'Side margins for comfortable reading width',
          type: 'slider',
          value: savedSettings.margin_size || 20,
          icon: 'square-outline',
          min: 10,
          max: 50,
          step: 5,
          unit: 'px'
        },
        {
          id: 'max_width',
          title: 'Max Reading Width',
          description: 'Maximum width of text columns (% of screen)',
          type: 'slider',
          value: savedSettings.max_width || 100,
          icon: 'resize-outline',
          min: 60,
          max: 100,
          step: 5,
          unit: '%'
        }
      ]
    },
    {
      title: 'Typography & Styling',
      description: 'Advanced typography and visual enhancements',
      settings: [
        {
          id: 'font_weight',
          title: 'Font Weight',
          description: 'Thickness of the font characters',
          type: 'selection',
          value: savedSettings.font_weight || 'normal',
          icon: 'contrast-outline',
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Normal', value: 'normal' },
            { label: 'Medium', value: 'medium' },
            { label: 'Semi-bold', value: 'semibold' },
            { label: 'Bold', value: 'bold' }
          ]
        },
        {
          id: 'text_contrast',
          title: 'Text Contrast',
          description: 'Enhance contrast between text and background',
          type: 'selection',
          value: savedSettings.text_contrast || 'normal',
          icon: 'contrast-outline',
          options: [
            { label: 'Low Contrast', value: 'low' },
            { label: 'Normal Contrast', value: 'normal' },
            { label: 'High Contrast', value: 'high' },
            { label: 'Maximum Contrast', value: 'maximum' }
          ]
        },
        {
          id: 'letter_spacing',
          title: 'Letter Spacing',
          description: 'Space between individual letters',
          type: 'slider',
          value: savedSettings.letter_spacing || 0,
          icon: 'text-outline',
          min: -0.5,
          max: 3.0,
          step: 0.1,
          unit: 'px'
        }
      ]
    },
    {
      title: 'Reading Accessibility',
      description: 'Features to improve reading accessibility',
      settings: [
        {
          id: 'dyslexia_friendly',
          title: 'Dyslexia-Friendly Mode',
          description: 'Use fonts and spacing optimized for dyslexic readers',
          type: 'switch',
          value: savedSettings.dyslexia_friendly || false,
          icon: 'accessibility-outline'
        },
        {
          id: 'highlight_focus',
          title: 'Highlight Current Paragraph',
          description: 'Highlight the paragraph being read',
          type: 'switch',
          value: savedSettings.highlight_focus || false,
          icon: 'bulb-outline'
        },
        {
          id: 'reading_guide',
          title: 'Reading Guide Line',
          description: 'Show a guide line to help track reading progress',
          type: 'switch',
          value: savedSettings.reading_guide || false,
          icon: 'remove-outline'
        },
        {
          id: 'word_spacing',
          title: 'Word Spacing',
          description: 'Increase space between words for clarity',
          type: 'slider',
          value: savedSettings.word_spacing || 1.0,
          icon: 'text-outline',
          min: 0.8,
          max: 2.0,
          step: 0.1,
          unit: 'x'
        }
      ]
    },
    {
      title: 'Display & Theme Integration',
      description: 'How text integrates with your display settings',
      settings: [
        {
          id: 'respect_system_font',
          title: 'Use System Font Size',
          description: 'Respect device accessibility font size settings',
          type: 'switch',
          value: savedSettings.respect_system_font !== false,
          icon: 'phone-portrait-outline'
        },
        {
          id: 'auto_dark_text',
          title: 'Auto Dark Mode Text',
          description: 'Automatically adjust text for dark themes',
          type: 'switch',
          value: savedSettings.auto_dark_text !== false,
          icon: 'moon-outline'
        },
        {
          id: 'text_shadow',
          title: 'Text Shadow',
          description: 'Add subtle shadow for better text visibility',
          type: 'switch',
          value: savedSettings.text_shadow || false,
          icon: 'layers-outline'
        },
        {
          id: 'reading_mode_tint',
          title: 'Reading Mode Tint',
          description: 'Apply warm tint to reduce eye strain',
          type: 'selection',
          value: savedSettings.reading_mode_tint || 'none',
          icon: 'sunny-outline',
          options: [
            { label: 'No Tint', value: 'none' },
            { label: 'Slight Warm', value: 'warm_light' },
            { label: 'Warm', value: 'warm' },
            { label: 'Sepia', value: 'sepia' },
            { label: 'Blue Light Filter', value: 'blue_filter' }
          ]
        }
      ]
    }
  ];

  const loadFontSettings = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const savedSettings = saved ? JSON.parse(saved) : {};
      setFontCategories(getDefaultFontSettings(savedSettings));
    } catch (error) {
      console.error('Error loading font settings:', error);
      setFontCategories(getDefaultFontSettings());
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingId: string, value: any) => {
    setSaving(true);
    try {
      // Update local state
      setFontCategories(prev => 
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
      Alert.alert('Error', 'Failed to save font setting');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all text and font settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setFontCategories(getDefaultFontSettings());
              Alert.alert('Reset Complete', 'All text and font settings have been reset to defaults.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          }
        }
      ]
    );
  };

  const renderSetting = (setting: FontSetting) => {
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
                {typeof setting.value === 'number' ? setting.value.toFixed(setting.step && setting.step < 1 ? 1 : 0) : setting.value}{setting.unit || ''}
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
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionText,
                      { color: option.value === setting.value ? theme.primary : theme.text }
                    ]}>
                      {option.label}
                    </Text>
                    {option.preview && (
                      <Text style={[
                        styles.optionPreview,
                        { color: option.value === setting.value ? theme.primary : theme.textSecondary }
                      ]}>
                        {option.preview}
                      </Text>
                    )}
                  </View>
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
          <Text style={styles.headerTitle}>Text & Font Settings</Text>
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
        <Text style={styles.headerTitle}>Text & Font Settings</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefaults}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {fontCategories.map((category, categoryIndex) => (
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
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionPreview: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
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