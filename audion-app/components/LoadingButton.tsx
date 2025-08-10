import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface LoadingButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

export default function LoadingButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
  textStyle,
  testID = 'loading-button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button' as const,
}: LoadingButtonProps) {
  const { theme } = useTheme();

  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: size === 'small' ? 8 : size === 'large' ? 12 : 10,
      paddingVertical: size === 'small' ? 8 : size === 'large' ? 16 : 12,
      paddingHorizontal: size === 'small' ? 12 : size === 'large' ? 24 : 16,
      opacity: isDisabled ? 0.6 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: theme.primary,
        };
      default:
        return baseStyle;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return '#fff';
      case 'secondary':
        return theme.text;
      case 'outline':
        return theme.primary;
      default:
        return theme.text;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 18;
      default: return 16;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContent}>
          <ActivityIndicator 
            size={getIconSize()} 
            color={getTextColor()}
            testID={`${testID}-spinner`}
          />
          <Text 
            style={[
              styles.buttonText, 
              { 
                color: getTextColor(), 
                fontSize: getFontSize(),
                marginLeft: 8,
              },
              textStyle
            ]}
            testID={`${testID}-loading-text`}
          >
            Loading...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.buttonContent}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={getTextColor()} 
            style={{ marginRight: 8 }}
          />
        )}
        <Text 
          style={[
            styles.buttonText, 
            { color: getTextColor(), fontSize: getFontSize() },
            textStyle
          ]}
          testID={`${testID}-text`}
        >
          {title}
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ 
        disabled: isDisabled,
        busy: loading
      }}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});