import React, { createContext, useContext, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AudioItem {
  id: string;
  title: string;
  audio_url: string;
  duration: number; // in seconds
  created_at: string;
  script?: string;
  chapters?: Array<{
    title: string;
    start_time: number;
    end_time: number;
  }>;
}

interface AudioContextType {
  // Current audio state
  currentAudio: AudioItem | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number; // in milliseconds
  duration: number; // in milliseconds
  sound: Audio.Sound | null;
  playbackRate: number; // Playback speed (0.7, 1.0, 1.3, 1.5)
  
  // UI state
  showMiniPlayer: boolean;
  showFullScreenPlayer: boolean;
  openDirectToScript: boolean;
  
  // Actions
  playAudio: (audioItem: AudioItem) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setShowFullScreenPlayer: (show: boolean, openToScript?: boolean) => void;
  
  // Cleanup
  cleanupAudio: (audioId: string) => void;
  
  // Analytics
  recordInteraction: (interactionType: string, metadata?: any) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentAudio, setCurrentAudio] = useState<AudioItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);
  const [openDirectToScript, setOpenDirectToScript] = useState(false);
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8000/api';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const playAudio = async (audioItem: AudioItem) => {
    console.log('AudioContext: Playing audio:', audioItem.title);
    setIsLoading(true);

    try {
      // Record previous audio completion if switching
      if (currentAudio && sound && currentAudio.id !== audioItem.id) {
        const completionPct = duration > 0 ? (position / duration) * 100 : 0;
        if (completionPct > 70) {
          setTimeout(() => recordInteraction('completed'), 100);
        } else if (completionPct > 10) {
          setTimeout(() => recordInteraction('partial_play'), 100);
        } else {
          setTimeout(() => recordInteraction('quick_exit'), 100);
        }
      }

      // Stop any existing audio
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Create new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioItem.audio_url },
        { shouldPlay: true }
      );

      // Set up status listener with enhanced tracking
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || audioItem.duration * 1000);
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            // Record completion
            setTimeout(() => recordInteraction('completed'), 50);
            setIsPlaying(false);
            setPosition(0);
            setShowMiniPlayer(false);
            newSound.unloadAsync();
            setSound(null);
            setCurrentAudio(null);
            setPlayStartTime(null);
          }
        }
      });

      setSound(newSound);
      setCurrentAudio(audioItem);
      setIsPlaying(true);
      setShowMiniPlayer(true);
      setDuration(audioItem.duration * 1000);
      setPlayStartTime(Date.now()); // Record start time for duration tracking
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pauseAudio = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
      // Record pause interaction (useful for engagement analysis)
      setTimeout(() => recordInteraction('paused'), 50);
    }
  };

  const resumeAudio = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      setPlayStartTime(Date.now()); // Reset start time for accurate duration tracking
    }
  };

  const stopAudio = async () => {
    // Record interaction before stopping
    if (currentAudio && duration > 0) {
      const completionPct = (position / duration) * 100;
      if (completionPct > 70) {
        setTimeout(() => recordInteraction('completed'), 50);
      } else if (completionPct > 10) {
        setTimeout(() => recordInteraction('partial_play'), 50);
      } else {
        setTimeout(() => recordInteraction('quick_exit'), 50);
      }
    }

    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setPosition(0);
    setCurrentAudio(null);
    setShowMiniPlayer(false);
    setShowFullScreenPlayer(false);
    setPlayStartTime(null);
  };

  const seekTo = async (newPosition: number) => {
    console.log('AudioContext: Attempting to seek to position:', newPosition, 'ms');
    
    if (!sound) {
      console.warn('AudioContext: No sound object available for seeking');
      return;
    }

    if (!isFinite(newPosition) || newPosition < 0) {
      console.warn('AudioContext: Invalid seek position:', newPosition);
      return;
    }

    if (newPosition >= duration) {
      console.warn('AudioContext: Seek position exceeds duration:', newPosition, 'vs', duration);
      return;
    }

    try {
      // Get current status to ensure sound is loaded
      const status = await sound.getStatusAsync();
      
      if (!status.isLoaded) {
        console.warn('AudioContext: Sound not loaded, cannot seek');
        return;
      }

      console.log('AudioContext: Current position before seek:', status.positionMillis);
      console.log('AudioContext: Sound duration:', status.durationMillis);
      console.log('AudioContext: Seeking to:', newPosition);

      // Pause before seeking for better reliability
      const wasPlaying = status.isPlaying;
      if (wasPlaying) {
        await sound.pauseAsync();
      }

      // Perform the seek operation
      await sound.setPositionAsync(newPosition, {
        toleranceMillisBefore: 1000,
        toleranceMillisAfter: 1000,
      });

      // Update position state immediately
      setPosition(newPosition);

      // Resume playback if it was playing before
      if (wasPlaying) {
        await sound.playAsync();
      }

      // Verify the seek worked
      const newStatus = await sound.getStatusAsync();
      console.log('AudioContext: Position after seek:', newStatus.isLoaded ? newStatus.positionMillis : 'not loaded');

    } catch (error) {
      console.error('AudioContext: Error during seek operation:', error);
      // Fallback: try a simpler seek approach
      try {
        await sound.setPositionAsync(newPosition);
        setPosition(newPosition);
      } catch (fallbackError) {
        console.error('AudioContext: Fallback seek also failed:', fallbackError);
      }
    }
  };

  const setPlaybackRate = async (rate: number) => {
    if (sound) {
      await sound.setRateAsync(rate, true); // pitchCorrectionQuality = true
      setPlaybackRateState(rate);
      
      // Record playback rate change interaction
      await recordInteraction('playback_rate_changed', { rate });
    }
  };

  const cleanupAudio = (audioId: string) => {
    // If the deleted audio is currently playing, stop it and clean up
    if (currentAudio && currentAudio.id === audioId) {
      console.log('AudioContext: Cleaning up deleted audio:', audioId);
      
      // Stop the audio and clean up
      if (sound) {
        sound.unloadAsync().catch(error => {
          console.error('Error unloading sound during cleanup:', error);
        });
        setSound(null);
      }
      
      // Reset all audio state
      setCurrentAudio(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setShowMiniPlayer(false);
      setShowFullScreenPlayer(false);
      setPlayStartTime(null);
    }
  };

  const recordInteraction = async (interactionType: string, metadata: any = {}) => {
    if (!currentAudio) {
      console.warn('No current audio for interaction tracking');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No user token found for interaction tracking');
        return;
      }

      // Calculate completion percentage if relevant
      let completionPercentage;
      if (duration > 0) {
        completionPercentage = (position / duration) * 100;
      }

      // Calculate play duration
      let playDuration;
      if (playStartTime) {
        playDuration = Math.floor((Date.now() - playStartTime) / 1000);
      }

      const requestData = {
        audio_id: currentAudio.id,
        interaction_type: interactionType,
        completion_percentage: completionPercentage,
        play_duration: playDuration,
        ...metadata
      };

      const response = await axios.post(`${API}/audio-interaction`, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: requestData
      });

      console.log('Interaction recorded:', {
        type: interactionType,
        audio: currentAudio.title,
        completion: completionPercentage?.toFixed(1) + '%',
        duration: playDuration + 's'
      });
    } catch (error: any) {
      // If it's a 404 or 500 error, the audio might have been deleted
      if (error.response?.status === 404 || error.response?.status === 500) {
        console.warn('Audio might have been deleted, skipping interaction recording for:', currentAudio.id);
        return;
      }
      
      console.error('Failed to record interaction:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  };

  const setShowFullScreenPlayerWithScript = (show: boolean, openToScript: boolean = false) => {
    setShowFullScreenPlayer(show);
    setOpenDirectToScript(openToScript);
  };

  const value: AudioContextType = {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    sound,
    playbackRate,
    showMiniPlayer,
    showFullScreenPlayer,
    openDirectToScript,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setPlaybackRate,
    setShowFullScreenPlayer: setShowFullScreenPlayerWithScript,
    cleanupAudio,
    recordInteraction,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}