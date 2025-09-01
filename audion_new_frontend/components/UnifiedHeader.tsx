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
} from 'react-native';
import SlideMenu from './SlideMenu';

interface UnifiedHeaderProps {
  onUserPress?: () => void;
  onSearchPress?: () => void;
  onReadStatusPress?: () => void;
}

export default function UnifiedHeader({ 
  onUserPress, 
  onSearchPress,
  onReadStatusPress
}: UnifiedHeaderProps) {
  const [showSlideMenu, setShowSlideMenu] = useState(false);

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress();
    } else {
      setShowSlideMenu(true);
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
          <Text style={styles.userIconText}>👤</Text>
        </View>
      </TouchableOpacity>

      {/* Center: App Logo */}
      <View style={styles.centerSection}>
        <Text style={styles.appLogo}>Audion</Text>
      </View>

      {/* Right: Icons */}
      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={styles.eyeButton}
          onPress={onReadStatusPress}
        >
          <Text style={styles.eyeIcon}>👁</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={onSearchPress}
        >
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
        
      </View>
      </View>

      {/* Slide Menu */}
      <SlideMenu
        visible={showSlideMenu}
        onClose={() => setShowSlideMenu(false)}
      />
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
  userIconText: {
    fontSize: 16,
    color: '#ffffff',
  },
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
  searchIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
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
  eyeIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
});