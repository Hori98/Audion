/**
 * Articles Screen - Container Component
 * カスタムフックとUIコンポーネントを接続するだけの薄いレイヤー
 * UI刷新時も変更不要（FeedUIのみ差し替え）
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useRSSFeedContext } from '../../context/RSSFeedContext';
import { FeedUI } from '../../components/FeedUI';
import SearchModal from '../../components/SearchModal';

export default function ArticlesScreen() {
  // 1. 認証情報を取得
  const { user } = useAuth();
  const router = useRouter();
  
  // 2. ビジネスロジックを取得（共通化されたContext経由）
  const rssState = useRSSFeedContext();
  
  // 3. 検索機能の状態管理
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  const handleSearchResult = (result: any) => {
    switch (result.type) {
      case 'article':
        Alert.alert('記事選択', `${result.title}を表示します`);
        break;
      case 'genre':
        rssState.setSelectedGenre(result.id || 'all');
        break;
      case 'source':
        rssState.setSelectedSource(result.id || 'all');
        break;
      default:
        break;
    }
  };

  
  // 4. UIコンポーネントにpropsとして渡すだけ
  return (
    <>
      <FeedUI
        user={user}
        {...rssState}
        onSearchPress={() => setShowSearchModal(true)}
      />
      
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onResultPress={handleSearchResult}
      />
    </>
  );
}