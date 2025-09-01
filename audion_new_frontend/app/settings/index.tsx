/**
 * 設定画面 - 2段階設計（メインリスト＋詳細設定タブ）
 * 重要設定を優先し、詳細設定は別タブで管理
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  View,
  Text,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'main' | 'advanced'>('main');
  
  // 音声作成設定の状態
  const [autoPickEnabled, setAutoPickEnabled] = useState(true);
  const [manualPickEnabled, setManualPickEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // メインリスト用のハンドラー
  const handleRSSSourcesPress = () => {
    router.push('/settings/rss-sources');
  };

  const handleAutoPickDetailPress = () => {
    console.log('AutoPick詳細設定 - 将来実装予定');
  };

  const handleManualPickDetailPress = () => {
    console.log('ManualPick詳細設定 - 将来実装予定');
  };

  const handleHelpPress = () => {
    console.log('ヘルプ - 将来実装予定');
  };

  const handleLogoutPress = () => {
    logout();
  };

  // 詳細設定タブ用のハンドラー
  const handleThemePress = () => {
    console.log('テーマ設定 - 将来実装予定');
  };

  const handleLanguagePress = () => {
    console.log('言語設定 - 将来実装予定');
  };

  const handleNotificationDetailPress = () => {
    console.log('通知詳細設定 - 将来実装予定');
  };

  const handlePromptManagementPress = () => {
    console.log('プロンプト管理 - 将来実装予定');
  };

  const handlePrivacyPress = () => {
    console.log('プライバシー設定 - 将来実装予定');
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="arrow-left" size={18} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerRight} />
      </View>

      {/* タブ切り替えボタン */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'main' && styles.activeTabButton]}
          onPress={() => setSelectedTab('main')}
        >
          <Text style={[styles.tabText, selectedTab === 'main' && styles.activeTabText]}>
            📱 メインリスト
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'advanced' && styles.activeTabButton]}
          onPress={() => setSelectedTab('advanced')}
        >
          <Text style={[styles.tabText, selectedTab === 'advanced' && styles.activeTabText]}>
            🔧 設定とプライバシー
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'main' ? (
          // メインリスト（重要設定）
          <>
            {/* アカウントセクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🔐 アカウント</Text>
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  <FontAwesome name="user" size={20} color="#ffffff" />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>ログイン中: {user?.email}</Text>
                </View>
              </View>
              <SettingItem
                title="ログアウト"
                icon="sign-out"
                onPress={handleLogoutPress}
                showArrow={false}
              />
            </View>

            {/* 音声作成設定 */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🎵 音声作成設定</Text>
              <SettingItem
                title="AutoPick機能"
                description="自動音声生成機能"
                icon="magic"
                toggle={true}
                toggleValue={autoPickEnabled}
                onToggleChange={setAutoPickEnabled}
              />
              <SettingItem
                title="Manual Pick機能"
                description="手動音声生成機能"
                icon="hand-paper-o"
                toggle={true}
                toggleValue={manualPickEnabled}
                onToggleChange={setManualPickEnabled}
              />
              <SettingItem
                title="通知"
                description="音声完了通知"
                icon="bell"
                toggle={true}
                toggleValue={notificationsEnabled}
                onToggleChange={setNotificationsEnabled}
              />
              <SettingItem
                title="📡 RSSソース管理"
                description="購読中のRSSフィードを管理"
                icon="rss"
                onPress={handleRSSSourcesPress}
              />
              <SettingItem
                title="⚙️ AutoPick詳細設定"
                description="自動生成の詳細オプション"
                icon="cog"
                onPress={handleAutoPickDetailPress}
              />
              <SettingItem
                title="⚙️ ManualPick詳細設定"
                description="手動生成の詳細オプション"
                icon="wrench"
                onPress={handleManualPickDetailPress}
              />
            </View>

            {/* その他 */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>📋 その他</Text>
              <SettingItem
                title="ヘルプ"
                description="使い方とサポート"
                icon="question-circle"
                onPress={handleHelpPress}
              />
              <SettingItem
                title="バージョン: 1.0.0"
                icon="info-circle"
                showArrow={false}
              />
            </View>
          </>
        ) : (
          // 詳細設定タブ（「設定とプライバシー」）
          <>
            {/* 表示設定 */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🎨 表示設定</Text>
              <SettingItem
                title="テーマ"
                description="ダーク/ライト/システム"
                icon="paint-brush"
                onPress={handleThemePress}
              />
              <SettingItem
                title="言語"
                description="日本語/English"
                icon="globe"
                onPress={handleLanguagePress}
              />
            </View>

            {/* 通知詳細設定 */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🔔 通知詳細設定</Text>
              <SettingItem
                title="通知詳細設定"
                description="プッシュ通知、音声完了、定期配信"
                icon="bell-o"
                onPress={handleNotificationDetailPress}
              />
            </View>

            {/* プロンプト管理 */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>📝 プロンプト管理</Text>
              <SettingItem
                title="プロンプト管理"
                description="標準・カスタム・履歴"
                icon="edit"
                onPress={handlePromptManagementPress}
              />
            </View>

            {/* プライバシー */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>🔒 プライバシー</Text>
              <SettingItem
                title="プライバシー設定"
                description="データ使用量、キャッシュクリア、デバッグ情報"
                icon="shield"
                onPress={handlePrivacyPress}
              />
            </View>

            {/* 今後の機能（ローンチ版） */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>⏰ 今後の機能（ローンチ版）</Text>
              <SettingItem
                title="SchedulePick設定"
                description="スケジュール音声生成（開発予定）"
                icon="clock-o"
                disabled={true}
                showArrow={false}
              />
            </View>
          </>
        )}

        {/* 下部の余白 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#888888',
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
  bottomSpacer: {
    height: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
  },
  activeTabText: {
    color: '#ffffff',
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
});