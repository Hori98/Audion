/**
 * Mini Player Component
 * 画面下部に表示される音声再生コントローラー
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useGlobalAudio } from '../context/GlobalAudioContext';
import Icon from './common/Icon';

interface MiniPlayerProps {
  visible: boolean;
  onExpand?: () => void;
}

export default function MiniPlayer({ visible, onExpand }: MiniPlayerProps) {
  const { currentTrack, isPlaying, pauseSound, playSound, stopSound } = useGlobalAudio();

  if (!visible || !currentTrack) {
    return null;
  }

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseSound();
    } else {
      await playSound(currentTrack);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.mainArea}
        onPress={onExpand}
        activeOpacity={0.8}
      >
        {/* サムネイル */}
        <View style={styles.thumbnail}>
          <Icon name="music" size={16} color="#ffffff" />
        </View>

        {/* トラック情報 */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackStatus} numberOfLines={1}>
            {isPlaying ? '再生中' : '一時停止'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* コントロールボタン */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handlePlayPause}
        >
          {isPlaying ? (
            <Icon name="pause" size={20} color="#ffffff" />
          ) : (
            <Icon name="play" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={stopSound}
        >
          <Icon name="stop" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 40,
    height: 40,
    backgroundColor: '#333333',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailIcon: {},
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  trackStatus: {
    fontSize: 12,
    color: '#b3b3b3',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {},
});
