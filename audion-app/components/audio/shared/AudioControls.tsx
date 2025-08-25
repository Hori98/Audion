/**
 * AudioControls - Shared audio control components
 * Used across all 4 player types for consistency
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

interface PlayPauseButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'minimal';
}

export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  isPlaying,
  isLoading,
  onPress,
  size = 'medium',
  variant = 'primary'
}) => {
  const { theme } = useTheme();
  
  const sizeConfig = {
    small: { buttonSize: 32, iconSize: 16 },
    medium: { buttonSize: 44, iconSize: 20 },
    large: { buttonSize: 56, iconSize: 24 }
  };
  
  const variantConfig = {
    primary: {
      backgroundColor: theme.primary,
      iconColor: '#fff'
    },
    secondary: {
      backgroundColor: theme.surface,
      iconColor: theme.text
    },
    minimal: {
      backgroundColor: 'transparent',
      iconColor: theme.text
    }
  };
  
  const { buttonSize, iconSize } = sizeConfig[size];
  const { backgroundColor, iconColor } = variantConfig[variant];
  
  return (
    <TouchableOpacity
      style={[
        styles.playButton,
        {
          backgroundColor,
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          opacity: isLoading ? 0.7 : 1
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      {isLoading ? (
        <Ionicons name="hourglass-outline" size={iconSize} color={iconColor} />
      ) : (
        <Ionicons 
          name={isPlaying ? "pause" : "play"} 
          size={iconSize} 
          color={iconColor}
          style={!isPlaying && { marginLeft: 2 }} // Center play icon
        />
      )}
    </TouchableOpacity>
  );
};

interface TimeDisplayProps {
  currentTime: number; // in seconds
  totalTime: number;   // in seconds
  variant?: 'compact' | 'full';
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  currentTime,
  totalTime,
  variant = 'full'
}) => {
  const { theme } = useTheme();
  
  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (variant === 'compact') {
    return (
      <Text style={[styles.timeCompact, { color: theme.textSecondary }]}>
        {formatTime(currentTime)}
      </Text>
    );
  }
  
  return (
    <View style={styles.timeContainer}>
      <Text style={[styles.timeText, { color: theme.text }]}>
        {formatTime(currentTime)}
      </Text>
      <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>
        /
      </Text>
      <Text style={[styles.timeText, { color: theme.textSecondary }]}>
        {formatTime(totalTime)}
      </Text>
    </View>
  );
};

interface AudioInfoProps {
  title: string;
  subtitle?: string;
  showIcon?: boolean;
  iconName?: string;
  iconColor?: string;
  maxLines?: number;
}

export const AudioInfo: React.FC<AudioInfoProps> = ({
  title,
  subtitle,
  showIcon = false,
  iconName = 'radio-outline',
  iconColor,
  maxLines = 1
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.audioInfoContainer}>
      {showIcon && (
        <View style={[styles.iconContainer, { backgroundColor: theme.accent }]}>
          <Ionicons 
            name={iconName as any} 
            size={16} 
            color={iconColor || theme.primary} 
          />
        </View>
      )}
      
      <View style={styles.textContainer}>
        <Text 
          style={[styles.titleText, { color: theme.text }]} 
          numberOfLines={maxLines}
        >
          {title}
        </Text>
        {subtitle && (
          <Text 
            style={[styles.subtitleText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

interface PlaybackSpeedControlProps {
  currentRate: number;
  onRateChange: (rate: number) => void;
  availableRates?: number[];
}

export const PlaybackSpeedControl: React.FC<PlaybackSpeedControlProps> = ({
  currentRate,
  onRateChange,
  availableRates = [0.5, 0.75, 1, 1.25, 1.5, 2]
}) => {
  const { theme } = useTheme();
  
  const cycleSpeed = () => {
    const currentIndex = availableRates.indexOf(currentRate);
    const nextIndex = (currentIndex + 1) % availableRates.length;
    onRateChange(availableRates[nextIndex]);
  };
  
  return (
    <TouchableOpacity
      style={[styles.speedButton, { backgroundColor: theme.surface }]}
      onPress={cycleSpeed}
      activeOpacity={0.7}
    >
      <Text style={[styles.speedText, { color: theme.text }]}>
        {currentRate}x
      </Text>
    </TouchableOpacity>
  );
};

interface ActionButtonProps {
  icon: string;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium';
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onPress,
  disabled = false,
  variant = 'secondary',
  size = 'medium'
}) => {
  const { theme } = useTheme();
  
  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      textColor: '#fff'
    },
    secondary: {
      backgroundColor: theme.surface,
      textColor: theme.text
    },
    danger: {
      backgroundColor: '#FF6B6B',
      textColor: '#fff'
    }
  };
  
  const sizeStyles = {
    small: { padding: 8, iconSize: 16 },
    medium: { padding: 12, iconSize: 20 }
  };
  
  const { backgroundColor, textColor } = variantStyles[variant];
  const { padding, iconSize } = sizeStyles[size];
  
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor,
          padding,
          opacity: disabled ? 0.5 : 1
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Ionicons name={icon as any} size={iconSize} color={textColor} />
      {label && (
        <Text style={[styles.actionButtonText, { color: textColor }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  playButton: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: 14,
    marginHorizontal: 4,
  },
  timeCompact: {
    fontSize: 12,
    fontWeight: '500',
  },
  audioInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitleText: {
    fontSize: 13,
    marginTop: 2,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  speedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});