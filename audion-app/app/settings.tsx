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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import DebugMenu from '../components/DebugMenu';
import DebugService from '../services/DebugService';
import CacheService from '../services/CacheService';
import ArticleManagerService from '../services/ArticleManagerService';
import ArchiveService from '../services/ArchiveService';
import BookmarkService from '../services/BookmarkService';
import UserProfileService, { UserProfile } from '../services/UserProfileService';

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
  const { 
    currentLanguage, 
    setLanguage, 
    supportedLanguages,
    currentVoiceLanguage,
    setVoiceLanguage,
    supportedVoiceLanguages
  } = useLanguage();
  const { t } = useTranslation();
  
  const [debugMenuVisible, setDebugMenuVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [voiceLanguageModalVisible, setVoiceLanguageModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profileService = UserProfileService.getInstance();
        if (user?.token) {
          profileService.setAuthToken(user.token);
          const profile = await profileService.getCurrentUserProfile();
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

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

  const handleClearCache = () => {
    console.log('⚙️ Settings - Cache clear button pressed');
    Alert.alert(
      'キャッシュクリア',
      'アプリのキャッシュをクリアしますか？これにより、最新のニュースを取得できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'クリア', 
          style: 'destructive',
          onPress: async () => {
            console.log('⚙️ Settings - Starting comprehensive cache clear operation');
            try {
              // Clear all service caches
              console.log('⚙️ Settings - Clearing CacheService...');
              await CacheService.clear();
              
              console.log('⚙️ Settings - Clearing ArticleManagerService cache...');
              await ArticleManagerService.getInstance().clearCache();
              
              console.log('⚙️ Settings - Clearing ArchiveService cache...');
              ArchiveService.getInstance().clearCache();
              
              console.log('⚙️ Settings - Clearing BookmarkService cache...');
              BookmarkService.getInstance().clearCache();
              
              console.log('⚙️ Settings - All caches cleared successfully');
              Alert.alert(
                '完了', 
                'すべてのキャッシュをクリアしました。アプリを再起動して最新のニュースを取得してください。',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      console.log('⚙️ Settings - User acknowledged cache clear completion');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('⚙️ Settings - Cache clear error:', error);
              Alert.alert('エラー', 'キャッシュのクリアに失敗しました。詳細はログを確認してください。');
            }
          }
        }
      ]
    );
  };

  const getThemeDisplayName = () => {
    switch (themeMode) {
      case 'system': return t('settings.systemTheme');
      case 'dark': return t('settings.darkTheme');
      case 'light': return t('settings.lightTheme');
      default: return themeMode;
    }
  };

  const getCurrentLanguageName = () => {
    return supportedLanguages.find(lang => lang.code === currentLanguage)?.nativeName || 'English';
  };

  const getCurrentVoiceLanguageName = () => {
    return supportedVoiceLanguages.find(lang => lang.code === currentVoiceLanguage)?.nativeName || 'English (US)';
  };

  // Define settings by sections for better organization
  const languageSettings: QuickSettingItem[] = [
    {
      id: 'ui-language',
      title: 'アプリの表示言語',
      subtitle: 'App Interface: ' + getCurrentLanguageName(),
      icon: 'phone-portrait-outline',
      type: 'navigation',
      onPress: () => setLanguageModalVisible(true)
    },
    {
      id: 'voice-language',
      title: '音声・原稿の言語',
      subtitle: 'Script & Voice: ' + getCurrentVoiceLanguageName(),
      icon: 'musical-note-outline',
      type: 'navigation',
      onPress: () => setVoiceLanguageModalVisible(true)
    }
  ];

  const appSettings: QuickSettingItem[] = [
    {
      id: 'sources',
      title: t('settings.rssSourceManagement'),
      subtitle: t('settings.rssSourceSubtitle'),
      icon: 'newspaper-outline',
      type: 'navigation',
      onPress: () => router.push('/sources')
    },
    {
      id: 'theme',
      title: t('settings.theme'),
      subtitle: t('settings.themeSubtitle', { theme: getThemeDisplayName() }),
      icon: 'contrast-outline',
      type: 'navigation',
      onPress: () => setThemeModalVisible(true)
    },
    {
      id: 'schedule',
      title: t('settings.scheduleDelivery'),
      subtitle: t('settings.scheduleSubtitle'),
      icon: 'time-outline',
      type: 'navigation',
      onPress: () => router.push('/schedule-content-settings')
    },
    {
      id: 'auto-pick',
      title: 'Auto-Pick設定',
      subtitle: '記事選定アルゴリズムの詳細設定',
      icon: 'settings-outline',
      type: 'navigation',
      onPress: () => router.push('/auto-pick-settings')
    },
    {
      id: 'prompt-settings',
      title: 'プロンプト設定',
      subtitle: '全ての音声作成方法のプロンプトスタイル設定',
      icon: 'chatbubble-ellipses-outline',
      type: 'navigation',
      onPress: () => router.push('/prompt-settings')
    },
    {
      id: 'notifications',
      title: t('settings.pushNotifications'),
      subtitle: t('settings.notificationSubtitle'),
      icon: 'notifications-outline',
      type: 'navigation',
      onPress: () => router.push('/notification-settings')
    },
    {
      id: 'clear-cache',
      title: 'キャッシュクリア',
      subtitle: '記事とデータのキャッシュをクリアして最新情報を取得',
      icon: 'trash-outline',
      type: 'action',
      onPress: handleClearCache
    }
  ];

  const accountSettings: QuickSettingItem[] = [
    {
      id: 'account-details',
      title: 'アカウント詳細設定',
      subtitle: '詳細なプロフィール設定・プライバシー・通知設定',
      icon: 'settings-outline',
      type: 'navigation',
      onPress: () => router.push('/profile')
    },
    {
      id: 'subscription',
      title: 'Subscription Limits',
      subtitle: 'View your plan limits and usage',
      icon: 'diamond-outline',
      type: 'navigation',
      onPress: () => router.push('/subscription-limits')
    },
    {
      id: 'developer',
      title: t('settings.developerOptions'),
      subtitle: DebugService.isDebugModeEnabled() ? t('settings.debugEnabled') : t('settings.debugDisabled'),
      icon: 'code-outline',
      type: 'navigation',
      onPress: () => setDebugMenuVisible(true)
    },
    {
      id: 'logout',
      title: t('settings.logout'),
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
          onPress={() => {
            try {
              if (router.canGoBack()) {
                router.back();
              } else {
                // フォールバック: ホーム画面に移動
                router.replace('/(tabs)/');
              }
            } catch (error) {
              console.warn('Navigation error:', error);
              router.replace('/(tabs)/');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Info Card */}
        <TouchableOpacity 
          style={[styles.accountCard, { backgroundColor: theme.card }]}
          onPress={() => setAccountModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.accountAvatar}>
            {userProfile?.avatar_url ? (
              <Image 
                source={{ uri: userProfile.avatar_url }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.defaultAvatar, { backgroundColor: theme.accent }]}>
                <Ionicons name="person" size={24} color={theme.primary} />
              </View>
            )}
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: theme.text }]}>
              {userProfile?.display_name || user?.email || 'ユーザー'}
            </Text>
            <Text style={[styles.accountEmail, { color: theme.textSecondary }]}>
              {userProfile?.email || user?.email || 'user@example.com'}
            </Text>
            {userProfile && (
              <View style={styles.accountStats}>
                <Text style={[styles.accountStatsText, { color: theme.textSecondary }]}>
                  {userProfile.audio_count || 0} 音声 • {userProfile.followers_count || 0} フォロワー
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Language Settings Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🌍 言語設定 / Language Settings
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            アプリの表示言語と音声・原稿の言語は独立して設定できます
          </Text>
          <View style={styles.settingsContainer}>
            {languageSettings.map((setting) => (
              <TouchableOpacity
                key={setting.id}
                style={[styles.settingItem, { backgroundColor: theme.card }]}
                onPress={() => {
                  if (setting.onPress) {
                    setting.onPress();
                  }
                }}
                disabled={!setting.onPress}
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
                  {setting.type === 'toggle' && (
                    <Switch
                      value={setting.value}
                      onValueChange={setting.onToggle}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor={setting.value ? '#fff' : theme.background}
                    />
                  )}
                  {(setting.type === 'navigation' || setting.type === 'action') && (
                    <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            ⚙️ アプリ設定 / App Settings
          </Text>
          <View style={styles.settingsContainer}>
            {appSettings.map((setting) => (
              <TouchableOpacity
                key={setting.id}
                style={[styles.settingItem, { backgroundColor: theme.card }]}
                onPress={() => {
                  if (setting.onPress) {
                    setting.onPress();
                  }
                }}
                disabled={!setting.onPress}
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
                  {setting.type === 'toggle' && (
                    <Switch
                      value={setting.value}
                      onValueChange={setting.onToggle}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor={setting.value ? '#fff' : theme.background}
                    />
                  )}
                  {(setting.type === 'navigation' || setting.type === 'action') && (
                    <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account & Advanced Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            👤 アカウント / Account & Advanced
          </Text>
          <View style={styles.settingsContainer}>
            {accountSettings.map((setting) => (
              <TouchableOpacity
                key={setting.id}
                style={[styles.settingItem, { backgroundColor: theme.card }]}
                onPress={() => {
                  if (setting.onPress) {
                    setting.onPress();
                  }
                }}
                disabled={!setting.onPress}
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
                  {setting.type === 'toggle' && (
                    <Switch
                      value={setting.value}
                      onValueChange={setting.onToggle}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor={setting.value ? '#fff' : theme.background}
                    />
                  )}
                  {(setting.type === 'navigation' || setting.type === 'action') && (
                    <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
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

      {/* Language Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setLanguageModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>アプリ表示言語</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.voiceLanguageDescription, { color: theme.textSecondary }]}>
              アプリのメニューや設定画面の表示言語を選択してください。音声や原稿の言語は別途設定できます。
            </Text>
            
            {supportedLanguages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  { backgroundColor: theme.card },
                  currentLanguage === language.code && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={async () => {
                  await setLanguage(language.code);
                  setLanguageModalVisible(false);
                }}
              >
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, { color: theme.text }]}>
                    {language.nativeName}
                  </Text>
                  <Text style={[styles.languageEnglishName, { color: theme.textSecondary }]}>
                    {language.name}
                  </Text>
                </View>
                {currentLanguage === language.code && (
                  <Ionicons name="checkmark" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Voice Language Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={voiceLanguageModalVisible}
        onRequestClose={() => setVoiceLanguageModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setVoiceLanguageModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>音声言語選択</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.voiceLanguageDescription, { color: theme.textSecondary }]}>
              音声原稿の生成言語とTTS音声の言語を選択してください。アプリの表示言語とは独立して設定できます。
              {'\n'}• 日本語選択: 日本語でニュース原稿を生成し、日本語音声で読み上げ
              {'\n'}• 英語選択: 英語でニュース原稿を生成し、英語音声で読み上げ
            </Text>
            
            {supportedVoiceLanguages.map((voiceLanguage) => (
              <TouchableOpacity
                key={voiceLanguage.code}
                style={[
                  styles.voiceLanguageOption,
                  { backgroundColor: theme.card },
                  currentVoiceLanguage === voiceLanguage.code && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={async () => {
                  await setVoiceLanguage(voiceLanguage.code);
                  setVoiceLanguageModalVisible(false);
                }}
              >
                <View style={styles.voiceLanguageInfo}>
                  <Text style={[styles.voiceLanguageName, { color: theme.text }]}>
                    {voiceLanguage.nativeName}
                  </Text>
                  <Text style={[styles.voiceLanguageDetails, { color: theme.textSecondary }]}>
                    {voiceLanguage.name} • {voiceLanguage.voices.length}種類の音声
                  </Text>
                </View>
                <View style={styles.voiceLanguageRight}>
                  <Ionicons 
                    name="musical-notes-outline" 
                    size={20} 
                    color={theme.textMuted} 
                    style={{ marginRight: 8 }}
                  />
                  {currentVoiceLanguage === voiceLanguage.code && (
                    <Ionicons name="checkmark" size={24} color={theme.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Account Modal */}
      <Modal
        visible={accountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.accountModalContainer}>
          <View style={[styles.accountModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.accountModalHeader}>
              <View style={styles.accountModalAvatar}>
                {userProfile?.avatar_url ? (
                  <Image 
                    source={{ uri: userProfile.avatar_url }} 
                    style={styles.accountModalAvatarImage}
                  />
                ) : (
                  <View style={[styles.accountModalDefaultAvatar, { backgroundColor: theme.accent }]}>
                    <Ionicons name="person" size={32} color={theme.primary} />
                  </View>
                )}
              </View>
              
              <Text style={[styles.accountModalName, { color: theme.text }]}>
                {userProfile?.display_name || user?.email || 'ユーザー'}
              </Text>
              
              <Text style={[styles.accountModalEmail, { color: theme.textSecondary }]}>
                {userProfile?.email || user?.email || 'user@example.com'}
              </Text>
              
              {userProfile && (
                <View style={[styles.accountModalStats, { borderColor: theme.border }]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>
                      {userProfile.audio_count || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      音声
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>
                      {userProfile.followers_count || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      フォロワー
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>
                      {userProfile.following_count || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      フォロー中
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>
                      {userProfile.total_plays || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                      再生数
                    </Text>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.accountModalButtons}>
              <TouchableOpacity
                style={[styles.accountModalButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setAccountModalVisible(false);
                  router.push('/profile');
                }}
              >
                <Ionicons name="settings-outline" size={20} color={theme.background} />
                <Text style={[styles.accountModalButtonText, { color: theme.background }]}>
                  詳細設定
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.accountModalButton, { backgroundColor: theme.accent }]}
                onPress={async () => {
                  const avatarUrl = await UserProfileService.getInstance().uploadAvatar();
                  if (avatarUrl && userProfile) {
                    setUserProfile({
                      ...userProfile,
                      avatar_url: avatarUrl,
                    });
                  }
                }}
              >
                <Ionicons name="camera-outline" size={20} color={theme.text} />
                <Text style={[styles.accountModalButtonText, { color: theme.text }]}>
                  アバター変更
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.accountModalButton, styles.closeModalButton, { backgroundColor: theme.border }]}
                onPress={() => setAccountModalVisible(false)}
              >
                <Text style={[styles.accountModalButtonText, { color: theme.text }]}>
                  閉じる
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  languageEnglishName: {
    fontSize: 14,
  },
  // Voice Language Modal Styles
  voiceLanguageDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  voiceLanguageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  voiceLanguageInfo: {
    flex: 1,
  },
  voiceLanguageName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  voiceLanguageDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  voiceLanguageRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Section Styles for better organization
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  // Account Card Styles
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  accountAvatar: {
    marginRight: 16,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  accountStats: {
    marginTop: 4,
  },
  accountStatsText: {
    fontSize: 12,
  },
  // Account Modal Styles
  accountModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountModalContent: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 24,
  },
  accountModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  accountModalAvatar: {
    marginBottom: 16,
  },
  accountModalAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  accountModalDefaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountModalName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  accountModalEmail: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  accountModalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  accountModalButtons: {
    gap: 12,
  },
  accountModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  accountModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeModalButton: {
    marginTop: 8,
  },
});