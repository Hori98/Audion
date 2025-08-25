/**
 * MiniPlayerManager - Conditionally renders either regular or instant mini player
 * Based on the type of audio currently playing
 */

import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import UnifiedMiniPlayer from './UnifiedMiniPlayer';
import InstantMiniPlayer from './InstantMiniPlayer';
import InstantAudioView from './InstantAudioView';

export default function MiniPlayerManager() {
  const { currentAudio, showMiniPlayer } = useAudio();
  const { currentTrack, playbackState } = useAudioPlayer();
  const [showInstantView, setShowInstantView] = useState(false);

  // Check both audio systems for activity
  const isNewSystemActive = currentTrack && playbackState !== 'IDLE';
  const isLegacySystemActive = currentAudio && showMiniPlayer;
  
  // Determine if current audio is instant/auto-pick vs regular library audio
  const isInstantAudio = 
    // New system: check context for instant/auto-pick audio
    (currentTrack && (
      currentTrack.context === 'home' || 
      currentTrack.context === 'feed' ||
      currentTrack.context === 'quick-listen'
    )) ||
    // Legacy system instant audio
    (currentAudio && (
      currentAudio.id.includes('instant_') || 
      currentAudio.title?.includes('Instant Audio')
    ));

  const handleOpenInstantView = () => {
    setShowInstantView(true);
  };

  const handleCloseInstantView = () => {
    setShowInstantView(false);
  };

  // Show mini player if either system is active
  if (!isNewSystemActive && !isLegacySystemActive) {
    return null;
  }

  return (
    <>
      {isInstantAudio ? (
        <InstantMiniPlayer onOpenInstantView={handleOpenInstantView} />
      ) : (
        <UnifiedMiniPlayer />
      )}
      
      <InstantAudioView
        visible={showInstantView}
        onClose={handleCloseInstantView}
        context={currentTrack?.context || currentAudio?.context}
      />
    </>
  );
}