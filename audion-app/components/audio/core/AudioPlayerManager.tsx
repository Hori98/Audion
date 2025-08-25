/**
 * AudioPlayerManager - Central orchestrator for all 4 audio player types
 * Replaces MiniPlayerManager with unified, smart routing logic
 * Routes to correct player based on audio type and UI state
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useUnifiedAudio } from '../../../context/UnifiedAudioContext';

// Import all 4 player components
import InstantMiniPlayer from '../players/InstantMiniPlayer';
import InstantAudioView from '../players/InstantAudioView';
import SavedMiniPlayer from '../players/SavedMiniPlayer';
import SavedAudioView from '../players/SavedAudioView';

export const AudioPlayerManager: React.FC = () => {
  const { state, showPlayer, hidePlayer } = useUnifiedAudio();
  
  const {
    currentTrack,
    audioType,
    playbackState,
    showMiniPlayer,
    showFullView,
    activePlayerType
  } = state;

  // Show mini player if we have audio and should show mini
  const shouldShowMini = currentTrack && 
                        playbackState !== 'IDLE' && 
                        showMiniPlayer;

  // Show full view if we have audio, should show mini, and full view is requested
  const shouldShowFull = shouldShowMini && showFullView;

  // Callbacks for player interactions
  const handleOpenFullView = useCallback(() => {
    if (audioType === 'instant') {
      showPlayer('instant-full');
    } else if (audioType === 'saved') {
      showPlayer('saved-full');
    }
  }, [audioType, showPlayer]);

  const handleCloseFullView = useCallback(() => {
    if (audioType === 'instant') {
      showPlayer('instant-mini');
    } else if (audioType === 'saved') {
      showPlayer('saved-mini');
    }
  }, [audioType, showPlayer]);

  const handleSaveInstantAudio = useCallback((audioTrack: any) => {
    console.log('🎵 AudioPlayerManager: Instant audio saved, switching to saved player');
    // The conversion logic is handled in UnifiedAudioContext
    // This callback notifies us that the conversion happened
  }, []);

  const handleAddToPlaylist = useCallback((playlistId: string) => {
    console.log('🎵 AudioPlayerManager: Adding to playlist:', playlistId);
    // Playlist logic is handled in UnifiedAudioContext
  }, []);

  const handleShare = useCallback((audioTrack: any) => {
    console.log('🎵 AudioPlayerManager: Sharing audio:', audioTrack.title);
    // TODO: Implement sharing functionality
  }, []);

  // Don't render anything if no audio
  if (!shouldShowMini) {
    return null;
  }

  return (
    <View>
      {/* Mini Players */}
      {audioType === 'instant' && (
        <InstantMiniPlayer
          visible={shouldShowMini && !shouldShowFull}
          onOpenFullView={handleOpenFullView}
          onSave={handleSaveInstantAudio}
          context={currentTrack?.context as 'home' | 'feed'}
        />
      )}
      
      {audioType === 'saved' && (
        <SavedMiniPlayer
          visible={shouldShowMini && !shouldShowFull}
          onAddToPlaylist={handleAddToPlaylist}
          onShare={handleShare}
        />
      )}

      {/* Full View Players */}
      {audioType === 'instant' && (
        <InstantAudioView
          visible={shouldShowFull}
          onClose={handleCloseFullView}
          onSave={handleSaveInstantAudio}
          context={currentTrack?.context as 'home' | 'feed'}
        />
      )}
      
      {audioType === 'saved' && (
        <SavedAudioView
          visible={shouldShowFull}
          onClose={handleCloseFullView}
          onAddToPlaylist={handleAddToPlaylist}
          onShare={handleShare}
        />
      )}
    </View>
  );
};

export default AudioPlayerManager;