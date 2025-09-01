/**
 * useReadingHistory - 既読履歴管理のカスタムフック
 * HomeタブとFeedタブ間でロジック共通化を実現
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const READING_HISTORY_KEY = 'reading_history';

export const useReadingHistory = () => {
  const [readingHistory, setReadingHistory] = useState<Map<string, Date>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // AsyncStorage から既読履歴を読み込み
  const loadReadingHistoryFromStorage = useCallback(async (): Promise<Map<string, Date>> => {
    try {
      const historyJson = await AsyncStorage.getItem(READING_HISTORY_KEY);
      if (historyJson) {
        const historyArray: [string, string][] = JSON.parse(historyJson);
        const history = new Map(
          historyArray.map(([id, dateStr]) => [id, new Date(dateStr)])
        );
        console.log(`useReadingHistory: Loaded ${history.size} entries from storage`);
        return history;
      }
      return new Map();
    } catch (error) {
      console.error('useReadingHistory: Error loading reading history:', error);
      return new Map();
    }
  }, []);

  // 既読履歴を AsyncStorage に保存
  const saveReadingHistoryToStorage = useCallback(async (history: Map<string, Date>) => {
    try {
      const historyArray = Array.from(history.entries()).map(([id, date]) => [
        id,
        date.toISOString(),
      ]);
      await AsyncStorage.setItem(READING_HISTORY_KEY, JSON.stringify(historyArray));
      console.log(`useReadingHistory: Saved ${historyArray.length} entries to storage`);
    } catch (error) {
      console.error('useReadingHistory: Error saving reading history:', error);
    }
  }, []);

  // 初期化時に既読履歴をロード
  useEffect(() => {
    const initializeHistory = async () => {
      setIsLoading(true);
      const history = await loadReadingHistoryFromStorage();
      setReadingHistory(history);
      setIsLoading(false);
    };

    initializeHistory();
  }, [loadReadingHistoryFromStorage]);

  // 記事を既読としてマーク
  const markAsRead = useCallback(async (articleId: string, readAt: Date = new Date()) => {
    const newHistory = new Map(readingHistory);
    newHistory.set(articleId, readAt);
    setReadingHistory(newHistory);
    
    // 即座に永続化
    await saveReadingHistoryToStorage(newHistory);
    console.log(`useReadingHistory: Marked article ${articleId} as read. History size: ${newHistory.size}`);
  }, [readingHistory, saveReadingHistoryToStorage]);

  // 記事が既読かチェック
  const isRead = useCallback((articleId: string): boolean => {
    return readingHistory.has(articleId);
  }, [readingHistory]);

  // 今週読んだ記事かチェック
  const isReadThisWeek = useCallback((articleId: string): boolean => {
    const readDate = readingHistory.get(articleId);
    if (!readDate) return false;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return readDate >= weekAgo;
  }, [readingHistory]);

  // 既読履歴をクリア
  const clearReadingHistory = useCallback(async () => {
    setReadingHistory(new Map());
    await AsyncStorage.removeItem(READING_HISTORY_KEY);
    console.log('useReadingHistory: Cleared all reading history');
  }, []);

  // 統計情報取得
  const getStats = useCallback(() => {
    const totalRead = readingHistory.size;
    const thisWeekRead = Array.from(readingHistory.values()).filter(date => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }).length;

    return {
      totalRead,
      thisWeekRead,
    };
  }, [readingHistory]);

  return {
    readingHistory,
    isLoading,
    markAsRead,
    isRead,
    isReadThisWeek,
    clearReadingHistory,
    getStats,
    // 内部関数も公開（既存コードとの互換性のため）
    loadReadingHistoryFromStorage,
    saveReadingHistoryToStorage,
  };
};

export default useReadingHistory;