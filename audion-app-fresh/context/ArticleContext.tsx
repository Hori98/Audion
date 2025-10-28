/**
 * Article Context - 記事の既読ステータス管理
 * AsyncStorageを使用して既読状態を永続化
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ArticleContextType {
  readArticleIds: string[];
  isArticleRead: (articleId: string) => boolean;
  toggleReadStatus: (articleId: string) => Promise<void>;
  markAsRead: (articleId: string) => Promise<void>;
  markAsUnread: (articleId: string) => Promise<void>;
  clearAllReadStatus: () => Promise<void>;
  isReadMode: boolean;
  toggleReadMode: () => void;
}

const ArticleContext = createContext<ArticleContextType | undefined>(undefined);

const STORAGE_KEY = '@audion_read_articles';

interface ArticleProviderProps {
  children: ReactNode;
}

export function ArticleProvider({ children }: ArticleProviderProps) {
  const [readArticleIds, setReadArticleIds] = useState<string[]>([]);
  const [isReadMode, setIsReadMode] = useState(false);

  // AsyncStorageから既読データを読み込み
  const loadReadArticles = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const readIds = JSON.parse(stored);
        setReadArticleIds(readIds);
      }
    } catch (error) {
      console.error('Failed to load read articles:', error);
    }
  };

  // AsyncStorageに既読データを保存
  const saveReadArticles = async (readIds: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
    } catch (error) {
      console.error('Failed to save read articles:', error);
    }
  };

  // 初期化時にデータを読み込み
  useEffect(() => {
    loadReadArticles();
  }, []);

  // 記事が既読かどうかを確認
  const isArticleRead = (articleId: string): boolean => {
    return readArticleIds.includes(articleId);
  };

  // 既読ステータスを切り替え
  const toggleReadStatus = async (articleId: string) => {
    const newReadIds = readArticleIds.includes(articleId)
      ? readArticleIds.filter(id => id !== articleId)
      : [...readArticleIds, articleId];

    setReadArticleIds(newReadIds);
    await saveReadArticles(newReadIds);
  };

  // 既読としてマーク
  const markAsRead = async (articleId: string) => {
    if (!readArticleIds.includes(articleId)) {
      const newReadIds = [...readArticleIds, articleId];
      setReadArticleIds(newReadIds);
      await saveReadArticles(newReadIds);
    }
  };

  // 未読としてマーク
  const markAsUnread = async (articleId: string) => {
    const newReadIds = readArticleIds.filter(id => id !== articleId);
    setReadArticleIds(newReadIds);
    await saveReadArticles(newReadIds);
  };

  // 全ての既読ステータスをクリア
  const clearAllReadStatus = async () => {
    setReadArticleIds([]);
    await saveReadArticles([]);
  };

  // 既読モードの切り替え
  const toggleReadMode = () => {
    setIsReadMode(!isReadMode);
  };

  const value: ArticleContextType = {
    readArticleIds,
    isArticleRead,
    toggleReadStatus,
    markAsRead,
    markAsUnread,
    clearAllReadStatus,
    isReadMode,
    toggleReadMode,
  };

  return (
    <ArticleContext.Provider value={value}>
      {children}
    </ArticleContext.Provider>
  );
}

export function useArticle() {
  const context = useContext(ArticleContext);
  if (context === undefined) {
    throw new Error('useArticle must be used within an ArticleProvider');
  }
  return context;
}

export default ArticleContext;