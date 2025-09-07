/**
 * Global Audio Context
 * アプリ全体で音声再生を管理し、重複再生を防ぐ
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

interface AudioTrack {
  id: string;
  uri: string;
  title: string;
}

interface GlobalAudioContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  playSound: (track: AudioTrack) => Promise<void>;
  pauseSound: () => Promise<void>;
  stopSound: () => Promise<void>;
  isCurrentTrack: (trackId: string) => boolean;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

export const GlobalAudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 新しい音声を再生するメイン関数
  const playSound = async (track: AudioTrack) => {
    try {
      // 同じトラックが再生中の場合は一時停止/再開を切り替える
      if (sound && currentTrack?.id === track.id) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // ★★★ 排他制御のコアロジック ★★★
      // 別の音声が再生中なら、まずアンロードしてリソースを解放する
      if (sound) {
        console.log('🎵 [GLOBAL] Unloading previous sound...');
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setCurrentTrack(null);
      }

      console.log('🎵 [GLOBAL] Loading new sound:', track.title);
      
      if (!track.uri) {
        Alert.alert('エラー', '音声ファイルのURLが見つかりません');
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentTrack(track);

      // 再生状態の監視
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentTrack(null);
          console.log('🎵 [GLOBAL] Playback finished');
        }
      });

    } catch (error) {
      console.error('🎵 [GLOBAL] Failed to load sound:', error);
      Alert.alert('再生エラー', '音声の再生に失敗しました');
    }
  };

  const pauseSound = async () => {
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const stopSound = async () => {
    if (sound) {
      console.log('🎵 [GLOBAL] Stopping sound');
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setCurrentTrack(null);
    }
  };

  const isCurrentTrack = (trackId: string): boolean => {
    return currentTrack?.id === trackId && isPlaying;
  };

  // コンポーネントがアンマウントされるときのクリーンアップ
  useEffect(() => {
    return () => {
      if (sound) {
        console.log('🎵 [GLOBAL] Cleanup on unmount');
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <GlobalAudioContext.Provider 
      value={{
        currentTrack,
        isPlaying,
        playSound,
        pauseSound,
        stopSound,
        isCurrentTrack,
      }}
    >
      {children}
    </GlobalAudioContext.Provider>
  );
};

export const useGlobalAudio = (): GlobalAudioContextType => {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
};