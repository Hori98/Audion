/**
 * Profile & Account Settings Screen
 * プロフィールとアカウント設定画面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  ScrollView,
  Switch,
  Alert,
  Image,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
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
  const { user, updateUserProfile } = useAuth();
  
  // プロフィール設定の状態
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // プロフィール更新関連の状態
  const [newUsername, setNewUsername] = useState(user?.username || user?.display_name || user?.email?.split('@')[0] || 'ユーザー');
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isUsernameModalVisible, setUsernameModalVisible] = useState(false);
  const [tempUsername, setTempUsername] = useState(newUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ユーザー情報が変更された時の処理
  useEffect(() => {
    const currentDisplayName = user?.username || user?.display_name || user?.email?.split('@')[0] || 'ユーザー';
    setNewUsername(currentDisplayName);
    setTempUsername(currentDisplayName);
    setSelectedImage(null);
    setHasChanges(false);
  }, [user]);

  // 変更があるかチェック
  useEffect(() => {
    const currentDisplayName = user?.username || user?.display_name || user?.email?.split('@')[0] || 'ユーザー';
    const usernameChanged = newUsername !== currentDisplayName;
    const imageChanged = selectedImage !== null;
    setHasChanges(usernameChanged || imageChanged);
  }, [newUsername, selectedImage, user]);

  const handleProfileImagePress = async () => {
    try {
      // Webの場合は権限チェックをスキップ
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('権限が必要です', 'プロフィール画像を更新するには、カメラロールへのアクセス許可が必要です。');
          return;
        }
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択中に問題が発生しました。');
    }
  };

  const handleDisplayNamePress = () => {
    setTempUsername(newUsername);
    setUsernameModalVisible(true);
  };

  const handleSaveUsername = () => {
    setNewUsername(tempUsername);
    setUsernameModalVisible(false);
  };

  const handleSaveProfile = async () => {
    if (isSaving || !hasChanges) {
      if (!hasChanges) {
        Alert.alert('変更なし', 'プロフィールに変更点がありません。');
      }
      return;
    }

    setIsSaving(true);

    try {
      const updates: { username?: string; profile_image?: string } = {};
      
      // ユーザー名の変更をチェック
      const currentDisplayName = user?.username || user?.display_name || user?.email?.split('@')[0] || 'ユーザー';
      if (newUsername !== currentDisplayName) {
        updates.username = newUsername;
      }

      // プロフィール画像の変更をチェック
      if (selectedImage) {
        updates.profile_image = selectedImage.uri;
      }

      await updateUserProfile(updates);
      
      Alert.alert('成功', 'プロフィールを更新しました。', [
        { text: 'OK', onPress: () => onClose() }
      ]);
      
    } catch (error: any) {
      console.error('プロフィール更新エラー:', error);
      Alert.alert(
        'エラー', 
        error.message || 'プロフィールの更新中に問題が発生しました。'
      );
    } finally {
      setIsSaving(false);
    }
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

  // プロフィール画像の表示用URI取得
  const getProfileImageUri = () => {
    if (selectedImage) return selectedImage.uri;
    if (user?.profile_image) return user.profile_image;
    return null;
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
          <TouchableOpacity 
            onPress={handleSaveProfile} 
            style={[styles.headerRight, (!hasChanges || isSaving) && styles.headerRightDisabled]}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#007bff" />
            ) : (
              <Text style={[styles.saveButtonText, (!hasChanges || isSaving) && styles.saveButtonTextDisabled]}>
                保存
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* プロフィール情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>プロフィール情報</Text>
            
            {/* プロフィール画像 */}
            <TouchableOpacity onPress={handleProfileImagePress} style={styles.profile_imageContainer}>
              <View style={styles.profile_imageWrapper}>
                {getProfileImageUri() ? (
                  <Image
                    source={{ uri: getProfileImageUri()! }}
                    style={styles.profile_image}
                  />
                ) : (
                  <View style={styles.profile_imagePlaceholder}>
                    <FontAwesome name="user" size={40} color="#666666" />
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  <FontAwesome name="camera" size={16} color="#ffffff" />
                </View>
              </View>
            </TouchableOpacity>
            
            <SettingItem
              title="表示名"
              description={newUsername}
              icon="user"
              onPress={handleDisplayNamePress}
            />
            
            <SettingItem
              title="メールアドレス"
              description={user?.email || '未設定'}
              icon="envelope"
              onPress={handleEmailPress}
              showArrow={false}
              disabled={true}
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

      {/* ユーザー名編集モーダル */}
      <Modal
        transparent={true}
        visible={isUsernameModalVisible}
        animationType="fade"
        onRequestClose={() => setUsernameModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>表示名の変更</Text>
            <TextInput
              style={styles.textInput}
              value={tempUsername}
              onChangeText={setTempUsername}
              autoFocus={true}
              placeholder="表示名を入力"
              placeholderTextColor="#666666"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setUsernameModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={handleSaveUsername}
              >
                <Text style={styles.modalButtonTextPrimary}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerRightDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#666666',
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
  profile_imageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profile_imageWrapper: {
    position: 'relative',
  },
  profile_image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  profile_imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#333333',
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: '#000000',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    backgroundColor: '#333333',
    color: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonPrimary: {
    backgroundColor: '#007bff',
  },
  modalButtonTextCancel: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});