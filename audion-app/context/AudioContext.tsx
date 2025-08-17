import React, { createContext, useContext, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DownloadService, { DownloadProgress } from '../services/DownloadService';

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
    original_url?: string; // Added for source linking
  }>;
  // 🆕 ダウンロード機能追加
  download_status?: 'none' | 'downloading' | 'downloaded' | 'failed';
  local_file_path?: string; // ローカルファイルパス
  download_progress?: number; // 0-100
  file_size?: number; // バイト単位
}

interface CurrentChapter {
  index: number;
  chapter: {
    title: string;
    start_time: number;
    end_time: number;
    original_url?: string;
  };
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
  
  // Chapter navigation
  currentChapter: CurrentChapter | null;
  
  // UI state
  showMiniPlayer: boolean;
  showFullScreenPlayer: boolean;
  openDirectToScript: boolean;
  
  // 🆕 Download state
  downloadProgress: Map<string, number>; // audioId -> progress (0-100)
  downloadingAudios: Set<string>; // Currently downloading audio IDs
  
  // Actions
  playAudio: (audioItem: AudioItem) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setShowFullScreenPlayer: (show: boolean, openToScript?: boolean) => void;
  
  // Chapter actions
  getCurrentChapter: () => CurrentChapter | null;
  openCurrentChapterSource: () => Promise<void>;
  
  // 🆕 Download actions
  downloadAudio: (audioItem: AudioItem) => Promise<void>;
  removeDownload: (audioId: string) => Promise<void>;
  isAudioDownloaded: (audioId: string) => Promise<boolean>;
  getDownloadProgress: (audioId: string) => number;
  isAudioDownloading: (audioId: string) => boolean;
  
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
  const [currentChapter, setCurrentChapter] = useState<CurrentChapter | null>(null);
  
  // 🆕 Download states
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [downloadingAudios, setDownloadingAudios] = useState<Set<string>>(new Set());
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

  // Helper function to update current chapter based on playback position
  const updateCurrentChapter = (audioItem: AudioItem, currentPosition: number) => {
    if (!audioItem.chapters || audioItem.chapters.length === 0) {
      setCurrentChapter(null);
      return;
    }

    // Convert position from milliseconds to seconds for comparison
    const positionInSeconds = currentPosition / 1000;
    
    // Find the current chapter
    const activeChapter = audioItem.chapters.find((chapter, index) => {
      return positionInSeconds >= chapter.start_time && positionInSeconds <= chapter.end_time;
    });

    if (activeChapter) {
      const chapterIndex = audioItem.chapters.indexOf(activeChapter);
      setCurrentChapter({
        index: chapterIndex,
        chapter: activeChapter
      });
    } else {
      setCurrentChapter(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const playAudio = async (audioItem: AudioItem) => {
    setIsLoading(true);

    try {
      // Check if we have a local file first
      const localPath = await DownloadService.getLocalPath(audioItem.id);
      const audioUri = localPath || audioItem.audio_url;
      

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

      // Create new sound with local or remote URI
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      // Set up status listener with enhanced tracking
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          const currentPos = status.positionMillis || 0;
          setPosition(currentPos);
          setDuration(status.durationMillis || audioItem.duration * 1000);
          setIsPlaying(status.isPlaying);

          // Update current chapter based on position
          updateCurrentChapter(audioItem, currentPos);

          if (status.didJustFinish) {
            // Record completion
            setTimeout(() => recordInteraction('completed'), 50);
            setIsPlaying(false);
            setPosition(0);
            setCurrentChapter(null);
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
      setPlayStartTime(Date.now());

      // Record play interaction with source info
      await recordInteraction('play_started', { 
        audio_id: audioItem.id,
        source: localPath ? 'local' : 'remote'
      });

    } catch (error) {
      console.error('Error playing audio:', error);
      
      // If local file failed, try remote as fallback
      const localPathForFallback = await DownloadService.getLocalPath(audioItem.id);
      if (localPathForFallback && error) {
        try {
          const { sound: fallbackSound } = await Audio.Sound.createAsync(
            { uri: audioItem.audio_url },
            { shouldPlay: true }
          );
          
          fallbackSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              const currentPos = status.positionMillis || 0;
              setPosition(currentPos);
              setDuration(status.durationMillis || audioItem.duration * 1000);
              setIsPlaying(status.isPlaying);
              updateCurrentChapter(audioItem, currentPos);
              
              if (status.didJustFinish) {
                setTimeout(() => recordInteraction('completed'), 50);
                setIsPlaying(false);
                setPosition(0);
                setCurrentChapter(null);
                setShowMiniPlayer(false);
                fallbackSound.unloadAsync();
                setSound(null);
                setCurrentAudio(null);
                setPlayStartTime(null);
              }
            }
          });
          
          setSound(fallbackSound);
          setCurrentAudio(audioItem);
          setIsPlaying(true);
          setShowMiniPlayer(true);
          setDuration(audioItem.duration * 1000);
          setPlayStartTime(Date.now());
          
          await recordInteraction('play_started', { 
            audio_id: audioItem.id,
            source: 'remote_fallback'
          });
          
        } catch (fallbackError) {
          console.error('❌ Both local and remote playback failed:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
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
    setCurrentChapter(null);
    setShowMiniPlayer(false);
    setShowFullScreenPlayer(false);
    setPlayStartTime(null);
  };

  const seekTo = async (newPosition: number) => {
    
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
      setCurrentChapter(null);
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

      // console.log removed - interaction recorded: {
      //   type: interactionType,
      //   audio: currentAudio.title,
      //   completion: completionPercentage?.toFixed(1) + '%',
      //   duration: playDuration + 's'
      // };
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

  const getCurrentChapter = (): CurrentChapter | null => {
    return currentChapter;
  };

  const openCurrentChapterSource = async () => {
    if (!currentChapter || !currentChapter.chapter.original_url) {
      console.warn('No current chapter or source URL available');
      return;
    }

    try {
      // Import Linking dynamically to avoid import issues
      const { Linking } = await import('react-native');
      
      // Record interaction for analytics
      await recordInteraction('chapter_source_opened', {
        chapter_index: currentChapter.index,
        chapter_title: currentChapter.chapter.title,
        source_url: currentChapter.chapter.original_url
      });

      // Open the source URL
      const supported = await Linking.canOpenURL(currentChapter.chapter.original_url);
      if (supported) {
        await Linking.openURL(currentChapter.chapter.original_url);
      } else {
        console.error('Cannot open URL:', currentChapter.chapter.original_url);
      }
    } catch (error) {
      console.error('Error opening chapter source:', error);
    }
  };

  // 🆕 Download functions
  const downloadAudio = async (audioItem: AudioItem) => {
    try {
      
      // Add to downloading set
      setDownloadingAudios(prev => new Set([...prev, audioItem.id]));
      
      // Initialize progress
      setDownloadProgress(prev => new Map([...prev, [audioItem.id, 0]]));
      
      // Record interaction
      await recordInteraction('download_started', { audio_id: audioItem.id });
      
      // Start download with progress callback
      await DownloadService.downloadAudio(
        audioItem.id,
        audioItem.audio_url,
        audioItem.title,
        (progress: DownloadProgress) => {
          setDownloadProgress(prev => new Map([...prev, [audioItem.id, progress.progress]]));
          
          if (progress.status === 'completed') {
            setDownloadingAudios(prev => {
              const newSet = new Set(prev);
              newSet.delete(audioItem.id);
              return newSet;
            });
            
            // Record successful download
            recordInteraction('download_completed', { 
              audio_id: audioItem.id,
              file_size: progress.totalBytes 
            });
            
          } else if (progress.status === 'failed') {
            setDownloadingAudios(prev => {
              const newSet = new Set(prev);
              newSet.delete(audioItem.id);
              return newSet;
            });
            
            // Record failed download
            recordInteraction('download_failed', { audio_id: audioItem.id });
            
            console.error('❌ Download failed:', audioItem.title);
          }
        }
      );
      
    } catch (error) {
      console.error('❌ Download error:', error);
      
      // Clean up on error
      setDownloadingAudios(prev => {
        const newSet = new Set(prev);
        newSet.delete(audioItem.id);
        return newSet;
      });
      
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(audioItem.id);
        return newMap;
      });
      
      // Record failed download
      await recordInteraction('download_failed', { 
        audio_id: audioItem.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  };

  const removeDownload = async (audioId: string) => {
    try {
      
      await DownloadService.removeDownload(audioId);
      
      // Clean up state
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(audioId);
        return newMap;
      });
      
      // Record interaction
      await recordInteraction('download_removed', { audio_id: audioId });
      
    } catch (error) {
      console.error('❌ Failed to remove download:', error);
      throw error;
    }
  };

  const isAudioDownloaded = async (audioId: string): Promise<boolean> => {
    return await DownloadService.isAudioDownloaded(audioId);
  };

  const getDownloadProgress = (audioId: string): number => {
    return downloadProgress.get(audioId) || 0;
  };

  const isAudioDownloading = (audioId: string): boolean => {
    return downloadingAudios.has(audioId);
  };

  const value: AudioContextType = {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    sound,
    playbackRate,
    currentChapter,
    showMiniPlayer,
    showFullScreenPlayer,
    openDirectToScript,
    // 🆕 Download states
    downloadProgress,
    downloadingAudios,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setPlaybackRate,
    setShowFullScreenPlayer: setShowFullScreenPlayerWithScript,
    getCurrentChapter,
    openCurrentChapterSource,
    // 🆕 Download actions
    downloadAudio,
    removeDownload,
    isAudioDownloaded,
    getDownloadProgress,
    isAudioDownloading,
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