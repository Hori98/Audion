/**
 * SeekBar - Advanced seek control with drag and tap support
 * Used in both mini and full players with different variants
 */

import React, { useRef, useState, useCallback } from 'react';
import { View, PanResponder, Dimensions, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SeekBarProps {
  currentTime: number; // in seconds
  totalTime: number;   // in seconds
  onSeek: (timeSeconds: number) => void;
  variant?: 'mini' | 'full';
  disabled?: boolean;
  showThumb?: boolean;
  height?: number;
}

export const SeekBar: React.FC<SeekBarProps> = ({
  currentTime,
  totalTime,
  onSeek,
  variant = 'full',
  disabled = false,
  showThumb = true,
  height
}) => {
  const { theme } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const progressBarRef = useRef<View>(null);
  const progressBarWidth = useRef(0);
  
  // Configuration based on variant
  const config = {
    mini: {
      height: height || 4,
      thumbSize: 0, // No thumb in mini variant
      touchHeight: 20, // Larger touch area
    },
    full: {
      height: height || 6,
      thumbSize: showThumb ? 16 : 0,
      touchHeight: 40,
    }
  };
  
  const currentConfig = config[variant];
  
  // Calculate progress percentage
  const progressPercentage = totalTime > 0 
    ? ((isDragging ? dragPosition : currentTime) / totalTime) * 100 
    : 0;
  
  // Measure progress bar width
  const handleLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    progressBarWidth.current = width;
  }, []);
  
  // Convert touch position to time
  const positionToTime = useCallback((position: number) => {
    const percentage = Math.max(0, Math.min(1, position / progressBarWidth.current));
    return percentage * totalTime;
  }, [totalTime]);
  
  // PanResponder for drag operations
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return !disabled && (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3);
      },
      onPanResponderGrant: (evt) => {
        if (disabled) return;
        setIsDragging(true);
        const locationX = evt.nativeEvent.locationX;
        const newTime = positionToTime(locationX);
        setDragPosition(newTime);
      },
      onPanResponderMove: (evt) => {
        if (disabled) return;
        const locationX = evt.nativeEvent.locationX;
        const newTime = positionToTime(locationX);
        setDragPosition(Math.max(0, Math.min(totalTime, newTime)));
      },
      onPanResponderRelease: () => {
        if (disabled) return;
        setIsDragging(false);
        onSeek(dragPosition);
      },
      onPanResponderTerminate: () => {
        if (disabled) return;
        setIsDragging(false);
      },
    })
  ).current;
  
  // Handle tap to seek
  const handleTap = useCallback((evt: any) => {
    if (disabled) return;
    const locationX = evt.nativeEvent.locationX;
    const newTime = positionToTime(locationX);
    onSeek(Math.max(0, Math.min(totalTime, newTime)));
  }, [disabled, positionToTime, totalTime, onSeek]);
  
  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View
          style={[
            styles.touchArea,
            { height: currentConfig.touchHeight }
          ]}
          {...panResponder.panHandlers}
        >
          <View
            ref={progressBarRef}
            style={[
              styles.progressContainer,
              {
                height: currentConfig.height,
                backgroundColor: theme.divider,
              }
            ]}
            onLayout={handleLayout}
          >
            {/* Progress fill */}
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, progressPercentage))}%`,
                  backgroundColor: isDragging ? theme.accent : theme.primary,
                  height: currentConfig.height,
                }
              ]}
            />
            
            {/* Thumb (for full variant only) */}
            {currentConfig.thumbSize > 0 && (
              <View
                style={[
                  styles.thumb,
                  {
                    width: currentConfig.thumbSize,
                    height: currentConfig.thumbSize,
                    borderRadius: currentConfig.thumbSize / 2,
                    backgroundColor: isDragging ? theme.accent : theme.primary,
                    left: `${Math.max(0, Math.min(100, progressPercentage))}%`,
                    marginLeft: -currentConfig.thumbSize / 2,
                    opacity: isDragging ? 1 : 0.9,
                    transform: [{ scale: isDragging ? 1.2 : 1 }],
                  }
                ]}
              />
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: 'thin' | 'thick';
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'thin',
  color,
  backgroundColor,
  animated = false
}) => {
  const { theme } = useTheme();
  
  const height = variant === 'thin' ? 2 : 4;
  const progressColor = color || theme.primary;
  const bgColor = backgroundColor || theme.divider;
  
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.progressContainer,
          {
            height,
            backgroundColor: bgColor,
          }
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(0, Math.min(100, progress))}%`,
              backgroundColor: progressColor,
              height,
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  touchArea: {
    width: '100%',
    justifyContent: 'center',
  },
  progressContainer: {
    width: '100%',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -8, // Half of thumb size
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});