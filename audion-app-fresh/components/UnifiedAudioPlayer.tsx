import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { useAudioMetadata } from '../context/AudioMetadataProvider';
import AudioService from '../services/AudioService';
import UnifiedAudioGenerationService from '../services/UnifiedAudioGenerationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UnifiedAudioPlayerProps {
  articleId: string;
  articleTitle: string;
  articleContent?: string;
  showTitle?: boolean;
  size?: 'mini' | 'standard' | 'full';
}

interface AudioPlayerState {
  status: 'idle' | 'generating' | 'ready' | 'playing' | 'paused' | 'error';
  progress: number;
  duration: number;
  audioUrl?: string;
  localUri?: string;
  error?: string;
  generationProgress?: string;
  playbackRate: number;
  position: number;
  isOfflinePlayback?: boolean;
}

export default function UnifiedAudioPlayer({
  articleId,
  articleTitle,
  articleContent,
  showTitle = true,
  size = 'standard'
}: UnifiedAudioPlayerProps) {
  const { token, isLoading: authLoading } = useAuth();
  const { getMetadata, loadInitialMetadata } = useAudioMetadata();
  const netInfo = useNetInfo();
  const [state, setState] = useState<AudioPlayerState>({
    status: 'idle',
    progress: 0,
    duration: 0,
    playbackRate: 1.0,
    position: 0
  });
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const generationPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio settings
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Failed to setup audio:', error);
      }
    };
    
    setupAudio();
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (generationPollingRef.current) {
        clearInterval(generationPollingRef.current);
      }
    };
  }, []);

  // Check if audio already exists for this article
  useEffect(() => {
    if (articleId && token) {
      checkExistingAudio();
    }
  }, [articleId, token]);

  const checkExistingAudio = async () => {
    if (!articleId || state.status !== 'idle') return;
    
    // まずローカルファイルをチェック
    const audioMetadata = getMetadata(articleId);
    if (audioMetadata?.status === 'downloaded' && audioMetadata.localUri) {
      console.log('Found local audio file:', audioMetadata.localUri);
      setState(prev => ({
        ...prev,
        status: 'ready',
        localUri: audioMetadata.localUri,
        isOfflinePlayback: true
      }));
      return;
    }

    // 認証初期化中の場合は待機
    if (authLoading) {
      return;
    }
    
    // ネットワーク接続がない場合はローカルチェックのみ
    if (!netInfo.isConnected || !token) {
      // ログ出力頻度を制限（開発時のみ表示）
      if (__DEV__ && Math.random() < 0.1) {
        console.log('No network connection or token, checking local files only');
      }
      return;
    }
    
    // ネットワーク接続がある場合はリモートもチェック
    try {
      const existingAudioUrl = await UnifiedAudioGenerationService.checkExistingAudio(articleId, token);
      if (existingAudioUrl) {
        // リモートファイルが見つかった場合、AudioMetadataに登録
        await loadInitialMetadata([{
          id: articleId,
          remoteUrl: existingAudioUrl,
          title: articleTitle
        }]);
        
        setState(prev => ({
          ...prev,
          status: 'ready',
          audioUrl: existingAudioUrl,
          isOfflinePlayback: false
        }));
      }
    } catch (error) {
      console.error('Failed to check existing audio:', error);
      // エラー時は状態を変更せず、idleのまま
    }
  };

  const generateAudio = async () => {
    if (!token) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    if (!netInfo.isConnected) {
      Alert.alert('エラー', 'ネットワーク接続が必要です\nオフラインでは新しい音声を生成できません');
      return;
    }

    setState(prev => ({ ...prev, status: 'generating', generationProgress: '音声生成を開始しています...' }));

    try {
      await UnifiedAudioGenerationService.generateAudioWithProgress({
        articleId,
        articleTitle,
        articleContent,
        language: 'ja',
        voice_type: 'standard',
        showUserAlerts: false, // UnifiedAudioPlayerではアラートを表示しない
        onProgress: (status) => {
          setState(prev => ({
            ...prev,
            generationProgress: status.message || '生成中...'
          }));
        },
        onSuccess: async (audioUrl) => {
          // 音声生成成功時、AudioMetadataに登録
          await loadInitialMetadata([{
            id: articleId,
            remoteUrl: audioUrl,
            title: articleTitle
          }]);
          
          setState(prev => ({
            ...prev,
            status: 'ready',
            audioUrl,
            generationProgress: undefined,
            isOfflinePlayback: false
          }));
        },
        onError: (errorMessage) => {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: errorMessage
          }));
        }
      }, token);
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: '音声生成に失敗しました'
      }));
    }
  };

  // pollGenerationStatus is now handled by UnifiedAudioGenerationService

  const playAudio = async () => {
    // ローカルファイル優先、次にリモートファイル
    const sourceUri = state.localUri || state.audioUrl;
    
    if (!sourceUri) {
      console.error('No audio source available');
      return;
    }

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      console.log('Playing audio from:', state.isOfflinePlayback ? 'local' : 'remote', sourceUri);

      const { sound } = await Audio.Sound.createAsync(
        { uri: sourceUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setState(prev => ({ ...prev, status: 'playing' }));
      
      // Record play analytics (オンライン時のみ)
      if (!state.isOfflinePlayback && token && netInfo.isConnected) {
        try {
          await AudioService.recordAudioPlay(articleId, token);
        } catch (error) {
          console.error('Failed to record play:', error);
        }
      }
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      
      // ローカルファイル再生に失敗した場合、リモートを試す
      if (state.isOfflinePlayback && state.audioUrl && netInfo.isConnected) {
        console.log('Local playback failed, trying remote...');
        setState(prev => ({ 
          ...prev, 
          localUri: undefined, 
          isOfflinePlayback: false 
        }));
        // リモートファイルでの再生を再試行
        setTimeout(() => playAudio(), 100);
        return;
      }
      
      Alert.alert(
        'エラー', 
        state.isOfflinePlayback 
          ? 'オフライン音声の再生に失敗しました' 
          : '音声の再生に失敗しました'
      );
    }
  };

  const pauseAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setState(prev => ({ ...prev, status: 'paused' }));
    }
  };

  const resumeAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setState(prev => ({ ...prev, status: 'playing' }));
    }
  };

  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setState(prev => ({ ...prev, status: 'ready', progress: 0 }));
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const progress = status.durationMillis ? status.positionMillis! / status.durationMillis : 0;
      const duration = status.durationMillis || 0;
      const position = status.positionMillis || 0;
      
      setState(prev => ({
        ...prev,
        progress: progress * 100,
        duration: duration / 1000,
        position: position / 1000
      }));

      if (status.didJustFinish) {
        setState(prev => ({ ...prev, status: 'ready', progress: 0, position: 0 }));
      }
    }
  };

  const changePlaybackRate = async (rate: number) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(rate, true);
        setState(prev => ({ ...prev, playbackRate: rate }));
      } catch (error) {
        console.error('Failed to change playback rate:', error);
      }
    }
  };

  const seekToPosition = async (positionPercent: number) => {
    if (soundRef.current && state.duration > 0) {
      try {
        const positionMillis = (positionPercent / 100) * state.duration * 1000;
        await soundRef.current.setPositionAsync(positionMillis);
      } catch (error) {
        console.error('Failed to seek:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPlayerButton = () => {
    const iconSize = size === 'mini' ? 16 : size === 'standard' ? 20 : 24;
    
    switch (state.status) {
      case 'idle':
        return (
          <TouchableOpacity onPress={generateAudio} style={[styles.button, styles.generateButton]}>
            <Ionicons name="musical-note-outline" size={iconSize} color="#007AFF" />
            {size !== 'mini' && <Text style={[styles.buttonText, styles.generateButtonText]}>音声生成</Text>}
          </TouchableOpacity>
        );
        
      case 'generating':
        return (
          <View style={[styles.button, styles.generatingButton]}>
            <ActivityIndicator size="small" color="#FF9500" />
            {size !== 'mini' && <Text style={[styles.buttonText, styles.generatingButtonText]}>生成中...</Text>}
          </View>
        );
        
      case 'ready':
        return (
          <View style={styles.readyContainer}>
            <TouchableOpacity onPress={playAudio} style={[styles.button, styles.playButton]}>
              <Ionicons name="play-outline" size={iconSize} color="#34C759" />
              {size !== 'mini' && <Text style={[styles.buttonText, styles.playButtonText]}>再生</Text>}
            </TouchableOpacity>
            {state.isOfflinePlayback && size !== 'mini' && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={12} color="#888888" />
                <Text style={styles.offlineText}>オフライン</Text>
              </View>
            )}
          </View>
        );
        
      case 'playing':
        return (
          <TouchableOpacity onPress={pauseAudio} style={[styles.button, styles.pauseButton]}>
            <Ionicons name="pause-outline" size={iconSize} color="#FF9500" />
            {size !== 'mini' && <Text style={[styles.buttonText, styles.pauseButtonText]}>一時停止</Text>}
          </TouchableOpacity>
        );
        
      case 'paused':
        return (
          <View style={styles.pausedControls}>
            <TouchableOpacity onPress={resumeAudio} style={[styles.button, styles.playButton]}>
              <Ionicons name="play-outline" size={iconSize} color="#34C759" />
            </TouchableOpacity>
            {size !== 'mini' && (
              <TouchableOpacity onPress={stopAudio} style={[styles.button, styles.stopButton]}>
                <Ionicons name="stop-outline" size={16} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        );
        
      case 'error':
        return (
          <TouchableOpacity onPress={generateAudio} style={[styles.button, styles.errorButton]}>
            <Ionicons name="refresh-outline" size={iconSize} color="#FF3B30" />
            {size !== 'mini' && <Text style={[styles.buttonText, styles.errorButtonText]}>再試行</Text>}
          </TouchableOpacity>
        );
        
      default:
        return null;
    }
  };

  const containerStyle = [
    styles.container,
    size === 'mini' && styles.miniContainer,
    size === 'full' && styles.fullContainer
  ];

  return (
    <View style={containerStyle}>
      {showTitle && size !== 'mini' && (
        <Text style={styles.title} numberOfLines={2}>
          {articleTitle}
        </Text>
      )}
      
      <View style={styles.playerControls}>
        {renderPlayerButton()}
      </View>
      
      {state.generationProgress && size !== 'mini' && (
        <Text style={styles.progressText}>{state.generationProgress}</Text>
      )}
      
      {state.status === 'playing' || state.status === 'paused' ? (
        <View style={styles.progressContainer}>
          <TouchableOpacity 
            style={styles.progressBar}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              const progressBarWidth = SCREEN_WIDTH - 32; // Account for padding
              const seekPercent = (locationX / progressBarWidth) * 100;
              seekToPosition(Math.max(0, Math.min(100, seekPercent)));
            }}
            activeOpacity={0.8}
          >
            <View 
              style={[styles.progressFill, { width: `${state.progress}%` }]} 
            />
          </TouchableOpacity>
          <View style={styles.controlsRow}>
            {size !== 'mini' && (
              <Text style={styles.timeText}>
                {formatTime(state.position)} / {formatTime(state.duration)}
              </Text>
            )}
            {size === 'full' && (
              <View style={styles.speedControls}>
                {[0.8, 1.0, 1.2, 1.5].map(rate => (
                  <TouchableOpacity 
                    key={rate}
                    style={[
                      styles.speedButton,
                      state.playbackRate === rate && styles.activeSpeedButton
                    ]}
                    onPress={() => changePlaybackRate(rate)}
                  >
                    <Text style={[
                      styles.speedButtonText,
                      state.playbackRate === rate && styles.activeSpeedButtonText
                    ]}>
                      {rate}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : null}
      
      {state.error && size !== 'mini' && (
        <Text style={styles.errorText}>{state.error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 8,
    marginVertical: 2,
  },
  miniContainer: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullContainer: {
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 2,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  generateButton: {
    borderColor: '#007AFF',
  },
  generatingButton: {
    borderColor: '#FF9500',
  },
  playButton: {
    borderColor: '#34C759',
  },
  pauseButton: {
    borderColor: '#FF9500',
  },
  stopButton: {
    borderColor: '#FF3B30',
  },
  errorButton: {
    borderColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  generateButtonText: {
    color: '#007AFF',
  },
  generatingButtonText: {
    color: '#FF9500',
  },
  playButtonText: {
    color: '#34C759',
  },
  pauseButtonText: {
    color: '#FF9500',
  },
  errorButtonText: {
    color: '#FF3B30',
  },
  pausedControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  timeText: {
    fontSize: 10,
    color: '#cccccc',
    textAlign: 'center',
    marginTop: 4,
  },
  progressText: {
    fontSize: 10,
    color: '#cccccc',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 10,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginLeft: 4,
  },
  activeSpeedButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  speedButtonText: {
    fontSize: 10,
    color: '#cccccc',
    fontWeight: '500',
  },
  activeSpeedButtonText: {
    color: '#ffffff',
  },
  readyContainer: {
    alignItems: 'center',
    gap: 4,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(136, 136, 136, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  offlineText: {
    fontSize: 9,
    color: '#888888',
    fontWeight: '500',
  },
});