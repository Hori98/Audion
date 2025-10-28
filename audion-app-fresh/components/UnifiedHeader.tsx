/**
 * Unified Header Component
 * Consistent header across all tabs with user icon, app logo, and search
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
} from 'react-native';
import SlideMenu from './SlideMenu';
import Icon from './common/Icon';
import { COLORS } from '../styles/commonStyles';

interface UnifiedHeaderProps {
  onUserPress?: () => void;
  onSearchPress?: () => void;
  onReadStatusPress?: (status: 'all' | 'unread' | 'read') => void;
  currentReadStatus?: 'all' | 'unread' | 'read';
  onManualPickPress?: () => void;
  showManualPickIcon?: boolean;
}

export default function UnifiedHeader({
  onUserPress,
  onSearchPress,
  onReadStatusPress,
  currentReadStatus = 'all',
  onManualPickPress,
  showManualPickIcon = false
}: UnifiedHeaderProps) {
  const [showSlideMenu, setShowSlideMenu] = useState(false);
  const [showReadStatusModal, setShowReadStatusModal] = useState(false);

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress();
    } else {
      setShowSlideMenu(true);
    }
  };

  const handleReadStatusPress = (status: 'all' | 'unread' | 'read') => {
    setShowReadStatusModal(false);
    if (onReadStatusPress) {
      onReadStatusPress(status);
    }
  };

  const getReadStatusIconName = () => {
    switch (currentReadStatus) {
      case 'unread': return 'eye';
      case 'read': return 'eye';
      default: return 'eye';
    }
  };

  const getReadStatusLabel = (status: 'all' | 'unread' | 'read') => {
    switch (status) {
      case 'all': return 'すべて';
      case 'unread': return '未読';
      case 'read': return '既読';
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Left: User Icon */}
        <TouchableOpacity 
          style={styles.userButton}
          onPress={handleUserPress}
        >
        <View style={styles.userIcon}>
          <Icon name="user" size={18} color={COLORS.TEXT_PRIMARY} />
        </View>
      </TouchableOpacity>

      {/* Center: App Logo */}
      <View style={styles.centerSection}>
        <Text style={styles.appLogo}>Audion</Text>
      </View>

      {/* Right: Icons */}
      <View style={styles.rightSection}>
        {showManualPickIcon && (
          <TouchableOpacity
            style={styles.manualPickButton}
            onPress={onManualPickPress}
          >
            <Icon name="musical-note" size={18} color="#FF6B35" />
          </TouchableOpacity>
        )}
        {onReadStatusPress && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowReadStatusModal(true)}
          >
            <Icon name={getReadStatusIconName()} size={18} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchPress}
        >
          <Icon name="search" size={18} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>
      </View>

      {/* Slide Menu */}
      <SlideMenu
        visible={showSlideMenu}
        onClose={() => setShowSlideMenu(false)}
      />

      {/* Read Status Modal */}
      <Modal
        visible={showReadStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReadStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReadStatusModal(false)}
        >
          <View style={styles.modalContent}>
            {(['all', 'unread', 'read'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.modalOption,
                  currentReadStatus === status && styles.modalOptionSelected
                ]}
                onPress={() => handleReadStatusPress(status)}
              >
                <Text style={[
                  styles.modalOptionText,
                  currentReadStatus === status && styles.modalOptionTextSelected
                ]}>
                  {getReadStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60, // Dynamic Island + Status Bar
    paddingBottom: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  userButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIconText: {},
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  appLogo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {},
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualPickButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOptionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
