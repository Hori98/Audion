/**
 * Global Mini Player Component
 * アプリ全体で統一して使用されるミニプレイヤー
 * どの画面からでも音声再生時に自動表示される
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useGlobalAudio } from '../context/GlobalAudioContext';
import Icon from './common/Icon';

interface GlobalMiniPlayerProps {
  onExpand?: () => void;
  bottomOffset?: number; // Tab bar height or footer height to sit above
}

export default function GlobalMiniPlayer({ onExpand, bottomOffset = 0 }: GlobalMiniPlayerProps) {
  const { 
    currentTrack, 
    isPlaying, 
    progress,
    positionMs,
    durationMs,
    togglePlayPause, 
    stopSound 
  } = useGlobalAudio();

  // Debug positioning
  React.useEffect(() => {
    if (currentTrack) {
      console.log('🎯 [MINI-PLAYER] bottomOffset:', bottomOffset, 'currentTrack:', currentTrack.title);
    }
  }, [bottomOffset, currentTrack]);

  // ドラッグジェスチャー用のアニメーション値
  const translateY = useRef(new Animated.Value(0)).current;

  // 新しい音声が開始される時にアニメーション値をリセット
  React.useEffect(() => {
    if (currentTrack) {
      translateY.setValue(0);
    }
  }, [currentTrack?.id]);
  // Spotify風: 下方向ドラッグで徐々にフェードアウト
  const opacity = translateY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  // ついでに僅かに縮小（任意）
  const scale = translateY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.98],
    extrapolate: 'clamp',
  });

  // currentTrackが存在しない場合は非表示
  if (!currentTrack) {
    return null;
  }

  const handlePlayPause = async () => {
    try {
      await togglePlayPause();
    } catch (error) {
      console.error('Mini player control error:', error);
    }
  };

  // 時間フォーマット関数
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ドラッグジェスチャーのハンドラー
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // 下方向に十分にドラッグされた、または速度が十分な場合は停止
      const shouldDismiss = translationY > 50 || (translationY > 25 && velocityY > 500);
      
      if (shouldDismiss) {
        // 停止してアニメーション
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }).start(async () => {
          try {
            await stopSound();
            // translateY.setValue(0) を削除 - 跳ね上がり防止
          } catch (error) {
            console.error('Mini player stop error:', error);
          }
        });
      } else {
        // 元の位置に戻すアニメーション
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetY={10}
      failOffsetX={[-20, 20]}
    >
      <Animated.View 
        style={[
          styles.container,
          {
            transform: [{ translateY }, { scale }],
            opacity,
            // Sit above footer/tab bar
            bottom: bottomOffset,
          },
        ]}
      >
        {/* 進捗バー */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* メインコンテンツエリア */}
        <View style={styles.contentArea}>
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
                {isPlaying ? '再生中' : '一時停止'} • {formatTime(positionMs)} / {formatTime(durationMs)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 一時停止ボタン（右端） */}
          <TouchableOpacity 
            style={styles.playPauseButton}
            onPress={handlePlayPause}
          >
            {isPlaying ? (
              <Icon name="pause" size={24} color="#ffffff" />
            ) : (
              <Icon name="play" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, // will be overridden by prop
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    // タブバー（zIndex:1000）の上に出す
    zIndex: 2001,
    elevation: 2001,
  },
  progressBar: {
    height: 2,
    backgroundColor: '#333333',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  progressFill: {
    height: 2,
    backgroundColor: '#1db954', // Spotify green
  },
  contentArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2, // 進捗バー分のスペース
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingVertical: 8,
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
  playPauseButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playPauseButtonText: {},
});
