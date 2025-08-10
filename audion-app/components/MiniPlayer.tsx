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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

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
  } = useAudio();
  const { theme } = useTheme();
  
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  // Calculate bottom position based on current route
  const calculateBottomPosition = () => {
    // Tab routes that have tab bar
    const tabRoutes = ['/feed', '/auto-pick', '/library', '/sources'];
    const isTabRoute = tabRoutes.some(route => pathname.startsWith(route));
    
    if (isTabRoute) {
      // Tab bar height + safe area
      return 49 + insets.bottom;
    } else {
      // No tab bar, just safe area
      return insets.bottom;
    }
  };
  
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

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={[styles.container, { bottom: calculateBottomPosition(), backgroundColor: theme.surface, borderTopColor: theme.border }]}>
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
});