/**
 * MiniPlayer v2 - Completely rebuilt for latest UI system
 * Features:
 * - Proper tab route detection  
 * - Enhanced controls (queue, speed, skip)
 * - Modern design with glassmorphism
 * - Improved positioning logic
 * - Better accessibility
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

export default function MiniPlayerV2() {
  const {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    pauseAudio,
    resumeAudio,
    stopAudio,
    setShowFullScreenPlayer,
    showMiniPlayer,
    playbackRate,
    audioQueue,
    playNext,
    playPrevious,
    setPlaybackRate,
  } = useAudio();
  
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  // Enhanced tab route detection
  const getTabInfo = () => {
    // More comprehensive tab detection
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
    
    const isTabRoute = tabRoutes.includes(pathname) || 
                      pathname.includes('/(tabs)') ||
                      pathname.startsWith('/(tabs)');
    
    // Simple positioning approach - let the system handle complexities
    let bottomOffset;
    
    if (Platform.OS === 'web') {
      bottomOffset = isTabRoute ? 10 : 10; // Simple web positioning
    } else {
      bottomOffset = isTabRoute ? 50 : 30; // Reduced native positioning - closer to footer
    }

    // Only log in development mode
    if (__DEV__) {
      console.log(`🎵 MiniPlayerV2: path="${pathname}", isTab=${isTabRoute}, total=${bottomOffset}`);
    }
    
    return { isTabRoute, bottomOffset };
  };

  const { isTabRoute, bottomOffset } = getTabInfo();

  // Show/hide animation
  useEffect(() => {
    if (showMiniPlayer && currentAudio) {
      setIsVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [showMiniPlayer, currentAudio]);

  // Progress animation
  useEffect(() => {
    if (duration > 0) {
      const progressValue = (position / duration) * 100;
      Animated.timing(progressAnim, {
        toValue: progressValue,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [position, duration]);

  // Pan responder for seek functionality
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Implement seek logic here if needed
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Handle seek completion
      },
    })
  ).current;

  // Handlers
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  };

  const handleStop = () => {
    stopAudio();
  };

  const handleOpenFullScreen = () => {
    setShowFullScreenPlayer(true);
  };

  const handleSkipBackward = () => {
    if (playPrevious) {
      playPrevious();
    }
  };

  const handleSkipForward = () => {
    if (playNext) {
      playNext();
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackRate || 1.0);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    
    if (setPlaybackRate) {
      setPlaybackRate(newSpeed);
    }
  };

  const handleQueuePress = () => {
    handleOpenFullScreen();
  };

  // Format time utility
  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible || !currentAudio) {
    return null;
  }

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: `${theme.surface}F0`, // Glassmorphism effect
          borderColor: theme.border,
          bottom: bottomOffset,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: theme.divider }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Left: Album art + Info */}
        <TouchableOpacity
          style={styles.leftSection}
          onPress={handleOpenFullScreen}
          activeOpacity={0.7}
        >
          <View style={[styles.albumArt, { backgroundColor: theme.accent }]}>
            <Ionicons name="musical-notes" size={20} color={theme.textMuted} />
          </View>
          
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: theme.text }]} numberOfLines={1}>
              {currentAudio.title}
            </Text>
            <View style={styles.trackMeta}>
              <Text style={[styles.trackTime, { color: theme.textSecondary }]}>
                {formatTime(position)} / {formatTime(duration)}
              </Text>
              {playbackRate && playbackRate !== 1.0 && (
                <Text style={[styles.speedIndicator, { color: theme.primary }]}>
                  {playbackRate}×
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: Controls */}
        <View style={styles.rightSection}>
          {/* Queue indicator */}
          {audioQueue && audioQueue.length > 0 && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleQueuePress}
              hitSlop={hitSlop}
            >
              <View style={styles.queueBadge}>
                <Ionicons name="list" size={16} color={theme.textMuted} />
                <Text style={[styles.queueCount, { color: theme.textMuted }]}>
                  {audioQueue.length}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Skip backward */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSkipBackward}
            hitSlop={hitSlop}
          >
            <Ionicons name="play-back" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: theme.primary }]}
            onPress={handlePlayPause}
            disabled={isLoading}
            hitSlop={hitSlop}
          >
            {isLoading ? (
              <Ionicons name="hourglass" size={20} color="#fff" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={20}
                color="#fff"
              />
            )}
          </TouchableOpacity>

          {/* Skip forward */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSkipForward}
            hitSlop={hitSlop}
          >
            <Ionicons name="play-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Speed control */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleSpeedToggle}
            hitSlop={hitSlop}
          >
            <Text style={[styles.speedText, { color: theme.textMuted }]}>
              {playbackRate || 1.0}×
            </Text>
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleStop}
            hitSlop={hitSlop}
          >
            <Ionicons name="stop" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(20px)', // Glassmorphism for web
    zIndex: 998,
  },
  progressContainer: {
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 8,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  albumArt: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackTime: {
    fontSize: 11,
  },
  speedIndicator: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  playButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginHorizontal: 4,
  },
  queueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  queueCount: {
    fontSize: 10,
    fontWeight: '600',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '600',
  },
});