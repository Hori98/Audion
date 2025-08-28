/**
 * Settings Screen Component
 * Comprehensive settings management screen
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
  const { user } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);

  const getSettingsSections = (): SettingsSection[] => {
    switch (title) {
      case 'プロフィール':
        return [
          {
            title: 'アカウント情報',
            items: [
              {
                id: 'email',
                title: 'メールアドレス',
                description: user?.email || '',
                type: 'info',
              },
              {
                id: 'username',
                title: 'ユーザー名',
                description: user?.email?.split('@')[0] || '',
                type: 'button',
                onPress: () => Alert.alert('ユーザー名変更', '実装予定の機能です'),
              },
              {
                id: 'password',
                title: 'パスワード変更',
                type: 'button',
                onPress: () => Alert.alert('パスワード変更', '実装予定の機能です'),
              },
            ],
          },
          {
            title: 'プロフィール設定',
            items: [
              {
                id: 'bio',
                title: 'プロフィール文',
                type: 'button',
                onPress: () => Alert.alert('プロフィール編集', '実装予定の機能です'),
              },
              {
                id: 'avatar',
                title: 'プロフィール画像',
                type: 'button',
                onPress: () => Alert.alert('画像変更', '実装予定の機能です'),
              },
            ],
          },
        ];

      case '通知':
        return [
          {
            title: 'プッシュ通知',
            items: [
              {
                id: 'push',
                title: 'プッシュ通知',
                description: 'アプリからの通知を受け取る',
                type: 'toggle',
                value: pushNotifications,
                onToggle: setPushNotifications,
              },
              {
                id: 'email',
                title: 'メール通知',
                description: 'メールで重要な更新を受け取る',
                type: 'toggle',
                value: emailNotifications,
                onToggle: setEmailNotifications,
              },
            ],
          },
          {
            title: '通知内容',
            items: [
              {
                id: 'new_content',
                title: '新しいコンテンツ',
                type: 'button',
                onPress: () => Alert.alert('通知設定', '実装予定の機能です'),
              },
              {
                id: 'social',
                title: 'ソーシャル通知',
                type: 'button',
                onPress: () => Alert.alert('通知設定', '実装予定の機能です'),
              },
            ],
          },
        ];

      case 'プライバシーと安全':
        return [
          {
            title: 'プライバシー設定',
            items: [
              {
                id: 'privacy_level',
                title: 'プライバシーレベル',
                type: 'button',
                onPress: () => Alert.alert('プライバシー設定', '実装予定の機能です'),
              },
              {
                id: 'data_usage',
                title: 'データ使用量',
                type: 'button',
                onPress: () => Alert.alert('データ設定', '実装予定の機能です'),
              },
            ],
          },
        ];

      case '設定とプライバシー':
        return [
          {
            title: 'アプリケーション設定',
            items: [
              {
                id: 'theme',
                title: 'ダークモード',
                description: '目に優しい暗いテーマを使用',
                type: 'toggle',
                value: darkMode,
                onToggle: setDarkMode,
              },
              {
                id: 'autoplay',
                title: '自動再生',
                description: 'コンテンツを自動的に再生',
                type: 'toggle',
                value: autoPlay,
                onToggle: setAutoPlay,
              },
            ],
          },
          {
            title: 'ストレージ',
            items: [
              {
                id: 'cache',
                title: 'キャッシュをクリア',
                type: 'button',
                onPress: () => Alert.alert('キャッシュクリア', '実装予定の機能です'),
              },
              {
                id: 'downloads',
                title: 'ダウンロード管理',
                type: 'button',
                onPress: () => Alert.alert('ダウンロード管理', '実装予定の機能です'),
              },
            ],
          },
        ];

      default:
        return [];
    }
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
          <Text style={styles.headerTitle}>{title}</Text>
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