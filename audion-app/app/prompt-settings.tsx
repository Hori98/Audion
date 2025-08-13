import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface PromptSettings {
  manual: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
    enabled: boolean;
  };
  autoPick: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
    enabled: boolean;
  };
  schedule: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
    enabled: boolean;
  };
}

const defaultPromptSettings: PromptSettings = {
  manual: {
    style: 'standard',
    customPrompt: '',
    enabled: true,
  },
  autoPick: {
    style: 'standard',
    customPrompt: '',
    enabled: true,
  },
  schedule: {
    style: 'standard',
    customPrompt: '',
    enabled: true,
  },
};

const promptStyleOptions = [
  { 
    value: 'standard', 
    label: 'Standard', 
    description: 'Balanced, professional reporting style',
    icon: 'checkmark-circle-outline',
    example: 'Clear and neutral tone with structured delivery'
  },
  { 
    value: 'strict', 
    label: 'Strict', 
    description: 'Fact-focused, concise delivery',
    icon: 'shield-checkmark-outline',
    example: 'Direct facts with minimal interpretation'
  },
  { 
    value: 'gentle', 
    label: 'Gentle', 
    description: 'Conversational, accessible tone',
    icon: 'happy-outline',
    example: 'Friendly and approachable delivery style'
  },
  { 
    value: 'insightful', 
    label: 'Insightful', 
    description: 'Deep analysis with context and implications',
    icon: 'bulb-outline',
    example: 'Analytical with background context and implications'
  },
  { 
    value: 'custom', 
    label: 'Custom', 
    description: 'Your personalized prompt style',
    icon: 'create-outline',
    example: 'Define your own unique delivery style'
  },
];

const creationModes = [
  {
    key: 'manual',
    title: 'Manual Selection',
    description: 'When you manually select articles in Feed',
    icon: 'hand-left-outline',
    color: '#007AFF',
  },
  {
    key: 'autoPick',
    title: 'Auto-Pick',
    description: 'Algorithm-based automatic article selection',
    icon: 'flash-outline',
    color: '#34C759',
  },
  {
    key: 'schedule',
    title: 'Schedule Delivery',
    description: 'Time-based automatic content generation',
    icon: 'time-outline',
    color: '#FF9500',
  },
];

export default function PromptSettingsScreen() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<PromptSettings>(defaultPromptSettings);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<keyof PromptSettings>('manual');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('unified_prompt_settings');
      if (savedSettings) {
        setSettings({ ...defaultPromptSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading prompt settings:', error);
    }
  };

  const saveSettings = async (newSettings: PromptSettings) => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('unified_prompt_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Also save to individual keys for backward compatibility
      await AsyncStorage.setItem('unified_prompt_style', newSettings.manual.style);
      await AsyncStorage.setItem('unified_custom_prompt', newSettings.manual.customPrompt);
      
      Alert.alert('Success', 'Prompt settings saved successfully!');
    } catch (error) {
      console.error('Error saving prompt settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateModeSettings = (mode: keyof PromptSettings, field: string, value: any) => {
    const newSettings = {
      ...settings,
      [mode]: {
        ...settings[mode],
        [field]: value,
      },
    };
    setSettings(newSettings);
  };

  const copySettingsToAllModes = (sourceMode: keyof PromptSettings) => {
    Alert.alert(
      'Copy Settings',
      `Apply ${sourceMode} settings to all creation modes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply to All',
          onPress: () => {
            const sourceSettings = settings[sourceMode];
            const newSettings = {
              manual: { ...sourceSettings },
              autoPick: { ...sourceSettings },
              schedule: { ...sourceSettings },
            };
            setSettings(newSettings);
          }
        }
      ]
    );
  };

  // Helper function to get custom prompt preview text
  const getCustomPromptPreview = (customPrompt: string) => {
    if (!customPrompt.trim()) {
      return 'Define your own unique delivery style';
    }
    
    // Truncate long prompts with ellipsis
    const maxLength = 60;
    if (customPrompt.length <= maxLength) {
      return customPrompt;
    }
    
    return customPrompt.substring(0, maxLength).trim() + '...';
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
        Prompt Settings
      </Text>
      <TouchableOpacity
        onPress={() => saveSettings(settings)}
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Save prompt settings"
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModeSelector = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Creation Modes</Text>
      <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
        Configure prompts for each audio creation method
      </Text>
      
      <View style={styles.modeGrid}>
        {creationModes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeCard,
              {
                backgroundColor: activeMode === mode.key ? theme.accent : theme.surface,
                borderColor: activeMode === mode.key ? mode.color : theme.border,
              }
            ]}
            onPress={() => setActiveMode(mode.key as keyof PromptSettings)}
          >
            <View style={[styles.modeIcon, { backgroundColor: `${mode.color}20` }]}>
              <Ionicons name={mode.icon as any} size={24} color={mode.color} />
            </View>
            <Text style={[styles.modeTitle, { color: theme.text }]}>{mode.title}</Text>
            <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
              {mode.description}
            </Text>
            {activeMode === mode.key && (
              <View style={[styles.activeBadge, { backgroundColor: mode.color }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPromptStyleSection = () => {
    const currentMode = settings[activeMode];
    const modeInfo = creationModes.find(m => m.key === activeMode);

    return (
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name={modeInfo?.icon as any} size={24} color={modeInfo?.color} style={styles.sectionIcon} />
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{modeInfo?.title} Settings</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Configure prompt style for {modeInfo?.title.toLowerCase()}
              </Text>
            </View>
          </View>
          <View style={styles.sectionActions}>
            <TouchableOpacity
              onPress={() => copySettingsToAllModes(activeMode)}
              style={[styles.copyButton, { borderColor: theme.border }]}
            >
              <Ionicons name="copy-outline" size={16} color={theme.primary} />
              <Text style={[styles.copyButtonText, { color: theme.primary }]}>Copy to All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enable/Disable Toggle */}
        <View style={styles.enableToggle}>
          <Text style={[styles.enableToggleText, { color: theme.text }]}>
            Enable custom prompts for {modeInfo?.title.toLowerCase()}
          </Text>
          <Switch
            value={currentMode.enabled}
            onValueChange={(value) => updateModeSettings(activeMode, 'enabled', value)}
            trackColor={{ false: theme.textMuted, true: theme.primary }}
            thumbColor={currentMode.enabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        {currentMode.enabled && (
          <>
            {/* Prompt Style Options */}
            <View style={styles.promptStyleGrid}>
              {promptStyleOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.styleOption,
                    {
                      backgroundColor: currentMode.style === option.value ? theme.accent : theme.surface,
                      borderColor: currentMode.style === option.value ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => updateModeSettings(activeMode, 'style', option.value)}
                >
                  <View style={styles.styleOptionHeader}>
                    <Ionicons name={option.icon as any} size={20} color={theme.primary} />
                    <Text style={[styles.styleOptionTitle, { color: theme.text }]}>{option.label}</Text>
                    {currentMode.style === option.value && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    )}
                  </View>
                  <Text style={[styles.styleOptionDescription, { color: theme.textSecondary }]}>
                    {option.description}
                  </Text>
                  <Text style={[styles.styleOptionExample, { color: theme.textMuted }]}>
                    {option.value === 'custom' 
                      ? getCustomPromptPreview(currentMode.customPrompt)
                      : option.example
                    }
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Prompt Input */}
            {currentMode.style === 'custom' && (
              <View style={styles.customPromptSection}>
                <Text style={[styles.customPromptLabel, { color: theme.text }]}>
                  Custom Prompt for {modeInfo?.title}
                </Text>
                <Text style={[styles.customPromptHelper, { color: theme.textSecondary }]}>
                  Define how the AI should present news content for this creation mode
                </Text>
                <TextInput
                  style={[
                    styles.customPromptInput,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    }
                  ]}
                  value={currentMode.customPrompt}
                  onChangeText={(text) => updateModeSettings(activeMode, 'customPrompt', text)}
                  placeholder={`Enter custom prompt for ${modeInfo?.title.toLowerCase()}...`}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.primary }]}>
              Unified Prompt System
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              Configure how AI generates audio content for different creation methods. 
              Each mode can have its own prompt style for optimal results.
            </Text>
          </View>
        </View>

        {renderModeSelector()}
        {renderPromptStyleSection()}

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
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  sectionIcon: {
    marginRight: 12,
    marginTop: 2,
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
  sectionActions: {
    marginLeft: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modeGrid: {
    gap: 12,
    marginTop: 12,
  },
  modeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enableToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  enableToggleText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  promptStyleGrid: {
    gap: 12,
    marginBottom: 16,
  },
  styleOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  styleOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  styleOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  styleOptionDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  styleOptionExample: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  customPromptSection: {
    marginTop: 16,
  },
  customPromptLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customPromptHelper: {
    fontSize: 14,
    marginBottom: 12,
  },
  customPromptInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  bottomSpacer: {
    height: 32,
  },
});