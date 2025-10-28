/**
 * 音声生成設定コンポーネント
 * Auto Pick / Manual / Schedule の各方式ごとに完全分離された設定UI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

// 音声生成方式の定義
const GENERATION_MODES = [
  {
    id: 'autopick',
    title: 'Auto Pick',
    description: 'AI自動記事選別',
    icon: 'flash',
    color: '#34C759',
  },
  {
    id: 'manual', 
    title: 'Manual',
    description: 'ユーザー手動選択',
    icon: 'hand-left',
    color: '#007AFF',
  },
  {
    id: 'schedule',
    title: 'Schedule', 
    description: '定期自動配信',
    icon: 'time',
    color: '#FF9500',
  },
];

// プロンプトプリセットの定義
const PROMPT_PRESETS = [
  {
    id: 'recommended',
    name: 'recommended (推奨)',
    description: 'リスナー重視の魅力的なコンテンツ',
    preview: 'リスナーの関心を引く導入を心がけ、親しみやすく信頼できるトーンで...',
  },
  {
    id: 'friendly', 
    name: 'friendly (フレンドリー)',
    description: '親しみやすい会話調',
    preview: 'まるで友達と話すような自然で温かい口調で...',
  },
  {
    id: 'insightful',
    name: 'insightful (洞察的)', 
    description: '深い分析と背景説明',
    preview: '表面的な情報だけでなく、背景や意味、影響について深く考察...',
  },
  {
    id: 'strict',
    name: 'strict (厳密)',
    description: '客観的で正確な報道スタイル',  
    preview: '事実の正確な伝達を最優先し、偏見や個人的意見は排除...',
  },
  {
    id: 'custom',
    name: 'custom (カスタム)',
    description: 'オリジナルプロンプト',
    preview: '自分だけのプロンプトを作成...',
  },
];

// 音声言語オプション
const VOICE_LANGUAGE_OPTIONS = [
  { value: 'ja-JP', label: '日本語' },
  { value: 'en-US', label: 'English' },
];

// 音声スタイルオプション  
const VOICE_STYLE_OPTIONS = [
  { value: 'alloy', label: 'alloy (標準)' },
  { value: 'echo', label: 'echo (響く)' },
  { value: 'fable', label: 'fable (物語調)' },
  { value: 'onyx', label: 'onyx (深い)' },
  { value: 'nova', label: 'nova (明るい)' },
  { value: 'shimmer', label: 'shimmer (軽やか)' },
];

interface ModeSettings {
  promptPreset: string;
  customPrompt: string;
  voiceLanguage: string;
  voiceStyle: string;
  enabled: boolean;
}

interface AudioGenerationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const defaultSettings: Record<string, ModeSettings> = {
  autopick: {
    promptPreset: 'recommended',
    customPrompt: '',
    voiceLanguage: 'ja-JP', 
    voiceStyle: 'alloy',
    enabled: true,
  },
  manual: {
    promptPreset: 'recommended',
    customPrompt: '',
    voiceLanguage: 'ja-JP',
    voiceStyle: 'alloy', 
    enabled: true,
  },
  schedule: {
    promptPreset: 'recommended',
    customPrompt: '',
    voiceLanguage: 'ja-JP',
    voiceStyle: 'alloy',
    enabled: false,
  },
};

export default function AudioGenerationSettings({ visible, onClose }: AudioGenerationSettingsProps) {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState('autopick');
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('audio_generation_settings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading audio generation settings:', error);
    }
  };

  const saveSettings = async (newSettings: Record<string, ModeSettings>) => {
    try {
      setIsLoading(true);
      await AsyncStorage.setItem('audio_generation_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('設定保存', '設定を正常に保存しました');
    } catch (error) {
      console.error('Error saving audio generation settings:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateModeSetting = (mode: string, key: keyof ModeSettings, value: any) => {
    const newSettings = {
      ...settings,
      [mode]: {
        ...settings[mode],
        [key]: value,
      },
    };
    setSettings(newSettings);
  };

  const getCurrentModeInfo = () => {
    return GENERATION_MODES.find(mode => mode.id === activeMode)!;
  };

  const getCurrentSettings = () => {
    return settings[activeMode];
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>🎵 音声生成設定</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      {GENERATION_MODES.map((mode) => (
        <TouchableOpacity
          key={mode.id}
          style={[
            styles.modeTab,
            activeMode === mode.id && { backgroundColor: mode.color },
          ]}
          onPress={() => setActiveMode(mode.id)}
        >
          <Ionicons 
            name={mode.icon as any} 
            size={20} 
            color={activeMode === mode.id ? '#fff' : mode.color} 
          />
          <Text style={[
            styles.modeTabText,
            { color: activeMode === mode.id ? '#fff' : '#666' }
          ]}>
            {mode.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPromptPresetSection = () => {
    const currentSettings = getCurrentSettings();
    const modeInfo = getCurrentModeInfo();
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={modeInfo.icon as any} size={20} color={modeInfo.color} />
          <Text style={styles.sectionTitle}>
            {modeInfo.title} - プロンプト設定
          </Text>
        </View>

        {/* プリセット選択 */}
        <Text style={styles.subsectionTitle}>🎨 プロンプトスタイル</Text>
        {PROMPT_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetOption,
              currentSettings.promptPreset === preset.id && styles.presetOptionSelected,
            ]}
            onPress={() => updateModeSetting(activeMode, 'promptPreset', preset.id)}
          >
            <View style={styles.presetHeader}>
              <View style={[
                styles.radioButton,
                currentSettings.promptPreset === preset.id && styles.radioButtonSelected,
              ]} />
              <Text style={styles.presetName}>{preset.name}</Text>
            </View>
            <Text style={styles.presetDescription}>{preset.description}</Text>
            <Text style={styles.presetPreview}>{preset.preview}</Text>
          </TouchableOpacity>
        ))}

        {/* カスタムプロンプト入力 */}
        {currentSettings.promptPreset === 'custom' && (
          <View style={styles.customPromptSection}>
            <Text style={styles.subsectionTitle}>✏️ カスタムプロンプト</Text>
            <TextInput
              style={styles.customPromptInput}
              value={currentSettings.customPrompt}
              onChangeText={(text) => updateModeSetting(activeMode, 'customPrompt', text)}
              placeholder={`${modeInfo.title}用のカスタムプロンプトを入力...`}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCounter}>
              {currentSettings.customPrompt.length}/500
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAdvancedSettings = () => {
    const currentSettings = getCurrentSettings();
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ 詳細設定</Text>
        
        {/* 機能有効化 */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>機能を有効にする</Text>
          <Switch
            value={currentSettings.enabled}
            onValueChange={(value) => updateModeSetting(activeMode, 'enabled', value)}
          />
        </View>

        {/* 音声言語 */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>🔊 音声言語</Text>
          <View style={styles.optionGroup}>
            {VOICE_LANGUAGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  currentSettings.voiceLanguage === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => updateModeSetting(activeMode, 'voiceLanguage', option.value)}
              >
                <Text style={[
                  styles.optionButtonText,
                  currentSettings.voiceLanguage === option.value && styles.optionButtonTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 音声スタイル */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>🎭 音声スタイル</Text>
          <View style={styles.dropdownContainer}>
            {VOICE_STYLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  currentSettings.voiceStyle === option.value && styles.dropdownOptionSelected,
                ]}
                onPress={() => updateModeSetting(activeMode, 'voiceStyle', option.value)}
              >
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
                {currentSettings.voiceStyle === option.value && (
                  <Ionicons name="checkmark" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 文字数情報 */}
        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={16} color="#666" />
          <Text style={styles.infoText}>
            📏 推定文字数: 記事数に応じて自動調整されます
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderModeSelector()}
        
        <ScrollView style={styles.content}>
          {renderPromptPresetSection()}
          {renderAdvancedSettings()}
          
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={() => saveSettings(settings)}
            disabled={isLoading}
          >
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>
              {isLoading ? '保存中...' : '💾 設定を保存'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  presetOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  presetOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  radioButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  presetPreview: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  customPromptSection: {
    marginTop: 16,
  },
  customPromptInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 14,
    flex: 1,
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#666',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  dropdownContainer: {
    maxWidth: '60%',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dropdownOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  dropdownOptionText: {
    fontSize: 12,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 32,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});