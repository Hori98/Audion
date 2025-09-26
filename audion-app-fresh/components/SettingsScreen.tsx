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
  Image,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../context/AuthContext';
import AudioGenerationSettings from './AudioGenerationSettings';
import AccountScreen from './settings/AccountScreen';
import RSSSourcesScreen from './settings/RSSSourcesScreen';

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
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showAccountScreen, setShowAccountScreen] = useState(false);
  const [showRSSSourcesScreen, setShowRSSSourcesScreen] = useState(false);

  const getSettingsSections = (): SettingsSection[] => {
    return [
      {
        title: 'アカウント',
        items: [
          {
            id: 'account',
            title: 'アカウント設定',
            description: 'プロファイル、セキュリティ、外部連携',
            type: 'button',
            onPress: () => setShowAccountScreen(true),
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
        ],
      },
      {
        title: '詳細設定',
        items: [
          {
            id: 'audio_generation_settings',
            title: '音声生成プロンプト設定',
            description: 'Auto Pick / Manual / Schedule のプロンプト設定',
            type: 'button',
            onPress: () => setShowAudioSettings(true),
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
        title: 'RSS管理',
        items: [
          {
            id: 'rss_sources',
            title: 'RSSソース管理',
            description: 'ニュースソースの追加・削除・ON/OFF切り替え',
            type: 'button',
            onPress: () => setShowRSSSourcesScreen(true),
          },
        ],
      },
      {
        title: '外観と表示',
        items: [
          {
            id: 'theme',
            title: 'テーマ設定',
            description: 'ダークモード・ライトモード',
            type: 'button',
            onPress: () => Alert.alert('実装予定', 'テーマ設定は実装予定です。'),
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
          {/* User Profile Section */}
          <TouchableOpacity 
            style={styles.userProfileSection}
            onPress={() => setShowAccountScreen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.userAvatarContainer}>
              {user?.profile_image ? (
                <Image source={{ uri: user.profile_image }} style={styles.userAvatar} />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <FontAwesome name="user" size={24} color="#888888" />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.username || user?.display_name || user?.email?.split('@')[0] || 'ユーザー'}
              </Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#666666" />
          </TouchableOpacity>

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
      
      {/* 音声生成設定モーダル */}
      <AudioGenerationSettings
        visible={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
      />

      {/* アカウント設定画面 */}
      <AccountScreen
        visible={showAccountScreen}
        onClose={() => setShowAccountScreen(false)}
      />

      {/* RSSソース管理画面 */}
      <RSSSourcesScreen
        visible={showRSSSourcesScreen}
        onClose={() => setShowRSSSourcesScreen(false)}
      />
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
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  userAvatarContainer: {
    marginRight: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888888',
  },
});