/**
 * Settings Screen Component - 簡素化版
 * 4つの音声作成方式に関連する設定のみを表示
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  type: 'toggle' | 'button' | 'info';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

interface SettingsSection {
  title: string;
  items: SettingItem[];
}

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  title: string;
}

export default function SettingsScreen({ visible, onClose, title }: SettingsScreenProps) {
  const { user, logout } = useAuth();
  
  // 4つの音声作成方式に関連する基本設定のみ
  const [autoPickEnabled, setAutoPickEnabled] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const getSettingsSections = (): SettingsSection[] => {
    return [
      {
        title: 'アカウント',
        items: [
          {
            id: 'email',
            title: 'ログイン中',
            description: user?.email || 'ゲスト',
            type: 'info',
          },
          {
            id: 'logout',
            title: 'ログアウト',
            type: 'button',
            onPress: () => {
              Alert.alert(
                'ログアウト',
                'ログアウトしますか？',
                [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: 'ログアウト', style: 'destructive', onPress: logout }
                ]
              );
            },
          },
        ],
      },
      {
        title: '音声作成設定',
        items: [
          {
            id: 'autopick',
            title: 'AutoPick機能',
            description: 'AI自動記事選別機能を使用する',
            type: 'toggle',
            value: autoPickEnabled,
            onToggle: setAutoPickEnabled,
          },
          {
            id: 'schedule',
            title: 'Schedule Pick',
            description: '定期自動配信機能を使用する',
            type: 'toggle',
            value: scheduleEnabled,
            onToggle: setScheduleEnabled,
          },
          {
            id: 'notifications',
            title: '通知',
            description: '音声作成完了時に通知を受け取る',
            type: 'toggle',
            value: notifications,
            onToggle: setNotifications,
          },
          {
            id: 'rss_sources',
            title: 'RSSソース管理',
            description: 'ニュースソースの追加・削除・管理',
            type: 'button',
            onPress: () => Alert.alert('実装予定', 'RSSソース管理画面は実装中です。'),
          },
        ],
      },
      {
        title: '詳細設定',
        items: [
          {
            id: 'autopick_settings',
            title: 'AutoPick詳細設定',
            description: '記事選別アルゴリズムとジャンル設定',
            type: 'button',
            onPress: () => Alert.alert('実装予定', 'AutoPick詳細設定は実装予定です。'),
          },
          {
            id: 'schedule_settings',
            title: 'Schedule詳細設定',
            description: '配信時間とソース設定',
            type: 'button',
            onPress: () => Alert.alert('実装予定', 'Schedule詳細設定は実装予定です。'),
          },
          {
            id: 'voice_settings',
            title: '音声設定',
            description: '音声の種類と速度設定',
            type: 'button',
            onPress: () => Alert.alert('実装予定', '音声設定は実装予定です。'),
          },
        ],
      },
      {
        title: 'その他',
        items: [
          {
            id: 'help',
            title: 'ヘルプ',
            type: 'button',
            onPress: () => Alert.alert('ヘルプ', '4つの音声作成方式について\n\n• AutoPick: AI自動記事選別\n• Manual Pick: 手動記事選択\n• Schedule Pick: 定期自動配信\n• 記事音声: 個別記事URL入力'),
          },
          {
            id: 'version',
            title: 'バージョン',
            description: '1.0.0 (ベータ版)',
            type: 'info',
          },
        ],
      },
    ];
  };

  const renderSettingItem = (item: SettingItem) => {
    switch (item.type) {
      case 'toggle':
        return (
          <View key={item.id} style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.settingDescription}>{item.description}</Text>
              )}
            </View>
            <Switch
              value={item.value || false}
              onValueChange={item.onToggle}
              trackColor={{ false: '#333333', true: '#007bff' }}
              thumbColor={item.value ? '#ffffff' : '#888888'}
            />
          </View>
        );

      case 'button':
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.settingItem}
            onPress={item.onPress}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.settingDescription}>{item.description}</Text>
              )}
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        );

      case 'info':
        return (
          <View key={item.id} style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.settingValue}>{item.description}</Text>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const settingsSections = getSettingsSections();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>設定</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Settings Content */}
        <ScrollView style={styles.scrollContainer}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionContent}>
                {section.items.map(renderSettingItem)}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    marginLeft: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: '#111111',
    marginHorizontal: 20,
    borderRadius: 12,
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
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 2,
  },
  settingArrow: {
    fontSize: 18,
    color: '#666666',
  },
});