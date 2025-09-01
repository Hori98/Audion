/**
 * Content & Playback Settings Screen (MECE準拠)
 * コンテンツと再生 - 「何を」「どのように」聴くかの統合設定
 * Auto-Pick, Manual-Pick, RSS管理, 再生設定を統合
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
} from 'react-native';
// import Slider from '@react-native-community/slider';
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

export default function ContentPlaybackScreen({ visible, onClose }: ContentPlaybackScreenProps) {
  // SettingsContextを使用
  const { settings, updateSettings } = useSettings();

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
          {/* コンテンツ生成方式セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>コンテンツ生成方式</Text>
            
            <SettingItem
              title="Auto-Pick"
              description="AIが自動的に記事を選択して音声生成"
              icon="magic"
              toggle={true}
              toggleValue={settings.isAutoPickEnabled}
              onToggleChange={handleAutoPickToggle}
            />

            <SettingItem
              title="Manual-Pick"
              description="手動で記事を選択して音声生成"
              icon="hand-paper-o"
              toggle={true}
              toggleValue={settings.isManualPickEnabled}
              onToggleChange={handleManualPickToggle}
            />

            <SettingItem
              title="Schedule-Pick"
              description="スケジュールに基づく自動生成"
              icon="calendar"
              toggle={true}
              toggleValue={settings.isSchedulePickEnabled}
              onToggleChange={handleSchedulePickToggle}
              disabled={true}
            />
          </View>

          {/* Auto-Pick詳細設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Auto-Pick設定</Text>
            
            <SettingItem
              title="記事数設定"
              description="1回の生成で選択する記事数"
              icon="list-ol"
              rightText={`${settings.autoPickMaxArticles}記事`}
              onPress={handleMaxArticlesPress}
              disabled={!settings.isAutoPickEnabled}
            />

            <SettingItem
              title="優先ジャンル設定"
              description="優先的に選択するニュースジャンル"
              icon="tags"
              rightText="全て"
              onPress={() => Alert.alert('実装予定', '優先ジャンル設定は実装予定です')}
              disabled={!settings.isAutoPickEnabled}
            />

            <SettingItem
              title="生成スケジュール"
              description="定時Auto-Pickの設定"
              icon="clock-o"
              rightText="無効"
              onPress={() => Alert.alert('実装予定', '生成スケジュール設定は実装予定です')}
              disabled={true}
            />
          </View>

          {/* 音声再生設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>音声再生設定</Text>
            
            <SettingItem
              title="再生速度"
              description="音声の再生スピードを調整"
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
              title="音声の種類"
              description="音声生成に使用する音声モデル"
              icon="microphone"
              rightText={settings.voiceType === 'alloy' ? 'Alloy' : settings.voiceType === 'echo' ? 'Echo' : settings.voiceType === 'fable' ? 'Fable' : 'Nova'}
              onPress={handleVoiceTypePress}
            />

            <SettingItem
              title="音声品質"
              description="音質とファイルサイズのバランス"
              icon="volume-up"
              rightText={settings.audioQuality}
              onPress={handleQualityPress}
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

          {/* RSSフィード管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>RSSフィード管理</Text>
            
            <SettingItem
              title="フィード一覧管理"
              description="購読中のRSSフィードを管理"
              icon="rss"
              onPress={() => Alert.alert('実装予定', 'RSSフィード管理画面は実装予定です')}
            />

            <SettingItem
              title="自動更新設定"
              description="フィードの自動更新間隔"
              icon="refresh"
              rightText="1時間毎"
              onPress={() => Alert.alert('実装予定', '自動更新設定は実装予定です')}
            />

            <SettingItem
              title="記事フィルター"
              description="キーワード・言語による記事フィルタ"
              icon="filter"
              onPress={() => Alert.alert('実装予定', '記事フィルター設定は実装予定です')}
            />
          </View>

          {/* 現在の設定状況表示 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>現在の設定</Text>
            
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <FontAwesome name="magic" size={16} color="#4CAF50" />
                <Text style={styles.statusLabel}>Auto-Pick</Text>
                <Text style={styles.statusValue}>{settings.isAutoPickEnabled ? '有効' : '無効'}</Text>
              </View>
              
              <View style={styles.statusItem}>
                <FontAwesome name="tachometer" size={16} color="#007bff" />
                <Text style={styles.statusLabel}>再生速度</Text>
                <Text style={styles.statusValue}>{settings.playbackSpeed.toFixed(1)}x</Text>
              </View>
              
              <View style={styles.statusItem}>
                <FontAwesome name="microphone" size={16} color="#FF9800" />
                <Text style={styles.statusLabel}>音声</Text>
                <Text style={styles.statusValue}>{settings.voiceType}</Text>
              </View>
            </View>
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
});