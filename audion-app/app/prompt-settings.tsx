import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
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
  };
  autoPick: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
  };
  schedule: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
  };
}

const defaultPromptSettings: PromptSettings = {
  manual: {
    style: 'standard',
    customPrompt: '',
  },
  autoPick: {
    style: 'standard',
    customPrompt: '',
  },
  schedule: {
    style: 'standard',
    customPrompt: '',
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
    title: 'Manual',
    description: 'When you manually select articles in Feed',
    icon: 'hand-left-outline',
    color: '#007AFF',
  },
  {
    key: 'autoPick',
    title: 'Auto',
    description: 'Algorithm-based automatic article selection',
    icon: 'flash-outline',
    color: '#34C759',
  },
  {
    key: 'schedule',
    title: 'Schedule',
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
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();
    
    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
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

  const updateModeSettings = async (mode: keyof PromptSettings, field: string, value: any, shouldDebounce: boolean = false) => {
    // ✨ PRESERVE CUSTOM PROMPT: Never reset customPrompt when changing style
    const currentCustomPrompt = settings[mode].customPrompt;
    
    const newSettings = {
      ...settings,
      [mode]: {
        ...settings[mode],
        [field]: value,
        // Always preserve existing custom prompt unless explicitly updating it
        ...(field !== 'customPrompt' && { customPrompt: currentCustomPrompt }),
      },
    };
    setSettings(newSettings);
    
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (shouldDebounce) {
      // For text input, debounce the save operation
      setAutoSaveStatus('saving');
      debounceTimerRef.current = setTimeout(async () => {
        await performSave(newSettings, mode, field, value);
      }, 1000); // 1 second delay
    } else {
      // For immediate saves (style changes, toggles, etc.)
      setAutoSaveStatus('saving');
      await performSave(newSettings, mode, field, value);
    }
  };

  const performSave = async (newSettings: PromptSettings, mode: keyof PromptSettings, field: string, value: any) => {
    try {
      await AsyncStorage.setItem('unified_prompt_settings', JSON.stringify(newSettings));
      
      // Also save to individual keys for backward compatibility
      await AsyncStorage.setItem('unified_prompt_style', newSettings.manual.style);
      await AsyncStorage.setItem('unified_custom_prompt', newSettings.manual.customPrompt);
      
      console.log(`✅ Auto-saved prompt settings for ${mode}:`, { field, value });
      setAutoSaveStatus('saved');
      
      // Reset status after showing "saved" for 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('idle');
    }
  };

  const copySettingsToAllModes = async (sourceMode: keyof PromptSettings) => {
    Alert.alert(
      'Copy Settings',
      `Apply ${sourceMode} settings to all creation modes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply to All',
          onPress: async () => {
            const sourceSettings = settings[sourceMode];
            const newSettings = {
              manual: { ...sourceSettings },
              autoPick: { ...sourceSettings },
              schedule: { ...sourceSettings },
            };
            setSettings(newSettings);
            
            // Auto-save immediately with proper sync and UI feedback
            setAutoSaveStatus('saving');
            try {
              await AsyncStorage.setItem('unified_prompt_settings', JSON.stringify(newSettings));
              
              // Update backward compatibility keys with manual mode settings
              await AsyncStorage.setItem('unified_prompt_style', newSettings.manual.style);
              await AsyncStorage.setItem('unified_custom_prompt', newSettings.manual.customPrompt);
              
              console.log(`✅ Copied and auto-saved ${sourceMode} settings to all modes`);
              setAutoSaveStatus('saved');
              
              // Force UI update by triggering state changes for all modes
              setActiveMode('manual'); // Reset to manual to trigger re-render
              setTimeout(() => {
                setActiveMode(sourceMode); // Return to original mode
                setTimeout(() => setAutoSaveStatus('idle'), 2000); // Reset status after delay
              }, 100);
              
            } catch (error) {
              console.error('Copy to all auto-save failed:', error);
              setAutoSaveStatus('idle');
              Alert.alert('Error', 'Failed to save copied settings');
            }
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
      {/* Auto-save status indicator instead of save button */}
      <View style={styles.saveStatusContainer}>
        {autoSaveStatus === 'saving' && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.savingText, { color: theme.textSecondary }]}>Saving...</Text>
          </View>
        )}
        {autoSaveStatus === 'saved' && (
          <View style={styles.savedIndicator}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={[styles.savedText, { color: '#10B981' }]}>Saved</Text>
          </View>
        )}
        {autoSaveStatus === 'idle' && <View style={styles.placeholderSpace} />}
      </View>
    </View>
  );

  const renderModeSelector = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Creation Modes</Text>
      
      <View style={styles.modeRow}>
        {creationModes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeButton,
              {
                backgroundColor: activeMode === mode.key ? mode.color : theme.surface,
                borderColor: activeMode === mode.key ? mode.color : theme.border,
              }
            ]}
            onPress={() => setActiveMode(mode.key as keyof PromptSettings)}
          >
            <Ionicons 
              name={mode.icon as any} 
              size={24} 
              color={activeMode === mode.key ? '#fff' : mode.color} 
            />
            <Text style={[
              styles.modeButtonText, 
              { color: activeMode === mode.key ? '#fff' : theme.text }
            ]}>
              {mode.title}
            </Text>
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
                  onChangeText={(text) => {
                    // Real-time update with debounced auto-save (1 second delay)
                    updateModeSettings(activeMode, 'customPrompt', text, true);
                  }}
                  placeholder={`Enter custom prompt for ${modeInfo?.title.toLowerCase()}...`}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
        </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
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
  saveStatusContainer: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  placeholderSpace: {
    width: 1,
    height: 20,
  },
});