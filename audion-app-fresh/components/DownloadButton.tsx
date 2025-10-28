/**
 * DownloadButton Component
 * 音声ファイルのダウンロード状態を管理するボタンコンポーネント
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  View,
} from 'react-native';
import * as Progress from 'react-native-progress';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAudioMetadata } from '../context/AudioMetadataProvider';
import { useDownloader } from '../hooks/useDownloader';

interface DownloadButtonProps {
  audioId: string;
  remoteUrl: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: string) => void;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  audioId,
  remoteUrl,
  title,
  size = 'medium',
  showProgress = true,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
}) => {
  const { getMetadata, updateMetadata } = useAudioMetadata();
  const { 
    downloadAudio, 
    deleteAudio, 
    cancelDownload, 
    getAvailableStorage 
  } = useDownloader();

  const metadata = getMetadata(audioId);

  // メタデータが存在しない場合は初期化
  React.useEffect(() => {
    if (!metadata) {
      updateMetadata(audioId, {
        id: audioId,
        remoteUrl,
        status: 'none',
        title,
      });
    }
  }, [audioId, remoteUrl, title, metadata, updateMetadata]);

  const handleDownload = async () => {
    if (!metadata) return;

    try {
      // ストレージ容量チェック
      const availableStorage = await getAvailableStorage();
      const estimatedSize = 5 * 1024 * 1024; // 5MB推定
      
      if (availableStorage < estimatedSize) {
        Alert.alert(
          'ストレージ不足',
          'ダウンロードに必要な容量が不足しています。\n不要なファイルを削除してから再試行してください。',
          [{ text: 'OK' }]
        );
        return;
      }

      onDownloadStart?.();
      const success = await downloadAudio(metadata);
      
      if (success) {
        onDownloadComplete?.();
      } else {
        onDownloadError?.('ダウンロードに失敗しました');
      }
    } catch (error) {
      console.error('Download error:', error);
      onDownloadError?.('ダウンロード中にエラーが発生しました');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'ダウンロードファイルの削除',
      'このファイルを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (metadata) {
              await deleteAudio(metadata);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'ダウンロードのキャンセル',
      'ダウンロードを中止しますか？',
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'はい',
          onPress: () => cancelDownload(audioId),
        },
      ]
    );
  };

  if (!metadata) return null;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: styles.buttonSmall,
          icon: 14,
          text: styles.textSmall,
          progress: 20,
        };
      case 'large':
        return {
          button: styles.buttonLarge,
          icon: 24,
          text: styles.textLarge,
          progress: 40,
        };
      default:
        return {
          button: styles.buttonMedium,
          icon: 18,
          text: styles.textMedium,
          progress: 30,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const renderContent = () => {
    switch (metadata.status) {
      case 'none':
        return (
          <TouchableOpacity
            style={[styles.button, sizeStyles.button, styles.downloadButton]}
            onPress={handleDownload}
          >
            <FontAwesome name="download" size={sizeStyles.icon} color="#007bff" />
            {size !== 'small' && (
              <Text style={[sizeStyles.text, styles.downloadText]}>
                ダウンロード
              </Text>
            )}
          </TouchableOpacity>
        );

      case 'downloading':
        return (
          <View style={[styles.button, sizeStyles.button, styles.downloadingButton]}>
            {showProgress ? (
              <View style={styles.progressContainer}>
                <Progress.Circle
                  size={sizeStyles.progress}
                  progress={metadata.progress || 0}
                  color="#007bff"
                  unfilledColor="rgba(0, 123, 255, 0.2)"
                  borderWidth={0}
                  showsText={false}
                />
                {size !== 'small' && (
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={styles.cancelButton}
                  >
                    <FontAwesome name="times" size={12} color="#666666" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <FontAwesome name="spinner" size={sizeStyles.icon} color="#007bff" />
                {size !== 'small' && (
                  <Text style={[sizeStyles.text, styles.downloadingText]}>
                    {Math.round((metadata.progress || 0) * 100)}%
                  </Text>
                )}
              </>
            )}
          </View>
        );

      case 'downloaded':
        return (
          <TouchableOpacity
            style={[styles.button, sizeStyles.button, styles.downloadedButton]}
            onPress={handleDelete}
          >
            <FontAwesome name="check-circle" size={sizeStyles.icon} color="#4CAF50" />
            {size !== 'small' && (
              <Text style={[sizeStyles.text, styles.downloadedText]}>
                オフライン
              </Text>
            )}
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  buttonMedium: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  buttonLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  downloadButton: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderColor: '#007bff',
  },
  downloadingButton: {
    backgroundColor: 'rgba(0, 123, 255, 0.05)',
    borderColor: '#007bff',
  },
  downloadedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  textMedium: {
    fontSize: 12,
    fontWeight: '600',
  },
  textLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  downloadText: {
    color: '#007bff',
  },
  downloadingText: {
    color: '#007bff',
  },
  downloadedText: {
    color: '#4CAF50',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelButton: {
    padding: 2,
  },
});

export default DownloadButton;