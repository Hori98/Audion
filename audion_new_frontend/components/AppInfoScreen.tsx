/**
 * App Info Settings Screen
 * このアプリについて設定画面
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
  Linking,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface AppInfoScreenProps {
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

export default function AppInfoScreen({ visible, onClose }: AppInfoScreenProps) {
  // 設定状態
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [updateNotifications, setUpdateNotifications] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('日本語');

  const handleVersionInfoPress = () => {
    Alert.alert(
      'バージョン情報',
      'Audion v1.0.0\nBuild: 2024123101\n最終更新: 2024年12月31日\n\n新機能:\n• 設定画面の大幅改善\n• パフォーマンス向上\n• バグ修正'
    );
  };

  const handleUpdatePress = () => {
    Alert.alert('アップデート確認', 'アップデートチェック機能は実装予定です');
  };

  const handleUpdateHistoryPress = () => {
    Alert.alert('更新履歴', '更新履歴画面は実装予定です');
  };

  const handleAppStatsPress = () => {
    Alert.alert('アプリ統計', 'アプリ統計表示機能は実装予定です');
  };

  const handleTermsPress = () => {
    Alert.alert('利用規約', '利用規約画面は実装予定です');
  };

  const handlePrivacyPolicyPress = () => {
    Alert.alert('プライバシーポリシー', 'プライバシーポリシー画面は実装予定です');
  };

  const handleLicensesPress = () => {
    Alert.alert('オープンソースライセンス', 'ライセンス表示機能は実装予定です');
  };

  const handleLanguagePress = () => {
    Alert.alert(
      '言語設定',
      '表示言語を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '日本語', onPress: () => setSelectedLanguage('日本語') },
        { text: 'English', onPress: () => setSelectedLanguage('English') },
      ]
    );
  };

  const handleTimezonePress = () => {
    Alert.alert('タイムゾーン設定', 'タイムゾーン設定機能は実装予定です');
  };

  const handleAccessibilityPress = () => {
    Alert.alert('アクセシビリティ', 'アクセシビリティ設定は実装予定です');
  };

  const handleCreditsPress = () => {
    Alert.alert('クレジット・謝辞', 'クレジット表示機能は実装予定です');
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
          <Text style={styles.headerTitle}>このアプリについて</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* アプリ情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>アプリ情報</Text>
            
            <View style={styles.appInfoCard}>
              <View style={styles.appIconContainer}>
                <FontAwesome name="volume-up" size={32} color="#007bff" />
              </View>
              <View style={styles.appDetails}>
                <Text style={styles.appName}>Audion</Text>
                <Text style={styles.appVersion}>Version 1.0.0</Text>
                <Text style={styles.appDescription}>AI音声ニュースアプリ</Text>
              </View>
            </View>
            
            <SettingItem
              title="バージョン情報"
              description="現在のバージョン・ビルド情報"
              icon="info-circle"
              onPress={handleVersionInfoPress}
            />
            
            <SettingItem
              title="自動アップデート"
              description="新バージョンの自動インストール"
              icon="refresh"
              toggle={true}
              toggleValue={autoUpdate}
              onToggleChange={setAutoUpdate}
            />
            
            <SettingItem
              title="アップデート通知"
              description="新バージョン公開の通知"
              icon="bell"
              toggle={true}
              toggleValue={updateNotifications}
              onToggleChange={setUpdateNotifications}
            />
            
            <SettingItem
              title="アップデート確認"
              description="手動でアップデートをチェック"
              icon="cloud-download"
              onPress={handleUpdatePress}
            />
            
            <SettingItem
              title="更新履歴"
              description="過去のアップデート内容"
              icon="history"
              onPress={handleUpdateHistoryPress}
            />
            
            <SettingItem
              title="アプリ統計"
              description="総利用時間・生成音声数"
              icon="bar-chart"
              onPress={handleAppStatsPress}
            />
          </View>

          {/* 法的情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>法的情報</Text>
            
            <SettingItem
              title="利用規約"
              description="サービス利用規約"
              icon="file-text-o"
              onPress={handleTermsPress}
            />
            
            <SettingItem
              title="プライバシーポリシー"
              description="データ収集・利用方針"
              icon="shield"
              onPress={handlePrivacyPolicyPress}
            />
            
            <SettingItem
              title="オープンソースライセンス"
              description="使用ライブラリのライセンス"
              icon="code"
              onPress={handleLicensesPress}
            />
          </View>

          {/* 言語・地域設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>言語・地域設定</Text>
            
            <SettingItem
              title="アプリ表示言語"
              description={selectedLanguage}
              icon="globe"
              onPress={handleLanguagePress}
            />
            
            <SettingItem
              title="タイムゾーン設定"
              description="Asia/Tokyo (UTC+9)"
              icon="clock-o"
              onPress={handleTimezonePress}
            />
            
            <SettingItem
              title="アクセシビリティ"
              description="文字サイズ・高コントラスト"
              icon="universal-access"
              onPress={handleAccessibilityPress}
            />
          </View>

          {/* クレジット・謝辞セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>クレジット・謝辞</Text>
            
            <SettingItem
              title="開発チーム"
              description="Audion Development Team"
              icon="users"
              onPress={handleCreditsPress}
            />
            
            <SettingItem
              title="特別協力"
              description="パートナー・協力企業"
              icon="handshake-o"
              onPress={handleCreditsPress}
            />
            
            <SettingItem
              title="ユーザーコミュニティ"
              description="ベータテスター・フィードバック提供者"
              icon="heart"
              onPress={handleCreditsPress}
            />
          </View>

          {/* システム情報表示 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>システム情報</Text>
            
            <View style={styles.systemCard}>
              <View style={styles.systemItem}>
                <FontAwesome name="mobile" size={16} color="#007bff" />
                <Text style={styles.systemLabel}>デバイス</Text>
                <Text style={styles.systemValue}>iOS 17.0</Text>
              </View>
              
              <View style={styles.systemItem}>
                <FontAwesome name="wifi" size={16} color="#4CAF50" />
                <Text style={styles.systemLabel}>接続状態</Text>
                <Text style={styles.systemValue}>Wi-Fi接続</Text>
              </View>
              
              <View style={styles.systemItem}>
                <FontAwesome name="database" size={16} color="#FF9800" />
                <Text style={styles.systemLabel}>データ使用量</Text>
                <Text style={styles.systemValue}>156 MB</Text>
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
  appInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  appIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 2,
  },
  appDescription: {
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
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingTitleDisabled: {
    color: '#666666',
  },
  settingDescriptionDisabled: {
    color: '#444444',
  },
  systemCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  systemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  systemLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  systemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
});