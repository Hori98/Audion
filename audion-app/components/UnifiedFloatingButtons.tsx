/**
 * UnifiedFloatingButtons - Unified floating button system for all tabs
 * Consistent positioning, icons, and UI across Home and Feed tabs
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

export interface FloatingButtonAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  visible?: boolean;
  style?: 'primary' | 'secondary' | 'success';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

interface UnifiedFloatingButtonsProps {
  actions: FloatingButtonAction[];
}

export default function UnifiedFloatingButtons({ actions }: UnifiedFloatingButtonsProps) {
  const { theme } = useTheme();
  const { showMiniPlayer, currentAudio } = useAudio();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Enhanced tab route detection (same as MiniPlayerV2)
  const isTabRoute = React.useMemo(() => {
    const tabRoutes = [
      '/(tabs)/',
      '/(tabs)/feed', 
      '/(tabs)/discover',
      '/(tabs)/playlist',
      '/(tabs)/archive',
      '/playlist',
      '/feed',
      '/discover', 
      '/archive',
      '/', // Home route
    ];
    
    return tabRoutes.includes(pathname) || 
           pathname.includes('/(tabs)') ||
           pathname.startsWith('/(tabs)');
  }, [pathname]);

  // Calculate consistent bottom position for all buttons
  const calculateButtonPosition = () => {
    const isMiniPlayerVisible = showMiniPlayer && currentAudio;
    
    // Base positions
    const tabHeight = Platform.OS === 'ios' ? 49 + insets.bottom : 56;
    const safeBottomArea = insets.bottom || 0;
    
    if (isMiniPlayerVisible) {
      // Stack: Footer -> MiniPlayer -> Buttons
      // MiniPlayer positioning (from MiniPlayerV2)
      const miniPlayerGap = Platform.OS === 'web' ? 6 : 4;
      const miniPlayerBottom = isTabRoute ? tabHeight + miniPlayerGap : safeBottomArea + miniPlayerGap;
      const MINI_PLAYER_HEIGHT = 76;
      const BUTTON_GAP = 16; // Slightly more gap for better visual separation
      
      return miniPlayerBottom + MINI_PLAYER_HEIGHT + BUTTON_GAP;
    } else {
      // Stack: Footer -> Buttons  
      const BUTTON_GAP = 16; // Consistent gap above footer
      const footerTop = isTabRoute ? tabHeight : safeBottomArea;
      
      return footerTop + BUTTON_GAP;
    }
  };

  const bottomPosition = calculateButtonPosition();

  // Filter visible actions
  const visibleActions = actions.filter(action => action.visible !== false);

  if (visibleActions.length === 0) {
    return null;
  }

  // Get button style based on type
  const getButtonStyle = (style: FloatingButtonAction['style'] = 'primary') => {
    switch (style) {
      case 'secondary':
        return {
          backgroundColor: theme.surface,
          borderColor: theme.primary,
          borderWidth: 2,
        };
      case 'success':
        return {
          backgroundColor: theme.success || '#28a745',
          borderWidth: 0,
        };
      case 'primary':
      default:
        return {
          backgroundColor: theme.primary,
          borderWidth: 0,
        };
    }
  };

  const getIconColor = (style: FloatingButtonAction['style'] = 'primary') => {
    switch (style) {
      case 'secondary':
        return theme.primary;
      case 'success':
      case 'primary':
      default:
        return '#fff';
    }
  };

  return (
    <View style={[styles.container, { bottom: bottomPosition }]}>
      {visibleActions.map((action, index) => {
        const buttonStyle = getButtonStyle(action.style);
        const iconColor = getIconColor(action.style);
        
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.button,
              buttonStyle,
              action.disabled && styles.disabled,
            ]}
            onPress={action.onPress}
            disabled={action.disabled || action.loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            accessibilityHint={action.accessibilityHint}
            accessibilityState={{ 
              disabled: action.disabled || action.loading 
            }}
          >
            {action.loading ? (
              <ActivityIndicator size={20} color={iconColor} />
            ) : (
              <Ionicons 
                name={action.icon} 
                size={20} 
                color={iconColor} 
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row-reverse', // Right to left ordering
    gap: 12, // Space between buttons
    zIndex: 999,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabled: {
    opacity: 0.6,
  },
});