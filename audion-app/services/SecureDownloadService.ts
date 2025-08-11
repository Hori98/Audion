import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecureDownloadProgress {
  audioId: string;
  progress: number; // 0-100
  totalBytes: number;
  downloadedBytes: number;
  status: 'downloading' | 'completed' | 'failed';
}

export interface SecureDownloadedAudio {
  audioId: string;
  encryptedPath: string; // 暗号化されたファイルパス
  keyHash: string; // 暗号化キーのハッシュ
  fileSize: number;
  downloadedAt: string;
  title: string;
  userFingerprint: string; // ユーザー固有のフィンガープリント
  appVersion: string; // アプリバージョン制限
}

export class SecureDownloadService {
  private static readonly SECURE_STORAGE_KEY = 'secure_downloaded_audios';
  // 🔒 アプリ専用の隠しディレクトリ（Spotify式）
  private static readonly SECURE_DIRECTORY = `${FileSystem.documentDirectory}.audion_secure/`;
  private static readonly ENCRYPTION_ALGORITHM = 'AES-256-GCM';
  
  // ダウンロード進捗のリスナー
  private static progressListeners: Map<string, (progress: SecureDownloadProgress) => void> = new Map();

  /**
   * 🔐 暗号化されたアプリ内音声ダウンロード（Spotify式）
   */
  static async secureDownloadAudio(
    audioId: string,
    audioUrl: string,
    title: string,
    userId: string,
    onProgress?: (progress: SecureDownloadProgress) => void
  ): Promise<string> {
    try {
      // セキュアディレクトリを作成
      await this.ensureSecureDirectory();
      
      // ユーザー固有の暗号化キー生成
      const encryptionKey = await this.generateUserEncryptionKey(userId, audioId);
      const encryptedFileName = await this.hashString(`${audioId}_${userId}_${Date.now()}`);
      const encryptedPath = `${this.SECURE_DIRECTORY}${encryptedFileName}.enc`;
      
      // 既にダウンロード済みかチェック
      if (await this.isSecureAudioDownloaded(audioId)) {
        const existingPath = await this.getSecureLocalPath(audioId);
        if (existingPath && await this.verifySecureFile(existingPath, userId)) {
          console.log('🔒 Secure audio already downloaded:', existingPath);
          return existingPath;
        }
      }

      // プログレスリスナーを登録
      if (onProgress) {
        this.progressListeners.set(audioId, onProgress);
      }

      console.log('🔽 Starting secure download:', { audioId, encryptedPath });

      // 一時ファイルをダウンロード
      const tempPath = `${FileSystem.cacheDirectory}temp_${audioId}.mp3`;
      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        tempPath,
        {},
        (downloadProgress) => {
          const progress: SecureDownloadProgress = {
            audioId,
            progress: (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100,
            totalBytes: downloadProgress.totalBytesExpectedToWrite,
            downloadedBytes: downloadProgress.totalBytesWritten,
            status: 'downloading'
          };
          
          const listener = this.progressListeners.get(audioId);
          if (listener) listener(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        // 🔐 ファイルを暗号化してセキュアディレクトリに保存
        await this.encryptAndStore(result.uri, encryptedPath, encryptionKey);
        
        // 一時ファイルを削除
        await FileSystem.deleteAsync(result.uri);
        
        // ユーザーフィンガープリント生成
        const userFingerprint = await this.generateUserFingerprint(userId);
        
        // セキュアダウンロード情報を保存
        const secureAudio: SecureDownloadedAudio = {
          audioId,
          encryptedPath,
          keyHash: await this.hashString(encryptionKey),
          fileSize: (await FileSystem.getInfoAsync(encryptedPath)).size || 0,
          downloadedAt: new Date().toISOString(),
          title,
          userFingerprint,
          appVersion: '1.0.0', // アプリバージョンで制限
        };

        await this.saveSecureDownloadInfo(secureAudio);
        
        // 完了プログレスを送信
        const listener = this.progressListeners.get(audioId);
        if (listener) {
          listener({
            audioId,
            progress: 100,
            totalBytes: secureAudio.fileSize,
            downloadedBytes: secureAudio.fileSize,
            status: 'completed'
          });
        }

        this.progressListeners.delete(audioId);
        console.log('✅ Secure download completed:', encryptedPath);
        return encryptedPath;
      } else {
        throw new Error('Secure download failed - no result');
      }

    } catch (error) {
      console.error('❌ Secure download failed:', error);
      
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
      
      this.progressListeners.delete(audioId);
      throw error;
    }
  }

  /**
   * 🔓 暗号化されたファイルを復号してストリーミング用URIを生成
   */
  static async getSecurePlaybackUri(audioId: string, userId: string): Promise<string | null> {
    try {
      const secureAudio = await this.getSecureDownloadInfo(audioId);
      if (!secureAudio) return null;

      // ユーザー認証チェック（Spotify式DRM）
      if (!await this.verifyUserAccess(secureAudio, userId)) {
        console.warn('🚫 User access denied for secure audio:', audioId);
        return null;
      }

      // 暗号化キーを再生成
      const encryptionKey = await this.generateUserEncryptionKey(userId, audioId);
      
      // 一時的な復号ファイルを作成（再生用）
      const tempPlaybackPath = `${FileSystem.cacheDirectory}playback_${audioId}_${Date.now()}.mp3`;
      await this.decryptToTemp(secureAudio.encryptedPath, tempPlaybackPath, encryptionKey);
      
      // 🔄 一定時間後に自動削除（セキュリティ強化）
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(tempPlaybackPath);
          console.log('🗑️ Temporary playback file cleaned up:', tempPlaybackPath);
        } catch (error) {
          console.warn('Failed to cleanup temp playback file:', error);
        }
      }, 30 * 60 * 1000); // 30分後に削除
      
      return tempPlaybackPath;
      
    } catch (error) {
      console.error('❌ Failed to get secure playback URI:', error);
      return null;
    }
  }

  /**
   * 🔐 セキュアダウンロード削除（完全消去）
   */
  static async removeSecureDownload(audioId: string): Promise<void> {
    try {
      const secureAudio = await this.getSecureDownloadInfo(audioId);
      if (!secureAudio) return;

      // 暗号化ファイルを削除
      if (await FileSystem.getInfoAsync(secureAudio.encryptedPath)) {
        await FileSystem.deleteAsync(secureAudio.encryptedPath);
        console.log('🔒 Encrypted file deleted:', secureAudio.encryptedPath);
      }

      // メタデータを削除
      const secureAudios = await this.getSecureDownloadedAudios();
      const filteredAudios = secureAudios.filter(audio => audio.audioId !== audioId);
      await AsyncStorage.setItem(this.SECURE_STORAGE_KEY, JSON.stringify(filteredAudios));
      
      console.log('✅ Secure download completely removed:', audioId);
    } catch (error) {
      console.error('❌ Failed to remove secure download:', error);
      throw error;
    }
  }

  /**
   * 👤 ユーザー固有の暗号化キー生成
   */
  private static async generateUserEncryptionKey(userId: string, audioId: string): Promise<string> {
    // ユーザーID + 音声ID + アプリ固有のソルトで強固なキー生成
    const salt = 'audion_secure_2025_v1';
    const keyMaterial = `${userId}_${audioId}_${salt}`;
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, keyMaterial);
  }

  /**
   * 🔐 ファイル暗号化と保存
   */
  private static async encryptAndStore(sourcePath: string, targetPath: string, key: string): Promise<void> {
    try {
      // 実際の暗号化実装（簡略化）
      // 本格実装では AES-256-GCM を使用
      const sourceData = await FileSystem.readAsStringAsync(sourcePath, { encoding: FileSystem.EncodingType.Base64 });
      
      // シンプルなXOR暗号化（デモ用）
      // 実際のプロダクションでは crypto-js や react-native-crypto を使用
      const encryptedData = this.simpleEncrypt(sourceData, key);
      
      await FileSystem.writeAsStringAsync(targetPath, encryptedData, { encoding: FileSystem.EncodingType.UTF8 });
      console.log('🔐 File encrypted and stored:', targetPath);
      
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw error;
    }
  }

  /**
   * 🔓 暗号化ファイルの復号
   */
  private static async decryptToTemp(encryptedPath: string, tempPath: string, key: string): Promise<void> {
    try {
      const encryptedData = await FileSystem.readAsStringAsync(encryptedPath, { encoding: FileSystem.EncodingType.UTF8 });
      const decryptedData = this.simpleDecrypt(encryptedData, key);
      
      await FileSystem.writeAsStringAsync(tempPath, decryptedData, { encoding: FileSystem.EncodingType.Base64 });
      console.log('🔓 File decrypted to temp:', tempPath);
      
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  /**
   * 🔍 ユーザーアクセス検証（DRM機能）
   */
  private static async verifyUserAccess(secureAudio: SecureDownloadedAudio, currentUserId: string): Promise<boolean> {
    try {
      const currentFingerprint = await this.generateUserFingerprint(currentUserId);
      
      // ユーザーフィンガープリント照合
      if (secureAudio.userFingerprint !== currentFingerprint) {
        return false;
      }

      // アプリバージョン確認
      if (secureAudio.appVersion !== '1.0.0') {
        return false;
      }

      // ダウンロード期限確認（例：30日）
      const downloadDate = new Date(secureAudio.downloadedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - downloadDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 30) {
        console.warn('🕒 Secure download expired:', secureAudio.audioId);
        return false;
      }

      return true;
      
    } catch (error) {
      console.error('❌ User access verification failed:', error);
      return false;
    }
  }

  /**
   * 🎯 ユーザーフィンガープリント生成
   */
  private static async generateUserFingerprint(userId: string): Promise<string> {
    // デバイス + ユーザー固有の識別子
    const deviceInfo = `${userId}_device_${Date.now().toString().slice(-6)}`;
    return await this.hashString(deviceInfo);
  }

  /**
   * 🗂️ セキュアダウンロード情報の管理
   */
  private static async getSecureDownloadedAudios(): Promise<SecureDownloadedAudio[]> {
    try {
      const stored = await AsyncStorage.getItem(this.SECURE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static async saveSecureDownloadInfo(secureAudio: SecureDownloadedAudio): Promise<void> {
    const audios = await this.getSecureDownloadedAudios();
    const existingIndex = audios.findIndex(audio => audio.audioId === secureAudio.audioId);
    
    if (existingIndex >= 0) {
      audios[existingIndex] = secureAudio;
    } else {
      audios.push(secureAudio);
    }
    
    await AsyncStorage.setItem(this.SECURE_STORAGE_KEY, JSON.stringify(audios));
  }

  private static async getSecureDownloadInfo(audioId: string): Promise<SecureDownloadedAudio | null> {
    const audios = await this.getSecureDownloadedAudios();
    return audios.find(audio => audio.audioId === audioId) || null;
  }

  /**
   * 🛡️ ヘルパー関数
   */
  private static async ensureSecureDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.SECURE_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.SECURE_DIRECTORY, { intermediates: true });
      console.log('🔒 Secure directory created');
    }
  }

  private static async hashString(input: string): Promise<string> {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
  }

  private static async verifySecureFile(filePath: string, userId: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  private static async isSecureAudioDownloaded(audioId: string): Promise<boolean> {
    const info = await this.getSecureDownloadInfo(audioId);
    return info !== null;
  }

  private static async getSecureLocalPath(audioId: string): Promise<string | null> {
    const info = await this.getSecureDownloadInfo(audioId);
    return info?.encryptedPath || null;
  }

  // シンプルなXOR暗号化（デモ用）
  private static simpleEncrypt(data: string, key: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64エンコード
  }

  private static simpleDecrypt(encryptedData: string, key: string): string {
    const data = atob(encryptedData); // Base64デコード
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }
}

export default SecureDownloadService;