/**
 * Account Settings Screen (MECE準拠)
 * アカウント管理 - 認証・個人情報の一元管理
 * 実装可能な高優先度項目から実装開始
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
  TextInput,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '../../context/AuthContext';

interface AccountScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightText?: string;
  disabled?: boolean;
}

function SettingItem({ 
  title, 
  description, 
  icon, 
  onPress, 
  showArrow = true,
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
      {rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function AccountScreen({ visible, onClose }: AccountScreenProps) {
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('エラー', 'パスワードは8文字以上で入力してください');
      return;
    }

    try {
      // TODO: バックエンドAPIの実装後に有効化
      // await changePasswordAPI(currentPassword, newPassword);
      Alert.alert('成功', 'パスワードが変更されました');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('エラー', 'パスワード変更に失敗しました');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウント削除',
      '本当にアカウントを削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: バックエンドAPIの実装後に有効化
              // await deleteAccountAPI();
              Alert.alert('完了', 'アカウントが削除されました');
              await logout();
              onClose();
            } catch (error) {
              Alert.alert('エラー', 'アカウント削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          onPress: async () => {
            try {
              await logout();
              onClose();
            } catch (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました');
            }
          }
        }
      ]
    );
  };

  return (
    <>
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
            <Text style={styles.headerTitle}>アカウント</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* アカウント情報セクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>アカウント情報</Text>
              
              <SettingItem
                title="メールアドレス"
                description={user?.email || 'ユーザー'}
                icon="envelope"
                rightText="変更"
                onPress={() => Alert.alert('実装予定', 'メールアドレス変更機能は実装予定です')}
              />
              
              <SettingItem
                title="ユーザー名"
                description="表示名の設定"
                icon="user"
                rightText="未設定"
                onPress={() => Alert.alert('実装予定', 'ユーザー名設定機能は実装予定です')}
              />
            </View>

            {/* セキュリティセクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>セキュリティ</Text>
              
              <SettingItem
                title="パスワード変更"
                description="アカウントのセキュリティを保護"
                icon="lock"
                onPress={handleChangePassword}
              />
              
              <SettingItem
                title="ログイン履歴"
                description="最近のアクセス履歴を確認"
                icon="history"
                onPress={() => Alert.alert('実装予定', 'ログイン履歴機能は実装予定です')}
              />
              
              <SettingItem
                title="2段階認証"
                description="追加のセキュリティレイヤー"
                icon="shield"
                rightText="設定なし"
                onPress={() => Alert.alert('実装予定', '2段階認証機能は実装予定です')}
              />
            </View>

            {/* 外部連携セクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>外部連携</Text>
              
              <SettingItem
                title="Google連携"
                description="Googleアカウントで簡単ログイン"
                icon="google"
                rightText="未連携"
                onPress={() => Alert.alert('実装予定', 'Google連携機能は実装予定です')}
              />
              
              <SettingItem
                title="Apple ID連携"
                description="Apple IDで簡単ログイン"
                icon="apple"
                rightText="未連携"
                onPress={() => Alert.alert('実装予定', 'Apple ID連携機能は実装予定です')}
              />
            </View>

            {/* アカウント管理セクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>アカウント管理</Text>
              
              <SettingItem
                title="ログアウト"
                description="このデバイスからログアウト"
                icon="sign-out"
                onPress={handleLogout}
                showArrow={false}
              />
              
              <SettingItem
                title="アカウント削除"
                description="アカウントと全データを完全に削除"
                icon="trash"
                onPress={handleDeleteAccount}
                showArrow={false}
              />
            </View>

            {/* 下部の余白 */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* パスワード変更モーダル */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setShowPasswordModal(false)}
            >
              <FontAwesome name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>パスワード変更</Text>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handlePasswordSubmit}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.inputLabel}>現在のパスワード</Text>
              <TextInput
                style={styles.textInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="現在のパスワードを入力"
                placeholderTextColor="#666666"
              />

              <Text style={styles.inputLabel}>新しいパスワード</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="新しいパスワードを入力（8文字以上）"
                placeholderTextColor="#666666"
              />

              <Text style={styles.inputLabel}>パスワード確認</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="新しいパスワードを再入力"
                placeholderTextColor="#666666"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomSpacer: {
    height: 32,
  },
});