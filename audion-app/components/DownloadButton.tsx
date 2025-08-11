import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { AudioItem } from '../context/AudioContext';
import DownloadService from '../services/DownloadService';

interface DownloadButtonProps {
  audioItem: AudioItem;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export default function DownloadButton({ 
  audioItem, 
  size = 'medium', 
  showText = true 
}: DownloadButtonProps) {
  const { theme } = useTheme();
  const { 
    downloadAudio, 
    removeDownload, 
    getDownloadProgress, 
    isAudioDownloading,
    isAudioDownloaded 
  } = useAudio();
  
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSize, setFileSize] = useState<string>('');

  const styles = createStyles(theme, size);

  // Check download status on mount and when audioItem changes
  useEffect(() => {
    checkDownloadStatus();
  }, [audioItem.id]);

  // Update downloading state and progress
  useEffect(() => {
    const downloading = isAudioDownloading(audioItem.id);
    const downloadProgress = getDownloadProgress(audioItem.id);
    
    setIsDownloading(downloading);
    setProgress(downloadProgress);
  }, [audioItem.id]);

  const checkDownloadStatus = async () => {
    try {
      const downloaded = await isAudioDownloaded(audioItem.id);
      setIsDownloaded(downloaded);
      
      if (downloaded) {
        // Get file size for display
        const downloadedAudios = await DownloadService.getDownloadedAudios();
        const downloadedAudio = downloadedAudios.find(audio => audio.audioId === audioItem.id);
        if (downloadedAudio) {
          setFileSize(DownloadService.formatFileSize(downloadedAudio.fileSize));
        }
      }
    } catch (error) {
      console.error('Error checking download status:', error);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) {
      // TODO: Implement cancel download functionality
      Alert.alert(
        'ダウンロード中',
        'ダウンロードは進行中です。しばらくお待ちください。',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isDownloaded) {
      // Show options for downloaded file
      Alert.alert(
        'ダウンロード済み',
        `この音声はダウンロード済みです。${fileSize ? `(${fileSize})` : ''}`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: handleRemoveDownload,
          },
        ]
      );
      return;
    }

    // Start download
    try {
      await downloadAudio(audioItem);
      await checkDownloadStatus(); // Refresh status
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert(
        'ダウンロード失敗',
        '音声のダウンロードに失敗しました。ネットワーク接続を確認して再試行してください。',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRemoveDownload = async () => {
    try {
      await removeDownload(audioItem.id);
      await checkDownloadStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to remove download:', error);
      Alert.alert(
        '削除失敗',
        'ダウンロードファイルの削除に失敗しました。',
        [{ text: 'OK' }]
      );
    }
  };

  const getIcon = () => {
    if (isDownloading) {
      return 'download-outline';
    } else if (isDownloaded) {
      return 'checkmark-circle';
    } else {
      return 'cloud-download-outline';
    }
  };

  const getIconColor = () => {
    if (isDownloading) {
      return theme.primary;
    } else if (isDownloaded) {
      return theme.success || '#10B981';
    } else {
      return theme.textSecondary;
    }
  };

  const getText = () => {
    if (isDownloading) {
      return progress > 0 ? `${Math.round(progress)}%` : 'ダウンロード中';
    } else if (isDownloaded) {
      return 'ダウンロード済み';
    } else {
      return 'ダウンロード';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 20;
      case 'large': return 24;
      default: return 20;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isDownloading && styles.downloading,
        isDownloaded && styles.downloaded
      ]}
      onPress={handleDownload}
      disabled={isDownloading}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getIcon()}
          size={getIconSize()}
          color={getIconColor()}
        />
        {isDownloading && progress > 0 && (
          <View style={styles.progressContainer}>
            <View 
              style={[
                styles.progressBar,
                { width: `${progress}%`, backgroundColor: theme.primary }
              ]}
            />
          </View>
        )}
      </View>
      
      {showText && (
        <Text style={[styles.text, { color: getIconColor() }]}>
          {getText()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: any, size: 'small' | 'medium' | 'large') => {
  const padding = size === 'small' ? 6 : size === 'medium' ? 8 : 12;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;
  
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: padding,
      paddingVertical: padding / 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      gap: 6,
    },
    downloading: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    downloaded: {
      borderColor: theme.success || '#10B981',
      backgroundColor: (theme.success || '#10B981') + '10',
    },
    iconContainer: {
      position: 'relative',
    },
    progressContainer: {
      position: 'absolute',
      bottom: -2,
      left: -2,
      right: -2,
      height: 2,
      backgroundColor: theme.accent,
      borderRadius: 1,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 1,
    },
    text: {
      fontSize,
      fontWeight: '500',
    },
  });
};