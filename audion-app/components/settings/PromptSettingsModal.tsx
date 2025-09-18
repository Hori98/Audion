/**
 * Prompt Settings Modal - プロンプト設定モーダル
 * 古いフロントエンドのUIデザインを参考にした新しいフロントエンド向け実装
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSettings, useContentSettings, usePickModes } from '../../context/SettingsContext';

interface PromptSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'auto' | 'manual' | 'schedule';
}

interface PromptSettings {
  auto: {
    style: 'ニュース' | '学習' | 'エンタメ' | 'レポート' | '意見' | 'custom';
    customPrompt: string;
  };
  manual: {
    style: 'ニュース' | '学習' | 'エンタメ' | 'レポート' | '意見' | 'custom';
    customPrompt: string;
  };
  schedule: {
    style: 'ニュース' | '学習' | 'エンタメ' | 'レポート' | '意見' | 'custom';
    customPrompt: string;
  };
}

const defaultPromptSettings: PromptSettings = {
  auto: { style: '学習', customPrompt: '' },
  manual: { style: '学習', customPrompt: '' },
  schedule: { style: '学習', customPrompt: '' },
};

const promptStyleOptions = [
  { 
    value: 'ニュース', 
    label: 'ニュース', 
    description: '短時間で最重要情報をキャッチアップ',
    icon: 'flash',
    example: '通勤・朝の準備中に1-3分で完結するニュース速報'
  },
  { 
    value: '学習', 
    label: '学習', 
    description: '深い洞察と包括的な分析を含む学習向け',
    icon: 'graduation-cap',
    example: '背景・因果関係・将来への影響を多角的に解説'
  },
  { 
    value: 'エンタメ', 
    label: 'エンタメ', 
    description: '感情に訴える物語性豊かなストーリー',
    icon: 'heart',
    example: '登場人物の感情やドラマを重視したナラティブ'
  },
  { 
    value: 'レポート', 
    label: 'レポート', 
    description: '中立的で多角的な視点を提供する客観レポート',
    icon: 'bar-chart',
    example: '賛否両論併記、データ重視、主観排除の客観分析'
  },
  {
    value: '意見',
    label: '意見',
    description: '一貫した主張と説得力ある論拠を持つオピニオン',
    icon: 'commenting',
    example: '明確なテーゼと論理的な論拠で新しい視点を提供'
  },
  { 
    value: 'custom', 
    label: 'カスタム', 
    description: 'あなた独自のプロンプトスタイル',
    icon: 'edit',
    example: '独自の配信スタイルを定義'
  },
];

const creationModes = [
  {
    key: 'auto',
    title: 'Auto Pick',
    description: 'AI自動記事選別時のプロンプト',
    icon: 'flash',
    color: '#34C759',
  },
  {
    key: 'manual',
    title: 'Manual Pick',
    description: 'フィード内手動選択時のプロンプト',
    icon: 'hand-paper-o',
    color: '#007AFF',
  },
  {
    key: 'schedule',
    title: 'Schedule Pick',
    description: '時間ベース自動生成時のプロンプト',
    icon: 'clock-o',
    color: '#FF9500',
  },
];

export default function PromptSettingsModal({ 
  visible, 
  onClose, 
  mode = 'auto',
  pickModes: propPickModes,
  content: propContent,
  updatePickModes: propUpdatePickModes,
  updateContent: propUpdateContent
}: PromptSettingsModalProps) {
  // propsが渡されない場合はContext hooksを使用
  const contextContent = useContentSettings();
  const contextPickModes = usePickModes();
  
  const content = propContent || contextContent.content;
  const updateContent = propUpdateContent || contextContent.updateContent;
  const pickModes = propPickModes || contextPickModes.pickModes;
  const updatePickModes = propUpdatePickModes || contextPickModes.updatePickModes;
  const [settings, setSettings] = useState<PromptSettings>(defaultPromptSettings);
  const [activeMode, setActiveMode] = useState<keyof PromptSettings>(mode);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }

    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [visible]);

  const loadSettings = () => {
    try {
      // 既存のSettingsContextから現在のプロンプトスタイルを読み込み
      const currentStyle = content.promptTemplate;
      
      // 各モードに同じスタイルを適用（後で個別設定対応可能）
      const loadedSettings: PromptSettings = {
        auto: { style: currentStyle as any, customPrompt: '' },
        manual: { style: currentStyle as any, customPrompt: '' },
        schedule: { style: currentStyle as any, customPrompt: '' },
      };
      
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading prompt settings:', error);
      setSettings(defaultPromptSettings);
    }
  };

  const updateModeSettings = async (mode: keyof PromptSettings, field: string, value: any, shouldDebounce: boolean = false) => {
    const currentCustomPrompt = settings[mode].customPrompt;
    
    const newSettings = {
      ...settings,
      [mode]: {
        ...settings[mode],
        [field]: value,
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
      // SettingsContextを通じて保存
      if (field === 'style') {
        await updateContent({ promptTemplate: value });
      }
      
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
      '設定をコピー',
      `${sourceMode}の設定をすべての作成モードに適用しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'すべてに適用',
          onPress: async () => {
            const sourceSettings = settings[sourceMode];
            const newSettings = {
              auto: { ...sourceSettings },
              manual: { ...sourceSettings },
              schedule: { ...sourceSettings },
            };
            setSettings(newSettings);
            
            // Auto-save immediately
            setAutoSaveStatus('saving');
            try {
              await updateContent({ promptTemplate: sourceSettings.style });
              
              console.log(`✅ Copied and auto-saved ${sourceMode} settings to all modes`);
              setAutoSaveStatus('saved');
              setTimeout(() => setAutoSaveStatus('idle'), 2000);
            } catch (error) {
              console.error('Copy to all auto-save failed:', error);
              setAutoSaveStatus('idle');
              Alert.alert('エラー', 'コピーした設定の保存に失敗しました');
            }
          }
        }
      ]
    );
  };

  const getCustomPromptPreview = (customPrompt: string) => {
    if (!customPrompt.trim()) {
      return '独自の配信スタイルを定義';
    }
    
    const maxLength = 60;
    if (customPrompt.length <= maxLength) {
      return customPrompt;
    }
    
    return customPrompt.substring(0, maxLength).trim() + '...';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesome name="arrow-left" size={18} color="#ffffff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>プロンプト設定</Text>
      <View style={styles.saveStatusContainer}>
        {autoSaveStatus === 'saving' && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#007bff" />
            <Text style={styles.savingText}>保存中...</Text>
          </View>
        )}
        {autoSaveStatus === 'saved' && (
          <View style={styles.savedIndicator}>
            <FontAwesome name="check-circle" size={16} color="#10B981" />
            <Text style={styles.savedText}>保存完了</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderModeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>作成モード</Text>
      
      <View style={styles.modeRow}>
        {creationModes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeButton,
              {
                backgroundColor: activeMode === mode.key ? mode.color : '#111111',
                borderColor: activeMode === mode.key ? mode.color : '#333333',
              }
            ]}
            onPress={() => setActiveMode(mode.key as keyof PromptSettings)}
          >
            <FontAwesome 
              name={mode.icon as any} 
              size={20} 
              color={activeMode === mode.key ? '#ffffff' : mode.color} 
            />
            <Text style={[
              styles.modeButtonText, 
              { color: activeMode === mode.key ? '#ffffff' : '#ffffff' }
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <FontAwesome name={modeInfo?.icon as any} size={20} color={modeInfo?.color} style={styles.sectionIcon} />
            <View>
              <Text style={styles.sectionTitle}>{modeInfo?.title} 設定</Text>
              <Text style={styles.sectionDescription}>
                {modeInfo?.description}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => copySettingsToAllModes(activeMode)}
            style={styles.copyButton}
          >
            <FontAwesome name="copy" size={14} color="#007bff" />
            <Text style={styles.copyButtonText}>全てにコピー</Text>
          </TouchableOpacity>
        </View>

        {/* Prompt Style Options */}
        <View style={styles.promptStyleGrid}>
          {promptStyleOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.styleOption,
                {
                  backgroundColor: currentMode.style === option.value ? '#1a1a1a' : '#0a0a0a',
                  borderColor: currentMode.style === option.value ? '#007bff' : '#333333',
                },
              ]}
              onPress={() => updateModeSettings(activeMode, 'style', option.value)}
            >
              <View style={styles.styleOptionHeader}>
                <FontAwesome name={option.icon as any} size={16} color="#007bff" />
                <Text style={styles.styleOptionTitle}>{option.label}</Text>
                {currentMode.style === option.value && (
                  <FontAwesome name="check-circle" size={16} color="#007bff" />
                )}
              </View>
              <Text style={styles.styleOptionDescription}>
                {option.description}
              </Text>
              <Text style={styles.styleOptionExample}>
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
            <Text style={styles.customPromptLabel}>
              {modeInfo?.title} カスタムプロンプト
            </Text>
            <Text style={styles.customPromptHelper}>
              この作成モードでAIがニュースコンテンツをどのように提示するかを定義してください
            </Text>
            <TextInput
              style={styles.customPromptInput}
              value={currentMode.customPrompt}
              onChangeText={(text) => {
                updateModeSettings(activeMode, 'customPrompt', text, true);
              }}
              placeholder={`${modeInfo?.title.toLowerCase()}用のカスタムプロンプトを入力...`}
              placeholderTextColor="#666666"
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {renderHeader()}
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderModeSelector()}
          {renderPromptStyleSection()}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
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
    color: '#888888',
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888888',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 6,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 12,
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
    color: '#ffffff',
    flex: 1,
  },
  styleOptionDescription: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
  styleOptionExample: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  customPromptSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
  },
  customPromptLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  customPromptHelper: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 12,
  },
  customPromptInput: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: '#111111',
    minHeight: 100,
  },
  bottomSpacer: {
    height: 32,
  },
});