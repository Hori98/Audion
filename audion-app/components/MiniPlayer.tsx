import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import TabBarService from '../services/TabBarService';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
export default function MiniPlayer() {
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
    recordInteraction,
    playbackRate,
    audioQueue,
  } = useAudio();
  const { theme } = useTheme();
  
  const { totalBottomOffset, isTabRoute, tabBarHeight, safeAreaBottom } = useTabBarHeight();
  const [debugInfo, setDebugInfo] = useState('');
  
  // Update debug info when offset changes
  useEffect(() => {
    const debug = isTabRoute 
      ? `Tab: ${Platform.OS}, tab=${tabBarHeight}, safe=${safeAreaBottom}, total=${totalBottomOffset}`
      : `NoTab: ${Platform.OS}, safe=${safeAreaBottom}, total=${totalBottomOffset}`;
    
    setDebugInfo(debug);
  }, [totalBottomOffset, isTabRoute, tabBarHeight, safeAreaBottom]);
  
  const handleOpenFullScreen = () => {
    recordInteraction('full_screen_opened');
    setShowFullScreenPlayer(true);
  };

  const handleOpenFullScreenWithScript = () => {
    recordInteraction('script_opened_from_mini');
    setShowFullScreenPlayer(true, true); // Open directly to script
  };

  if (!showMiniPlayer || !currentAudio) {
    return null;
  }

  // Debug mode - show debug info in development
  const showDebugInfo = __DEV__ && true; // Set to true to see debug info

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={[
      styles.container, 
      { 
        bottom: totalBottomOffset, 
        backgroundColor: theme.surface, 
        borderTopColor: theme.border,
        marginHorizontal: 8,
        borderRadius: 12,
        marginBottom: 4,
        shadowColor: theme.text,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }
    ]}>
      {/* Main Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={handleOpenFullScreen}
        activeOpacity={0.8}
      >
        {/* Album Art Placeholder */}
        <View style={[styles.albumArt, { backgroundColor: theme.accent }]}>
          <Ionicons name="musical-notes" size={24} color={theme.textMuted} />
        </View>

        {/* Audio Info */}
        <View style={styles.audioInfo}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {currentAudio.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {format(new Date(currentAudio.created_at), 'MMM dd, yyyy')} · {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {audioQueue.length > 0 && (
            <TouchableOpacity
              onPress={handleOpenFullScreen}
              style={styles.queueButton}
            >
              <Ionicons name="list-outline" size={20} color={theme.textMuted} />
              <Text style={[styles.queueCount, { color: theme.textMuted }]}>
                {audioQueue.length}
              </Text>
            </TouchableOpacity>
          )}
          
          {currentAudio?.script && (
            <TouchableOpacity
              onPress={handleOpenFullScreenWithScript}
              style={styles.scriptButton}
            >
              <Ionicons name="document-text-outline" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={isPlaying ? pauseAudio : resumeAudio}
            style={styles.playButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <Ionicons name="hourglass" size={24} color={theme.primary} />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color={theme.primary}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={stopAudio}
            style={styles.stopButton}
          >
            <Ionicons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      
      {/* Progress Bar at Bottom */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.divider }]}>
          <View 
            style={[
              styles.progressFill,
              { width: `${progressPercentage}%`, backgroundColor: theme.primary }
            ]}
          />
        </View>
      </View>
      
      {/* Debug Info - Development Only */}
      {showDebugInfo && (
        <View style={[styles.debugInfo, { backgroundColor: theme.background }]}>
          <Text style={[styles.debugText, { color: theme.text }]}>
            {debugInfo}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999, // Below tab bar but above content
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#f3f4f6',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
  },
  albumArt: {
    width: 48,
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioInfo: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    padding: 8,
    marginRight: 8,
  },
  stopButton: {
    padding: 8,
  },
  scriptButton: {
    padding: 8,
    marginRight: 4,
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 4,
    gap: 2,
  },
  queueCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  debugInfo: {
    position: 'absolute',
    top: -30,
    left: 8,
    right: 8,
    padding: 4,
    borderRadius: 4,
    opacity: 0.9,
  },
  debugText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});