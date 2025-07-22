import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function FullScreenPlayer() {
  const {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    showFullScreenPlayer,
    setShowFullScreenPlayer,
    recordInteraction,
  } = useAudio();
  
  const [isSaved, setIsSaved] = React.useState(false);

  if (!showFullScreenPlayer || !currentAudio) {
    return null;
  }

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeek = (percentage: number) => {
    if (duration > 0 && isFinite(percentage) && percentage >= 0 && percentage <= 100) {
      const newPosition = (percentage / 100) * duration;
      seekTo(newPosition);
    }
  };

  const skipForward = () => {
    const newPosition = Math.min(position + 30000, duration);
    seekTo(newPosition);
  };

  const skipBackward = () => {
    const newPosition = Math.max(position - 30000, 0);
    seekTo(newPosition);
  };

  const handleSave = async () => {
    if (isSaved) return;
    
    setIsSaved(true);
    await recordInteraction('saved');
    // TODO: Implement actual save to library/favorites
  };

  const handleLike = async () => {
    await recordInteraction('liked');
    // TODO: Visual feedback for like
  };

  return (
    <Modal
      visible={showFullScreenPlayer}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowFullScreenPlayer(false)}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-down" size={28} color="#1f2937" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Now Playing</Text>
          
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
          >
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isSaved ? "#4f46e5" : "#1f2937"} 
            />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            <View style={styles.albumArt}>
              <Ionicons name="musical-notes" size={80} color="#9ca3af" />
            </View>
          </View>

          {/* Audio Info */}
          <View style={styles.audioInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {currentAudio.title}
            </Text>
            <Text style={styles.subtitle}>
              {format(new Date(currentAudio.created_at), 'MMMM dd, yyyy')}
            </Text>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <TouchableOpacity
              style={styles.progressBarContainer}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                if (isFinite(locationX) && width > 0) {
                  const percentage = (locationX / width) * 100;
                  handleSeek(Math.max(0, Math.min(100, percentage)));
                }
              }}
            >
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` }
                  ]}
                />
                <View
                  style={[
                    styles.progressThumb,
                    { left: `${progressPercentage}%` }
                  ]}
                />
              </View>
            </TouchableOpacity>
            
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              onPress={skipBackward}
              style={styles.skipButton}
            >
              <Ionicons name="play-back" size={32} color="#1f2937" />
              <Text style={styles.skipText}>30</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isPlaying ? pauseAudio : resumeAudio}
              style={styles.playButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={36} color="#ffffff" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={36}
                  color="#ffffff"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={skipForward}
              style={styles.skipButton}
            >
              <Ionicons name="play-forward" size={32} color="#1f2937" />
              <Text style={styles.skipText}>30</Text>
            </TouchableOpacity>
          </View>

          {/* Script Section */}
          {currentAudio.script && (
            <View style={styles.scriptSection}>
              <Text style={styles.scriptTitle}>Transcript</Text>
              <ScrollView style={styles.scriptScrollView} showsVerticalScrollIndicator={false}>
                <Text style={styles.scriptText}>{currentAudio.script}</Text>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            onPress={handleLike}
            style={styles.likeButton}
          >
            <Ionicons name="heart-outline" size={20} color="#6b7280" />
            <Text style={styles.likeButtonText}>Like</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              stopAudio();
              setShowFullScreenPlayer(false);
            }}
            style={styles.stopButton}
          >
            <Ionicons name="stop" size={20} color="#ef4444" />
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerButton: {
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  albumArt: {
    width: 280,
    height: 280,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  audioInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 40,
  },
  progressBarContainer: {
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    marginLeft: -8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  skipButton: {
    padding: 20,
    marginHorizontal: 20,
    position: 'relative',
  },
  skipText: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    bottom: 12,
    alignSelf: 'center',
  },
  playButton: {
    backgroundColor: '#4f46e5',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  scriptSection: {
    flex: 1,
    marginTop: 20,
  },
  scriptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  scriptScrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
  },
  bottomActions: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  likeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
  },
  stopButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});