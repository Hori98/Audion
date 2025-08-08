import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token, user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const styles = createStyles(theme);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await axios.put(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail || !emailPassword) {
      Alert.alert('Error', 'Please fill in all email fields');
      return;
    }

    if (newEmail === user?.email) {
      Alert.alert('Error', 'New email is the same as current email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsChangingEmail(true);
    try {
      await axios.put(`${API}/auth/change-email`, {
        new_email: newEmail,
        password: emailPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Email updated successfully');
      setEmailPassword('');
    } catch (error: any) {
      console.error('Email change error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to change email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Current Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Current Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        {/* Change Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
            
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 6 chars)"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
            
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              style={[styles.button, isChangingPassword && styles.buttonDisabled]}
              onPress={handlePasswordChange}
              disabled={isChangingPassword}
            >
              <Text style={styles.buttonText}>
                {isChangingPassword ? 'Updating...' : 'Change Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Change Email Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Email</Text>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>New Email Address</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email address"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={emailPassword}
              onChangeText={setEmailPassword}
              placeholder="Enter password to confirm"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              style={[styles.button, isChangingEmail && styles.buttonDisabled]}
              onPress={handleEmailChange}
              disabled={isChangingEmail}
            >
              <Text style={styles.buttonText}>
                {isChangingEmail ? 'Updating...' : 'Change Email'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.infoCard}>
            <View style={styles.securityItem}>
              <Ionicons name="shield-checkmark" size={20} color={theme.success} />
              <Text style={styles.securityText}>Account is secured with password protection</Text>
            </View>
            <View style={styles.securityItem}>
              <Ionicons name="lock-closed" size={20} color={theme.success} />
              <Text style={styles.securityText}>Data is encrypted in transit and at rest</Text>
            </View>
          </View>
        </View>

      </ScrollView>
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: theme.text,
  },
  inputCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  button: {
    backgroundColor: theme.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
});