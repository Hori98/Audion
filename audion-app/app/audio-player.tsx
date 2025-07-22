import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';

interface AudioItem {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  created_at: string;
  script?: string;
}

export default function AudioPlayerScreen() {
  const { audioData } = useLocalSearchParams();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scriptModalVisible, setScriptModalVisible] = useState(false);
  const [audioItem, setAudioItem] = useState<AudioItem | null>(null);

  useEffect(() => {
    console.log('Received audioData:', audioData);
    if (audioData) {
      try {
        let parsedAudio;
        if (typeof audioData === 'string') {
          parsedAudio = JSON.parse(decodeURIComponent(audioData));
        } else {
          parsedAudio = JSON.parse(audioData as string);
        }
        console.log('Parsed audio item:', parsedAudio);
        setAudioItem(parsedAudio);
        setDuration(parsedAudio.duration * 1000 || 0); // Convert to milliseconds
      } catch (error) {
        console.error('Error parsing audio data:', error);
        Alert.alert('Error', 'Invalid audio data');
        router.back();
      }
    } else {
      console.error('No audio data received');
      Alert.alert('Error', 'No audio data provided');
      router.back();
    }
  }, [audioData]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadAudio = async () => {
    if (!audioItem) return;

    setIsLoading(true);
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioItem.audio_url },
        { shouldPlay: false }
      );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || audioItem.duration * 1000);
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
          }
        }
      });
    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Error', 'Failed to load audio');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      await loadAudio();
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      Alert.alert('Error', 'Failed to control playback');
    }
  };

  const seekTo = async (value: number) => {
    if (sound) {
      try {
        await sound.setPositionAsync(value);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const skipForward = async () => {
    const newPosition = Math.min(position + 30000, duration);
    await seekTo(newPosition);
  };

  const skipBackward = async () => {
    const newPosition = Math.max(position - 30000, 0);
    await seekTo(newPosition);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };


  if (!audioItem) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity 
          onPress={() => setScriptModalVisible(true)}
          style={styles.scriptButton}
        >
          <Ionicons name="document-text" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Audio Info */}
      <View style={styles.audioInfoContainer}>
        <View style={styles.albumArt}>
          <Ionicons name="musical-notes" size={80} color="#9ca3af" />
        </View>
        <Text style={styles.audioTitle}>{audioItem.title}</Text>
        <Text style={styles.audioSubtitle}>
          {format(new Date(audioItem.created_at), 'MMM dd, yyyy')}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }
            ]} 
          />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={skipBackward} style={styles.controlButton}>
          <Ionicons name="play-back" size={32} color="#1f2937" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={togglePlayPause} 
          style={styles.playButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={40} 
              color="#ffffff" 
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={skipForward} style={styles.controlButton}>
          <Ionicons name="play-forward" size={32} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Script Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={scriptModalVisible}
        onRequestClose={() => setScriptModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Script</Text>
            <TouchableOpacity 
              onPress={() => setScriptModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scriptScrollView}>
            <Text style={styles.scriptText}>
              {audioItem.script || 'No script available for this audio.'}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  scriptButton: {
    padding: 8,
  },
  audioInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  albumArt: {
    width: 200,
    height: 200,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  audioTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  audioSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginVertical: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
  },
  controlButton: {
    padding: 20,
    marginHorizontal: 20,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 8,
  },
  scriptScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
});