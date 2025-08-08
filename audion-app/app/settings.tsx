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
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  badge?: string;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

interface DeletedAudio {
  id: string;
  title: string;
  deleted_at: string;
  permanent_delete_at: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user, token, handleAuthError } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [deletedAudio, setDeletedAudio] = useState<DeletedAudio[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Schedule delivery states
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('07:00');
  const [scheduleCount, setScheduleCount] = useState(3);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  
  // Prompt settings states
  const [selectedPromptStyle, setSelectedPromptStyle] = useState<'strict' | 'recommended' | 'friendly' | 'insight' | 'custom'>('recommended');
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8000/api';

  // Prompt presets definition
  const PROMPT_PRESETS = [
    {
      id: 'strict' as const,
      name: '厳格モード',
      description: '事実重視・正確性を最優先',
      icon: 'shield-checkmark-outline',
      systemPrompt: '正確で事実に基づいたニュース原稿を作成してください。推測や主観は避け、確認された情報のみを報告し、200-250語で簡潔にまとめてください。'
    },
    {
      id: 'recommended' as const,
      name: 'おすすめ（標準）',
      description: 'バランスの取れた汎用スタイル',
      icon: 'checkmark-circle-outline', 
      systemPrompt: '専門的でクリアなニュース原稿を単一ナレーター向けに作成してください。重要情報を分かりやすく整理し、200-300語で自然な話し言葉で構成してください。'
    },
    {
      id: 'friendly' as const,
      name: '優しめ（分かりやすい）',
      description: '初心者にも理解しやすい表現', 
      icon: 'heart-outline',
      systemPrompt: '分かりやすく親しみやすいニュース原稿を作成してください。専門用語は簡単に説明し、背景情報も含めて初心者でも理解できるよう250-350語で丁寧に解説してください。'
    },
    {
      id: 'insight' as const,
      name: 'インサイト提供',
      description: '分析・見解・影響を重視',
      icon: 'bulb-outline',
      systemPrompt: 'ニュースの背景分析と今後への影響を重視した原稿を作成してください。事実に加えて、専門的な洞察や市場・社会への意味も含め、300-400語で深い理解を提供してください。'
    }
  ];

  const getPromptDisplayName = () => {
    if (selectedPromptStyle === 'custom') return 'カスタム';
    const preset = PROMPT_PRESETS.find(p => p.id === selectedPromptStyle);
    return preset?.name || 'おすすめ（標準）';
  };

  // Helper function to convert time string to Date object
  const timeStringToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  };

  // Helper function to convert Date to time string
  const dateToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  useEffect(() => {
    if (token) {
      fetchDeletedAudio();
      fetchUserProfile();
      loadSettings();
    }
  }, [token]);

  // Load settings from AsyncStorage
  const loadSettings = async () => {
    try {
      // Load prompt settings
      const savedPromptStyle = await AsyncStorage.getItem('prompt_style');
      const savedCustomPrompt = await AsyncStorage.getItem('custom_prompt');
      
      if (savedPromptStyle) {
        setSelectedPromptStyle(savedPromptStyle as any);
      }
      if (savedCustomPrompt) {
        setCustomPrompt(savedCustomPrompt);
      }

      // Load schedule settings  
      const savedScheduleEnabled = await AsyncStorage.getItem('schedule_enabled');
      const savedScheduleTime = await AsyncStorage.getItem('schedule_time');
      const savedScheduleCount = await AsyncStorage.getItem('schedule_count');

      if (savedScheduleEnabled) {
        setScheduleEnabled(JSON.parse(savedScheduleEnabled));
      }
      if (savedScheduleTime) {
        setScheduleTime(savedScheduleTime);
      }
      if (savedScheduleCount) {
        setScheduleCount(parseInt(savedScheduleCount));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save settings to AsyncStorage
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('prompt_style', selectedPromptStyle);
      await AsyncStorage.setItem('custom_prompt', customPrompt);
      await AsyncStorage.setItem('schedule_enabled', JSON.stringify(scheduleEnabled));
      await AsyncStorage.setItem('schedule_time', scheduleTime);
      await AsyncStorage.setItem('schedule_count', scheduleCount.toString());
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };


  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.profile_image) {
        setProfileImage(response.data.profile_image);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      if (error.response?.status === 401) {
        handleAuthError();
        return;
      }
      // Profile endpoint might not exist yet, ignore other errors
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to upload your profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setUploadingImage(true);
      
      try {
        const response = await axios.post(
          `${API}/user/profile-image`,
          {
            image_data: `data:image/jpeg;base64,${asset.base64}`,
            filename: asset.fileName || 'profile.jpg',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setProfileImage(response.data.profile_image_url);
        Alert.alert('Success', 'Profile image updated successfully!');
      } catch (error: any) {
        console.error('Error uploading profile image:', error);
        Alert.alert('Upload Failed', error.response?.data?.detail || 'Failed to upload profile image.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera permissions to take your profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setUploadingImage(true);
      
      try {
        const response = await axios.post(
          `${API}/user/profile-image`,
          {
            image_data: `data:image/jpeg;base64,${asset.base64}`,
            filename: 'profile.jpg',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        setProfileImage(response.data.profile_image_url);
        Alert.alert('Success', 'Profile image updated successfully!');
      } catch (error: any) {
        console.error('Error uploading profile image:', error);
        Alert.alert('Upload Failed', error.response?.data?.detail || 'Failed to upload profile image.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleRemoveProfileImage = async () => {
    Alert.alert(
      'Remove Profile Image',
      'Are you sure you want to remove your profile image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/user/profile-image`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setProfileImage(null);
              Alert.alert('Success', 'Profile image removed successfully!');
            } catch (error: any) {
              console.error('Error removing profile image:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to remove profile image.');
            }
          }
        }
      ]
    );
  };

  const fetchDeletedAudio = async () => {
    setLoadingDeleted(true);
    try {
      const response = await axios.get(`${API}/audio/deleted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeletedAudio(response.data || []);
    } catch (error: any) {
      console.error('Error fetching deleted audio:', error);
      if (error.response?.status === 401) {
        handleAuthError();
        return;
      }
      // Don't show error alert for missing endpoint during development
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleClearAllDeleted = async () => {
    if (deletedAudio.length === 0) {
      Alert.alert('No Deleted Items', 'There are no deleted audio files to clear.');
      return;
    }

    Alert.alert(
      'Clear All Deleted Audio',
      `Permanently delete all ${deletedAudio.length} deleted audio files? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/audio/deleted/clear-all`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'All deleted audio files have been permanently removed.');
              fetchDeletedAudio(); // Refresh the list
            } catch (error: any) {
              console.error('Error clearing all deleted audio:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to clear deleted audio.');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const timeString = dateToTimeString(selectedDate);
      setScheduleTime(timeString);
      // Auto-save when time changes
      setTimeout(() => saveSettings(), 100);
    }
    setTimePickerVisible(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data including:\n\n• All RSS sources\n• All created audio files\n• User profile and preferences\n• All downloads and history\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure you want to delete your account? This action is irreversible.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await axios.delete(`${API}/user/account`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      Alert.alert(
                        'Account Deleted',
                        'Your account has been permanently deleted.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              logout();
                              router.replace('/');
                            }
                          }
                        ]
                      );
                    } catch (error: any) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete account.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Profile Settings',
          subtitle: 'Edit your profile information and avatar',
          icon: 'person-outline',
          type: 'navigation',
          onPress: () => {
            setProfileModalVisible(true);
          }
        },
        {
          id: 'account',
          title: 'Account Settings',
          subtitle: 'Password, email, security',
          icon: 'shield-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/account-settings');
          }
        }
      ]
    },
    {
      title: 'Audio & Playback',
      items: [
        {
          id: 'audio-quality',
          title: 'Audio Quality',
          subtitle: 'Standard quality, playback speed',
          icon: 'musical-notes-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/audio-quality-settings');
          }
        },
        {
          id: 'auto-play',
          title: 'Auto-play Next',
          subtitle: 'Automatically play next audio in queue',
          icon: 'play-forward-outline',
          type: 'toggle',
          value: autoPlay,
          onToggle: setAutoPlay
        },
        {
          id: 'downloads',
          title: 'Download Settings',
          subtitle: 'Offline playback, storage management',
          icon: 'download-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Download settings will be available soon');
          }
        }
      ]
    },
    {
      title: 'Content & Sources',
      items: [
        {
          id: 'rss-sources',
          title: 'RSS Sources',
          subtitle: 'Manage your news sources',
          icon: 'radio-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/sources');
          }
        },
        {
          id: 'auto-pick',
          title: 'Auto-Pick Settings',
          subtitle: 'Customize automatic content selection',
          icon: 'sparkles-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Auto-Pick settings will be available soon');
          }
        },
        {
          id: 'script-style',
          title: 'AI Script Style',
          subtitle: `Current: ${getPromptDisplayName()}`,
          icon: 'document-text-outline',
          type: 'navigation',
          onPress: () => {
            setPromptModalVisible(true);
          }
        },
        {
          id: 'interests',
          title: 'Genre Preferences',
          subtitle: 'Customize content categories',
          icon: 'heart-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Genre preferences will be available soon');
          }
        }
      ]
    },
    {
      title: 'Storage & Cache',
      items: [
        {
          id: 'deleted-audio',
          title: 'Deleted Audio Recovery',
          subtitle: `${deletedAudio.length} items available for recovery`,
          icon: 'trash-outline',
          type: 'navigation',
          badge: deletedAudio.length > 0 ? deletedAudio.length.toString() : undefined,
          onPress: () => {
            if (deletedAudio.length === 0) {
              Alert.alert('No Deleted Audio', 'There are no deleted audio files to recover.');
              return;
            }
            
            // Show simple list for now - could be expanded to a dedicated page
            const audioList = deletedAudio.map(audio => 
              `• ${audio.title} (${audio.days_remaining} days remaining)`
            ).join('\n');
            
            Alert.alert(
              'Deleted Audio Files',
              `Recoverable audio files:\n\n${audioList}\n\nThese files will be permanently deleted after 14 days. Use "Clear All Deleted Audio" to remove them immediately.`,
              [{ text: 'OK' }]
            );
          }
        },
        {
          id: 'clear-cache',
          title: 'Clear All Deleted Audio',
          subtitle: 'Permanently remove all deleted items',
          icon: 'trash-bin-outline',
          type: 'action',
          onPress: handleClearAllDeleted
        },
        {
          id: 'storage-info',
          title: 'Storage Usage',
          subtitle: 'View audio storage and cache usage',
          icon: 'server-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Storage info will be available soon');
          }
        }
      ]
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'New content, recommendations',
          icon: 'notifications-outline',
          type: 'toggle',
          value: notifications,
          onToggle: setNotifications
        },
        {
          id: 'auto-pick-notifications',
          title: 'Auto-Pick Completion',
          subtitle: 'Notify when new audio is ready',
          icon: 'checkmark-circle-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/notification-settings');
          }
        }
      ]
    },
    {
      title: 'Auto-Schedule',
      items: [
        {
          id: 'schedule-enabled',
          title: 'Daily Auto-Pick',
          subtitle: 'Generate audio at scheduled time',
          icon: 'time-outline',
          type: 'toggle',
          value: scheduleEnabled,
          onToggle: (value: boolean) => {
            setScheduleEnabled(value);
            setTimeout(() => saveSettings(), 100);
          }
        },
        {
          id: 'schedule-time',
          title: 'Delivery Time',
          subtitle: `${scheduleTime} (${scheduleEnabled ? 'Active' : 'Inactive'})`,
          icon: 'alarm-outline',
          type: 'navigation',
          onPress: () => {
            setTimePickerVisible(true);
          }
        },
        {
          id: 'schedule-count',
          title: 'Article Count',
          subtitle: `${scheduleCount} articles per daily audio`,
          icon: 'list-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert(
              'Daily Auto-Pick Article Count',
              'How many articles should be included in your daily auto-generated audio?',
              [
                { text: '1 Article', onPress: () => { setScheduleCount(1); setTimeout(() => saveSettings(), 100); } },
                { text: '3 Articles', onPress: () => { setScheduleCount(3); setTimeout(() => saveSettings(), 100); } },
                { text: '5 Articles', onPress: () => { setScheduleCount(5); setTimeout(() => saveSettings(), 100); } },
                { text: '7 Articles', onPress: () => { setScheduleCount(7); setTimeout(() => saveSettings(), 100); } },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        },
        {
          id: 'schedule-preferences',
          title: 'Content Preferences',
          subtitle: 'Genre filters and source priority',
          icon: 'options-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Advanced content preferences will be available soon');
          }
        }
      ]
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          id: 'data-collection',
          title: 'Data Collection',
          subtitle: 'Usage analytics, crash reports',
          icon: 'shield-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Privacy settings will be available soon');
          }
        },
        {
          id: 'export-data',
          title: 'Export My Data',
          subtitle: 'Download your audio library data',
          icon: 'download-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Data export will be available soon');
          }
        }
      ]
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'theme',
          title: 'Theme',
          subtitle: `Current: ${themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light'}`,
          icon: 'contrast-outline',
          type: 'navigation',
          onPress: () => {
            setThemeModalVisible(true);
          }
        },
        {
          id: 'language',
          title: 'Language',
          subtitle: 'English (US)',
          icon: 'language-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Language settings will be available soon');
          }
        },
        {
          id: 'font-size',
          title: 'Text Size',
          subtitle: 'Adjust reading text size',
          icon: 'text-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Text size settings will be available soon');
          }
        }
      ]
    },
    {
      title: 'Support & Info',
      items: [
        {
          id: 'help',
          title: 'Help & FAQ',
          subtitle: 'Get help and find answers',
          icon: 'help-circle-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Help section will be available soon');
          }
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          subtitle: 'Help us improve Audion',
          icon: 'chatbubble-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Feedback feature will be available soon');
          }
        },
        {
          id: 'report-bug',
          title: 'Report Bug',
          subtitle: 'Report technical issues',
          icon: 'bug-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Bug reporting will be available soon');
          }
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          subtitle: 'View terms and conditions',
          icon: 'document-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/terms-of-service');
          }
        },
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          subtitle: 'How we handle your data',
          icon: 'lock-closed-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/privacy-policy');
          }
        },
        {
          id: 'about',
          title: 'About Audion',
          subtitle: 'Version 1.0.0 (MVP)',
          icon: 'information-circle-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('About Audion', 'Audion v1.0.0 (MVP)\nAI-powered news audio platform\n\nFeatures:\n• RSS news aggregation\n• AI-powered summarization\n• Text-to-speech audio generation\n• Personalized recommendations\n• Spotify-like audio interface');
          }
        }
      ]
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          title: 'Logout',
          subtitle: 'Sign out of your account',
          icon: 'log-out-outline',
          type: 'action',
          onPress: handleLogout
        },
        {
          id: 'force-logout',
          title: 'Force Logout',
          subtitle: 'Clear all authentication data (for debugging)',
          icon: 'exit-outline',
          type: 'action',
          onPress: () => {
            Alert.alert(
              'Force Logout',
              'This will clear all authentication data and return you to login. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Force Logout',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      
                      // Clear all auth-related data directly
                      await AsyncStorage.multiRemove([
                        'token',
                        'user',
                        'isNewUser',
                        'feed_selected_articles'
                      ]);
                      
                      // Clear axios auth header
                      delete axios.defaults.headers.common['Authorization'];
                      
                      
                      // For web, force reload the entire page
                      if (typeof window !== 'undefined') {
                        window.location.reload();
                      } else {
                        // For native, use router
                        router.replace('/');
                      }
                    } catch (error) {
                      console.error('Error during force logout:', error);
                      Alert.alert('Error', 'Failed to force logout');
                    }
                  },
                },
              ]
            );
          }
        },
        {
          id: 'delete-account',
          title: 'Delete Account',
          subtitle: 'Permanently delete your account and all data',
          icon: 'trash-outline',
          type: 'action',
          onPress: handleDeleteAccount
        }
      ]
    }
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.settingItem, { borderBottomColor: theme.divider }]}
        onPress={item.onPress}
        disabled={item.type === 'toggle'}
      >
        <View style={styles.settingItemLeft}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: item.id === 'delete-account' ? '#fee2e2' : theme.accent }
          ]}>
            <Ionicons 
              name={item.icon as any} 
              size={22} 
              color={item.id === 'delete-account' ? '#dc2626' : theme.primary} 
            />
          </View>
          <View style={styles.settingItemContent}>
            <Text style={[
              styles.settingItemTitle, 
              { color: item.id === 'delete-account' ? '#dc2626' : theme.text }
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={[styles.settingItemSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.settingItemRight}>
          {item.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          
          {item.type === 'toggle' ? (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={item.value ? theme.primary : theme.surface}
            />
          ) : item.type === 'action' ? (
            item.id === 'delete-account' ? (
              <Ionicons name="chevron-forward" size={20} color="#dc2626" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            )
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/feed')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Settings List */}
      <ScrollView style={styles.scrollContainer}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{section.title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}
        
        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>

      {/* Profile Settings Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              onPress={() => setProfileModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Profile Settings</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            {/* Profile Image Section */}
            <View style={[styles.profileImageSection, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Profile Image</Text>
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={[styles.defaultProfileImage, { backgroundColor: theme.accent, borderColor: theme.border }]}>
                    <Ionicons name="person" size={50} color={theme.textMuted} />
                  </View>
                )}
              </View>
              
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.imageButton, { borderColor: theme.primary, backgroundColor: theme.surface }]}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={20} color={theme.primary} />
                      <Text style={[styles.imageButtonText, { color: theme.primary }]}>Choose Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.imageButton, { borderColor: theme.primary, backgroundColor: theme.surface }]}
                  onPress={handleTakePhoto}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={20} color={theme.primary} />
                      <Text style={[styles.imageButtonText, { color: theme.primary }]}>Take Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                {profileImage && (
                  <TouchableOpacity 
                    style={[styles.imageButton, { borderColor: theme.error, backgroundColor: theme.surface }]}
                    onPress={handleRemoveProfileImage}
                    disabled={uploadingImage}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.error} />
                    <Text style={[styles.imageButtonText, { color: theme.error }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Additional Profile Settings */}
            <View style={[styles.profileSection, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Account Information</Text>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountLabel, { color: theme.textSecondary }]}>Email</Text>
                <Text style={[styles.accountValue, { color: theme.text }]}>{user?.email || 'Not available'}</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountLabel, { color: theme.textSecondary }]}>Username</Text>
                <Text style={[styles.accountValue, { color: theme.text }]}>{user?.email?.split('@')[0] || 'User'}</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={themeModalVisible}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              onPress={() => setThemeModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Theme</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Theme Options */}
          <ScrollView style={styles.modalContent}>
            <View style={[styles.themeOptionsContainer, { backgroundColor: theme.surface }]}>
              {/* Light Theme Option */}
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'light' && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                  setThemeMode('light');
                  setThemeModalVisible(false);
                }}
              >
                <View style={styles.themePreview}>
                  <View style={[styles.themePreviewCard, { backgroundColor: '#f9fafb' }]}>
                    <View style={[styles.themePreviewHeader, { backgroundColor: '#ffffff' }]} />
                    <View style={[styles.themePreviewContent, { backgroundColor: '#ffffff' }]} />
                  </View>
                </View>
                <View style={styles.themeOptionInfo}>
                  <Text style={[styles.themeOptionTitle, { color: theme.text }]}>Light</Text>
                  <Text style={[styles.themeOptionDescription, { color: theme.textSecondary }]}>
                    Clean and bright interface
                  </Text>
                </View>
                {themeMode === 'light' && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>

              {/* Dark Theme Option */}
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'dark' && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                  setThemeMode('dark');
                  setThemeModalVisible(false);
                }}
              >
                <View style={styles.themePreview}>
                  <View style={[styles.themePreviewCard, { backgroundColor: '#111827' }]}>
                    <View style={[styles.themePreviewHeader, { backgroundColor: '#1f2937' }]} />
                    <View style={[styles.themePreviewContent, { backgroundColor: '#374151' }]} />
                  </View>
                </View>
                <View style={styles.themeOptionInfo}>
                  <Text style={[styles.themeOptionTitle, { color: theme.text }]}>Dark</Text>
                  <Text style={[styles.themeOptionDescription, { color: theme.textSecondary }]}>
                    Easy on the eyes in low light
                  </Text>
                </View>
                {themeMode === 'dark' && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>

              {/* System Theme Option */}
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'system' && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => {
                  setThemeMode('system');
                  setThemeModalVisible(false);
                }}
              >
                <View style={styles.themePreview}>
                  <View style={styles.themePreviewCard}>
                    <View style={[styles.themePreviewHeader, { backgroundColor: '#ffffff' }]} />
                    <View style={[styles.themePreviewContent, { backgroundColor: '#1f2937' }]} />
                  </View>
                </View>
                <View style={styles.themeOptionInfo}>
                  <Text style={[styles.themeOptionTitle, { color: theme.text }]}>System</Text>
                  <Text style={[styles.themeOptionDescription, { color: theme.textSecondary }]}>
                    Matches your device settings
                  </Text>
                </View>
                {themeMode === 'system' && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Time Picker Modal */}
      {timePickerVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={timePickerVisible}
          onRequestClose={() => setTimePickerVisible(false)}
        >
          <View style={styles.timePickerOverlay}>
            <View style={[styles.timePickerContainer, { backgroundColor: theme.surface }]}>
              <View style={[styles.timePickerHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity 
                  onPress={() => setTimePickerVisible(false)}
                  style={styles.timePickerCancel}
                >
                  <Text style={[styles.timePickerButtonText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.timePickerTitle, { color: theme.text }]}>Daily Delivery Time</Text>
                <TouchableOpacity 
                  onPress={() => setTimePickerVisible(false)}
                  style={styles.timePickerDone}
                >
                  <Text style={[styles.timePickerButtonText, { color: theme.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timePickerContent}>
                <DateTimePicker
                  value={timeStringToDate(scheduleTime)}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor={theme.text}
                  style={styles.timePicker}
                />
                
                <Text style={[styles.timePickerDescription, { color: theme.textMuted }]}>
                  Your daily auto-pick will generate new audio content at this time every day.
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Prompt Style Selection Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={promptModalVisible}
        onRequestClose={() => setPromptModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              onPress={() => setPromptModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>AI Script Style</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Prompt Options */}
          <ScrollView style={styles.modalContent}>
            <View style={[styles.promptOptionsContainer, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 16 }]}>
                Choose how AI should generate your news scripts
              </Text>
              
              {/* Preset Options */}
              {PROMPT_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.promptOption,
                    { backgroundColor: theme.background },
                    selectedPromptStyle === preset.id && { 
                      borderColor: theme.primary, 
                      borderWidth: 2,
                      backgroundColor: theme.primary + '10'
                    }
                  ]}
                  onPress={() => setSelectedPromptStyle(preset.id)}
                >
                  <View style={styles.promptOptionIcon}>
                    <Ionicons 
                      name={preset.icon as any} 
                      size={24} 
                      color={selectedPromptStyle === preset.id ? theme.primary : theme.textMuted}
                    />
                  </View>
                  <View style={styles.promptOptionContent}>
                    <Text style={[
                      styles.promptOptionTitle, 
                      { color: selectedPromptStyle === preset.id ? theme.primary : theme.text }
                    ]}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.promptOptionDescription, { color: theme.textMuted }]}>
                      {preset.description}
                    </Text>
                  </View>
                  {selectedPromptStyle === preset.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Custom Option */}
              <TouchableOpacity
                style={[
                  styles.promptOption,
                  { backgroundColor: theme.background },
                  selectedPromptStyle === 'custom' && { 
                    borderColor: theme.primary, 
                    borderWidth: 2,
                    backgroundColor: theme.primary + '10'
                  }
                ]}
                onPress={() => setSelectedPromptStyle('custom')}
              >
                <View style={styles.promptOptionIcon}>
                  <Ionicons 
                    name="create-outline" 
                    size={24} 
                    color={selectedPromptStyle === 'custom' ? theme.primary : theme.textMuted}
                  />
                </View>
                <View style={styles.promptOptionContent}>
                  <Text style={[
                    styles.promptOptionTitle, 
                    { color: selectedPromptStyle === 'custom' ? theme.primary : theme.text }
                  ]}>
                    カスタム
                  </Text>
                  <Text style={[styles.promptOptionDescription, { color: theme.textMuted }]}>
                    独自のプロンプトを作成
                  </Text>
                </View>
                {selectedPromptStyle === 'custom' && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>

              {/* Custom Prompt Input */}
              {selectedPromptStyle === 'custom' && (
                <View style={[styles.customPromptContainer, { backgroundColor: theme.background }]}>
                  <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 8 }]}>
                    カスタムプロンプト
                  </Text>
                  <View style={[styles.textInputWrapper, { borderColor: theme.border }]}>
                    <Text
                      style={[styles.customPromptInput, { color: theme.text }]}
                      onPress={() => {
                        Alert.prompt(
                          'カスタムプロンプト',
                          'AI原稿作成用のカスタムプロンプトを入力してください:',
                          (text) => setCustomPrompt(text || ''),
                          'plain-text',
                          customPrompt
                        );
                      }}
                    >
                      {customPrompt || 'タップしてカスタムプロンプトを入力...'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Apply Button */}
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  await saveSettings();
                  setPromptModalVisible(false);
                  Alert.alert('設定完了', 'AI原稿スタイルが更新されました。新しい音声生成から適用されます。');
                }}
              >
                <Text style={[styles.applyButtonText, { color: '#FFFFFF' }]}>
                  設定を適用
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#f0f0ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalBackButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    paddingTop: 20,
  },
  profileImageSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  profileImageContainer: {
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f46e5',
    backgroundColor: '#ffffff',
    minWidth: 120,
    justifyContent: 'center',
  },
  removeButton: {
    borderColor: '#ef4444',
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  profileSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
  },
  accountInfo: {
    marginBottom: 16,
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  themeOptionsContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themePreview: {
    marginRight: 16,
  },
  themePreviewCard: {
    width: 60,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  themePreviewHeader: {
    height: 12,
    width: '100%',
  },
  themePreviewContent: {
    flex: 1,
    width: '100%',
  },
  themeOptionInfo: {
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeOptionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  // Time Picker Modal Styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  timePickerCancel: {
    paddingHorizontal: 8,
  },
  timePickerDone: {
    paddingHorizontal: 8,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timePickerContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  timePicker: {
    height: 200,
    width: '100%',
  },
  timePickerDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  // Prompt Selection Modal Styles
  promptOptionsContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  promptOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  promptOptionIcon: {
    marginRight: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptOptionContent: {
    flex: 1,
  },
  promptOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  promptOptionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  customPromptContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInputWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customPromptInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  applyButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});