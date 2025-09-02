import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

type AudioMode = 'manual' | 'autoPick' | 'schedule';

interface ContentPlaybackSettings {
  // Manual設定
  manual: {
    enabled: boolean;
    defaultArticleCount: number;
    playbackSpeed: number;
    voiceType: string;
    audioQuality: string;
  };
  
  // Auto Pick設定
  autoPick: {
    enabled: boolean;
    articleCount: number;
    preferredGenres: string[];
    scheduleEnabled: boolean;
    playbackSpeed: number;
    voiceType: string;
    audioQuality: string;
  };
  
  // Schedule設定
  schedule: {
    enabled: boolean;
    articleCount: number;
    frequency: string;
    timeSlots: string[];
    playbackSpeed: number;
    voiceType: string;
    audioQuality: string;
  };
  
  // 共通設定
  global: {
    autoPlay: boolean;
    rssAutoUpdateInterval: string;
    enableFilters: boolean;
  };
}

const defaultSettings: ContentPlaybackSettings = {
  manual: {
    enabled: true,
    defaultArticleCount: 5,
    playbackSpeed: 1.0,
    voiceType: 'alloy',
    audioQuality: 'standard',
  },
  autoPick: {
    enabled: true,
    articleCount: 10,
    preferredGenres: [],
    scheduleEnabled: false,
    playbackSpeed: 1.0,
    voiceType: 'alloy',
    audioQuality: 'standard',
  },
  schedule: {
    enabled: false,
    articleCount: 15,
    frequency: 'daily',
    timeSlots: ['09:00'],
    playbackSpeed: 1.0,
    voiceType: 'alloy',
    audioQuality: 'standard',
  },
  global: {
    autoPlay: false,
    rssAutoUpdateInterval: '1hour',
    enableFilters: true,
  },
};

const audioModes = [
  {
    key: 'manual' as AudioMode,
    title: 'Manual',
    description: '手動記事選択',
    icon: 'hand-left-outline',
    color: '#007AFF',
  },
  {
    key: 'autoPick' as AudioMode,
    title: 'Auto Pick',
    description: 'AI自動記事選別',
    icon: 'flash-outline',
    color: '#34C759',
  },
  {
    key: 'schedule' as AudioMode,
    title: 'Schedule',
    description: '定期自動配信',
    icon: 'time-outline',
    color: '#FF9500',
  },
];

const genreOptions = [
  'ビジネス', 'テクノロジー', '政治', '社会', 'エンタメ', 'スポーツ',
  '科学', '国際', '経済', 'ライフスタイル'
];

const playbackSpeeds = [
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1.0x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2.0, label: '2.0x' },
];

const voiceTypes = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

const audioQualities = [
  { value: 'standard', label: '標準' },
  { value: 'hd', label: '高品質' },
];

const updateIntervals = [
  { value: '15min', label: '15分毎' },
  { value: '30min', label: '30分毎' },
  { value: '1hour', label: '1時間毎' },
  { value: '3hours', label: '3時間毎' },
  { value: '6hours', label: '6時間毎' },
];

const frequencies = [
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '週1回' },
  { value: 'custom', label: 'カスタム' },
];

export default function ContentPlaybackScreen() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true); // 初期ロード状態をtrueに
  const [settings, setSettings] = useState<ContentPlaybackSettings>(defaultSettings);
  const [activeMode, setActiveMode] = useState<AudioMode>('manual');

  // アクティブモード変更時の自動保存
  const handleModeChange = (mode: AudioMode) => {
    setActiveMode(mode);
    autoSave();
  };
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await AsyncStorage.getItem('content_playback_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
        // 最後に使用したモードを復元
        const lastMode = await AsyncStorage.getItem('last_active_mode');
        if (lastMode && ['manual', 'autoPick', 'schedule'].includes(lastMode)) {
          setActiveMode(lastMode as AudioMode);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // 設定読み込み失敗時はデフォルト設定を使用
      setSettings(defaultSettings);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (showAlert: boolean = true) => {
    try {
      setSaveStatus('saving');
      await AsyncStorage.setItem('content_playback_settings', JSON.stringify(settings));
      await AsyncStorage.setItem('last_active_mode', activeMode);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      if (showAlert) {
        Alert.alert('保存完了', '設定が正常に保存されました');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (showAlert) {
        Alert.alert('保存エラー', '設定の保存に失敗しました。再度お試しください。');
      }
    }
  };

  // 自動保存機能
  const autoSave = () => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      saveSettings(false); // アラート表示なしで自動保存
    }, 1000); // 1秒後に自動保存
    setAutoSaveTimeout(timeout);
  };

  const updateSettings = (mode: AudioMode | 'global', field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value
      }
    }));
    autoSave(); // 設定変更時に自動保存をトリガー
  };

  const toggleGenre = (genre: string) => {
    const currentGenres = settings.autoPick.preferredGenres;
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre];
    
    updateSettings('autoPick', 'preferredGenres', newGenres);
  };

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>コンテンツと再生</Text>
      <TouchableOpacity
        onPress={saveSettings}
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        disabled={saveStatus === 'saving'}
      >
        {saveStatus === 'saving' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>保存</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderModeSelector = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>音声作成方式</Text>
      
      <View style={styles.modeRow}>
        {audioModes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeButton,
              {
                backgroundColor: activeMode === mode.key ? mode.color : theme.surface,
                borderColor: activeMode === mode.key ? mode.color : theme.border,
              }
            ]}
            onPress={() => handleModeChange(mode.key)}
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
            <Text style={[
              styles.modeButtonDescription, 
              { color: activeMode === mode.key ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
            ]}>
              {mode.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCurrentSettingsDisplay = () => {
    const currentSettings = settings[activeMode];
    const modeInfo = audioModes.find(m => m.key === activeMode);

    return (
      <View style={[styles.currentSettingsCard, { backgroundColor: theme.accent }]}>
        <View style={styles.currentSettingsHeader}>
          <Ionicons name={modeInfo?.icon as any} size={20} color={theme.primary} />
          <Text style={[styles.currentSettingsTitle, { color: theme.text }]}>
            現在の{modeInfo?.title}設定
          </Text>
        </View>
        <View style={styles.currentSettingsGrid}>
          <View style={styles.currentSettingItem}>
            <Text style={[styles.currentSettingLabel, { color: theme.textSecondary }]}>状態:</Text>
            <Text style={[styles.currentSettingValue, { color: currentSettings.enabled ? '#34C759' : '#FF3B30' }]}>
              {currentSettings.enabled ? '有効' : '無効'}
            </Text>
          </View>
          <View style={styles.currentSettingItem}>
            <Text style={[styles.currentSettingLabel, { color: theme.textSecondary }]}>再生速度:</Text>
            <Text style={[styles.currentSettingValue, { color: theme.text }]}>
              {currentSettings.playbackSpeed}x
            </Text>
          </View>
          <View style={styles.currentSettingItem}>
            <Text style={[styles.currentSettingLabel, { color: theme.textSecondary }]}>音声:</Text>
            <Text style={[styles.currentSettingValue, { color: theme.text }]}>
              {currentSettings.voiceType}
            </Text>
          </View>
          {activeMode === 'autoPick' && (
            <View style={styles.currentSettingItem}>
              <Text style={[styles.currentSettingLabel, { color: theme.textSecondary }]}>記事数:</Text>
              <Text style={[styles.currentSettingValue, { color: theme.text }]}>
                {settings.autoPick.articleCount}記事
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderManualSettings = () => (
    <View style={styles.modeSettings}>
      <View style={styles.settingItem}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Manual Pick有効</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              フィードから手動で記事を選択して音声生成
            </Text>
          </View>
          <Switch
            value={settings.manual.enabled}
            onValueChange={(value) => updateSettings('manual', 'enabled', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={settings.manual.enabled ? '#fff' : theme.textMuted}
          />
        </View>
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          デフォルト記事数: {settings.manual.defaultArticleCount}記事
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={settings.manual.defaultArticleCount}
          onValueChange={(value) => updateSettings('manual', 'defaultArticleCount', value)}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbStyle={{ backgroundColor: theme.primary }}
        />
      </View>

      {renderCommonAudioSettings('manual')}
    </View>
  );

  const renderAutoPickSettings = () => (
    <View style={styles.modeSettings}>
      <View style={styles.settingItem}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Auto Pick有効</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              AIが自動的に記事を選択して音声生成
            </Text>
          </View>
          <Switch
            value={settings.autoPick.enabled}
            onValueChange={(value) => updateSettings('autoPick', 'enabled', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={settings.autoPick.enabled ? '#fff' : theme.textMuted}
          />
        </View>
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          1回の生成で選択する記事数: {settings.autoPick.articleCount}記事
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={20}
          step={1}
          value={settings.autoPick.articleCount}
          onValueChange={(value) => updateSettings('autoPick', 'articleCount', value)}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbStyle={{ backgroundColor: theme.primary }}
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          優先的に選択するニュースジャンル
        </Text>
        <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
          {settings.autoPick.preferredGenres.length > 0 ? settings.autoPick.preferredGenres.join(', ') : '全て'}
        </Text>
        <View style={styles.genreGrid}>
          {genreOptions.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreChip,
                {
                  backgroundColor: settings.autoPick.preferredGenres.includes(genre) 
                    ? theme.primary 
                    : theme.surface,
                  borderColor: settings.autoPick.preferredGenres.includes(genre)
                    ? theme.primary 
                    : theme.border,
                }
              ]}
              onPress={() => toggleGenre(genre)}
            >
              <Text style={[
                styles.genreChipText,
                { 
                  color: settings.autoPick.preferredGenres.includes(genre) 
                    ? '#fff' 
                    : theme.text 
                }
              ]}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>定時Auto-Pickの設定</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {settings.autoPick.scheduleEnabled ? '有効' : '無効'}
            </Text>
          </View>
          <Switch
            value={settings.autoPick.scheduleEnabled}
            onValueChange={(value) => updateSettings('autoPick', 'scheduleEnabled', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={settings.autoPick.scheduleEnabled ? '#fff' : theme.textMuted}
          />
        </View>
      </View>

      {renderCommonAudioSettings('autoPick')}
    </View>
  );

  const renderScheduleSettings = () => (
    <View style={styles.modeSettings}>
      <View style={styles.settingItem}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Schedule Pick有効</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              スケジュールに基づく自動生成
            </Text>
          </View>
          <Switch
            value={settings.schedule.enabled}
            onValueChange={(value) => updateSettings('schedule', 'enabled', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={settings.schedule.enabled ? '#fff' : theme.textMuted}
          />
        </View>
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          配信頻度: {frequencies.find(f => f.value === settings.schedule.frequency)?.label}
        </Text>
        <View style={styles.frequencySelector}>
          {frequencies.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={[
                styles.frequencyButton,
                {
                  backgroundColor: settings.schedule.frequency === freq.value ? theme.primary : theme.surface,
                  borderColor: settings.schedule.frequency === freq.value ? theme.primary : theme.border,
                }
              ]}
              onPress={() => updateSettings('schedule', 'frequency', freq.value)}
            >
              <Text style={[
                styles.frequencyButtonText,
                { color: settings.schedule.frequency === freq.value ? '#fff' : theme.text }
              ]}>
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          記事数: {settings.schedule.articleCount}記事
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={5}
          maximumValue={25}
          step={1}
          value={settings.schedule.articleCount}
          onValueChange={(value) => updateSettings('schedule', 'articleCount', value)}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbStyle={{ backgroundColor: theme.primary }}
        />
      </View>

      {renderCommonAudioSettings('schedule')}
    </View>
  );

  const renderCommonAudioSettings = (mode: AudioMode) => (
    <>
      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          音声の再生スピード: {settings[mode].playbackSpeed}x
        </Text>
        <View style={styles.speedSelector}>
          {playbackSpeeds.map((speed) => (
            <TouchableOpacity
              key={speed.value}
              style={[
                styles.speedButton,
                {
                  backgroundColor: settings[mode].playbackSpeed === speed.value ? theme.primary : theme.surface,
                  borderColor: settings[mode].playbackSpeed === speed.value ? theme.primary : theme.border,
                }
              ]}
              onPress={() => updateSettings(mode, 'playbackSpeed', speed.value)}
            >
              <Text style={[
                styles.speedButtonText,
                { color: settings[mode].playbackSpeed === speed.value ? '#fff' : theme.text }
              ]}>
                {speed.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          音声の種類: {settings[mode].voiceType}
        </Text>
        <View style={styles.voiceSelector}>
          {voiceTypes.map((voice) => (
            <TouchableOpacity
              key={voice.value}
              style={[
                styles.voiceButton,
                {
                  backgroundColor: settings[mode].voiceType === voice.value ? theme.accent : theme.surface,
                  borderColor: settings[mode].voiceType === voice.value ? theme.primary : theme.border,
                }
              ]}
              onPress={() => updateSettings(mode, 'voiceType', voice.value)}
            >
              <Text style={[
                styles.voiceButtonText,
                { color: settings[mode].voiceType === voice.value ? theme.primary : theme.text }
              ]}>
                {voice.label}
              </Text>
              {settings[mode].voiceType === voice.value && (
                <Ionicons name="checkmark" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          音声品質: {audioQualities.find(q => q.value === settings[mode].audioQuality)?.label}
        </Text>
        <View style={styles.qualitySelector}>
          {audioQualities.map((quality) => (
            <TouchableOpacity
              key={quality.value}
              style={[
                styles.qualityButton,
                {
                  backgroundColor: settings[mode].audioQuality === quality.value ? theme.primary : theme.surface,
                  borderColor: settings[mode].audioQuality === quality.value ? theme.primary : theme.border,
                }
              ]}
              onPress={() => updateSettings(mode, 'audioQuality', quality.value)}
            >
              <Text style={[
                styles.qualityButtonText,
                { color: settings[mode].audioQuality === quality.value ? '#fff' : theme.text }
              ]}>
                {quality.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  const renderGlobalSettings = () => (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings-outline" size={24} color={theme.primary} />
        <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 12 }]}>
          共通設定
        </Text>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>自動再生</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              音声生成完了時に自動的に再生開始
            </Text>
          </View>
          <Switch
            value={settings.global.autoPlay}
            onValueChange={(value) => updateSettings('global', 'autoPlay', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={settings.global.autoPlay ? '#fff' : theme.textMuted}
          />
        </View>
      </View>

      <View style={styles.settingItem}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          フィードの自動更新間隔: {updateIntervals.find(i => i.value === settings.global.rssAutoUpdateInterval)?.label}
        </Text>
        <View style={styles.intervalSelector}>
          {updateIntervals.map((interval) => (
            <TouchableOpacity
              key={interval.value}
              style={[
                styles.intervalButton,
                {
                  backgroundColor: settings.global.rssAutoUpdateInterval === interval.value ? theme.accent : theme.surface,
                  borderColor: settings.global.rssAutoUpdateInterval === interval.value ? theme.primary : theme.border,
                }
              ]}
              onPress={() => updateSettings('global', 'rssAutoUpdateInterval', interval.value)}
            >
              <Text style={[
                styles.intervalButtonText,
                { color: settings.global.rssAutoUpdateInterval === interval.value ? theme.primary : theme.text }
              ]}>
                {interval.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.settingItem, styles.navigatableItem]}
        onPress={() => router.push('/sources')}
      >
        <Text style={[styles.settingLabel, { color: theme.text }]}>RSSフィード管理</Text>
        <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
          購読中のRSSフィードを管理
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.settingItem, styles.navigatableItem]}
        onPress={() => Alert.alert('実装予定', 'フィードフィルター機能は実装予定です。')}
      >
        <Text style={[styles.settingLabel, { color: theme.text }]}>フィードフィルター</Text>
        <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
          キーワード・言語による記事フィルタ
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderCurrentModeSettings = () => {
    switch (activeMode) {
      case 'manual':
        return renderManualSettings();
      case 'autoPick':
        return renderAutoPickSettings();
      case 'schedule':
        return renderScheduleSettings();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={styles.loadingIndicator} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderModeSelector()}
        {renderCurrentSettingsDisplay()}
        
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name={audioModes.find(m => m.key === activeMode)?.icon as any} size={24} color={audioModes.find(m => m.key === activeMode)?.color} />
            <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 12 }]}>
              {audioModes.find(m => m.key === activeMode)?.title}設定
            </Text>
          </View>
          {renderCurrentModeSettings()}
        </View>

        {renderGlobalSettings()}
        
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
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeButtonDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
  currentSettingsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  currentSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  currentSettingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  currentSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '45%',
  },
  currentSettingLabel: {
    fontSize: 13,
    marginRight: 4,
  },
  currentSettingValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  modeSettings: {
    gap: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 13,
    marginTop: 4,
  },
  navigatableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  speedSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  voiceSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  qualitySelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  qualityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  qualityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  intervalSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  intervalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  intervalButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  frequencySelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  frequencyButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 32,
  },
  // 新しい保存状態関連のスタイル
  saveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});