import React, { createContext, useContext, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DownloadService, { DownloadProgress } from '../services/DownloadService';
import BackgroundAudioService from '../services/BackgroundAudioService';
import OfflineAudioService from '../services/OfflineAudioService';

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
  
  // 🆕 Audio queue state
  audioQueue: AudioItem[];
  currentQueueIndex: number;
  
  // UI state
  showMiniPlayer: boolean;
  showFullScreenPlayer: boolean;
  openDirectToScript: boolean;
  
  // 🆕 Streaming mode state
  isStreamingMode: boolean;
  streamingProcessingComplete: boolean;
  
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
  
  // 🆕 Audio queue actions
  addToQueue: (audioItem: AudioItem) => void;
  removeFromQueue: (audioId: string) => void;
  clearQueue: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  skipToQueueItem: (index: number) => Promise<void>;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  
  // 🆕 Download actions
  downloadAudio: (audioItem: AudioItem) => Promise<void>;
  removeDownload: (audioId: string) => Promise<void>;
  isAudioDownloaded: (audioId: string) => Promise<boolean>;
  getDownloadProgress: (audioId: string) => number;
  isAudioDownloading: (audioId: string) => boolean;
  
  // 🆕 Native app functions
  getStorageInfo: () => Promise<any>;
  getAllOfflineAudio: () => Promise<any[]>;
  cleanupOldFiles: () => Promise<number>;
  getAutoDownloadSettings: () => Promise<any>;
  setAutoDownloadSettings: (settings: any) => Promise<void>;
  getBackgroundAudioCapabilities: () => any;
  
  // Cleanup
  cleanupAudio: (audioId: string) => void;
  
  // Analytics
  recordInteraction: (interactionType: string, metadata?: any) => Promise<void>;
  
  // 🆕 Streaming mode actions
  setStreamingMode: (enabled: boolean) => void;
  markStreamingProcessingComplete: () => void;
  playAudioStreaming: (audioItem: AudioItem) => Promise<void>;
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
  
  // 🆕 Streaming mode states
  const [isStreamingMode, setIsStreamingMode] = useState(false);
  const [streamingProcessingComplete, setStreamingProcessingComplete] = useState(false);
  
  // 🆕 Seeking lock to prevent interruption
  const [isSeeking, setIsSeeking] = useState(false);
  
  // 🆕 Audio queue states
  const [audioQueue, setAudioQueue] = useState<AudioItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  
  // 🆕 Download states
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [downloadingAudios, setDownloadingAudios] = useState<Set<string>>(new Set());
  
  // 🆕 Native services
  const backgroundAudioService = BackgroundAudioService.getInstance();
  const offlineAudioService = OfflineAudioService.getInstance();
  
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

  // Initialize background audio service
  useEffect(() => {
    const initializeBackgroundAudio = async () => {
      await backgroundAudioService.initialize();
      
      // Set up media action handler for lock screen controls
      backgroundAudioService.setMediaActionHandler((action: string, audioId: string) => {
        switch (action) {
          case 'TOGGLE_PLAYBACK':
            if (isPlaying) {
              pauseAudio();
            } else {
              resumeAudio();
            }
            break;
          case 'SKIP_FORWARD':
            // Implement skip forward (e.g., +30 seconds)
            if (sound) {
              seekTo(Math.min(position + 30000, duration));
            }
            break;
          case 'SKIP_BACKWARD':
            // Implement skip backward (e.g., -15 seconds)
            if (sound) {
              seekTo(Math.max(position - 15000, 0));
            }
            break;
        }
      });
      
      console.log('🎵 Background audio service initialized');
    };

    initializeBackgroundAudio();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      backgroundAudioService.cleanup();
    };
  }, []);

  const playAudio = async (audioItem: AudioItem) => {
    setIsLoading(true);

    try {
      // Check if we have an offline file first, then fallback to existing download service
      let audioUri = audioItem.audio_url;
      let isOfflineFile = false;
      
      // Check offline audio service first (new native implementation)
      const offlineAudio = await offlineAudioService.getOfflineAudio(audioItem.id);
      if (offlineAudio) {
        audioUri = offlineAudio.localFilePath;
        isOfflineFile = true;
        console.log('🎵 Playing from offline storage:', audioItem.title);
      } else {
        // Fallback to existing download service
        const localPath = await DownloadService.getLocalPath(audioItem.id);
        if (localPath) {
          audioUri = localPath;
          isOfflineFile = true;
          console.log('🎵 Playing from legacy download storage:', audioItem.title);
        }
      }
      

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

      // Update background audio now playing info
      await backgroundAudioService.updateNowPlaying({
        title: audioItem.title,
        artist: 'Audion News', // or could be the RSS source name
        audioId: audioItem.id,
        duration: audioItem.duration * 1000
      });

      // Record play interaction with source info
      await recordInteraction('play_started', { 
        audio_id: audioItem.id,
        source: isOfflineFile ? 'offline' : 'remote'
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
      
      // Update background audio notification
      if (currentAudio) {
        await backgroundAudioService.updatePlaybackNotification(
          {
            title: currentAudio.title,
            artist: 'Audion News',
            audioId: currentAudio.id,
            duration: duration
          },
          {
            isPlaying: false,
            position: position,
            duration: duration,
            rate: playbackRate
          }
        );
      }
      
      // Record pause interaction (useful for engagement analysis)
      setTimeout(() => recordInteraction('paused'), 50);
    }
  };

  const resumeAudio = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      setPlayStartTime(Date.now()); // Reset start time for accurate duration tracking
      
      // Update background audio notification
      if (currentAudio) {
        await backgroundAudioService.updatePlaybackNotification(
          {
            title: currentAudio.title,
            artist: 'Audion News',
            audioId: currentAudio.id,
            duration: duration
          },
          {
            isPlaying: true,
            position: position,
            duration: duration,
            rate: playbackRate
          }
        );
      }
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
    
    // Clear background audio notification
    await backgroundAudioService.clearNowPlaying();
  };

  // 🆕 Audio queue management functions
  const addToQueue = (audioItem: AudioItem) => {
    setAudioQueue(prev => [...prev, audioItem]);
  };

  const removeFromQueue = (audioId: string) => {
    setAudioQueue(prev => prev.filter(item => item.id !== audioId));
    setCurrentQueueIndex(prev => {
      const newQueue = audioQueue.filter(item => item.id !== audioId);
      if (prev >= newQueue.length) return Math.max(0, newQueue.length - 1);
      return prev;
    });
  };

  const clearQueue = () => {
    setAudioQueue([]);
    setCurrentQueueIndex(0);
  };

  const playNext = async () => {
    if (currentQueueIndex < audioQueue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      setCurrentQueueIndex(nextIndex);
      await playAudio(audioQueue[nextIndex]);
    }
  };

  const playPrevious = async () => {
    if (currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      setCurrentQueueIndex(prevIndex);
      await playAudio(audioQueue[prevIndex]);
    }
  };

  const skipToQueueItem = async (index: number) => {
    if (index >= 0 && index < audioQueue.length) {
      setCurrentQueueIndex(index);
      await playAudio(audioQueue[index]);
    }
  };

  const moveQueueItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= audioQueue.length || toIndex < 0 || toIndex >= audioQueue.length) {
      return;
    }
    
    setAudioQueue(prev => {
      const newQueue = [...prev];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);
      return newQueue;
    });
    
    // Update current index if needed
    if (fromIndex === currentQueueIndex) {
      setCurrentQueueIndex(toIndex);
    } else if (fromIndex < currentQueueIndex && toIndex >= currentQueueIndex) {
      setCurrentQueueIndex(prev => prev - 1);
    } else if (fromIndex > currentQueueIndex && toIndex <= currentQueueIndex) {
      setCurrentQueueIndex(prev => prev + 1);
    }
  };

  const seekTo = async (newPosition: number) => {
    // Prevent concurrent seeking operations
    if (isSeeking) {
      console.warn('AudioContext: Seek operation already in progress, ignoring new request');
      return;
    }
    
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

    // Set seeking lock
    setIsSeeking(true);

    try {
      // Get current status to ensure sound is loaded
      const status = await sound.getStatusAsync();
      
      if (!status.isLoaded) {
        console.warn('AudioContext: Sound not loaded, cannot seek');
        return;
      }

      // Small delay to ensure audio is stable
      await new Promise(resolve => setTimeout(resolve, 50));

      // Perform the seek operation with improved reliability
      await sound.setPositionAsync(newPosition, {
        toleranceMillisBefore: 500,
        toleranceMillisAfter: 500,
      });

      // Update position state immediately
      setPosition(newPosition);

      console.log(`AudioContext: Successfully seeked to ${newPosition}ms`);

    } catch (error) {
      console.error('AudioContext: Error during seek operation:', error);
      
      // Only try fallback if the sound is still valid
      if (sound) {
        try {
          // Wait a bit before fallback
          await new Promise(resolve => setTimeout(resolve, 100));
          await sound.setPositionAsync(newPosition);
          setPosition(newPosition);
          console.log('AudioContext: Fallback seek succeeded');
        } catch (fallbackError) {
          console.error('AudioContext: Fallback seek also failed:', fallbackError);
          // Don't throw error, just log it to prevent UI crashes
        }
      }
    } finally {
      // Always clear the seeking lock
      setIsSeeking(false);
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

  // 🆕 Streaming mode functions
  const setStreamingMode = (enabled: boolean) => {
    setIsStreamingMode(enabled);
    if (!enabled) {
      setStreamingProcessingComplete(false);
    }
  };

  const markStreamingProcessingComplete = () => {
    setStreamingProcessingComplete(true);
  };

  const playAudioStreaming = async (audioItem: AudioItem) => {
    // Enable streaming mode
    setStreamingMode(true);
    setStreamingProcessingComplete(false);
    
    // Play audio normally
    await playAudio(audioItem);
    
    // For instant audio, processing is already complete
    if (audioItem.id.includes('instant_') || audioItem.title?.includes('Instant Audio')) {
      markStreamingProcessingComplete();
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

  // 🆕 Download functions - Enhanced with native offline support
  const downloadAudio = async (audioItem: AudioItem) => {
    try {
      
      // Add to downloading set
      setDownloadingAudios(prev => new Set([...prev, audioItem.id]));
      
      // Initialize progress
      setDownloadProgress(prev => new Map([...prev, [audioItem.id, 0]]));
      
      // Record interaction
      await recordInteraction('download_started', { audio_id: audioItem.id });
      
      // Use new OfflineAudioService for native download functionality
      try {
        const localFilePath = await offlineAudioService.downloadAudio(
          audioItem.id,
          audioItem.audio_url,
          audioItem.title,
          'Audion News', // artist
          {
            duration: audioItem.duration,
            format: 'mp3',
            quality: 'standard'
          },
          (progress) => {
            setDownloadProgress(prev => new Map([...prev, [audioItem.id, progress.progress]]));
          }
        );
        
        if (localFilePath) {
          // Success - clean up downloading state
          setDownloadingAudios(prev => {
            const newSet = new Set(prev);
            newSet.delete(audioItem.id);
            return newSet;
          });
          
          // Keep progress at 100%
          setDownloadProgress(prev => new Map([...prev, [audioItem.id, 100]]));
          
          // Record successful download
          await recordInteraction('download_completed', { 
            audio_id: audioItem.id,
            service: 'offline_audio'
          });
          
          console.log('✅ Audio downloaded successfully using OfflineAudioService:', audioItem.title);
        }
        
      } catch (offlineError) {
        console.warn('⚠️ OfflineAudioService failed, falling back to legacy DownloadService:', offlineError);
        
        // Fallback to existing download service
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
                file_size: progress.totalBytes,
                service: 'legacy_download'
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
      }
      
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
      
      // Try to remove from OfflineAudioService first
      const offlineDeleted = await offlineAudioService.deleteOfflineAudio(audioId);
      
      // Also try legacy download service
      try {
        await DownloadService.removeDownload(audioId);
      } catch (legacyError) {
        console.warn('Legacy download service removal failed:', legacyError);
      }
      
      // Clean up state
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(audioId);
        return newMap;
      });
      
      // Record interaction
      await recordInteraction('download_removed', { 
        audio_id: audioId,
        offline_deleted: offlineDeleted
      });
      
    } catch (error) {
      console.error('❌ Failed to remove download:', error);
      throw error;
    }
  };

  const isAudioDownloaded = async (audioId: string): Promise<boolean> => {
    // Check both offline service and legacy service
    const offlineAudio = await offlineAudioService.getOfflineAudio(audioId);
    if (offlineAudio) {
      return true;
    }
    
    // Fallback to legacy service
    return await DownloadService.isAudioDownloaded(audioId);
  };

  const getDownloadProgress = (audioId: string): number => {
    return downloadProgress.get(audioId) || 0;
  };

  const isAudioDownloading = (audioId: string): boolean => {
    return downloadingAudios.has(audioId);
  };

  // 🆕 Native app helper functions
  const getStorageInfo = async () => {
    return await offlineAudioService.getStorageInfo();
  };

  const getAllOfflineAudio = async () => {
    return await offlineAudioService.getAllOfflineAudio();
  };

  const cleanupOldFiles = async () => {
    return await offlineAudioService.cleanupOldFiles();
  };

  const getAutoDownloadSettings = async () => {
    return await offlineAudioService.getAutoDownloadSettings();
  };

  const setAutoDownloadSettings = async (settings: any) => {
    return await offlineAudioService.setAutoDownloadSettings(settings);
  };

  const getBackgroundAudioCapabilities = () => {
    return backgroundAudioService.getCapabilities();
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
    // 🆕 Audio queue state
    audioQueue,
    currentQueueIndex,
    showMiniPlayer,
    showFullScreenPlayer,
    openDirectToScript,
    // 🆕 Streaming mode state
    isStreamingMode,
    streamingProcessingComplete,
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
    // 🆕 Audio queue actions
    addToQueue,
    removeFromQueue,
    clearQueue,
    playNext,
    playPrevious,
    skipToQueueItem,
    moveQueueItem,
    // 🆕 Download actions
    downloadAudio,
    removeDownload,
    isAudioDownloaded,
    getDownloadProgress,
    isAudioDownloading,
    // 🆕 Native app functions
    getStorageInfo,
    getAllOfflineAudio,
    cleanupOldFiles,
    getAutoDownloadSettings,
    setAutoDownloadSettings,
    getBackgroundAudioCapabilities,
    cleanupAudio,
    recordInteraction,
    // 🆕 Streaming mode actions
    setStreamingMode,
    markStreamingProcessingComplete,
    playAudioStreaming,
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