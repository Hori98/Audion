import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DownloadProgress {
  audioId: string;
  progress: number; // 0-100
  totalBytes: number;
  downloadedBytes: number;
  status: 'downloading' | 'completed' | 'failed';
}

export interface DownloadedAudio {
  audioId: string;
  localPath: string;
  originalUrl: string;
  fileSize: number;
  downloadedAt: string;
  title: string;
}

export class DownloadService {
  private static readonly DOWNLOADS_STORAGE_KEY = 'downloaded_audios';
  private static readonly DOWNLOAD_DIRECTORY = `${FileSystem.documentDirectory}downloads/`;
  
  // ダウンロード進捗のリスナー
  private static progressListeners: Map<string, (progress: DownloadProgress) => void> = new Map();

  /**
   * 音声ファイルをダウンロード
   */
  static async downloadAudio(
    audioId: string,
    audioUrl: string,
    title: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    try {
      // ダウンロードディレクトリを作成
      await this.ensureDownloadDirectory();
      
      // ファイル名を生成
      const fileName = `${audioId}.mp3`;
      const localPath = `${this.DOWNLOAD_DIRECTORY}${fileName}`;
      
      // 既にダウンロード済みかチェック
      if (await this.isAudioDownloaded(audioId)) {
        const existingPath = await this.getLocalPath(audioId);
        if (existingPath && await FileSystem.getInfoAsync(existingPath)) {
          console.log('📱 Audio already downloaded:', existingPath);
          return existingPath;
        }
      }

      // プログレスリスナーを登録
      if (onProgress) {
        this.progressListeners.set(audioId, onProgress);
      }

      console.log('📥 Starting download:', { audioId, audioUrl, localPath });

      // ダウンロード実行
      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress: DownloadProgress = {
            audioId,
            progress: (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100,
            totalBytes: downloadProgress.totalBytesExpectedToWrite,
            downloadedBytes: downloadProgress.totalBytesWritten,
            status: 'downloading'
          };
          
          // プログレスリスナーを呼び出し
          const listener = this.progressListeners.get(audioId);
          if (listener) {
            listener(progress);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        // ダウンロード完了時の処理
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const downloadedAudio: DownloadedAudio = {
          audioId,
          localPath: result.uri,
          originalUrl: audioUrl,
          fileSize: fileInfo.size || 0,
          downloadedAt: new Date().toISOString(),
          title
        };

        // ダウンロード情報を保存
        await this.saveDownloadedAudio(downloadedAudio);
        
        // 完了プログレスを送信
        const listener = this.progressListeners.get(audioId);
        if (listener) {
          listener({
            audioId,
            progress: 100,
            totalBytes: fileInfo.size || 0,
            downloadedBytes: fileInfo.size || 0,
            status: 'completed'
          });
        }

        // リスナーを削除
        this.progressListeners.delete(audioId);

        console.log('✅ Download completed:', result.uri);
        return result.uri;
      } else {
        throw new Error('Download failed - no result');
      }

    } catch (error) {
      console.error('❌ Download failed:', error);
      
      // エラープログレスを送信
      const listener = this.progressListeners.get(audioId);
      if (listener) {
        listener({
          audioId,
          progress: 0,
          totalBytes: 0,
          downloadedBytes: 0,
          status: 'failed'
        });
      }
      
      // リスナーを削除
      this.progressListeners.delete(audioId);
      
      throw error;
    }
  }

  /**
   * 音声のダウンロード状況をチェック
   */
  static async isAudioDownloaded(audioId: string): Promise<boolean> {
    try {
      const downloadedAudios = await this.getDownloadedAudios();
      return downloadedAudios.some(audio => audio.audioId === audioId);
    } catch {
      return false;
    }
  }

  /**
   * ローカルファイルパスを取得
   */
  static async getLocalPath(audioId: string): Promise<string | null> {
    try {
      const downloadedAudios = await this.getDownloadedAudios();
      const audio = downloadedAudios.find(audio => audio.audioId === audioId);
      return audio?.localPath || null;
    } catch {
      return null;
    }
  }

  /**
   * ダウンロード済み音声を削除
   */
  static async removeDownload(audioId: string): Promise<void> {
    try {
      const localPath = await this.getLocalPath(audioId);
      
      if (localPath) {
        // ファイルを削除
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(localPath);
          console.log('🗑️ Local file deleted:', localPath);
        }
      }

      // ダウンロード情報を削除
      const downloadedAudios = await this.getDownloadedAudios();
      const updatedAudios = downloadedAudios.filter(audio => audio.audioId !== audioId);
      await AsyncStorage.setItem(this.DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedAudios));
      
      console.log('✅ Download info removed for:', audioId);
    } catch (error) {
      console.error('❌ Failed to remove download:', error);
      throw error;
    }
  }

  /**
   * 全ダウンロード済み音声を取得
   */
  static async getDownloadedAudios(): Promise<DownloadedAudio[]> {
    try {
      const stored = await AsyncStorage.getItem(this.DOWNLOADS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to get downloaded audios:', error);
      return [];
    }
  }

  /**
   * ダウンロード容量を取得
   */
  static async getTotalDownloadSize(): Promise<number> {
    try {
      const downloadedAudios = await this.getDownloadedAudios();
      return downloadedAudios.reduce((total, audio) => total + audio.fileSize, 0);
    } catch {
      return 0;
    }
  }

  /**
   * ダウンロードディレクトリを作成
   */
  private static async ensureDownloadDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.DOWNLOAD_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.DOWNLOAD_DIRECTORY, { intermediates: true });
        console.log('📁 Download directory created');
      }
    } catch (error) {
      console.error('❌ Failed to create download directory:', error);
      throw error;
    }
  }

  /**
   * ダウンロード情報を保存
   */
  private static async saveDownloadedAudio(downloadedAudio: DownloadedAudio): Promise<void> {
    try {
      const downloadedAudios = await this.getDownloadedAudios();
      
      // 既存のエントリを更新または追加
      const existingIndex = downloadedAudios.findIndex(audio => audio.audioId === downloadedAudio.audioId);
      if (existingIndex >= 0) {
        downloadedAudios[existingIndex] = downloadedAudio;
      } else {
        downloadedAudios.push(downloadedAudio);
      }
      
      await AsyncStorage.setItem(this.DOWNLOADS_STORAGE_KEY, JSON.stringify(downloadedAudios));
    } catch (error) {
      console.error('❌ Failed to save download info:', error);
      throw error;
    }
  }

  /**
   * ダウンロードをキャンセル (将来の実装用)
   */
  static async cancelDownload(audioId: string): Promise<void> {
    // 現在のDownloadResumableインスタンスを保持する仕組みが必要
    // 将来の機能拡張として実装予定
    this.progressListeners.delete(audioId);
    console.log('🚫 Download cancelled:', audioId);
  }

  /**
   * プログレスリスナーを登録
   */
  static addProgressListener(audioId: string, listener: (progress: DownloadProgress) => void): void {
    this.progressListeners.set(audioId, listener);
  }

  /**
   * プログレスリスナーを削除
   */
  static removeProgressListener(audioId: string): void {
    this.progressListeners.delete(audioId);
  }

  /**
   * フォーマットされたファイルサイズを取得
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default DownloadService;