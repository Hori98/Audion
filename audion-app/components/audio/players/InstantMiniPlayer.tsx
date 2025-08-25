/**
 * InstantMiniPlayer - Mini player for AutoPick instant audio (unsaved)
 * Features: Creation progress, genre indicator, drag-to-dismiss, save button
 * Only shown for instant audio before saving
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, PanResponder, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useUnifiedAudio } from '../../../context/UnifiedAudioContext';
import { InstantPlayerProps } from '../../../types/audio';
import { PlayPauseButton, AudioInfo } from '../shared/AudioControls';
import { ProgressBar } from '../shared/SeekBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const InstantMiniPlayer: React.FC<InstantPlayerProps> = ({
  visible,
  onOpenFullView,
  onSave,
  context
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, togglePlayPause, convertToSaved } = useUnifiedAudio();
  
  const { 
    currentTrack, 
    playbackState, 
    positionMillis, 
    durationMillis,
    creationProgress,
    creationStage 
  } = state;

  // Animation refs
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  
  // Only show if we have instant audio and visibility is true
  const shouldShow = visible && 
                    currentTrack && 
                    state.audioType === 'instant' && 
                    playbackState !== 'IDLE';

  // Slide animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  // Auto-show creation progress for first few seconds
  useEffect(() => {
    if (creationProgress !== undefined && creationProgress < 100) {
      setShowProgressDetails(true);
      const timer = setTimeout(() => {
        setShowProgressDetails(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [creationProgress]);

  // Drag-to-dismiss functionality
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Start drag
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) {
          // Dragged down enough to dismiss
          Alert.alert(
            '音声を停止',
            '即席音声の再生を停止しますか？',
            [
              { text: 'キャンセル', style: 'cancel', onPress: () => {
                Animated.spring(slideAnim, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
              }},
              { text: '停止', style: 'destructive', onPress: () => {
                // Stop audio and dismiss
                state.showMiniPlayer && onSave?.(currentTrack!);
              }},
            ]
          );
        } else {
          // Snap back
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleSaveAudio = async () => {
    if (currentTrack) {
      Alert.alert(
        '音声を保存',
        'この即席音声をライブラリに保存しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '保存',
            onPress: async () => {
              try {
                await convertToSaved();
                onSave?.(currentTrack);
              } catch (error) {
                console.error('Failed to save instant audio:', error);
              }
            },
          },
        ]
      );
    }
  };

  const getContextInfo = () => {
    const contextMap = {
      home: { emoji: '🏠', label: 'Home Auto-Pick' },
      feed: { emoji: '📰', label: 'Feed Auto-Pick' }
    };
    return contextMap[context || 'home'] || { emoji: '🎵', label: 'Instant Audio' };
  };

  const getCreationStageText = () => {
    const stageMap = {
      articles: '記事選択中',
      script: '台本作成中',
      audio: '音声生成中',
      complete: '完成'
    };
    return stageMap[creationStage || 'complete'] || '処理中';
  };

  const getGenreFromTrack = () => {
    return currentTrack?.genre || currentTrack?.source || 'ニュース';
  };

  if (!shouldShow) {
    return null;
  }

  const contextInfo = getContextInfo();
  const isPlaying = playbackState === 'PLAYING';
  const isLoading = playbackState === 'LOADING';
  const progress = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

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
      {...panResponder.panHandlers}
    >
      {/* Creation Progress Indicator (when active) */}
      {showProgressDetails && creationProgress !== undefined && creationProgress < 100 && (
        <View style={[styles.creationProgressContainer, { backgroundColor: theme.accent }]}>
          <View style={styles.creationProgressContent}>
            <Ionicons name="construct-outline" size={16} color={theme.primary} />
            <Text style={[styles.creationProgressText, { color: theme.primary }]}>
              {getCreationStageText()} {creationProgress.toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      {/* Main Progress Bar */}
      <ProgressBar 
        progress={progress} 
        variant="thin" 
        color={theme.primary}
      />

      {/* Main Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onOpenFullView}
        activeOpacity={0.8}
      >
        {/* Left: Audio Info with Context */}
        <View style={styles.leftSection}>
          <AudioInfo
            title={currentTrack?.title || 'Instant Audio'}
            subtitle={`${contextInfo.emoji} ${contextInfo.label} • ${getGenreFromTrack()}`}
            showIcon
            iconName="radio-outline"
            iconColor={theme.primary}
            maxLines={1}
          />
        </View>

        {/* Right: Controls */}
        <View style={styles.rightSection}>
          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.accent }]}
            onPress={handleSaveAudio}
            activeOpacity={0.7}
          >
            <Ionicons name="save-outline" size={16} color={theme.primary} />
          </TouchableOpacity>

          {/* Play/Pause Button */}
          <PlayPauseButton
            isPlaying={isPlaying}
            isLoading={isLoading}
            onPress={togglePlayPause}
            size="medium"
            variant="primary"
          />
        </View>
      </TouchableOpacity>

      {/* Drag Handle Indicator */}
      <View style={[styles.dragHandle, { backgroundColor: theme.textSecondary }]} />
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
  creationProgressContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  creationProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creationProgressText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    position: 'absolute',
    top: 6,
    left: '50%',
    width: 32,
    height: 3,
    borderRadius: 2,
    marginLeft: -16,
    opacity: 0.3,
  },
});

export default InstantMiniPlayer;