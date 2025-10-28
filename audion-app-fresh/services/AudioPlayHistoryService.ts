/**
 * Audio Play History Service
 * 音声の再生履歴を永続的に保存・管理する
 * キャッシュクリアでも削除されないようにAsyncStorageを使用
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@audion_audio_play_history';

interface PlayHistoryEntry {
  audioId: string;
  firstPlayedAt: string;
  lastPlayedAt: string;
  playCount: number;
}

class AudioPlayHistoryService {
  private playHistory: Map<string, PlayHistoryEntry> = new Map();
  private initialized = false;

  /**
   * サービスを初期化（AsyncStorageから履歴を読み込み）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const savedHistory = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed: PlayHistoryEntry[] = JSON.parse(savedHistory);
        parsed.forEach(entry => {
          this.playHistory.set(entry.audioId, entry);
        });
      }
      this.initialized = true;
    } catch (error) {
      console.error('[PLAY_HISTORY] Failed to initialize:', error);
      this.initialized = true; // エラーでも初期化済みとして続行
    }
  }

  /**
   * 音声の再生を記録
   */
  async recordPlay(audioId: string): Promise<void> {
    await this.initialize();

    const now = new Date().toISOString();
    const existing = this.playHistory.get(audioId);

    if (existing) {
      // 既存エントリを更新
      existing.lastPlayedAt = now;
      existing.playCount += 1;
    } else {
      // 新規エントリを作成
      this.playHistory.set(audioId, {
        audioId,
        firstPlayedAt: now,
        lastPlayedAt: now,
        playCount: 1,
      });
    }

    await this.saveToStorage();
  }

  /**
   * 音声が再生されたことがあるかチェック
   */
  async hasBeenPlayed(audioId: string): Promise<boolean> {
    await this.initialize();
    return this.playHistory.has(audioId);
  }

  /**
   * 音声の再生回数を取得
   */
  async getPlayCount(audioId: string): Promise<number> {
    await this.initialize();
    return this.playHistory.get(audioId)?.playCount || 0;
  }

  /**
   * 音声の最後の再生日時を取得
   */
  async getLastPlayedAt(audioId: string): Promise<string | null> {
    await this.initialize();
    return this.playHistory.get(audioId)?.lastPlayedAt || null;
  }

  /**
   * 複数の音声の再生状態を一括チェック
   */
  async getPlayedStatus(audioIds: string[]): Promise<{ [audioId: string]: boolean }> {
    await this.initialize();
    const result: { [audioId: string]: boolean } = {};
    audioIds.forEach(id => {
      result[id] = this.playHistory.has(id);
    });
    return result;
  }

  /**
   * 再生履歴をクリア（デバッグ用）
   */
  async clearHistory(): Promise<void> {
    this.playHistory.clear();
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 履歴をAsyncStorageに保存
   */
  private async saveToStorage(): Promise<void> {
    try {
      const historyArray = Array.from(this.playHistory.values());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(historyArray));
    } catch (error) {
      console.error('[PLAY_HISTORY] Failed to save to storage:', error);
    }
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    totalPlayedAudios: number;
    totalPlays: number;
    oldestPlay: string | null;
    newestPlay: string | null;
  }> {
    await this.initialize();
    
    const entries = Array.from(this.playHistory.values());
    const totalPlays = entries.reduce((sum, entry) => sum + entry.playCount, 0);
    
    let oldestPlay: string | null = null;
    let newestPlay: string | null = null;
    
    if (entries.length > 0) {
      oldestPlay = entries.reduce((oldest, entry) => 
        entry.firstPlayedAt < oldest ? entry.firstPlayedAt : oldest, 
        entries[0].firstPlayedAt
      );
      newestPlay = entries.reduce((newest, entry) => 
        entry.lastPlayedAt > newest ? entry.lastPlayedAt : newest, 
        entries[0].lastPlayedAt
      );
    }

    return {
      totalPlayedAudios: this.playHistory.size,
      totalPlays,
      oldestPlay,
      newestPlay,
    };
  }
}

export const audioPlayHistoryService = new AudioPlayHistoryService();
export default audioPlayHistoryService;