/**
 * useDownloader Hook
 * 音声ファイルのダウンロード・削除機能を提供
 */

import * as FileSystem from 'expo-file-system';
import { useAudioMetadata, AudioMetadata } from '../context/AudioMetadataProvider';

// アクティブなダウンロードを管理するためのMap
const downloadResumables: { [id: string]: FileSystem.DownloadResumable } = {};

export const useDownloader = () => {
  const { updateMetadata } = useAudioMetadata();

  /**
   * ローカルファイルのURIを生成
   */
  const getLocalUri = (id: string, remoteUrl?: string) => {
    // リモートURLから拡張子を取得、デフォルトはmp3
    let fileExtension = 'mp3';
    if (remoteUrl) {
      const urlMatch = remoteUrl.match(/\.(mp3|m4a|wav|aac)(\?.*)?$/i);
      if (urlMatch) {
        fileExtension = urlMatch[1];
      }
    }
    return `${FileSystem.documentDirectory}audio_${id}.${fileExtension}`;
  };

  /**
   * 音声ファイルをダウンロード
   */
  const downloadAudio = async (audio: AudioMetadata): Promise<boolean> => {
    if (audio.status === 'downloading' || audio.status === 'downloaded') {
      console.log(`Audio ${audio.id} is already ${audio.status}`);
      return false;
    }

    const localUri = getLocalUri(audio.id, audio.remoteUrl);
    console.log('Starting download:', audio.id, 'to', localUri);

    // 進捗コールバック
    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      updateMetadata(audio.id, { progress });
    };

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        audio.remoteUrl,
        localUri,
        {},
        callback
      );

      downloadResumables[audio.id] = downloadResumable;
      await updateMetadata(audio.id, { 
        status: 'downloading', 
        progress: 0,
        localUri 
      });

      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        console.log('Finished downloading:', result.uri);
        
        // ファイルサイズを取得
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSize = fileInfo.exists ? fileInfo.size : undefined;
        
        await updateMetadata(audio.id, { 
          status: 'downloaded', 
          localUri: result.uri, 
          progress: 1,
          fileSize,
          downloadedAt: new Date().toISOString()
        });
        
        return true;
      } else {
        throw new Error('Download result is null');
      }
    } catch (error) {
      console.error('Download failed for', audio.id, ':', error);
      await updateMetadata(audio.id, { 
        status: 'none', 
        progress: 0, 
        localUri: undefined 
      });
      return false;
    } finally {
      delete downloadResumables[audio.id];
    }
  };

  /**
   * ダウンロード中の音声を一時停止
   */
  const pauseDownload = async (audioId: string): Promise<boolean> => {
    const downloadResumable = downloadResumables[audioId];
    if (downloadResumable) {
      try {
        await downloadResumable.pauseAsync();
        console.log('Download paused:', audioId);
        return true;
      } catch (error) {
        console.error('Failed to pause download:', error);
        return false;
      }
    }
    return false;
  };

  /**
   * 一時停止されたダウンロードを再開
   */
  const resumeDownload = async (audioId: string): Promise<boolean> => {
    const downloadResumable = downloadResumables[audioId];
    if (downloadResumable) {
      try {
        await downloadResumable.resumeAsync();
        console.log('Download resumed:', audioId);
        return true;
      } catch (error) {
        console.error('Failed to resume download:', error);
        return false;
      }
    }
    return false;
  };

  /**
   * ダウンロード中の音声をキャンセル
   */
  const cancelDownload = async (audioId: string): Promise<boolean> => {
    const downloadResumable = downloadResumables[audioId];
    if (downloadResumable) {
      try {
        await downloadResumable.pauseAsync();
        delete downloadResumables[audioId];
        await updateMetadata(audioId, { 
          status: 'none', 
          progress: 0, 
          localUri: undefined 
        });
        console.log('Download cancelled:', audioId);
        return true;
      } catch (error) {
        console.error('Failed to cancel download:', error);
        return false;
      }
    }
    return false;
  };

  /**
   * ダウンロード済み音声ファイルを削除
   */
  const deleteAudio = async (audio: AudioMetadata): Promise<boolean> => {
    if (audio.status !== 'downloaded' || !audio.localUri) {
      console.log('Audio is not downloaded:', audio.id);
      return false;
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(audio.localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(audio.localUri);
        console.log('Deleted local file:', audio.localUri);
      }
      
      await updateMetadata(audio.id, { 
        status: 'none', 
        localUri: undefined, 
        progress: 0,
        fileSize: undefined,
        downloadedAt: undefined
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete audio file:', error);
      return false;
    }
  };

  /**
   * すべてのダウンロード済みファイルを削除
   */
  const deleteAllAudios = async (audios: AudioMetadata[]): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const audio of audios) {
      if (audio.status === 'downloaded') {
        const result = await deleteAudio(audio);
        if (result) {
          success++;
        } else {
          failed++;
        }
      }
    }

    console.log(`Bulk delete completed: ${success} success, ${failed} failed`);
    return { success, failed };
  };

  /**
   * ローカルファイルが実際に存在するかチェック
   */
  const verifyLocalFile = async (audio: AudioMetadata): Promise<boolean> => {
    if (!audio.localUri || audio.status !== 'downloaded') {
      return false;
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(audio.localUri);
      const exists = fileInfo.exists;
      
      if (!exists) {
        // ファイルが存在しない場合はメタデータを更新
        await updateMetadata(audio.id, { 
          status: 'none', 
          localUri: undefined, 
          progress: 0 
        });
        console.log('Local file not found, metadata updated:', audio.id);
      }
      
      return exists;
    } catch (error) {
      console.error('Failed to verify local file:', error);
      return false;
    }
  };

  /**
   * 利用可能なストレージ容量を取得
   */
  const getAvailableStorage = async (): Promise<number> => {
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      return freeDiskStorage;
    } catch (error) {
      console.error('Failed to get available storage:', error);
      return 0;
    }
  };

  return {
    downloadAudio,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteAudio,
    deleteAllAudios,
    verifyLocalFile,
    getLocalUri,
    getAvailableStorage,
  };
};