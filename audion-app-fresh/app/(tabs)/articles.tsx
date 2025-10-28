/**
 * Feed Screen (articles.tsx)
 * フィードタブ - ユーザー登録RSSソースからの記事表示
 *
 * 機能: RSS記事一覧、ジャンル・ソースフィルタリング、記事読み上げ音声生成
 * Note: カスタムフックとUIコンポーネントを接続するコンテナ層
 */

import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useUserFeed } from '../../hooks/useUserFeed';
import { CleanFeedUI } from '../../components/CleanFeedUI';
import SearchModal from '../../components/SearchModal';

export default function ArticlesScreen() {
  // 1. 認証情報を取得
  const { user } = useAuth();
  const router = useRouter();
  
  // 2. FEEDタブ専用：ユーザー登録RSSからの記事データを取得
  const rssState = useUserFeed();
  
  // 3. 検索機能の状態管理
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  const handleSearchResult = (result: any) => {
    switch (result.type) {
      case 'article':
        Alert.alert('記事選択', `${result.title}を表示します`);
        break;
      case 'genre':
        rssState.setSelectedGenre(result.id || 'すべて');
        break;
      case 'source':
        rssState.setSelectedSource(result.id || 'all');
        break;
      default:
        break;
    }
  };


  // 4. UIコンポーネントにpropsとして渡すだけ
  // CleanFeedUI には useUserFeed から取得した全データをpropsで渡す
  return (
    <>
      <CleanFeedUI
        user={user}
        articles={rssState.filteredArticles}
        userSources={rssState.userSources}
        loading={rssState.loading}
        refreshing={rssState.refreshing}
        selectedGenre={rssState.selectedGenre}
        selectedSource={rssState.selectedSource}
        selectedReadStatus={rssState.selectedReadStatus}
        availableGenres={rssState.availableGenres}
        onRefresh={rssState.refreshArticles}
        setSelectedGenre={rssState.setSelectedGenre}
        setSelectedSource={rssState.setSelectedSource}
        setSelectedReadStatus={rssState.setSelectedReadStatus}
        onSearchPress={() => setShowSearchModal(true)}
        markArticleAsRead={rssState.markArticleAsRead}
      />

      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onResultPress={handleSearchResult}
      />
    </>
  );
}
