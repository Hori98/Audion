import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { format } from 'date-fns';

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
  } = useAudio();
  
  const handleOpenFullScreen = () => {
    recordInteraction('full_screen_opened');
    setShowFullScreenPlayer(true);
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
    <TouchableOpacity
      style={styles.container}
      onPress={handleOpenFullScreen}
      activeOpacity={0.8}
    >
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${progressPercentage}%` }
            ]}
          />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Album Art Placeholder */}
        <View style={styles.albumArt}>
          <Ionicons name="musical-notes" size={24} color="#9ca3af" />
        </View>

        {/* Audio Info */}
        <View style={styles.audioInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {currentAudio.title}
          </Text>
          <Text style={styles.subtitle}>
            {format(new Date(currentAudio.created_at), 'MMM dd, yyyy')} · {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={isPlaying ? pauseAudio : resumeAudio}
            style={styles.playButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <Ionicons name="hourglass" size={24} color="#4f46e5" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="#4f46e5"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={stopAudio}
            style={styles.stopButton}
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
  },
  progressBarContainer: {
    height: 3,
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
});