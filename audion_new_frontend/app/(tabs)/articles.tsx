/**
 * Articles Screen - Container Component
 * カスタムフックとUIコンポーネントを接続するだけの薄いレイヤー
 * UI刷新時も変更不要（FeedUIのみ差し替え）
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRSSFeed } from '../../hooks/useRSSFeed';
import { FeedUI } from '../../components/FeedUI';

export default function ArticlesScreen() {
  // 1. 認証情報を取得
  const { user } = useAuth();
  
  // 2. ビジネスロジックを取得（カスタムフック）
  const rssState = useRSSFeed();
  
  // 3. UIコンポーネントにpropsとして渡すだけ
  return (
    <FeedUI
      user={user}
      {...rssState}
    />
  );
}