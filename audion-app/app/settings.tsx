import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DebugMenu from '../components/DebugMenu';
import DebugService from '../services/DebugService';

interface QuickSettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function QuickSettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  
  const [debugMenuVisible, setDebugMenuVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const quickSettings: QuickSettingItem[] = [
    {
      id: 'sources',
      title: 'RSSソース管理',
      subtitle: 'ニュースソースの追加・管理',
      icon: 'newspaper-outline',
      type: 'navigation',
      onPress: () => router.push('/sources')
    },
    {
      id: 'theme',
      title: 'テーマ',
      subtitle: `現在: ${themeMode === 'system' ? 'システム' : themeMode === 'dark' ? 'ダーク' : 'ライト'}`,
      icon: 'contrast-outline',
      type: 'navigation',
      onPress: () => setThemeModalVisible(true)
    },
    {
      id: 'notifications',
      title: 'プッシュ通知',
      subtitle: '新着音声の通知',
      icon: 'notifications-outline',
      type: 'toggle',
      value: notificationsEnabled,
      onToggle: setNotificationsEnabled
    },
    {
      id: 'account',
      title: 'アカウント',
      subtitle: user?.email || 'ユーザー情報',
      icon: 'person-outline',
      type: 'navigation',
      onPress: () => Alert.alert('開発中', 'アカウント設定は開発中です')
    },
    {
      id: 'developer',
      title: '開発者オプション',
      subtitle: DebugService.isDebugModeEnabled() ? 'デバッグモード有効' : 'デバッグモード無効',
      icon: 'code-outline',
      type: 'navigation',
      onPress: () => setDebugMenuVisible(true)
    },
    {
      id: 'logout',
      title: 'ログアウト',
      subtitle: 'アカウントからサインアウト',
      icon: 'log-out-outline',
      type: 'action',
      onPress: handleLogout
    }
  ];

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Option A Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="flash-outline" size={24} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.primary }]}>
              即消費体験に最適化
            </Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              複雑な設定を排除し、すぐに音声を楽しめる設計にしました。
              必要な設定のみを厳選しています。
            </Text>
          </View>
        </View>

        {/* Quick Settings */}
        <View style={styles.settingsContainer}>
          {quickSettings.map((setting) => (
            <TouchableOpacity
              key={setting.id}
              style={[styles.settingItem, { backgroundColor: theme.card }]}
              onPress={setting.onPress}
              disabled={!setting.onPress && setting.type !== 'toggle'}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accent }]}>
                  <Ionicons 
                    name={setting.icon as any} 
                    size={20} 
                    color={theme.primary} 
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    {setting.title}
                  </Text>
                  {setting.subtitle && (
                    <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                      {setting.subtitle}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.settingRight}>
                {setting.type === 'toggle' && setting.onToggle ? (
                  <Switch
                    value={setting.value}
                    onValueChange={setting.onToggle}
                    trackColor={{ false: theme.textMuted, true: theme.primary + '40' }}
                    thumbColor={setting.value ? theme.primary : '#f4f3f4'}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: theme.textMuted }]}>
            Audion v1.0 Option A
          </Text>
          <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
            AI-powered instant news consumption
          </Text>
        </View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={themeModalVisible}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setThemeModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>テーマ選択</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {[
              { key: 'light', name: 'ライト', icon: 'sunny-outline' },
              { key: 'dark', name: 'ダーク', icon: 'moon-outline' },
              { key: 'system', name: 'システム', icon: 'phone-portrait-outline' }
            ].map((themeOption) => (
              <TouchableOpacity
                key={themeOption.key}
                style={[
                  styles.themeOption,
                  { backgroundColor: theme.card },
                  themeMode === themeOption.key && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                  setThemeMode(themeOption.key as any);
                  setThemeModalVisible(false);
                }}
              >
                <Ionicons 
                  name={themeOption.icon as any} 
                  size={24} 
                  color={themeMode === themeOption.key ? theme.primary : theme.textMuted} 
                />
                <Text style={[
                  styles.themeOptionText,
                  { color: themeMode === themeOption.key ? theme.primary : theme.text }
                ]}>
                  {themeOption.name}
                </Text>
                {themeMode === themeOption.key && (
                  <Ionicons name="checkmark" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Debug Menu Modal */}
      <DebugMenu
        visible={debugMenuVisible}
        onClose={() => setDebugMenuVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingsContainer: {
    gap: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
});