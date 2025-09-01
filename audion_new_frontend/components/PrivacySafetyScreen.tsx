/**
 * Privacy & Safety Settings Screen
 * プライバシーと安全設定画面
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

interface PrivacySafetyScreenProps {
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

export default function PrivacySafetyScreen({ visible, onClose }: PrivacySafetyScreenProps) {
  // 設定状態
  const [saveHistory, setSaveHistory] = useState(true);
  const [allowPersonalization, setAllowPersonalization] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleHistoryManagementPress = () => {
    Alert.alert('履歴管理', '閲覧・再生履歴の管理機能は実装予定です');
  };

  const handleDataExportPress = () => {
    Alert.alert('データエクスポート', 'GDPR準拠データ取得機能は実装予定です');
  };

  const handleKeywordBlockPress = () => {
    Alert.alert('キーワードブロック', 'NGキーワード設定機能は実装予定です');
  };

  const handleSourceBlockPress = () => {
    Alert.alert('ソースブロック', 'RSS源ブロック機能は実装予定です');
  };

  const handleContentFilterPress = () => {
    Alert.alert('コンテンツフィルター', 'アダルト・暴力コンテンツフィルターは実装予定です');
  };

  const handleAppLockSettingsPress = () => {
    Alert.alert('アプリロック設定', 'PIN・パスワード設定は実装予定です');
  };

  const handleDeviceManagementPress = () => {
    Alert.alert('デバイス管理', 'ログイン中デバイス管理は実装予定です');
  };

  const handleSecurityLogPress = () => {
    Alert.alert('セキュリティログ', 'セキュリティログ確認は実装予定です');
  };

  const handleClearAllHistoryPress = () => {
    Alert.alert(
      '履歴の全削除',
      'すべての閲覧・再生履歴を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => {
          Alert.alert('完了', '履歴を削除しました（実装予定）');
        }}
      ]
    );
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
          <Text style={styles.headerTitle}>プライバシーと安全</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 個人データ管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>個人データ管理</Text>
            
            <SettingItem
              title="パーソナライズのためのデータ利用"
              description="閲覧履歴を使用した最適化"
              icon="user-circle"
              toggle={true}
              toggleValue={allowPersonalization}
              onToggleChange={setAllowPersonalization}
            />
            
            <SettingItem
              title="閲覧・再生履歴の保存"
              description="履歴を保存してパーソナライズ"
              icon="history"
              toggle={true}
              toggleValue={saveHistory}
              onToggleChange={setSaveHistory}
            />
            
            <SettingItem
              title="履歴の管理"
              description="履歴表示・個別削除"
              icon="list"
              onPress={handleHistoryManagementPress}
            />
            
            <SettingItem
              title="全履歴削除"
              description="すべての履歴を削除"
              icon="trash"
              onPress={handleClearAllHistoryPress}
              showArrow={false}
            />
            
            <SettingItem
              title="データエクスポート"
              description="GDPR準拠データ取得"
              icon="download"
              onPress={handleDataExportPress}
            />
          </View>

          {/* ブロック・フィルターセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ブロック・フィルター</Text>
            
            <SettingItem
              title="キーワードブロック"
              description="NGキーワード設定"
              icon="ban"
              onPress={handleKeywordBlockPress}
            />
            
            <SettingItem
              title="ソースブロック"
              description="特定RSS源・ドメインブロック"
              icon="times-circle"
              onPress={handleSourceBlockPress}
            />
            
            <SettingItem
              title="コンテンツフィルター"
              description="アダルト・暴力・政治コンテンツ"
              icon="filter"
              onPress={handleContentFilterPress}
            />
          </View>

          {/* セキュリティ設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>セキュリティ設定</Text>
            
            <SettingItem
              title="アプリロック"
              description="PIN・パスワードでアプリを保護"
              icon="lock"
              toggle={true}
              toggleValue={appLockEnabled}
              onToggleChange={setAppLockEnabled}
            />
            
            <SettingItem
              title="生体認証"
              description="指紋・顔認証でロック解除"
              icon="fingerprint"
              toggle={true}
              toggleValue={biometricEnabled}
              onToggleChange={setBiometricEnabled}
              disabled={!appLockEnabled}
            />
            
            <SettingItem
              title="アプリロック設定"
              description="自動ロック時間・設定変更"
              icon="cog"
              onPress={handleAppLockSettingsPress}
              disabled={!appLockEnabled}
            />
            
            <SettingItem
              title="デバイス管理"
              description="ログイン中デバイス・リモートログアウト"
              icon="mobile"
              onPress={handleDeviceManagementPress}
            />
            
            <SettingItem
              title="セキュリティログ"
              description="ログイン履歴・設定変更履歴"
              icon="shield"
              onPress={handleSecurityLogPress}
            />
          </View>

          {/* データ使用同意セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>データ使用同意</Text>
            
            <View style={styles.consentCard}>
              <View style={styles.consentItem}>
                <FontAwesome name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.consentText}>必須データ収集</Text>
                <Text style={styles.consentRequired}>必須</Text>
              </View>
              
              <View style={styles.consentItem}>
                <FontAwesome name="chart-bar" size={16} color="#007bff" />
                <Text style={styles.consentText}>匿名統計データ提供</Text>
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: '#333333', true: '#007bff' }}
                  thumbColor="#ffffff"
                />
              </View>
              
              <View style={styles.consentItem}>
                <FontAwesome name="bullhorn" size={16} color="#FF9800" />
                <Text style={styles.consentText}>マーケティング利用同意</Text>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  trackColor={{ false: '#333333', true: '#007bff' }}
                  thumbColor="#cccccc"
                />
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
  consentCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  consentRequired: {
    fontSize: 12,
    color: '#888888',
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bottomSpacer: {
    height: 32,
  },
});