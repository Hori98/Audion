/**
 * AudioMetadataProvider
 * 音声ファイルのダウンロード状態・メタデータ管理システム
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AudioMetadata {
  id: string;
  remoteUrl: string;
  localUri?: string;
  status: 'none' | 'downloading' | 'downloaded';
  progress?: number; // 0 to 1
  fileSize?: number;
  downloadedAt?: string;
  title?: string;
  duration?: number;
}

interface AudioMetadataContextType {
  metadata: { [id: string]: AudioMetadata };
  updateMetadata: (id: string, data: Partial<AudioMetadata>) => Promise<void>;
  loadInitialMetadata: (audios: { id: string, remoteUrl: string, title?: string }[]) => Promise<void>;
  getMetadata: (id: string) => AudioMetadata | undefined;
  getAllDownloadedAudios: () => AudioMetadata[];
  getTotalStorageUsage: () => number;
  clearAllMetadata: () => Promise<void>;
  isLoading: boolean;
}

const AudioMetadataContext = createContext<AudioMetadataContextType | undefined>(undefined);

const STORAGE_KEY = '@audion_audio_metadata';

export const AudioMetadataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metadata, setMetadata] = useState<{ [id: string]: AudioMetadata }>({});
  const [isLoading, setIsLoading] = useState(true);

  // アプリ起動時にAsyncStorageからメタデータを読み込む
  useEffect(() => {
    const loadState = async () => {
      try {
        setIsLoading(true);
        const storedMetadata = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedMetadata) {
          const parsed = JSON.parse(storedMetadata);
          setMetadata(parsed);
          console.log('AudioMetadata loaded:', Object.keys(parsed).length, 'items');
        }
      } catch (error) {
        console.error('Failed to load audio metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  const saveMetadata = async (newMetadata: { [id: string]: AudioMetadata }) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMetadata));
    } catch (error) {
      console.error('Failed to save audio metadata:', error);
    }
  };

  const updateMetadata = async (id: string, data: Partial<AudioMetadata>) => {
    const currentData = metadata[id] || { id, remoteUrl: '', status: 'none' };
    const updatedData = { ...currentData, ...data };
    
    const newMetadata = { ...metadata, [id]: updatedData };
    setMetadata(newMetadata);
    await saveMetadata(newMetadata);
    
    console.log('AudioMetadata updated:', id, updatedData.status, 
      updatedData.progress ? `${Math.round(updatedData.progress * 100)}%` : '');
  };

  const loadInitialMetadata = async (audios: { id: string, remoteUrl: string, title?: string }[]) => {
    const newMetadata = { ...metadata };
    let hasChanges = false;

    audios.forEach(audio => {
      if (!newMetadata[audio.id]) {
        newMetadata[audio.id] = {
          id: audio.id,
          remoteUrl: audio.remoteUrl,
          status: 'none',
          title: audio.title,
        };
        hasChanges = true;
      } else if (newMetadata[audio.id].remoteUrl !== audio.remoteUrl) {
        // URLが変更された場合は再ダウンロードが必要
        newMetadata[audio.id] = {
          ...newMetadata[audio.id],
          remoteUrl: audio.remoteUrl,
          status: 'none',
          localUri: undefined,
          progress: 0,
          title: audio.title,
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setMetadata(newMetadata);
      await saveMetadata(newMetadata);
      console.log('AudioMetadata initialized:', audios.length, 'audios');
    }
  };

  const getMetadata = (id: string): AudioMetadata | undefined => {
    return metadata[id];
  };

  const getAllDownloadedAudios = (): AudioMetadata[] => {
    return Object.values(metadata).filter(m => m.status === 'downloaded');
  };

  const getTotalStorageUsage = (): number => {
    return Object.values(metadata)
      .filter(m => m.status === 'downloaded' && m.fileSize)
      .reduce((total, m) => total + (m.fileSize || 0), 0);
  };

  const clearAllMetadata = async () => {
    setMetadata({});
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('AudioMetadata cleared');
  };

  const contextValue: AudioMetadataContextType = {
    metadata,
    updateMetadata,
    loadInitialMetadata,
    getMetadata,
    getAllDownloadedAudios,
    getTotalStorageUsage,
    clearAllMetadata,
    isLoading,
  };

  return (
    <AudioMetadataContext.Provider value={contextValue}>
      {children}
    </AudioMetadataContext.Provider>
  );
};

export const useAudioMetadata = () => {
  const context = useContext(AudioMetadataContext);
  if (!context) {
    throw new Error('useAudioMetadata must be used within an AudioMetadataProvider');
  }
  return context;
};