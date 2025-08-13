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
  
  const [deletedAudio, setDeletedAudio] = useState<DeletedAudio[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';
  
  useEffect(() => {
    if (token) {
      fetchDeletedAudio();
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data && response.data.profile_image_url) {
        setProfileImage(response.data.profile_image_url);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      
      try {
        setUploadingImage(true);
        const response = await axios.post(
          `${API}/user/profile-image`,
          {
            image_data: `data:image/jpeg;base64,${asset.base64}`,
            filename: `profile_${Date.now()}.jpg`,
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

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      
      try {
        setUploadingImage(true);
        const response = await axios.post(
          `${API}/user/profile-image`,
          {
            image_data: `data:image/jpeg;base64,${asset.base64}`,
            filename: `profile_${Date.now()}.jpg`,
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
    try {
      setLoadingDeleted(true);
      const response = await axios.get(`${API}/audio/deleted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const audioWithDaysRemaining = response.data.map((audio: any) => {
        const deletedAt = new Date(audio.deleted_at);
        const permanentDeleteAt = new Date(audio.permanent_delete_at);
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((permanentDeleteAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          ...audio,
          days_remaining: daysRemaining
        };
      });
      
      setDeletedAudio(audioWithDaysRemaining);
    } catch (error) {
      console.error('Error fetching deleted audio:', error);
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
          text: 'Delete All',
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
        { text: 'Logout', onPress: logout }
      ]
    );
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
                        [{ text: 'OK', onPress: logout }]
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
      title: 'User & Account',
      items: [
        {
          id: 'profile',
          title: 'Profile & Identity',
          subtitle: 'Profile image, display name, bio',
          icon: 'person-outline',
          type: 'navigation',
          onPress: () => setProfileModalVisible(true)
        },
        {
          id: 'account',
          title: 'Authentication & Security',
          subtitle: 'Password, email, two-factor authentication',
          icon: 'shield-checkmark-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/account-settings');
          }
        },
        {
          id: 'subscription',
          title: 'Subscription & Billing',
          subtitle: 'Plan details, payment methods',
          icon: 'card-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Subscription management will be available soon');
          }
        }
      ]
    },
    {
      title: 'Content & Sources',
      items: [
        {
          id: 'feed-autopick-settings',
          title: 'Feed & Auto-Pick Settings',
          subtitle: 'Comprehensive content management and automation',
          icon: 'sparkles-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/feed-autopick-settings');
          }
        }
      ]
    },
    {
      title: 'Audio & Playback',
      items: [
        {
          id: 'audio-quality',
          title: 'Audio Quality & Performance',
          subtitle: 'Bitrate, compression, streaming quality',
          icon: 'musical-notes-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/audio-quality-settings');
          }
        },
        {
          id: 'playback-controls',
          title: 'Playback Controls',
          subtitle: 'Auto-play, skip behavior, gestures',
          icon: 'play-circle-outline',
          type: 'navigation',
          onPress: () => router.push('/playback-controls')
        },
        {
          id: 'downloads',
          title: 'Downloads & Offline',
          subtitle: 'Offline playback, storage management',
          icon: 'download-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/download-settings');
          }
        }
      ]
    },
    {
      title: 'Privacy & Data',
      items: [
        {
          id: 'data-collection',
          title: 'Data Collection & Analytics',
          subtitle: 'Usage analytics, crash reports',
          icon: 'analytics-outline',
          type: 'navigation',
          onPress: () => {
            router.push('/data-collection-settings');
          }
        },
        {
          id: 'export-backup',
          title: 'Export & Backup',
          subtitle: 'Download data, backup settings',
          icon: 'cloud-download-outline',
          type: 'navigation',
          onPress: () => router.push('/export-backup')
        },
        {
          id: 'storage-management',
          title: 'Storage Management',
          subtitle: 'Cache, deleted items, storage usage',
          icon: 'server-outline',
          type: 'navigation',
          badge: deletedAudio.length > 0 ? deletedAudio.length.toString() : undefined,
          onPress: () => {
            if (deletedAudio.length === 0) {
              Alert.alert('No Deleted Audio', 'There are no deleted audio files to recover.');
              return;
            }
            
            const audioList = deletedAudio.map(audio => 
              `• ${audio.title} (${audio.days_remaining} days remaining)`
            ).join('\n');
            
            Alert.alert(
              'Deleted Audio Files',
              `Recoverable audio files:\n\n${audioList}\n\nThese files will be permanently deleted after 14 days.`,
              [
                { text: 'Clear All', style: 'destructive', onPress: handleClearAllDeleted },
                { text: 'OK', style: 'cancel' }
              ]
            );
          }
        }
      ]
    },
    {
      title: 'Appearance & Accessibility',
      items: [
        {
          id: 'theme',
          title: 'Themes & Display',
          subtitle: `Current: ${themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light'}`,
          icon: 'contrast-outline',
          type: 'navigation',
          onPress: () => {
            setThemeModalVisible(true);
          }
        },
        {
          id: 'text-settings',
          title: 'Text & Font Settings',
          subtitle: 'Font size, line spacing, reading mode',
          icon: 'text-outline',
          type: 'navigation',
          onPress: () => router.push('/text-font-settings')
        },
        {
          id: 'accessibility',
          title: 'Accessibility Features',
          subtitle: 'Voice guidance, color contrast, magnification',
          icon: 'accessibility-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Accessibility features will be available soon');
          }
        },
        {
          id: 'language',
          title: 'Language & Region',
          subtitle: 'English (US), date format, units',
          icon: 'language-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Language settings will be available soon');
          }
        }
      ]
    },
    {
      title: 'System & Advanced',
      items: [
        {
          id: 'performance',
          title: 'Performance Settings',
          subtitle: 'Memory usage, cache size, optimization',
          icon: 'speedometer-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Performance settings will be available soon');
          }
        },
        {
          id: 'integrations',
          title: 'Integration Settings',
          subtitle: 'Third-party services, API connections',
          icon: 'link-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Integration settings will be available soon');
          }
        },
        {
          id: 'developer',
          title: 'Developer Options',
          subtitle: 'Debug mode, advanced configurations',
          icon: 'code-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Developer options will be available soon');
          }
        }
      ]
    },
    {
      title: 'Support & Legal',
      items: [
        {
          id: 'help',
          title: 'Help & Documentation',
          subtitle: 'User guide, FAQs, tutorials',
          icon: 'help-circle-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Help documentation will be available soon');
          }
        },
        {
          id: 'feedback',
          title: 'Feedback & Support',
          subtitle: 'Send feedback, report issues',
          icon: 'chatbubble-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Feedback system will be available soon');
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
          id: 'delete-account',
          title: 'Delete Account',
          subtitle: 'Permanently delete your account and all data',
          icon: 'trash-outline',
          type: 'action',
          onPress: handleDeleteAccount
        },
        {
          id: 'force-logout',
          title: 'Force Logout (Debug)',
          subtitle: 'Clear all data and force logout',
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
                      await handleAuthError();
                      logout();
                    } catch (error) {
                      console.error('Error during force logout:', error);
                      Alert.alert('Error', 'Failed to force logout');
                    }
                  },
                },
              ]
            );
          }
        }
      ]
    }
  ];

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.settingItem,
                  { backgroundColor: theme.card }
                ]}
                onPress={item.onPress}
                disabled={!item.onPress}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.accent }]}>
                    <Ionicons 
                      name={item.icon as any} 
                      size={20} 
                      color={theme.primary} 
                    />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.settingRight}>
                  {item.badge && (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.type !== 'toggle' && (
                    <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setProfileModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Profile Settings</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.profileSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile Image</Text>
              
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.accent }]}>
                    <Ionicons name="person" size={50} color={theme.textMuted} />
                  </View>
                )}
                
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                )}
              </View>

              <View style={styles.profileButtons}>
                <TouchableOpacity
                  style={[styles.profileButton, { backgroundColor: theme.primary }]}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  <Ionicons name="images" size={20} color="#FFFFFF" />
                  <Text style={styles.profileButtonText}>Choose Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileButton, { backgroundColor: theme.secondary }]}
                  onPress={handleTakePhoto}
                  disabled={uploadingImage}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.profileButtonText}>Take Photo</Text>
                </TouchableOpacity>

                {profileImage && (
                  <TouchableOpacity
                    style={[styles.profileButton, { backgroundColor: theme.error }]}
                    onPress={handleRemoveProfileImage}
                    disabled={uploadingImage}
                  >
                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                    <Text style={styles.profileButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
            <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Theme</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {[
              { key: 'light', name: 'Light', icon: 'sunny-outline' },
              { key: 'dark', name: 'Dark', icon: 'moon-outline' },
              { key: 'system', name: 'System', icon: 'phone-portrait-outline' }
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
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
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
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  // Profile Modal Styles
  profileSection: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Theme Modal Styles
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