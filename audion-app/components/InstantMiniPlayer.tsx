/**
 * InstantMiniPlayer - Minimal interface for instant audio playback
 * Shows only title and play/pause - no duration, no full-screen access
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface InstantMiniPlayerProps {
  onOpenInstantView: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function InstantMiniPlayer({ onOpenInstantView }: InstantMiniPlayerProps) {
  const { theme } = useTheme();
  
  // Legacy AudioContext
  const { 
    currentAudio, 
    isPlaying, 
    position, 
    duration, 
    playAudio, 
    pauseAudio,
    showMiniPlayer 
  } = useAudio();
  
  // New AudioPlayerContext
  const {
    currentTrack: newCurrentTrack,
    playbackState: newPlaybackState,
    positionMillis: newPositionMillis,
    durationMillis: newDurationMillis,
    togglePlayPause: newTogglePlayPause
  } = useAudioPlayer();

  const slideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Determine which system is active
  const isNewSystemActive = newCurrentTrack && newPlaybackState !== 'IDLE';
  const isLegacySystemActive = currentAudio && showMiniPlayer;
  
  // Only show for instant audio (both systems)
  const isInstantAudio = 
    // Legacy system instant audio
    (currentAudio && (
      currentAudio.id.includes('instant_') || 
      currentAudio.title?.includes('Instant Audio')
    )) ||
    // New system audio (all considered instant)
    isNewSystemActive;
  
  const isVisible = (isNewSystemActive || isLegacySystemActive) && isInstantAudio;

  // Use appropriate data based on active system
  const activeAudioData = isNewSystemActive ? {
    title: newCurrentTrack?.title,
    isPlaying: newPlaybackState === 'PLAYING',
    position: newPositionMillis,
    duration: newDurationMillis
  } : {
    title: currentAudio?.title,
    isPlaying: isPlaying,
    position: position,
    duration: duration
  };

  // Slide animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  // Progress animation
  useEffect(() => {
    const currentDuration = activeAudioData?.duration || 0;
    const currentPosition = activeAudioData?.position || 0;
    
    if (currentDuration > 0) {
      const progressValue = (currentPosition / currentDuration) * 100;
      Animated.timing(progressAnim, {
        toValue: progressValue,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [activeAudioData?.position, activeAudioData?.duration]);

  const handlePlayPause = async () => {
    if (isNewSystemActive) {
      // Use new AudioPlayerContext
      await newTogglePlayPause();
    } else if (currentAudio) {
      // Use legacy AudioContext
      if (isPlaying) {
        pauseAudio();
      } else {
        await playAudio(currentAudio);
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Minimal Progress Bar */}
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

      {/* Main Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onOpenInstantView}
        activeOpacity={0.7}
      >
        {/* Left: Audio Icon + Title */}
        <View style={styles.leftSection}>
          <View style={[styles.audioIcon, { backgroundColor: theme.accent }]}>
            <Ionicons name="radio-outline" size={16} color={theme.primary} />
          </View>
          
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {activeAudioData?.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              即席音声 • ライブ作成中
            </Text>
          </View>
        </View>

        {/* Right: Play/Pause Only */}
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: theme.primary }]}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={activeAudioData?.isPlaying ? "pause" : "play"} 
            size={18} 
            color="#fff" 
            style={!activeAudioData?.isPlaying && { marginLeft: 2 }} // Center play icon better
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  progressContainer: {
    height: 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  progressBar: {
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});