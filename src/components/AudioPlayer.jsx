import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { format } from 'date-fns';

const AudioPlayer = () => {
  const {
    currentAudio,
    isPlaying,
    currentTime,
    duration,
    showPlayer,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setShowPlayer,
  } = useAudio();

  if (!showPlayer || !currentAudio) {
    return null;
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekTo(newTime);
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 30, duration);
    seekTo(newTime);
  };

  const skipBackward = () => {
    const newTime = Math.max(currentTime - 30, 0);
    seekTo(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div 
          className="h-1 bg-gray-200 cursor-pointer hover:h-2 transition-all duration-200"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-primary-500 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-between py-4">
          {/* Audio Info */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="bg-primary-100 p-3 rounded-lg flex-shrink-0">
              <Volume2 className="h-6 w-6 text-primary-600" />
            </div>
            
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-900 truncate">
                {currentAudio.title}
              </h4>
              <p className="text-sm text-gray-500">
                {format(new Date(currentAudio.created_at), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Time Display */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={skipBackward}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                title="Skip back 30s"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              
              <button
                onClick={isPlaying ? pauseAudio : resumeAudio}
                className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-full transition-colors duration-200"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </button>
              
              <button
                onClick={skipForward}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                title="Skip forward 30s"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={stopAudio}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 ml-4"
              title="Close player"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;