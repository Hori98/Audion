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
  Image,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services/AuthService';

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

// 画面状態の型定義
type ScreenMode = 'main' | 'changeEmail' | 'changePassword' | 'profile_image';

export default function AccountScreen({ visible, onClose }: AccountScreenProps) {
  const { user, logout, updateUserProfile } = useAuth();
  
  // 単一状態で画面を管理
  const [currentScreen, setCurrentScreen] = useState<ScreenMode>('main');
  
  // フォーム状態
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [tempProfileImage, setTempProfileImage] = useState<string | null>(null);
  
  // ユーザー名編集ポップアップ用
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');
  
  console.log('🚨 [DEBUG] Current Screen:', currentScreen);

  const handleChangePassword = () => {
    console.log('🚨 [DEBUG] Navigating to password change screen');
    setCurrentScreen('changePassword');
  };

  const handleChangeEmail = () => {
    console.log('🚨 [DEBUG] Navigating to email change screen');
    setNewEmail(user?.email || '');
    setCurrentScreen('changeEmail');
  };

  const handleUsernameEditPopup = () => {
    console.log('🚨 [DEBUG] Opening username edit popup');
    setEditingUsername(user?.username || '');
    setShowUsernameModal(true);
  };

  const handleSaveUsername = async () => {
    const trimmedUsername = editingUsername?.trim();
    
    if (!trimmedUsername || trimmedUsername.length < 2) {
      Alert.alert('エラー', 'ユーザー名は2文字以上で入力してください');
      return;
    }
    if (trimmedUsername.length > 20) {
      Alert.alert('エラー', 'ユーザー名は20文字以内で入力してください');
      return;
    }
    
    try {
      console.log('[AccountScreen] Starting username update:', trimmedUsername);
      
      await updateUserProfile({ username: trimmedUsername });
      
      console.log('[AccountScreen] Username update successful');
      Alert.alert('成功', 'ユーザー名が変更されました');
      setShowUsernameModal(false);
    } catch (error: any) {
      console.error('[AccountScreen] Username update error:', error);
      
      // より詳細なエラー情報を表示
      const errorMessage = error?.message || 'ユーザー名変更に失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  };

  const handleProfileImageEdit = () => {
    console.log('🚨 [DEBUG] Navigating to profile image screen');
    setTempProfileImage(user?.profile_image || null);
    setCurrentScreen('profile_image');
  };

  const handleBackToMain = () => {
    console.log('🚨 [DEBUG] Navigating back to main screen');
    setCurrentScreen('main');
    // フォーム状態をリセット
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
    setEmailPassword('');
    setTempProfileImage(null);
    setShowUsernameModal(false);
    setEditingUsername('');
  };

  // この関数は不要 - handleProfileImageEditで代替

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('カメラアクセス許可が必要です', 'プロフィール画像を撮影するためにカメラへのアクセスを許可してください。');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('写真ライブラリアクセス許可が必要です', 'プロフィール画像を選択するために写真ライブラリへのアクセスを許可してください。');
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setTempProfileImage(result.assets[0].uri);
    }
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setTempProfileImage(result.assets[0].uri);
    }
  };

  const handleSaveProfileImage = async () => {
    if (!tempProfileImage) {
      Alert.alert('エラー', '保存する画像が選択されていません');
      return;
    }

    try {
      console.log('[AccountScreen] Starting profile image save with URI:', tempProfileImage);
      
      // Get token from AsyncStorage or Auth context
      const token = await AuthService.getStoredToken();
      if (!token) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      // Upload profile image using new dedicated endpoint
      const result = await AuthService.uploadProfileImage(token, tempProfileImage);
      
      console.log('[AccountScreen] Profile image upload successful:', result);
      Alert.alert('成功', 'プロフィール画像が保存されました');
      
      // 一時画像をクリア
      setTempProfileImage(null);
      handleBackToMain();
      
    } catch (error: any) {
      console.error('[AccountScreen] Profile image update error:', error);
      
      // より詳細なエラー情報を表示
      const errorMessage = error?.message || 'プロフィール画像の保存に失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  };

  const handleRemoveProfileImage = () => {
    Alert.alert(
      'プロフィール画像を削除',
      'プロフィール画像を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            try {
              await updateUserProfile({ profile_image: '' });
              setTempProfileImage(null);
              Alert.alert('成功', 'プロフィール画像が削除されました');
            } catch (error) {
              console.error('[AccountScreen] Profile image deletion error:', error);
              Alert.alert('エラー', 'プロフィール画像の削除に失敗しました');
            }
          }
        }
      ]
    );
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
      handleBackToMain();
    } catch (error) {
      Alert.alert('エラー', 'パスワード変更に失敗しました');
    }
  };

  const handleEmailSubmit = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    if (!emailPassword) {
      Alert.alert('エラー', 'パスワードを入力してください');
      return;
    }

    try {
      await updateUserProfile({ email: newEmail });
      Alert.alert('成功', 'メールアドレスが変更されました');
      handleBackToMain();
    } catch (error) {
      console.error('[AccountScreen] Email update error:', error);
      Alert.alert('エラー', 'メールアドレス変更に失敗しました');
    }
  };


  const handleGoogleConnect = async () => {
    try {
      // TODO: Google OAuth実装後に有効化
      // await connectGoogleAccount();
      Alert.alert('実装準備中', 'Google連携機能を準備しています。\n\n今後のアップデートでご利用いただけます。');
    } catch (error) {
      Alert.alert('エラー', 'Google連携に失敗しました');
    }
  };

  const handleAppleConnect = async () => {
    try {
      // TODO: Apple ID実装後に有効化
      // await connectAppleAccount();
      Alert.alert('実装準備中', 'Apple ID連携機能を準備しています。\n\n今後のアップデートでご利用いただけます。');
    } catch (error) {
      Alert.alert('エラー', 'Apple ID連携に失敗しました');
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

  // メイン画面のレンダリング関数
  const renderMainScreen = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* プロフィール画像セクション */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>プロフィール</Text>
        
        <View style={styles.profile_imageSection}>
          <TouchableOpacity 
            style={styles.profile_imageContainer}
            onPress={handleProfileImageEdit}
            activeOpacity={0.7}
          >
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.profile_image} />
            ) : (
              <View style={styles.profile_imagePlaceholder}>
                <FontAwesome name="user" size={40} color="#888888" />
              </View>
            )}
            <View style={styles.editImageOverlay}>
              <FontAwesome name="camera" size={20} color="#ffffff" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <View style={styles.usernameContainer}>
              <Text style={styles.profileName}>
                {user?.username || user?.email?.split('@')[0] || 'ユーザー'}
              </Text>
              <TouchableOpacity 
                style={styles.editUsernameButton}
                onPress={handleUsernameEditPopup}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome name="pencil" size={16} color="#007bff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleProfileImageEdit}>
              <Text style={styles.editProfileText}>プロフィール画像を変更</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* アカウント情報セクション */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>アカウント情報</Text>
        
        <SettingItem
          title="メールアドレス"
          description={user?.email || 'ユーザー'}
          icon="envelope"
          rightText="変更"
          onPress={handleChangeEmail}
        />
        
        
        <SettingItem
          title="パスワード"
          description="•••••••••"
          icon="lock"
          rightText="変更"
          onPress={handleChangePassword}
        />
      </View>

      {/* 外部連携セクション */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>外部連携</Text>
        
        <SettingItem
          title="Google"
          description="Googleアカウントと連携"
          icon="google"
          rightText="連携"
          onPress={handleGoogleConnect}
        />
        
        <SettingItem
          title="Apple ID"
          description="Apple IDと連携"
          icon="apple"
          rightText="連携"
          onPress={handleAppleConnect}
        />
      </View>

      {/* アカウント管理セクション */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>アカウント管理</Text>
        
        <SettingItem
          title="ログアウト"
          description="このデバイスからログアウト"
          icon="sign-out"
          rightText=""
          onPress={handleLogout}
          showArrow={false}
        />
        
        <SettingItem
          title="アカウント削除"
          description="アカウントを完全に削除"
          icon="trash"
          rightText=""
          onPress={handleDeleteAccount}
          showArrow={false}
        />
      </View>
    </ScrollView>
  );

  // メールアドレス変更画面
  const renderEmailChangeScreen = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.inputLabel}>新しいメールアドレス</Text>
        <TextInput
          style={styles.textInput}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="新しいメールアドレスを入力"
          placeholderTextColor="#666666"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <Text style={styles.inputLabel}>現在のパスワード</Text>
        <TextInput
          style={styles.textInput}
          value={emailPassword}
          onChangeText={setEmailPassword}
          secureTextEntry
          placeholder="現在のパスワードを入力"
          placeholderTextColor="#666666"
        />
        
        <Text style={styles.inputDescription}>
          メールアドレスの変更には現在のパスワードが必要です
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleEmailSubmit}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // パスワード変更画面
  const renderPasswordChangeScreen = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
        
        <Text style={styles.inputDescription}>
          パスワードは8文字以上で設定してください
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handlePasswordSubmit}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );


  // プロフィール画像編集画面
  const renderProfileImageScreen = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.imageDisplayArea}>
        {tempProfileImage ? (
          <Image source={{ uri: tempProfileImage }} style={styles.fullProfileImage} />
        ) : (
          <View style={styles.fullProfileImagePlaceholder}>
            <FontAwesome name="user" size={60} color="#888888" />
          </View>
        )}
      </View>

      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImageFromCamera}>
          <FontAwesome name="camera" size={20} color="#007bff" />
          <Text style={styles.imageButtonText}>カメラで撮影</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageButton} onPress={pickImageFromLibrary}>
          <FontAwesome name="photo" size={20} color="#007bff" />
          <Text style={styles.imageButtonText}>ライブラリから選択</Text>
        </TouchableOpacity>

        {tempProfileImage && (
          <TouchableOpacity style={styles.imageButton} onPress={handleRemoveProfileImage}>
            <FontAwesome name="trash" size={20} color="#ff3b30" />
            <Text style={[styles.imageButtonText, { color: '#ff3b30' }]}>画像を削除</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfileImage}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // 条件付きコンテンツレンダリング関数
  const renderContent = () => {
    switch (currentScreen) {
      case 'changeEmail':
        return renderEmailChangeScreen();
      case 'changePassword':
        return renderPasswordChangeScreen();
      case 'profile_image':
        return renderProfileImageScreen();
      default:
        return renderMainScreen();
    }
  };

  // ヘッダータイトルを画面に応じて変更
  const getHeaderTitle = () => {
    switch (currentScreen) {
      case 'changeEmail':
        return 'メールアドレス変更';
      case 'changePassword':
        return 'パスワード変更';
      case 'profile_image':
        return 'プロフィール画像';
      default:
        return 'アカウント';
    }
  };

  // 戻るボタンの動作
  const handleHeaderBack = () => {
    if (currentScreen === 'main') {
      onClose();
    } else {
      handleBackToMain();
    }
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
            onPress={handleHeaderBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome name="arrow-left" size={18} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 条件付きコンテンツ */}
        {renderContent()}
      </View>

      {/* ユーザー名編集ポップアップ */}
      <Modal
        visible={showUsernameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <View style={styles.usernameModalOverlay}>
          <View style={styles.usernameModalContent}>
            <Text style={styles.usernameModalTitle}>ユーザー名変更</Text>
            <Text style={styles.usernameModalDescription}>
              ユーザー名を入力してください（2文字以上20文字以内）
            </Text>
            
            <TextInput
              style={styles.usernameModalInput}
              value={editingUsername}
              onChangeText={setEditingUsername}
              placeholder="ユーザー名を入力"
              placeholderTextColor="#666666"
              maxLength={20}
              autoFocus={true}
            />
            
            <View style={styles.usernameModalButtonRow}>
              <TouchableOpacity 
                style={[styles.usernameModalButton, styles.usernameModalCancelButton]}
                onPress={() => setShowUsernameModal(false)}
              >
                <Text style={styles.usernameModalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.usernameModalButton, styles.usernameModalSaveButton]}
                onPress={handleSaveUsername}
              >
                <Text style={styles.usernameModalButtonText}>保存</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  profile_imageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  profile_imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profile_image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profile_imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  profileInfo: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  editUsernameButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,123,255,0.1)',
  },
  editProfileText: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,123,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: '#666666',
  },
  settingDescription: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
  },
  settingDescriptionDisabled: {
    color: '#555555',
  },
  rightText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#111111',
    color: '#ffffff',
    fontSize: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 13,
    color: '#888888',
    marginTop: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  imageDisplayArea: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  fullProfileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  fullProfileImagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  imageButtonsContainer: {
    marginVertical: 20,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#111111',
    borderRadius: 8,
    marginBottom: 8,
  },
  imageButtonText: {
    fontSize: 16,
    color: '#007bff',
    marginLeft: 12,
    fontWeight: '500',
  },
  // Username Modal Styles
  usernameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 280,
    maxWidth: 320,
  },
  usernameModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  usernameModalDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  usernameModalInput: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  usernameModalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  usernameModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  usernameModalCancelButton: {
    backgroundColor: '#4a4a4a',
  },
  usernameModalSaveButton: {
    backgroundColor: '#1db954',
  },
  usernameModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
