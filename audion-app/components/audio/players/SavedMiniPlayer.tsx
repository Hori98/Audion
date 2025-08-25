/**
 * SavedMiniPlayer - Simplified mini player for saved audio
 * Basic structure only: Thumbnail + Progress + Play/Stop
 * No additional features as requested
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useUnifiedAudio } from '../../../context/UnifiedAudioContext';
import { SavedPlayerProps } from '../../../types/audio';
import { PlayPauseButton, TimeDisplay } from '../shared/AudioControls';
import { SeekBar } from '../shared/SeekBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SavedMiniPlayer: React.FC<SavedPlayerProps> = ({
  visible,
  onAddToPlaylist,
  onShare
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, togglePlayPause, seekTo, stop } = useUnifiedAudio();
  
  const { 
    currentTrack, 
    playbackState, 
    positionMillis, 
    durationMillis 
  } = state;

  // Animation refs
  const slideAnim = useRef(new Animated.Value(100)).current;
  
  // Only show if we have saved audio and visibility is true
  const shouldShow = visible && 
                    currentTrack && 
                    state.audioType === 'saved' && 
                    playbackState !== 'IDLE';

  // Slide animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  const handleSeek = (timeSeconds: number) => {
    seekTo(timeSeconds);
  };

  const handleStop = async () => {
    await stop();
  };

  if (!shouldShow) {
    return null;
  }

  const isPlaying = playbackState === 'PLAYING';
  const isLoading = playbackState === 'LOADING';
  const currentTimeSeconds = positionMillis / 1000;
  const totalTimeSeconds = durationMillis / 1000;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          bottom: insets.bottom + 60, // Above tab bar
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Seekable Progress Bar */}
      <SeekBar
        currentTime={currentTimeSeconds}
        totalTime={totalTimeSeconds}
        onSeek={handleSeek}
        variant="mini"
        height={4}
      />

      {/* Main Content - Basic Structure Only */}
      <View style={styles.content}>
        {/* Left: Thumbnail + Title */}
        <View style={styles.leftSection}>
          <View style={[styles.thumbnail, { backgroundColor: theme.accent }]}>
            <Ionicons name="library-outline" size={20} color={theme.primary} />
          </View>
          
          <View style={styles.audioInfo}>
            <Text 
              style={[styles.title, { color: theme.text }]} 
              numberOfLines={1}
            >
              {currentTrack?.title || 'Saved Audio'}
            </Text>
            <TimeDisplay
              currentTime={currentTimeSeconds}
              totalTime={totalTimeSeconds}
              variant="compact"
            />
          </View>
        </View>

        {/* Right: Play/Stop Controls Only */}
        <View style={styles.rightSection}>
          <PlayPauseButton
            isPlaying={isPlaying}
            isLoading={isLoading}
            onPress={togglePlayPause}
            size="medium"
            variant="primary"
          />
          
          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: theme.surface }]}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Ionicons name="stop" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});

export default SavedMiniPlayer;