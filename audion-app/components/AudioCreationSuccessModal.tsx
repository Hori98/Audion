import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUnifiedAudio } from '../context/UnifiedAudioContext';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

interface AudioCreationSuccessModalProps {
  visible: boolean;
  audioTitle: string;
  audioItem: any; // The complete audio item from the API response
  onClose: () => void;
  onPlayNow?: () => void;
}

export default function AudioCreationSuccessModal({
  visible,
  audioTitle,
  audioItem,
  onClose,
  onPlayNow,
}: AudioCreationSuccessModalProps) {
  const { theme } = useTheme();
  const { playTrack, showPlayer } = useUnifiedAudio();
  const scaleValue = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      
      // Play notification sound and strong haptic feedback
      playNotificationSound();
      
      // Triple haptic feedback for strong success indication
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
      
      // Animate modal appearance with bounce
      Animated.sequence([
        Animated.spring(scaleValue, {
          toValue: 1.1,
          tension: 100,
          friction: 8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  const playNotificationSound = async () => {
    try {
      // Set audio mode for brief notification
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // For now, we rely primarily on haptic feedback
      // A simple notification sound file could be added to assets later
      
    } catch (error) {
    }
  };

  const handlePlayNow = async () => {
    try {
      if (audioItem) {
        await playTrack(audioItem);
        // Open full screen player after starting playback
        setTimeout(() => {
          showPlayer('saved-full');
        }, 500);
      }
      onClose();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleClose = () => {
    Animated.spring(scaleValue, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { backgroundColor: theme.surface },
            { transform: [{ scale: scaleValue }] }
          ]}
        >
          {/* Success Icon */}
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="checkmark-circle" size={64} color={theme.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            Audio Created!
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            &ldquo;{audioTitle}&rdquo; is ready to play
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: theme.primary }]}
              onPress={handlePlayNow}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.playButtonText}>Play Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeButton, { borderColor: theme.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>
                Later
              </Text>
            </TouchableOpacity>
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorativeContainer}>
            {[...Array(3)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.decorativeCircle,
                  { backgroundColor: theme.primary + '30' },
                  {
                    transform: [
                      {
                        scale: scaleValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: width - 60,
    maxWidth: 340,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  decorativeContainer: {
    position: 'absolute',
    top: -20,
    right: -10,
    flexDirection: 'row',
    gap: 5,
  },
  decorativeCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});