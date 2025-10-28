/**
 * RSS Feed Context - 軽量データ共有のための Context
 * Settings/Schedule画面でuserSources共有用（useUserFeedベース）
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useUserFeed } from '../hooks/useUserFeed';
import { UserRSSSource } from '../services/RSSSourceService';

// Context型定義（最小限の互換性維持）
interface RSSFeedContextType {
  userSources: UserRSSSource[];
  fetchRSSData: () => Promise<void>;
}

// Context作成
const RSSFeedContext = createContext<RSSFeedContextType | undefined>(undefined);

// Provider Props
interface RSSFeedProviderProps {
  children: ReactNode;
}

/**
 * RSS Feed Provider - Settings/Schedule用軽量データ共有
 */
export function RSSFeedProvider({ children }: RSSFeedProviderProps) {
  // useUserFeedベースで必要最小限のデータを提供
  const { userSources, fetchUserSources } = useUserFeed();
  
  const contextValue: RSSFeedContextType = {
    userSources,
    fetchRSSData: fetchUserSources, // Settings互換のためのエイリアス
  };
  
  return (
    <RSSFeedContext.Provider value={contextValue}>
      {children}
    </RSSFeedContext.Provider>
  );
}

/**
 * RSS Feed Context Hook - Settings/Schedule画面で使用
 */
export function useRSSFeedContext(): RSSFeedContextType {
  const context = useContext(RSSFeedContext);
  if (context === undefined) {
    throw new Error('useRSSFeedContext must be used within a RSSFeedProvider');
  }
  return context;
}