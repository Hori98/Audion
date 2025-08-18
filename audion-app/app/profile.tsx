import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  TextInput,
  Switch,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LoadingIndicator from '../components/LoadingIndicator';
import UserProfileService, { UserProfile, NotificationSettings } from '../services/UserProfileService';

type TabType = 'profile' | 'social' | 'privacy' | 'notifications' | 'preferences';

export default function ProfileScreen() {
  const { token, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    location: '',
    website: '',
  });

  useEffect(() => {
    if (token) {
      UserProfileService.getInstance().setAuthToken(token);
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const profile = await UserProfileService.getInstance().getCurrentUserProfile();
      if (profile) {
        setUserProfile(profile);
        setEditForm({
          display_name: profile.display_name,
          bio: profile.bio || '',
          location: profile.location || '',
          website: profile.website || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;

    try {
      const updatedProfile = await UserProfileService.getInstance().updateUserProfile({
        display_name: editForm.display_name,
        bio: editForm.bio,
        location: editForm.location,
        website: editForm.website,
      });
      
      setUserProfile(updatedProfile);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleUploadAvatar = async () => {
    try {
      const avatarUrl = await UserProfileService.getInstance().uploadAvatar();
      if (avatarUrl && userProfile) {
        setUserProfile({
          ...userProfile,
          avatar_url: avatarUrl,
        });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await UserProfileService.getInstance().clearAllUserData();
      logout();
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
    setShowLogoutModal(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'official': return theme.success;
      case 'creator': return theme.warning;
      case 'premium': return theme.primary;
      default: return theme.textSecondary;
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'official': return 'shield-checkmark';
      case 'creator': return 'star';
      case 'premium': return 'diamond';
      default: return 'person';
    }
  };

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tabs = [
    { key: 'profile', label: 'Profile', icon: 'person-outline' },
    { key: 'social', label: 'Social', icon: 'people-outline' },
    { key: 'privacy', label: 'Privacy', icon: 'shield-outline' },
    { key: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
    { key: 'preferences', label: 'Preferences', icon: 'settings-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={theme.error} />
        </TouchableOpacity>
      </View>

      {/* Profile Summary Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleUploadAvatar} style={styles.avatarContainer}>
            {userProfile.avatar_url ? (
              <Image source={{ uri: userProfile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Ionicons name="person" size={40} color={theme.textMuted} />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={16} color={theme.background} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{userProfile.display_name}</Text>
              {userProfile.is_verified && (
                <Ionicons 
                  name={getAccountTypeIcon(userProfile.account_type) as any} 
                  size={18} 
                  color={getAccountTypeColor(userProfile.account_type)} 
                />
              )}
            </View>
            <Text style={styles.username}>@{userProfile.username}</Text>
            {userProfile.bio && (
              <Text style={styles.bio} numberOfLines={2}>{userProfile.bio}</Text>
            )}
          </View>
        </View>

        {/* Social Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(userProfile.audio_count)}</Text>
            <Text style={styles.statLabel}>Audio</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(userProfile.followers_count)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(userProfile.following_count)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(userProfile.total_plays)}</Text>
            <Text style={styles.statLabel}>Plays</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNavigation}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive
            ]}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? theme.primary : theme.textSecondary}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'profile' && (
          <ProfileTabContent 
            userProfile={userProfile}
            editing={editing}
            editForm={editForm}
            setEditForm={setEditForm}
            setEditing={setEditing}
            onSave={handleSaveProfile}
            theme={theme}
          />
        )}
        
        {activeTab === 'social' && (
          <SocialTabContent 
            userProfile={userProfile}
            theme={theme}
          />
        )}
        
        {activeTab === 'privacy' && (
          <PrivacyTabContent 
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            theme={theme}
          />
        )}
        
        {activeTab === 'notifications' && (
          <NotificationsTabContent 
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            theme={theme}
          />
        )}
        
        {activeTab === 'preferences' && (
          <PreferencesTabContent 
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            theme={theme}
          />
        )}
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmLogout}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Tab Components
const ProfileTabContent = ({ 
  userProfile, 
  editing, 
  editForm, 
  setEditForm, 
  setEditing, 
  onSave, 
  theme 
}: any) => (
  <View style={{ gap: 16 }}>
    <View style={[{ backgroundColor: theme.card, borderRadius: 12, padding: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Profile Information</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onSave}>
              <Ionicons name="checkmark" size={20} color={theme.success} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {editing ? (
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>Display Name</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: theme.text,
                backgroundColor: theme.background,
              }}
              value={editForm.display_name}
              onChangeText={(text) => setEditForm({ ...editForm, display_name: text })}
              placeholder="Enter display name"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          
          <View>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>Bio</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: theme.text,
                backgroundColor: theme.background,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              value={editForm.bio}
              onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
              placeholder="Tell us about yourself"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>Location</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: theme.text,
                backgroundColor: theme.background,
              }}
              value={editForm.location}
              onChangeText={(text) => setEditForm({ ...editForm, location: text })}
              placeholder="Your location"
              placeholderTextColor={theme.textMuted}
            />
          </View>
          
          <View>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>Website</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: theme.text,
                backgroundColor: theme.background,
              }}
              value={editForm.website}
              onChangeText={(text) => setEditForm({ ...editForm, website: text })}
              placeholder="https://your-website.com"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Email</Text>
            <Text style={{ fontSize: 16, color: theme.text }}>{userProfile.email}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>Member since</Text>
            <Text style={{ fontSize: 16, color: theme.text }}>
              {new Date(userProfile.created_at).toLocaleDateString()}
            </Text>
          </View>
          {userProfile.location && (
            <View>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>Location</Text>
              <Text style={{ fontSize: 16, color: theme.text }}>{userProfile.location}</Text>
            </View>
          )}
          {userProfile.website && (
            <View>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>Website</Text>
              <Text style={{ fontSize: 16, color: theme.primary }}>{userProfile.website}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  </View>
);

const SocialTabContent = ({ userProfile, theme }: any) => (
  <View style={{ gap: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Social Statistics</Text>
    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
      Feature coming soon: Follower/Following management, social interactions, and community features.
    </Text>
  </View>
);

const PrivacyTabContent = ({ userProfile, setUserProfile, theme }: any) => (
  <View style={{ gap: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Privacy Settings</Text>
    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
      Feature coming soon: Privacy controls, blocking, content visibility settings.
    </Text>
  </View>
);

const NotificationsTabContent = ({ userProfile, setUserProfile, theme }: any) => (
  <View style={{ gap: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Notification Settings</Text>
    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
      Feature coming soon: Push notifications, email preferences, alert customization.
    </Text>
  </View>
);

const PreferencesTabContent = ({ userProfile, setUserProfile, theme }: any) => (
  <View style={{ gap: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>Content Preferences</Text>
    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
      Feature coming soon: Language settings, content filtering, auto-download preferences.
    </Text>
  </View>
);

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  logoutButton: {
    padding: 8,
  },
  profileCard: {
    backgroundColor: theme.card,
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultAvatar: {
    backgroundColor: theme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: theme.card,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  username: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  tabNavigation: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: theme.card,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: theme.accent,
  },
  tabLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: theme.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: theme.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.background,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.accent,
  },
  confirmButton: {
    backgroundColor: theme.error,
  },
  cancelButtonText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: theme.background,
    fontSize: 14,
    fontWeight: '600',
  },
});