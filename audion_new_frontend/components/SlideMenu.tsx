/**
 * Slide Menu Component - Twitter-style settings menu
 * Slides from left side when user icon is tapped
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import SettingsScreen from './SettingsScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  onPress: () => void;
  showArrow?: boolean;
}

interface SlideMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function SlideMenu({ visible, onClose }: SlideMenuProps) {
  const { user, logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [activeSettingsScreen, setActiveSettingsScreen] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -MENU_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'profile',
      title: 'プロフィール',
      icon: '👤',
      onPress: () => setActiveSettingsScreen('プロフィール'),
      showArrow: true,
    },
    {
      id: 'notifications',
      title: '通知',
      icon: '🔔',
      onPress: () => setActiveSettingsScreen('通知'),
      showArrow: true,
    },
    {
      id: 'privacy',
      title: 'プライバシーと安全',
      icon: '🔒',
      onPress: () => setActiveSettingsScreen('プライバシーと安全'),
      showArrow: true,
    },
    {
      id: 'accessibility',
      title: 'アクセシビリティ',
      icon: '♿',
      onPress: () => console.log('Accessibility pressed'),
      showArrow: true,
    },
    {
      id: 'help',
      title: 'ヘルプセンター',
      icon: '❓',
      onPress: () => console.log('Help pressed'),
      showArrow: true,
    },
    {
      id: 'settings',
      title: '設定とプライバシー',
      icon: '⚙️',
      onPress: () => setActiveSettingsScreen('設定とプライバシー'),
      showArrow: true,
    },
    {
      id: 'logout',
      title: 'ログアウト',
      icon: '🚪',
      onPress: handleLogout,
      showArrow: false,
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        item.id === 'logout' && styles.logoutItem
      ]}
      onPress={item.onPress}
    >
      <View style={styles.menuItemContent}>
        <Text style={styles.menuIcon}>{item.icon}</Text>
        <Text style={[
          styles.menuTitle,
          item.id === 'logout' && styles.logoutText
        ]}>
          {item.title}
        </Text>
      </View>
      {item.showArrow && (
        <Text style={styles.menuArrow}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      {/* Background overlay */}
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Slide menu */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* User Header */}
          <View style={styles.userHeader}>
            <TouchableOpacity 
              style={styles.userAvatar}
              onPress={() => Alert.alert('アイコン編集', 'プロフィール画像を変更できます（実装予定）')}
            >
              <Text style={styles.userAvatarText}>
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </Text>
              <View style={styles.editIconOverlay}>
                <Text style={styles.editIcon}>📷</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.email || 'ユーザー'}
              </Text>
              <Text style={styles.userHandle}>
                @{user?.email?.split('@')[0] || 'user'}
              </Text>
            </View>
          </View>

          {/* Following/Followers stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>フォロー中</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>フォロワー</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Menu Items */}
          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
            {menuItems.map(renderMenuItem)}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* Settings Screen Modal */}
      {activeSettingsScreen && (
        <SettingsScreen
          visible={!!activeSettingsScreen}
          onClose={() => setActiveSettingsScreen(null)}
          title={activeSettingsScreen}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: '#000000',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  safeArea: {
    flex: 1,
  },
  userHeader: {
    padding: 20,
    paddingTop: 60, // Account for status bar
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 10,
  },
  userInfo: {
    marginTop: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: '#888888',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  statItem: {
    marginRight: 20,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#333333',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 18,
    color: '#666666',
    marginLeft: 8,
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginTop: 16,
  },
  logoutText: {
    color: '#ff4444',
  },
});