/**
 * AudioPlayerContext - Clean, modern audio player architecture
 * This is a new implementation separate from the existing AudioContext
 * Focused on instant audio streaming and simplified state management
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AudioTrack, PlaybackState, Chapter, AudioPlayerState } from '../types/audio';
import globalAudioManager from '../services/GlobalAudioManager';

interface AudioPlayerContextType {
  // State
  currentTrack: AudioTrack | null;
  playbackState: PlaybackState;
  positionMillis: number;
  durationMillis: number;
  isLoading: boolean;
  error?: string;
  
  // Actions
  playNewTrack: (track: AudioTrack) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionSeconds: number) => Promise<void>;
  jumpToChapter: (chapter: Chapter) => Promise<void>;
  stop: () => Promise<void>;
  clearError: () => void;
  
  // Streaming-specific
  playAudioStreaming: (track: AudioTrack) => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  // Core state
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('IDLE');
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Audio.Sound reference
  const soundRef = useRef<Audio.Sound | null>(null);

  // Register/unregister with GlobalAudioManager
  useEffect(() => {
    const stopCallback = async () => {
      console.log('🎵 AudioPlayerContext: Stop callback triggered by GlobalAudioManager');
      await cleanup();
      setCurrentTrack(null);
      setPlaybackState('IDLE');
      setPositionMillis(0);
      setDurationMillis(0);
      setIsLoading(false);
    };

    globalAudioManager.registerStopCallback('new', stopCallback);
    
    return () => {
      globalAudioManager.unregisterStopCallback('new');
    };
  }, []);

  /**
   * Playback status callback - handles all state updates from expo-av
   */
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (playbackState !== 'IDLE' && playbackState !== 'STOPPED') {
        setPlaybackState('STOPPED');
      }
      return;
    }

    // Update position and duration
    setPositionMillis(status.positionMillis || 0);
    setDurationMillis(status.durationMillis || 0);

    // Update playback state
    if (status.isBuffering) {
      setPlaybackState('LOADING');
      setIsLoading(true);
    } else if (status.isPlaying) {
      setPlaybackState('PLAYING');
      setIsLoading(false);
    } else {
      setPlaybackState('PAUSED');
      setIsLoading(false);
    }

    // Handle playback completion
    if (status.didJustFinish) {
      console.log('🎵 AudioPlayer: Track finished playing');
      setPlaybackState('STOPPED');
      setCurrentTrack(null);
      setPositionMillis(0);
      cleanup();
    }
  }, [playbackState]);

  /**
   * Cleanup audio resources
   */
  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.warn('AudioPlayer: Error during cleanup:', error);
      }
      soundRef.current = null;
    }
  }, []);

  /**
   * Play a new track (replaces current track)
   */
  const playNewTrack = useCallback(async (track: AudioTrack) => {
    console.log('🎵 AudioPlayer: Playing new track:', track.title);
    
    setIsLoading(true);
    setPlaybackState('LOADING');
    setError(undefined);

    try {
      // Request audio control (will stop other systems)
      await globalAudioManager.requestAudioControl('new');
      
      // Cleanup existing sound
      await cleanup();

      // Create new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { 
          shouldPlay: true,
          progressUpdateIntervalMillis: 1000, // Update every second
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentTrack(track);
      setPlaybackState('PLAYING');
      setIsLoading(false);
      
      console.log('🎵 AudioPlayer: Successfully loaded and playing:', track.title);
    } catch (error: any) {
      console.error('🎵 AudioPlayer: Error playing track:', error);
      setPlaybackState('ERROR');
      setError(error.message || 'Failed to play audio');
      setIsLoading(false);
      setCurrentTrack(null);
    }
  }, [cleanup, onPlaybackStatusUpdate]);

  /**
   * Streaming-specific playback function
   * This is optimized for instant audio streaming from our API
   */
  const playAudioStreaming = useCallback(async (track: AudioTrack) => {
    console.log('🎵 AudioPlayer: Starting streaming playback:', track.title);
    
    // For streaming, we want to start playback immediately as data becomes available
    setIsLoading(true);
    setPlaybackState('LOADING');
    setError(undefined);

    try {
      await cleanup();

      // Streaming-optimized configuration
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { 
          shouldPlay: true,
          progressUpdateIntervalMillis: 500, // More frequent updates for streaming
          isLooping: false,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentTrack(track);
      
      console.log('🎵 AudioPlayer: Streaming started for:', track.title);
      
    } catch (error: any) {
      console.error('🎵 AudioPlayer: Streaming error:', error);
      setPlaybackState('ERROR');
      setError(error.message || 'Failed to start streaming');
      setIsLoading(false);
    }
  }, [cleanup, onPlaybackStatusUpdate]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) {
      console.warn('🎵 AudioPlayer: No sound loaded');
      return;
    }

    try {
      if (playbackState === 'PLAYING') {
        await soundRef.current.pauseAsync();
        setPlaybackState('PAUSED');
        console.log('🎵 AudioPlayer: Paused');
      } else if (playbackState === 'PAUSED') {
        await soundRef.current.playAsync();
        setPlaybackState('PLAYING');
        console.log('🎵 AudioPlayer: Resumed');
      }
    } catch (error: any) {
      console.error('🎵 AudioPlayer: Error toggling playback:', error);
      setError(error.message || 'Playback control failed');
    }
  }, [playbackState]);

  /**
   * Seek to specific position
   */
  const seekTo = useCallback(async (positionSeconds: number) => {
    if (!soundRef.current) {
      console.warn('🎵 AudioPlayer: No sound loaded for seeking');
      return;
    }

    try {
      const positionMillis = Math.max(0, positionSeconds * 1000);
      await soundRef.current.setPositionAsync(positionMillis);
      console.log(`🎵 AudioPlayer: Seeked to ${positionSeconds}s`);
    } catch (error: any) {
      console.error('🎵 AudioPlayer: Seek error:', error);
      setError(error.message || 'Seek failed');
    }
  }, []);

  /**
   * Jump to specific chapter
   */
  const jumpToChapter = useCallback(async (chapter: Chapter) => {
    console.log(`🎵 AudioPlayer: Jumping to chapter: ${chapter.title} at ${chapter.startTime}s`);
    await seekTo(chapter.startTime);
  }, [seekTo]);

  /**
   * Stop playback and clear current track
   */
  const stop = useCallback(async () => {
    console.log('🎵 AudioPlayer: Stopping playback');
    
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch (error) {
        console.warn('🎵 AudioPlayer: Error stopping playback:', error);
      }
    }
    
    // Notify GlobalAudioManager that this system stopped
    globalAudioManager.notifyAudioStopped('new');
    
    setPlaybackState('STOPPED');
    setCurrentTrack(null);
    setPositionMillis(0);
    await cleanup();
  }, [cleanup]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🎵 AudioPlayer: Component unmounting, cleaning up');
      cleanup();
    };
  }, [cleanup]);

  const value: AudioPlayerContextType = {
    // State
    currentTrack,
    playbackState,
    positionMillis,
    durationMillis,
    isLoading,
    error,
    
    // Actions
    playNewTrack,
    togglePlayPause,
    seekTo,
    jumpToChapter,
    stop,
    clearError,
    
    // Streaming-specific
    playAudioStreaming,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

/**
 * Hook to use the AudioPlayer context
 */
export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within a AudioPlayerProvider');
  }
  return context;
};

// Export types for external use
export type { AudioPlayerContextType };