/**
 * Content & Playback Settings Screen
 * 3大音声生成モード（AutoPick/ManualPick/SchedulePick）の統合管理画面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSettings } from '../../context/SettingsContext';

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
  showArrow = false,
  toggle = false,
  toggleValue = false,
  onToggleChange,
  rightText,
  disabled = false
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, disabled && styles.disabledItem]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <View style={styles.settingLeft}>
        <FontAwesome name={icon as any} size={20} color="#007AFF" style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
          {description && (
            <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
              {description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.settingRight}>
        {rightText && (
          <Text style={[styles.rightText, disabled && styles.disabledText]}>{rightText}</Text>
        )}
        {toggle && (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            disabled={disabled}
            trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
            thumbColor={'#FFFFFF'}
          />
        )}
        {showArrow && !toggle && (
          <FontAwesome name="chevron-right" size={14} color="#C0C0C0" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ContentPlaybackScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const [expandedSection, setExpandedSection] = useState<string | null>('modes');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleAutoPickToggle = (enabled: boolean) => {
    updateSettings({
      pickModes: {
        ...settings.pickModes,
        auto: {
          ...settings.pickModes.auto,
          enabled
        }
      }
    });
  };

  const handleManualPickToggle = (enabled: boolean) => {
    updateSettings({
      pickModes: {
        ...settings.pickModes,
        manual: {
          ...settings.pickModes.manual,
          enabled
        }
      }
    });
  };

  const handleSchedulePickToggle = (enabled: boolean) => {
    updateSettings({
      pickModes: {
        ...settings.pickModes,
        schedule: {
          ...settings.pickModes.schedule,
          enabled
        }
      }
    });
  };

  const showAutoPickSettings = () => {
    Alert.alert('AutoPick設定', 'AutoPick詳細設定は今後実装予定です');
  };

  const showManualPickSettings = () => {
    Alert.alert('ManualPick設定', 'ManualPick詳細設定は今後実装予定です');
  };

  const showSchedulePickSettings = () => {
    router.push('/settings/schedule-manager');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'コンテンツ・再生設定',
          headerShown: true,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 音声生成モード選択セクション */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('modes')}
          >
            <Text style={styles.sectionTitle}>音声生成モード</Text>
            <FontAwesome
              name={expandedSection === 'modes' ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#007AFF"
            />
          </TouchableOpacity>

          {expandedSection === 'modes' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                音声コンテンツの作成方法を選択してください。複数のモードを同時に有効にできます。
              </Text>

              {/* AutoPick */}
              <SettingItem
                icon="magic"
                title="AutoPick（自動選択）"
                description="AIが自動で記事を選択して音声を生成"
                toggle={true}
                toggleValue={settings.pickModes.auto.enabled}
                onToggleChange={handleAutoPickToggle}
                showArrow={settings.pickModes.auto.enabled}
                onPress={settings.pickModes.auto.enabled ? showAutoPickSettings : undefined}
              />

              {/* ManualPick */}
              <SettingItem
                icon="hand-o-up"
                title="ManualPick（手動選択）"
                description="読んだ記事から手動で選択して音声を生成"
                toggle={true}
                toggleValue={settings.pickModes.manual.enabled}
                onToggleChange={handleManualPickToggle}
                showArrow={settings.pickModes.manual.enabled}
                onPress={settings.pickModes.manual.enabled ? showManualPickSettings : undefined}
              />

              {/* SchedulePick */}
              <SettingItem
                icon="clock-o"
                title="SchedulePick（スケジュール）"
                description="指定した時間に自動で音声を生成"
                toggle={true}
                toggleValue={settings.pickModes.schedule.enabled}
                onToggleChange={handleSchedulePickToggle}
                showArrow={settings.pickModes.schedule.enabled}
                onPress={settings.pickModes.schedule.enabled ? showSchedulePickSettings : undefined}
              />
            </View>
          )}
        </View>

        {/* 音声設定セクション */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('audio')}
          >
            <Text style={styles.sectionTitle}>音声設定</Text>
            <FontAwesome
              name={expandedSection === 'audio' ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#007AFF"
            />
          </TouchableOpacity>

          {expandedSection === 'audio' && (
            <View style={styles.sectionContent}>
              <SettingItem
                icon="volume-up"
                title="音声品質"
                description="音声の品質設定"
                rightText={settings.content.audioQuality}
                showArrow={true}
                onPress={() => Alert.alert('音声品質', '詳細設定は今後実装予定です')}
              />

              <SettingItem
                icon="user"
                title="音声タイプ"
                description="音声の種類"
                rightText={settings.content.voiceType}
                showArrow={true}
                onPress={() => Alert.alert('音声タイプ', '詳細設定は今後実装予定です')}
              />
            </View>
          )}
        </View>

        {/* 再生設定セクション */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('playback')}
          >
            <Text style={styles.sectionTitle}>再生設定</Text>
            <FontAwesome
              name={expandedSection === 'playback' ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#007AFF"
            />
          </TouchableOpacity>

          {expandedSection === 'playback' && (
            <View style={styles.sectionContent}>
              <SettingItem
                icon="play"
                title="自動再生"
                description="音声生成完了時に自動で再生開始"
                toggle={true}
                toggleValue={settings.playback.autoPlay}
                onToggleChange={(autoPlay) => updateSettings({
                  playback: { ...settings.playback, autoPlay }
                })}
              />

              <SettingItem
                icon="tachometer"
                title="再生速度"
                description="音声の再生速度"
                rightText={`${settings.playback.playbackSpeed}x`}
                showArrow={true}
                onPress={() => Alert.alert('再生速度', '詳細設定は今後実装予定です')}
              />
            </View>
          )}
        </View>

        {/* 現在の設定状況 */}
        <View style={[styles.section, styles.statusSection]}>
          <Text style={styles.statusTitle}>現在の設定状況</Text>
          <Text style={styles.statusText}>
            AutoPick: {settings.pickModes.auto.enabled ? '有効' : '無効'}{'\n'}
            ManualPick: {settings.pickModes.manual.enabled ? '有効' : '無効'}{'\n'}
            SchedulePick: {settings.pickModes.schedule.enabled ? '有効' : '無効'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  sectionContent: {
    padding: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
    width: 20,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666666',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightText: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  disabledItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999999',
  },
  statusSection: {
    marginTop: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
});