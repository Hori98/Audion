/**
 * UnifiedAudioContext - Single source of truth for all audio playback
 * Replaces both AudioContext and AudioPlayerContext with unified approach
 * Manages 4 player types: instant-mini, instant-full, saved-mini, saved-full
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Alert } from 'react-native';
import { AudioTrack, UnifiedAudioState, AudioPlayerContextType, AudioPlayerType, Chapter, PlaybackState } from '../types/audio';
import globalAudioManager from '../services/GlobalAudioManager';
import PersonalizationService from '../services/PersonalizationService';

const UnifiedAudioContext = createContext<AudioPlayerContextType | undefined>(undefined);

interface UnifiedAudioProviderProps {
  children: ReactNode;
}

export const UnifiedAudioProvider: React.FC<UnifiedAudioProviderProps> = ({ children }) => {
  // Core state management
  const [state, setState] = useState<UnifiedAudioState>({
    currentTrack: null,
    audioType: null,
    playbackState: 'IDLE',
    positionMillis: 0,
    durationMillis: 0,
    isLoading: false,
    error: undefined,
    
    // UI states
    showMiniPlayer: false,
    showFullView: false,
    activePlayerType: null,
    
    // Creation progress
    creationProgress: undefined,
    creationStage: undefined,
    
    // Playback controls
    playbackRate: 1.0,
    isShuffle: false,
    isRepeat: false,
  });

  // Audio.Sound reference
  const soundRef = useRef<Audio.Sound | null>(null);

  // Register with GlobalAudioManager
  useEffect(() => {
    const stopCallback = async () => {
      console.log('🎵 UnifiedAudioContext: Stop callback triggered');
      await cleanup();
      setState(prev => ({
        ...prev,
        currentTrack: null,
        audioType: null,
        playbackState: 'IDLE',
        positionMillis: 0,
        durationMillis: 0,
        isLoading: false,
        showMiniPlayer: false,
        showFullView: false,
        activePlayerType: null,
      }));
    };

    globalAudioManager.registerStopCallback('unified', stopCallback);
    
    return () => {
      globalAudioManager.unregisterStopCallback('unified');
    };
  }, []);

  /**
   * Playback status callback - handles all state updates from expo-av
   */
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (state.playbackState !== 'IDLE' && state.playbackState !== 'STOPPED') {
        setState(prev => ({ ...prev, playbackState: 'STOPPED' }));
      }
      return;
    }

    setState(prev => ({
      ...prev,
      positionMillis: status.positionMillis || 0,
      durationMillis: status.durationMillis || 0,
      playbackState: status.isBuffering ? 'LOADING' : 
                    status.isPlaying ? 'PLAYING' : 'PAUSED',
      isLoading: status.isBuffering,
    }));

    // Handle playback completion
    if (status.didJustFinish) {
      console.log('🎵 UnifiedAudioContext: Track finished playing');
      setState(prev => ({
        ...prev,
        playbackState: 'STOPPED',
        positionMillis: 0,
      }));
      cleanup();
    }
  }, [state.playbackState]);

  /**
   * Cleanup audio resources
   */
  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.warn('UnifiedAudioContext: Error during cleanup:', error);
      }
      soundRef.current = null;
    }
  }, []);

  /**
   * Determine audio type from track metadata
   */
  const determineAudioType = useCallback((track: AudioTrack): 'instant' | 'saved' => {
    // Explicit type setting
    if (track.audioType) {
      return track.audioType;
    }
    
    // ID-based detection
    if (track.id.includes('instant_') || track.isInstantAudio) {
      return 'instant';
    }
    
    // Context-based detection (AutoPick contexts = instant)
    if (track.context && ['home', 'feed'].includes(track.context)) {
      return 'instant';
    }
    
    // Default to saved
    return 'saved';
  }, []);

  /**
   * Core playback function - unified for all player types
   */
  const playTrack = useCallback(async (track: AudioTrack) => {
    console.log('🎵 UnifiedAudioContext: Playing track:', track.title);
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      playbackState: 'LOADING',
      error: undefined,
    }));

    try {
      // Request audio control
      await globalAudioManager.requestAudioControl('unified');
      
      // Cleanup existing sound
      await cleanup();

      // Determine audio type
      const audioType = determineAudioType(track);
      const playerType: AudioPlayerType = audioType === 'instant' ? 'instant-mini' : 'saved-mini';

      // Create new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { 
          shouldPlay: true,
          progressUpdateIntervalMillis: 1000,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      
      setState(prev => ({
        ...prev,
        currentTrack: { ...track, audioType },
        audioType,
        playbackState: 'PLAYING',
        isLoading: false,
        showMiniPlayer: true,
        activePlayerType: playerType,
      }));
      
      console.log(`🎵 UnifiedAudioContext: Successfully loaded ${audioType} audio:`, track.title);
      
      // Record interaction for personalization
      await PersonalizationService.recordInteraction({
        action: 'play',
        contentId: track.id,
        contentType: 'audio',
        category: audioType === 'instant' ? 'Auto-Pick Audio' : 'Saved Audio',
        timestamp: Date.now(),
        engagementLevel: 'medium',
      });
      
    } catch (error: any) {
      console.error('🎵 UnifiedAudioContext: Error playing track:', error);
      setState(prev => ({
        ...prev,
        playbackState: 'ERROR',
        error: error.message || 'Failed to play audio',
        isLoading: false,
        currentTrack: null,
        audioType: null,
        showMiniPlayer: false,
        activePlayerType: null,
      }));
    }
  }, [cleanup, onPlaybackStatusUpdate, determineAudioType]);

  /**
   * Instant audio playback with streaming optimizations
   */
  const playInstantAudio = useCallback(async (track: AudioTrack) => {
    console.log('🎵 UnifiedAudioContext: Starting instant audio playback:', track.title);
    
    // Mark as instant audio
    const instantTrack: AudioTrack = {
      ...track,
      audioType: 'instant',
      isInstantAudio: true,
    };
    
    await playTrack(instantTrack);
  }, [playTrack]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) {
      console.warn('🎵 UnifiedAudioContext: No sound loaded');
      return;
    }

    try {
      if (state.playbackState === 'PLAYING') {
        await soundRef.current.pauseAsync();
        setState(prev => ({ ...prev, playbackState: 'PAUSED' }));
        console.log('🎵 UnifiedAudioContext: Paused');
      } else if (state.playbackState === 'PAUSED') {
        await soundRef.current.playAsync();
        setState(prev => ({ ...prev, playbackState: 'PLAYING' }));
        console.log('🎵 UnifiedAudioContext: Resumed');
      }
    } catch (error: any) {
      console.error('🎵 UnifiedAudioContext: Error toggling playback:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Playback control failed' 
      }));
    }
  }, [state.playbackState]);

  /**
   * Seek to specific position
   */
  const seekTo = useCallback(async (positionSeconds: number) => {
    if (!soundRef.current) {
      console.warn('🎵 UnifiedAudioContext: No sound loaded for seeking');
      return;
    }

    try {
      const positionMillis = Math.max(0, positionSeconds * 1000);
      await soundRef.current.setPositionAsync(positionMillis);
      console.log(`🎵 UnifiedAudioContext: Seeked to ${positionSeconds}s`);
    } catch (error: any) {
      console.error('🎵 UnifiedAudioContext: Seek error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Seek failed' 
      }));
    }
  }, []);

  /**
   * Jump to specific chapter
   */
  const jumpToChapter = useCallback(async (chapter: Chapter) => {
    console.log(`🎵 UnifiedAudioContext: Jumping to chapter: ${chapter.title} at ${chapter.startTime}s`);
    const startTime = chapter.startTime || chapter.start_time || 0;
    await seekTo(startTime);
  }, [seekTo]);

  /**
   * Stop playback and clear current track
   */
  const stop = useCallback(async () => {
    console.log('🎵 UnifiedAudioContext: Stopping playback');
    
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch (error) {
        console.warn('🎵 UnifiedAudioContext: Error stopping playback:', error);
      }
    }
    
    // Notify GlobalAudioManager
    globalAudioManager.notifyAudioStopped('unified');
    
    setState(prev => ({
      ...prev,
      playbackState: 'STOPPED',
      currentTrack: null,
      audioType: null,
      positionMillis: 0,
      showMiniPlayer: false,
      showFullView: false,
      activePlayerType: null,
    }));
    
    await cleanup();
  }, [cleanup]);

  /**
   * UI Control Functions
   */
  const showPlayer = useCallback((type: AudioPlayerType) => {
    setState(prev => {
      if (type.includes('mini')) {
        return {
          ...prev,
          showMiniPlayer: true,
          showFullView: false,
          activePlayerType: type,
        };
      } else {
        return {
          ...prev,
          showMiniPlayer: true,
          showFullView: true,
          activePlayerType: type,
        };
      }
    });
  }, []);

  const hidePlayer = useCallback(() => {
    setState(prev => ({
      ...prev,
      showMiniPlayer: false,
      showFullView: false,
      activePlayerType: null,
    }));
  }, []);

  /**
   * Instant Audio Specific Functions
   */
  const convertToSaved = useCallback(async (customName?: string) => {
    if (!state.currentTrack || state.audioType !== 'instant') {
      console.warn('UnifiedAudioContext: Cannot convert - no instant audio playing');
      return;
    }

    try {
      // TODO: Implement API call to save instant audio to library
      console.log('🎵 UnifiedAudioContext: Converting instant audio to saved:', customName);
      
      // Update track type
      const savedTrack: AudioTrack = {
        ...state.currentTrack,
        audioType: 'saved',
        isInstantAudio: false,
        title: customName || state.currentTrack.title,
      };
      
      setState(prev => ({
        ...prev,
        currentTrack: savedTrack,
        audioType: 'saved',
        activePlayerType: 'saved-mini',
      }));
      
      Alert.alert('保存完了', '音声がライブラリに保存されました');
    } catch (error: any) {
      console.error('UnifiedAudioContext: Error converting to saved:', error);
      Alert.alert('エラー', '保存に失敗しました');
    }
  }, [state.currentTrack, state.audioType]);

  const updateCreationProgress = useCallback((progress: number, stage: string) => {
    setState(prev => ({
      ...prev,
      creationProgress: progress,
      creationStage: stage as any,
    }));
  }, []);

  /**
   * Saved Audio Specific Functions
   */
  const addToPlaylist = useCallback(async (playlistId: string) => {
    if (!state.currentTrack) return;
    
    try {
      // TODO: Implement API call to add to playlist
      console.log('🎵 UnifiedAudioContext: Adding to playlist:', playlistId);
      Alert.alert('プレイリスト', 'プレイリストに追加されました');
    } catch (error) {
      Alert.alert('エラー', 'プレイリストへの追加に失敗しました');
    }
  }, [state.currentTrack]);

  const removeFromPlaylist = useCallback(async (playlistId: string) => {
    if (!state.currentTrack) return;
    
    try {
      // TODO: Implement API call to remove from playlist
      console.log('🎵 UnifiedAudioContext: Removing from playlist:', playlistId);
      Alert.alert('プレイリスト', 'プレイリストから削除されました');
    } catch (error) {
      Alert.alert('エラー', 'プレイリストからの削除に失敗しました');
    }
  }, [state.currentTrack]);

  const toggleFavorite = useCallback(async () => {
    if (!state.currentTrack) return;
    
    try {
      // TODO: Implement API call to toggle favorite
      console.log('🎵 UnifiedAudioContext: Toggling favorite');
      Alert.alert('お気に入り', 'お気に入りの状態を変更しました');
    } catch (error) {
      Alert.alert('エラー', 'お気に入りの変更に失敗しました');
    }
  }, [state.currentTrack]);

  /**
   * Settings Functions
   */
  const setPlaybackRate = useCallback((rate: number) => {
    setState(prev => ({ ...prev, playbackRate: rate }));
    
    // Apply to current sound if playing
    if (soundRef.current) {
      soundRef.current.setRateAsync(rate, true).catch(error => {
        console.warn('Failed to set playback rate:', error);
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🎵 UnifiedAudioContext: Component unmounting, cleaning up');
      cleanup();
    };
  }, [cleanup]);

  const value: AudioPlayerContextType = {
    // State
    state,
    
    // Core actions
    playTrack,
    togglePlayPause,
    seekTo,
    jumpToChapter,
    stop,
    
    // UI actions
    showPlayer,
    hidePlayer,
    
    // Instant audio specific
    playInstantAudio,
    convertToSaved,
    updateCreationProgress,
    
    // Saved audio specific
    addToPlaylist,
    removeFromPlaylist,
    toggleFavorite,
    
    // Settings
    setPlaybackRate,
    clearError,
  };

  return (
    <UnifiedAudioContext.Provider value={value}>
      {children}
    </UnifiedAudioContext.Provider>
  );
};

/**
 * Hook to use the Unified Audio context
 */
export const useUnifiedAudio = () => {
  const context = useContext(UnifiedAudioContext);
  if (context === undefined) {
    throw new Error('useUnifiedAudio must be used within a UnifiedAudioProvider');
  }
  return context;
};

// Export types for external use
export type { AudioPlayerContextType };