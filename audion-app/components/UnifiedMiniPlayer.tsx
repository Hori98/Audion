/**
 * UnifiedMiniPlayer - Works with both AudioContext and AudioPlayerContext
 * Automatically adapts to whichever system is active
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UnifiedMiniPlayer() {
  // Legacy AudioContext
  const {
    currentAudio,
    isPlaying: legacyIsPlaying,
    position: legacyPosition,
    duration: legacyDuration,
    pauseAudio,
    resumeAudio,
    stopAudio,
    showMiniPlayer,
  } = useAudio();
  
  // New AudioPlayerContext
  const {
    currentTrack,
    playbackState,
    positionMillis,
    durationMillis,
    togglePlayPause,
    stop: newStop,
  } = useAudioPlayer();

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine which system is active
  const isNewSystemActive = currentTrack && playbackState !== 'IDLE';
  const isLegacySystemActive = currentAudio && showMiniPlayer;

  // Use appropriate audio data based on which system is active
  const activeAudio = isNewSystemActive ? {
    title: currentTrack?.title || '',
    artist: currentTrack?.artist || 'Unknown',
    isPlaying: playbackState === 'PLAYING',
    position: positionMillis / 1000, // Convert to seconds
    duration: durationMillis / 1000, // Convert to seconds
    isLoading: playbackState === 'LOADING'
  } : {
    title: currentAudio?.title || '',
    artist: currentAudio?.artist || 'Unknown',
    isPlaying: legacyIsPlaying,
    position: legacyPosition,
    duration: legacyDuration,
    isLoading: false
  };

  // Don't show if no audio is active
  if (!isNewSystemActive && !isLegacySystemActive) {
    return null;
  }

  const handlePlayPause = async () => {
    try {
      if (isNewSystemActive) {
        await togglePlayPause();
      } else {
        if (activeAudio.isPlaying) {
          pauseAudio();
        } else {
          resumeAudio();
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleStop = async () => {
    try {
      if (isNewSystemActive) {
        await newStop();
      } else {
        stopAudio();
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = activeAudio.duration > 0 
    ? (activeAudio.position / activeAudio.duration) * 100 
    : 0;

  // Screen dimensions
  const { width: screenWidth } = Dimensions.get('window');
  const miniPlayerWidth = screenWidth - 32; // 16px margin on each side

  // PanResponder for seek functionality
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Could pause during seeking
      },
      onPanResponderMove: (evt, gestureState) => {
        // Calculate seek position
        const seekPercentage = Math.max(0, Math.min(1, gestureState.moveX / miniPlayerWidth));
        const seekPosition = seekPercentage * activeAudio.duration;
        
        // For now, just visual feedback
        // TODO: Implement actual seeking
      },
      onPanResponderRelease: () => {
        // Resume playback if needed
      },
    })
  ).current;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.surface,
        borderTopColor: theme.border,
        marginBottom: insets.bottom,
      }
    ]}>
      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <View 
          style={[
            styles.progressBar, 
            { 
              width: `${progressPercentage}%`,
              backgroundColor: theme.primary 
            }
          ]} 
        />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Audio info */}
        <View style={styles.audioInfo}>
          <Text 
            style={[styles.audioTitle, { color: theme.text }]} 
            numberOfLines={1}
          >
            {activeAudio.title}
          </Text>
          <Text 
            style={[styles.audioArtist, { color: theme.textSecondary }]} 
            numberOfLines={1}
          >
            {formatTime(activeAudio.position)} / {formatTime(activeAudio.duration)}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: theme.primary }]}
            onPress={handlePlayPause}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeAudio.isPlaying ? 'pause' : 'play'}
              size={20}
              color="#fff"
              style={!activeAudio.isPlaying && styles.playIconOffset}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton, { borderColor: theme.border }]}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Ionicons
              name="stop"
              size={16}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Debug info (development only) */}
      {__DEV__ && (
        <Text style={[styles.debugText, { color: theme.textSecondary }]}>
          {isNewSystemActive ? `New: ${playbackState}` : `Legacy: ${legacyIsPlaying ? 'Playing' : 'Paused'}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    borderTopWidth: 1,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  progressContainer: {
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  audioInfo: {
    flex: 1,
    minWidth: 0, // Allows text truncation
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  audioArtist: {
    fontSize: 12,
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  playIconOffset: {
    marginLeft: 2, // Optical alignment for play icon
  },
  debugText: {
    fontSize: 10,
    textAlign: 'center',
    paddingBottom: 4,
  },
});