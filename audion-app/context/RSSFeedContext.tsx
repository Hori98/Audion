/**
 * RSS Feed Context - データ共有・最適化のための Context
 * HomeタブとFeedタブでデータ取得を共通化し、重複を防ぐ
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { RSSFeedState, RSSFeedActions, useRSSFeed } from '../hooks/useRSSFeed';

// Context型定義
type RSSFeedContextType = (RSSFeedState & RSSFeedActions) | undefined;

// Context作成
const RSSFeedContext = createContext<RSSFeedContextType>(undefined);

// Provider Props
interface RSSFeedProviderProps {
  children: ReactNode;
}

/**
 * RSS Feed Provider - 全タブでデータを共有
 */
export function RSSFeedProvider({ children }: RSSFeedProviderProps) {
  // 1つのuseRSSFeedインスタンスで全体のデータを管理
  const rssData = useRSSFeed();
  
  return (
    <RSSFeedContext.Provider value={rssData}>
      {children}
    </RSSFeedContext.Provider>
  );
}

/**
 * RSS Feed Context Hook - 各コンポーネントで使用
 */
export function useRSSFeedContext(): RSSFeedState & RSSFeedActions {
  const context = useContext(RSSFeedContext);
  if (context === undefined) {
    throw new Error('useRSSFeedContext must be used within a RSSFeedProvider');
  }
  return context;
}