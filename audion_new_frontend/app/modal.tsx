import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { useAuth } from '../context/AuthContext';

export default function UserProfileModal() {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{user.display_name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.tier}>
              Plan: {user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            disabled={isLoading}
          >
            <Text style={styles.logoutButtonText}>
              {isLoading ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 48,
  },
  displayName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 12,
  },
  tier: {
    fontSize: 14,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 48,
  },
  logoutButton: {
    height: 50,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
