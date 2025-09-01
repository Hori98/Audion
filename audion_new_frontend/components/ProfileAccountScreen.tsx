/**
 * Profile & Account Settings Screen
 * プロフィールとアカウント設定画面
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
import { useAuth } from '../context/AuthContext';

interface ProfileAccountScreenProps {
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

export default function ProfileAccountScreen({ visible, onClose }: ProfileAccountScreenProps) {
  const { user, logout } = useAuth();
  
  // プロフィール設定の状態
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleProfileImagePress = () => {
    Alert.alert(
      'プロフィール画像',
      'プロフィール画像の変更機能は実装予定です'
    );
  };

  const handleDisplayNamePress = () => {
    Alert.alert(
      '表示名の変更', 
      '表示名の変更機能は実装予定です'
    );
  };

  const handleEmailPress = () => {
    Alert.alert(
      'メールアドレス変更',
      'メールアドレス変更機能は実装予定です'
    );
  };

  const handlePasswordPress = () => {
    Alert.alert(
      'パスワード変更',
      'パスワード変更機能は実装予定です'
    );
  };

  const handleBirthdatePress = () => {
    Alert.alert(
      '生年月日設定',
      '生年月日設定機能は実装予定です'
    );
  };

  const handleLoginHistoryPress = () => {
    Alert.alert(
      'ログイン履歴',
      'ログイン履歴確認機能は実装予定です'
    );
  };

  const handleExternalAccountsPress = () => {
    Alert.alert(
      '外部連携',
      'Google, Apple ID等の外部連携機能は実装予定です'
    );
  };

  const handleAccountSuspensionPress = () => {
    Alert.alert(
      'アカウント一時停止',
      'アカウント一時停止機能は実装予定です'
    );
  };

  const handleAccountDeletionPress = () => {
    Alert.alert(
      'アカウント削除',
      'アカウント完全削除機能は実装予定です',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive' }
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
          <Text style={styles.headerTitle}>プロフィールとアカウント</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* プロフィール情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>プロフィール情報</Text>
            
            <SettingItem
              title="プロフィール画像"
              description="プロフィール画像を変更"
              icon="camera"
              onPress={handleProfileImagePress}
            />
            
            <SettingItem
              title="表示名"
              description={user?.email?.split('@')[0] || 'ユーザー'}
              icon="user"
              onPress={handleDisplayNamePress}
            />
            
            <SettingItem
              title="メールアドレス"
              description={user?.email || '未設定'}
              icon="envelope"
              onPress={handleEmailPress}
            />
            
            <SettingItem
              title="生年月日"
              description="任意"
              icon="calendar"
              onPress={handleBirthdatePress}
            />
          </View>

          {/* アカウントセキュリティセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>アカウントセキュリティ</Text>
            
            <SettingItem
              title="パスワード変更"
              description="パスワードを変更"
              icon="lock"
              onPress={handlePasswordPress}
            />
            
            <SettingItem
              title="2段階認証"
              description="セキュリティを強化"
              icon="shield"
              toggle={true}
              toggleValue={twoFactorEnabled}
              onToggleChange={setTwoFactorEnabled}
            />
            
            <SettingItem
              title="ログイン履歴"
              description="ログイン履歴を確認"
              icon="history"
              onPress={handleLoginHistoryPress}
            />
          </View>

          {/* 外部連携セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>外部連携</Text>
            
            <SettingItem
              title="Google アカウント連携"
              description="未連携"
              icon="google"
              onPress={handleExternalAccountsPress}
            />
            
            <SettingItem
              title="Apple ID 連携"
              description="未連携"
              icon="apple"
              onPress={handleExternalAccountsPress}
            />
            
            <SettingItem
              title="Twitter 連携"
              description="任意"
              icon="twitter"
              onPress={handleExternalAccountsPress}
            />
          </View>

          {/* アカウント管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>アカウント管理</Text>
            
            <SettingItem
              title="アカウント一時停止"
              description="アカウントを一時的に無効にする"
              icon="pause"
              onPress={handleAccountSuspensionPress}
              showArrow={false}
            />
            
            <SettingItem
              title="アカウント完全削除"
              description="すべてのデータが削除されます"
              icon="trash"
              onPress={handleAccountDeletionPress}
              showArrow={false}
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
  bottomSpacer: {
    height: 32,
  },
});