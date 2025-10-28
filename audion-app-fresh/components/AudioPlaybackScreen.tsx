/**
 * Audio & Playback Settings Screen
 * 音声再生設定画面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface AudioPlaybackScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  disabled?: boolean;
}

function SettingItem({ 
  title, 
  description, 
  icon, 
  onPress, 
  showArrow = true, 
  toggle = false,
  toggleValue = false,
  onToggleChange,
  disabled = false
}: SettingItemProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.settingItem, disabled && styles.settingItemDisabled]} 
      onPress={handlePress} 
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <FontAwesome 
            name={icon as any} 
            size={20} 
            color={disabled ? "#666666" : "#007bff"} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          disabled={disabled}
          trackColor={{ false: '#333333', true: '#007bff' }}
          thumbColor={toggleValue ? '#ffffff' : '#cccccc'}
        />
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function AudioPlaybackScreen({ visible, onClose }: AudioPlaybackScreenProps) {
  // 設定状態
  const [autoPickEnabled, setAutoPickEnabled] = useState(true);
  const [manualPickEnabled, setManualPickEnabled] = useState(true);
  const [schedulePickEnabled, setSchedulePickEnabled] = useState(false);
  const [continuousPlayback, setContinuousPlayback] = useState(true);
  const [backgroundPlayback, setBackgroundPlayback] = useState(true);
  const [noiseReduction, setNoiseReduction] = useState(true);

  const handleGenerationModePress = () => {
    Alert.alert('音声生成モード', 'モード選択画面は実装予定です');
  };

  const handleAutoPickSettingsPress = () => {
    Alert.alert('Auto-Pick設定', 'Auto-Pick詳細設定は実装予定です');
  };

  const handleSchedulePickSettingsPress = () => {
    Alert.alert('Schedule-Pick設定', 'Schedule-Pick詳細設定は実装予定です');
  };

  const handlePromptManagementPress = () => {
    Alert.alert('プロンプト管理', 'プロンプト管理画面は実装予定です');
  };

  const handleVoiceSettingsPress = () => {
    Alert.alert('AI音声設定', 'AI音声選択画面は実装予定です');
  };

  const handleAudioQualityPress = () => {
    Alert.alert('音声品質', '音声品質設定は実装予定です');
  };

  const handlePlaybackSpeedPress = () => {
    Alert.alert('再生速度', '再生速度調整は実装予定です');
  };

  const handleAudioAdjustmentPress = () => {
    Alert.alert('音声調整', '音声調整設定は実装予定です');
  };

  const handlePlaybackControlPress = () => {
    Alert.alert('再生制御', '再生制御設定は実装予定です');
  };

  const handleOutputSettingsPress = () => {
    Alert.alert('出力設定', 'Bluetooth等の出力設定は実装予定です');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome name="arrow-left" size={18} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>音声再生設定</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 生成モード設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>音声生成モード</Text>
            
            <SettingItem
              title="Auto-Pick"
              description="AIが自動で記事を選び音声を生成"
              icon="magic"
              toggle={true}
              toggleValue={autoPickEnabled}
              onToggleChange={setAutoPickEnabled}
            />
            
            <SettingItem
              title="Manual-Pick"
              description="手動で選んだ記事のみ音声を生成"
              icon="hand-paper-o"
              toggle={true}
              toggleValue={manualPickEnabled}
              onToggleChange={setManualPickEnabled}
            />
            
            <SettingItem
              title="Schedule-Pick"
              description="スケジュールに基づき音声を生成"
              icon="calendar"
              toggle={true}
              toggleValue={schedulePickEnabled}
              onToggleChange={setSchedulePickEnabled}
            />
          </View>

          {/* Auto-Pick設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Auto-Pick詳細設定</Text>
            
            <SettingItem
              title="生成量設定"
              description="1日の生成本数と記事数"
              icon="sort-numeric-asc"
              onPress={handleAutoPickSettingsPress}
              disabled={!autoPickEnabled}
            />
            
            <SettingItem
              title="生成タイミング"
              description="生成時刻と曜日設定"
              icon="clock-o"
              onPress={handleAutoPickSettingsPress}
              disabled={!autoPickEnabled}
            />
            
            <SettingItem
              title="選択基準"
              description="記事選択の優先基準"
              icon="filter"
              onPress={handleAutoPickSettingsPress}
              disabled={!autoPickEnabled}
            />
          </View>

          {/* Schedule-Pick設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Schedule-Pick詳細設定</Text>
            
            <SettingItem
              title="スケジュール管理"
              description="スケジュール一覧と作成"
              icon="calendar-check-o"
              onPress={handleSchedulePickSettingsPress}
              disabled={!schedulePickEnabled}
            />
            
            <SettingItem
              title="テンプレート管理"
              description="スケジュールテンプレート"
              icon="clone"
              onPress={handleSchedulePickSettingsPress}
              disabled={!schedulePickEnabled}
            />
          </View>

          {/* プロンプト管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>プロンプト管理</Text>
            
            <SettingItem
              title="プリセットプロンプト"
              description="5種類の標準プロンプト"
              icon="list-alt"
              onPress={handlePromptManagementPress}
            />
            
            <SettingItem
              title="カスタムプロンプト"
              description="オリジナルプロンプト作成"
              icon="edit"
              onPress={handlePromptManagementPress}
            />
            
            <SettingItem
              title="プロンプト共通設定"
              description="全モード一括適用"
              icon="copy"
              onPress={handlePromptManagementPress}
            />
          </View>

          {/* 音声品質・声設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>音声品質・声設定</Text>
            
            <SettingItem
              title="AI音声選択"
              description="声の性別・話者選択"
              icon="user-circle"
              onPress={handleVoiceSettingsPress}
            />
            
            <SettingItem
              title="再生品質"
              description="音声ビットレート・形式"
              icon="cog"
              onPress={handleAudioQualityPress}
            />
            
            <SettingItem
              title="ノイズ除去"
              description="音声品質向上"
              icon="volume-up"
              toggle={true}
              toggleValue={noiseReduction}
              onToggleChange={setNoiseReduction}
            />
            
            <SettingItem
              title="音声調整"
              description="話速・音量・無音スキップ"
              icon="sliders"
              onPress={handleAudioAdjustmentPress}
            />
          </View>

          {/* 再生動作設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>再生動作設定</Text>
            
            <SettingItem
              title="連続再生"
              description="自動で次の音声を再生"
              icon="play-circle"
              toggle={true}
              toggleValue={continuousPlayback}
              onToggleChange={setContinuousPlayback}
            />
            
            <SettingItem
              title="再生制御"
              description="自動一時停止・フェード設定"
              icon="pause-circle"
              onPress={handlePlaybackControlPress}
            />
            
            <SettingItem
              title="バックグラウンド再生"
              description="アプリ非表示時も再生継続"
              icon="mobile"
              toggle={true}
              toggleValue={backgroundPlayback}
              onToggleChange={setBackgroundPlayback}
            />
            
            <SettingItem
              title="出力設定"
              description="Bluetooth・イヤホン設定"
              icon="headphones"
              onPress={handleOutputSettingsPress}
            />
          </View>

          {/* 下部の余白 */}
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
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#888888',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingTitleDisabled: {
    color: '#666666',
  },
  settingDescriptionDisabled: {
    color: '#444444',
  },
  bottomSpacer: {
    height: 32,
  },
});