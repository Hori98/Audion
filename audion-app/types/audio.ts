/**
 * Audio-related type definitions for the Audion app
 * Unified architecture types for 4-player system
 */

export interface Chapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds  
  original_url?: string; // For news articles
  originalUrl?: string; // Alternative naming compatibility
  start_time?: number; // Backend compatibility
  end_time?: number;   // Backend compatibility
}

export interface AudioTrack {
  id: string;
  url: string;
  title: string;
  artist?: string;
  artwork?: string;
  chapters?: Chapter[];
  duration?: number;  // in seconds
  script?: string;    // Full script content
  voice_language?: string;
  voice_name?: string;
  created_at?: string;
  context?: 'home' | 'feed' | 'manual' | 'schedule'; // Extended source contexts
  // Audio type classification
  audioType?: 'instant' | 'saved';
  isInstantAudio?: boolean; // For backward compatibility
  // Creation progress (for instant audio)
  creationProgress?: number; // 0-100
  creationStage?: 'articles' | 'script' | 'audio' | 'complete';
  // Metadata
  genre?: string;
  source?: string;
  prompt_style?: string;
  // Playlist information
  playlistId?: string;
  playlistName?: string;
}

export type PlaybackState =
  | 'IDLE'      // Nothing playing
  | 'LOADING'   // Loading/buffering
  | 'PLAYING'   // Currently playing
  | 'PAUSED'    // Paused
  | 'STOPPED'   // Stopped (completed or interrupted)
  | 'ERROR';    // Error occurred

export type AudioPlayerType = 
  | 'instant-mini'    // InstantMiniPlayer
  | 'instant-full'    // InstantAudioView  
  | 'saved-mini'      // SavedMiniPlayer
  | 'saved-full';     // SavedAudioView

export interface UnifiedAudioState {
  // Core audio data
  currentTrack: AudioTrack | null;
  audioType: 'instant' | 'saved' | null;
  playbackState: PlaybackState;
  positionMillis: number;
  durationMillis: number;
  isLoading: boolean;
  error?: string;
  
  // UI state management
  showMiniPlayer: boolean;
  showFullView: boolean;
  activePlayerType: AudioPlayerType | null;
  
  // Creation progress (for instant audio)
  creationProgress?: number;
  creationStage?: 'articles' | 'script' | 'audio' | 'complete';
  
  // Playback controls
  playbackRate: number;
  isShuffle: boolean;
  isRepeat: boolean;
}

export interface AudioPlayerContextType {
  // State
  state: UnifiedAudioState;
  
  // Core actions
  playTrack: (track: AudioTrack) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionSeconds: number) => Promise<void>;
  jumpToChapter: (chapter: Chapter) => Promise<void>;
  stop: () => Promise<void>;
  
  // UI actions
  showPlayer: (type: AudioPlayerType) => void;
  hidePlayer: () => void;
  
  // Instant audio specific
  playInstantAudio: (track: AudioTrack) => Promise<void>;
  convertToSaved: (customName?: string) => Promise<void>;
  updateCreationProgress: (progress: number, stage: string) => void;
  
  // Saved audio specific  
  addToPlaylist: (playlistId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string) => Promise<void>;
  toggleFavorite: () => Promise<void>;
  
  // Settings
  setPlaybackRate: (rate: number) => void;
  clearError: () => void;
}

// Legacy compatibility types
export interface AudioItem {
  id: string;
  title: string;
  url: string;
  duration?: number;
  chapters?: any[];
  script?: string;
  artist?: string;
  created_at?: string;
  voice_language?: string;
  voice_name?: string;
  context?: string;
  prompt_style?: string;
}

// Backend API types
export interface InstantAudioRequest {
  article_ids: string[];
  article_titles: string[];
  article_urls: string[];
  article_summaries?: string[];  // 🔥 FIX: Add summaries for rich content
  article_contents?: string[];   // 🔥 FIX: Add contents for rich content
  voice_language: string;
  voice_name: string;
  prompt_style?: string;
  custom_prompt?: string;
}

export interface SimpleAudioResponse {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  voice_language: string;
  voice_name?: string;
  chapters?: Chapter[];
  script?: string;
}

export interface SavedAudioResponse {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  created_at: string;
  script?: string;
  chapters?: Chapter[];
  voice_language?: string;
  voice_name?: string;
  is_favorite?: boolean;
  playlist_ids?: string[];
}

// UI Component Props
export interface BasePlayerProps {
  onClose?: () => void;
  visible?: boolean;
}

export interface InstantPlayerProps extends BasePlayerProps {
  onSave?: (audioTrack: AudioTrack) => void;
  onOpenFullView?: () => void;
  context?: 'home' | 'feed';
}

export interface SavedPlayerProps extends BasePlayerProps {
  onAddToPlaylist?: (playlistId: string) => void;
  onShare?: (audioTrack: AudioTrack) => void;
}