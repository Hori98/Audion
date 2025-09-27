/**
 * Clean Feed UI Component - プレゼンテーショナル層
 * propsで渡されたデータの表示のみ担当（Context依存なし）
 * ユーザー登録RSSソースからの記事表示専用
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  View,
  Text,
  Alert,
} from 'react-native';
import { Article } from '../services/ArticleService';
import { UserRSSSource } from '../services/RSSSourceService';
import { Genre } from '../types/rss';
import { generateGenreTabs } from '../utils/genreUtils';
import HorizontalTabs from './HorizontalTabs';
import UnifiedHeader from './UnifiedHeader';
import ArticleCard from './ArticleCard';
import ArticleDetailModal from './ArticleDetailModal';

interface CleanFeedUIProps {
  // Core data
  user: any;
  articles: Article[];
  userSources: UserRSSSource[];
  loading: boolean;
  refreshing: boolean;

  // Filter state
  selectedGenre: Genre;
  selectedSource: string;
  selectedReadStatus: string;
  availableGenres: Genre[];

  // Actions
  onRefresh: () => void;
  setSelectedGenre: (genre: Genre) => void;
  setSelectedSource: (source: string) => void;
  setSelectedReadStatus?: (status: string) => void;
  onSearchPress?: () => void;
  markArticleAsRead?: (articleId: string) => void;
}


export const CleanFeedUI: React.FC<CleanFeedUIProps> = ({
  user,
  articles,
  userSources,
  loading,
  refreshing,
  selectedGenre,
  selectedSource,
  selectedReadStatus,
  availableGenres,
  onRefresh,
  setSelectedGenre,
  setSelectedSource,
  setSelectedReadStatus,
  onSearchPress,
  markArticleAsRead,
}) => {
  // Local state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);

  const handleArticlePress = (article: Article) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
    // 記事を開いた時に既読としてマーク
    if (markArticleAsRead) {
      markArticleAsRead(article.id);
    }
  };

  const handleCloseArticleModal = () => {
    setShowArticleModal(false);
    setSelectedArticle(null);
  };

  // ソースフィルタ用のソース一覧（アクティブソースのみ）
  const activeUserSources = userSources.filter(source => source.is_active);
  const sourceOptions = [
    { id: 'all', name: 'すべて' },
    ...activeUserSources.map(source => ({
      id: source.display_name || source.name,
      name: source.display_name || source.name
    }))
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UnifiedHeader
        onSearchPress={onSearchPress}
        onReadStatusPress={setSelectedReadStatus}
        currentReadStatus={selectedReadStatus}
      />

      {/* フィルターセクション */}
      <View style={styles.filterSection}>
        {/* ソースフィルター */}
        <HorizontalTabs
          tabs={sourceOptions}
          selectedTab={selectedSource}
          onTabSelect={setSelectedSource}
        />

        {/* ジャンルフィルター（動的表示） */}
        <HorizontalTabs
          tabs={generateGenreTabs(availableGenres)}
          selectedTab={selectedGenre}
          onTabSelect={setSelectedGenre}
        />
      </View>

      {/* 記事一覧 */}
      {articles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeUserSources.length === 0
              ? 'RSSソースが登録されていません。設定からRSSソースを追加してください。'
              : '条件に合う記事がありません。フィルターを変更してみてください。'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() => handleArticlePress(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.articlesList}
        />
      )}

      {/* 記事詳細モーダル */}
      <ArticleDetailModal
        visible={showArticleModal}
        article={selectedArticle}
        onClose={handleCloseArticleModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  articlesList: {
    paddingVertical: 8,
  },
});