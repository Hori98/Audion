/**
 * Content & Playback Settings Screen - Unified Audio Generation Control
 * 音声作成方式別統合管理（AutoPick → ManualPick → SchedulePick順）
 * プロンプト設定最上位、利用頻度順設定項目、アコーディオンUI
 */

import React, { useState, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '../../context/SettingsContext';

interface ContentPlaybackScreenProps {
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
  rightText?: string;
  disabled?: boolean;
}

interface SummaryItem {
  icon: string;
  label: string;
  value: string;
}

interface AccordionSectionProps {
  id: string;
  title: string;
  icon: string;
  isActive: boolean;
  isExpanded: boolean;
  enabled: boolean;
  summaryItems: SummaryItem[];
  onToggleExpansion: (id: string) => void;
  onSetActive: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  children: React.ReactNode;
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
  rightText,
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
      ) : rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

// アコーディオンセクションコンポーネント
function AccordionSection({ 
  id, title, icon, isActive, isExpanded, enabled, summaryItems, onToggleExpansion, onSetActive, onToggleEnabled, children 
}: AccordionSectionProps) {
  const [animation] = useState(new Animated.Value(isExpanded ? 1 : 0));

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animation]);

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const heightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[
      styles.accordionSection, 
      isActive && styles.activeSection
    ]}>
      {/* ヘッダー */}
      <View style={styles.accordionHeader}>
        <TouchableOpacity
          style={styles.accordionHeaderMain}
          onPress={() => {
            onToggleExpansion(id);
            onSetActive(id);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <FontAwesome name={icon as any} size={18} color={isActive ? '#007bff' : '#666666'} />
            <Text style={[
              styles.accordionTitle, 
              isActive && styles.activeAccordionTitle
            ]}>{title}</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <FontAwesome name="chevron-right" size={14} color={isActive ? '#007bff' : '#666666'} />
          </Animated.View>
        </TouchableOpacity>
        
        <View style={styles.accordionToggleContainer}>
          <Switch
            value={enabled}
            onValueChange={(value) => onToggleEnabled(id, value)}
            trackColor={{ false: '#333333', true: '#007bff' }}
            thumbColor={enabled ? '#ffffff' : '#cccccc'}
          />
        </View>
      </View>

      {/* 簡易表示サマリー（折りたたみ時） */}
      {!isExpanded && enabled && summaryItems.length > 0 && (
        <View style={styles.summaryContainer}>
          {summaryItems.map((item, index) => (
            <View key={index} style={styles.summaryItem}>
              <FontAwesome name={item.icon as any} size={12} color="#888888" />
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 展開コンテンツ */}
      <Animated.View style={[
        styles.accordionContent,
        {
          opacity: heightInterpolate,
          maxHeight: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1000],
          }),
        }
      ]}>
        {isExpanded && (
          <View style={styles.accordionContentInner}>
            {children}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export default function ContentPlaybackScreen({ visible, onClose }: ContentPlaybackScreenProps) {
  // SettingsContextを使用
  const { settings, updateSettings } = useSettings();
  
  // アコーディオン展開状態管理
  const [expandedSection, setExpandedSection] = useState<string | null>('autopick');
  const [currentActiveMode, setCurrentActiveMode] = useState<string>('autopick');

  // 各モードの有効化ハンドラー
  const handleToggleEnabled = (modeId: string, enabled: boolean) => {
    switch (modeId) {
      case 'autopick':
        handleAutoPickToggle(enabled);
        break;
      case 'manualpick':
        handleManualPickToggle(enabled);
        break;
      case 'schedulepick':
        handleSchedulePickToggle(enabled);
        break;
    }
  };

  // アコーディオン制御ハンドラー
  const handleToggleExpansion = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleSetActive = (sectionId: string) => {
    setCurrentActiveMode(sectionId);
  };

  // ハンドラー関数 - SettingsContextを使用
  const handleAutoPickToggle = async (value: boolean) => {
    await updateSettings({ isAutoPickEnabled: value });
  };

  const handleManualPickToggle = async (value: boolean) => {
    await updateSettings({ isManualPickEnabled: value });
  };

  const handleSchedulePickToggle = async (value: boolean) => {
    await updateSettings({ isSchedulePickEnabled: value });
    if (value) {
      Alert.alert('実装予定', 'Schedule-Pick機能は実装予定です');
    }
  };

  const handlePlaybackSpeedChange = async (value: number) => {
    await updateSettings({ playbackSpeed: value });
  };

  const handleAutoPlayToggle = async (value: boolean) => {
    await updateSettings({ autoPlay: value });
  };

  const handleVoiceTypePress = () => {
    Alert.alert(
      '音声の種類',
      '使用する音声の種類を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'Alloy（標準）', onPress: () => changeVoiceType('alloy') },
        { text: 'Echo（若い女性）', onPress: () => changeVoiceType('echo') },
        { text: 'Fable（英国男性）', onPress: () => changeVoiceType('fable') },
        { text: 'Nova（若い男性）', onPress: () => changeVoiceType('nova') },
      ]
    );
  };

  const changeVoiceType = async (voice: string) => {
    await updateSettings({ voiceType: voice });
    
    const voiceNames: { [key: string]: string } = {
      'alloy': 'Alloy（標準）',
      'echo': 'Echo（若い女性）', 
      'fable': 'Fable（英国男性）',
      'nova': 'Nova（若い男性）'
    };
    Alert.alert('変更完了', `音声を「${voiceNames[voice]}」に変更しました`);
  };

  const handleQualityPress = () => {
    Alert.alert(
      '音声品質',
      '音声の品質を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '高品質', onPress: () => changeQuality('高品質') },
        { text: '標準', onPress: () => changeQuality('標準') },
        { text: '低品質（節約）', onPress: () => changeQuality('低品質') },
      ]
    );
  };

  const changeQuality = async (quality: string) => {
    await updateSettings({ audioQuality: quality });
    Alert.alert('変更完了', `音声品質を「${quality}」に変更しました`);
  };

  const handleMaxArticlesPress = () => {
    Alert.alert(
      'Auto-Pick記事数',
      'Auto-Pickで生成する記事数を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '3記事', onPress: () => changeMaxArticles(3) },
        { text: '5記事', onPress: () => changeMaxArticles(5) },
        { text: '7記事', onPress: () => changeMaxArticles(7) },
        { text: '10記事', onPress: () => changeMaxArticles(10) },
      ]
    );
  };

  const changeMaxArticles = async (count: number) => {
    await updateSettings({ autoPickMaxArticles: count });
    Alert.alert('変更完了', `Auto-Pick記事数を${count}記事に変更しました`);
  };

  const getSpeedText = (speed: number) => {
    if (speed <= 0.7) return '遅い';
    if (speed <= 0.9) return 'やや遅い';  
    if (speed <= 1.1) return '標準';
    if (speed <= 1.3) return 'やや速い';
    return '速い';
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
          <Text style={styles.headerTitle}>コンテンツと再生</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* AutoPick アコーディオンセクション */}
          <AccordionSection
            id="autopick"
            title="Auto-Pick"
            icon="magic"
            isActive={currentActiveMode === 'autopick'}
            isExpanded={expandedSection === 'autopick'}
            enabled={settings.isAutoPickEnabled}
            summaryItems={[
              {
                icon: 'tags',
                label: '優先ジャンル',
                value: '全て' // TODO: 実装後に動的化
              },
              {
                icon: 'list-ol',
                label: '記事数',
                value: `${settings.autoPickMaxArticles}件`
              }
            ]}
            onToggleExpansion={handleToggleExpansion}
            onSetActive={handleSetActive}
            onToggleEnabled={handleToggleEnabled}
          >
            {/* プロンプト設定（最優先） */}
            <SettingItem
              title="プロンプト設定"
              description="AIが記事を要約する際の指示プロンプト"
              icon="edit"
              rightText="標準"
              onPress={() => Alert.alert('実装予定', 'プロンプトカスタム機能は実装予定です')}
              disabled={currentActiveMode !== 'autopick'}
            />
            
            {/* 有効化切り替え */}
            <SettingItem
              title="Auto-Pick有効化"
              description="AIによる自動記事選択機能を有効にする"
              icon="power-off"
              toggle={true}
              toggleValue={settings.isAutoPickEnabled}
              onToggleChange={handleAutoPickToggle}
            />

            {/* 使用頻度順設定項目 */}
            <SettingItem
              title="記事数設定"
              description="1回の生成で選択する記事数"
              icon="list-ol"
              rightText={`${settings.autoPickMaxArticles}記事`}
              onPress={handleMaxArticlesPress}
              disabled={currentActiveMode !== 'autopick' || !settings.isAutoPickEnabled}
            />

            <SettingItem
              title="音声の種類"
              description="音声生成に使用する音声モデル"
              icon="microphone"
              rightText={settings.voiceType === 'alloy' ? 'Alloy' : settings.voiceType === 'echo' ? 'Echo' : settings.voiceType === 'fable' ? 'Fable' : 'Nova'}
              onPress={handleVoiceTypePress}
              disabled={currentActiveMode !== 'autopick'}
            />

            <SettingItem
              title="優先ジャンル設定"
              description="優先的に選択するニュースジャンル"
              icon="tags"
              rightText="全て"
              onPress={() => Alert.alert('実装予定', '優先ジャンル設定は実装予定です')}
              disabled={currentActiveMode !== 'autopick' || !settings.isAutoPickEnabled}
            />

            <SettingItem
              title="音声品質"
              description="音質とファイルサイズのバランス"
              icon="volume-up"
              rightText={settings.audioQuality}
              onPress={handleQualityPress}
              disabled={currentActiveMode !== 'autopick'}
            />

            <SettingItem
              title="生成スケジュール"
              description="定時Auto-Pickの設定"
              icon="clock-o"
              rightText="無効"
              onPress={() => Alert.alert('実装予定', '生成スケジュール設定は実装予定です')}
              disabled={true}
            />
          </AccordionSection>

          {/* ManualPick アコーディオンセクション */}
          <AccordionSection
            id="manualpick"
            title="Manual-Pick"
            icon="hand-paper-o"
            isActive={currentActiveMode === 'manualpick'}
            isExpanded={expandedSection === 'manualpick'}
            enabled={settings.isManualPickEnabled}
            summaryItems={[
              {
                icon: 'eye',
                label: 'プレビュー',
                value: '有効' // TODO: 実装後に動的化
              },
              {
                icon: 'check-square-o',
                label: '複数選択',
                value: '有効' // TODO: 実装後に動的化
              }
            ]}
            onToggleExpansion={handleToggleExpansion}
            onSetActive={handleSetActive}
            onToggleEnabled={handleToggleEnabled}
          >
            {/* プロンプト設定（最優先） */}
            <SettingItem
              title="プロンプト設定"
              description="手動選択記事の要約プロンプト"
              icon="edit"
              rightText="標準"
              onPress={() => Alert.alert('実装予定', 'プロンプトカスタム機能は実装予定です')}
              disabled={currentActiveMode !== 'manualpick'}
            />

            {/* 有効化切り替え */}
            <SettingItem
              title="Manual-Pick有効化"
              description="手動記事選択機能を有効にする"
              icon="power-off"
              toggle={true}
              toggleValue={settings.isManualPickEnabled}
              onToggleChange={handleManualPickToggle}
            />

            {/* 使用頻度順設定項目 */}
            <SettingItem
              title="音声の種類"
              description="音声生成に使用する音声モデル"
              icon="microphone"
              rightText={settings.voiceType === 'alloy' ? 'Alloy' : settings.voiceType === 'echo' ? 'Echo' : settings.voiceType === 'fable' ? 'Fable' : 'Nova'}
              onPress={handleVoiceTypePress}
              disabled={currentActiveMode !== 'manualpick'}
            />

            <SettingItem
              title="音声品質"
              description="音質とファイルサイズのバランス"
              icon="volume-up"
              rightText={settings.audioQuality}
              onPress={handleQualityPress}
              disabled={currentActiveMode !== 'manualpick'}
            />

            <SettingItem
              title="記事プレビュー"
              description="選択前に記事内容をプレビュー表示"
              icon="eye"
              toggle={true}
              toggleValue={true}
              onToggleChange={() => Alert.alert('実装予定', '記事プレビュー設定は実装予定です')}
              disabled={currentActiveMode !== 'manualpick'}
            />

            <SettingItem
              title="複数選択モード"
              description="一度に複数記事を選択可能にする"
              icon="check-square-o"
              toggle={true}
              toggleValue={true}
              onToggleChange={() => Alert.alert('実装予定', '複数選択モード設定は実装予定です')}
              disabled={currentActiveMode !== 'manualpick'}
            />
          </AccordionSection>

          {/* SchedulePick アコーディオンセクション */}
          <AccordionSection
            id="schedulepick"
            title="Schedule-Pick"
            icon="calendar"
            isActive={currentActiveMode === 'schedulepick'}
            isExpanded={expandedSection === 'schedulepick'}
            enabled={settings.isSchedulePickEnabled}
            summaryItems={[
              {
                icon: 'tags',
                label: '優先ジャンル',
                value: '全て' // TODO: 実装後に動的化
              },
              {
                icon: 'clock-o',
                label: '配信スケジュール',
                value: '未設定' // TODO: 実装後に動的化
              }
            ]}
            onToggleExpansion={handleToggleExpansion}
            onSetActive={handleSetActive}
            onToggleEnabled={handleToggleEnabled}
          >
            {/* プロンプト設定（最優先） */}
            <SettingItem
              title="プロンプト設定"
              description="スケジュール配信用プロンプト"
              icon="edit"
              rightText="標準"
              onPress={() => Alert.alert('実装予定', 'プロンプトカスタム機能は実装予定です')}
              disabled={true}
            />

            {/* 有効化切り替え */}
            <SettingItem
              title="Schedule-Pick有効化"
              description="スケジュール配信機能を有効にする（実装予定）"
              icon="power-off"
              toggle={true}
              toggleValue={settings.isSchedulePickEnabled}
              onToggleChange={handleSchedulePickToggle}
              disabled={true}
            />

            {/* 使用頻度順設定項目 */}
            <SettingItem
              title="配信スケジュール"
              description="定期配信の時間とパターンを設定"
              icon="clock-o"
              rightText="未設定"
              onPress={() => Alert.alert('実装予定', '配信スケジュール設定は実装予定です')}
              disabled={true}
            />

            <SettingItem
              title="プッシュ通知設定"
              description="配信時の通知設定（通知項目と連動）"
              icon="bell"
              toggle={true}
              toggleValue={false}
              onToggleChange={() => Alert.alert('実装予定', '通知設定との連動機能は実装予定です')}
              disabled={true}
            />

            <SettingItem
              title="音声の種類"
              description="スケジュール配信用音声モデル"
              icon="microphone"
              rightText={settings.voiceType === 'alloy' ? 'Alloy' : settings.voiceType === 'echo' ? 'Echo' : settings.voiceType === 'fable' ? 'Fable' : 'Nova'}
              onPress={handleVoiceTypePress}
              disabled={true}
            />

          </AccordionSection>

          {/* 共通音声再生設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>共通再生設定</Text>
            
            <SettingItem
              title="再生速度"
              description="全モード共通の音声再生スピード"
              icon="tachometer"
              rightText={`${settings.playbackSpeed.toFixed(1)}x`}
              onPress={() => {
                Alert.alert(
                  '再生速度',
                  '再生速度を選択してください',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '0.5x（遅い）', onPress: () => handlePlaybackSpeedChange(0.5) },
                    { text: '0.8x（やや遅い）', onPress: () => handlePlaybackSpeedChange(0.8) },
                    { text: '1.0x（標準）', onPress: () => handlePlaybackSpeedChange(1.0) },
                    { text: '1.2x（やや速い）', onPress: () => handlePlaybackSpeedChange(1.2) },
                    { text: '1.5x（速い）', onPress: () => handlePlaybackSpeedChange(1.5) },
                    { text: '2.0x（高速）', onPress: () => handlePlaybackSpeedChange(2.0) },
                  ]
                );
              }}
            />

            <SettingItem
              title="自動再生"
              description="音声生成完了時に自動的に再生開始"
              icon="play-circle"
              toggle={true}
              toggleValue={settings.autoPlay}
              onToggleChange={handleAutoPlayToggle}
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
  rightText: {
    fontSize: 14,
    color: '#888888',
    marginRight: 8,
  },
  statusCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
  // アコーディオンスタイル
  accordionSection: {
    backgroundColor: '#0a0a0a',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeSection: {
    borderWidth: 2,
    borderColor: '#007bff',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  accordionHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionToggleContainer: {
    marginLeft: 12,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  activeAccordionTitle: {
    color: '#007bff',
  },
  accordionContent: {
    overflow: 'hidden',
  },
  accordionContentInner: {
    backgroundColor: '#0a0a0a',
  },
  // 簡易表示サマリースタイル
  summaryContainer: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 8,
    flex: 1,
  },
  summaryValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
});