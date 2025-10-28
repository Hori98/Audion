/**
 * Trending Articles Page
 * トレンド記事一覧ページ - Homeセクションの「もっと見る」リンク先
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrendingFeed, SortOrder } from '../hooks/useTrendingFeed';
import { generateGenreTabs } from '../utils/genreUtils';
import { Genre } from '../types/rss';
import { Article } from '../services/ArticleService';
import { commonStyles } from '../styles/commonStyles';
import HorizontalTabs from '../components/HorizontalTabs';
import UnifiedArticleList from '../components/common/UnifiedArticleList';
import ArticleDetailModal from '../components/ArticleDetailModal';
import SkeletonComponents from '../components/SkeletonComponents';
import LoadMoreButton from '../components/LoadMoreButton';

export default function TrendingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    visibleArticles,
    loading,
    refreshing,
    error,
    selectedGenre,
    selectedSort,
    availableGenres,
    hasMore,
    setSelectedGenre,
    setSelectedSort,
    loadMore,
    refresh,
  } = useTrendingFeed();

  // Article detail modal state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);

  // Sort options (removed for simplified UX)
  // const sortTabs = [
  //   { id: 'popular', name: '人気順' },
  //   { id: 'latest', name: '新着順' },
  // ];

  const handleArticlePress = (article: Article) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
  };

  const handleCloseArticleModal = () => {
    setShowArticleModal(false);
    setSelectedArticle(null);
  };

  const handleGenreSelect = (tabId: string) => {
    setSelectedGenre(tabId as Genre);
  };

  // const handleSortSelect = (tabId: string) => {
  //   setSelectedSort(tabId as SortOrder);
  // };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>トレンド</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Skeleton Loading */}
        <SkeletonComponents.SkeletonFeedList />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>トレンド</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Error State */}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#666666" />
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refresh}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>トレンド</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Section */}
      <View>
        {/* Genre Filter */}
        <HorizontalTabs
          tabs={generateGenreTabs(availableGenres)}
          selectedTab={selectedGenre}
          onTabSelect={handleGenreSelect}
          style={commonStyles.filterSection}
        />
      </View>

      {/* Articles List */}
      {visibleArticles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trending-down" size={64} color="#666666" />
          <Text style={styles.emptyTitle}>記事がありません</Text>
          <Text style={styles.emptyMessage}>
            選択した条件に合うトレンド記事がありません。{'\n'}
            フィルターを変更してみてください。
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <UnifiedArticleList
            articles={visibleArticles}
            onArticlePress={handleArticlePress}
            refreshing={refreshing}
            onRefresh={refresh}
            mode="flatlist"
          />
          
          {/* Load More Button */}
          <LoadMoreButton
            visible={hasMore}
            onPress={loadMore}
          />
        </View>
      )}

      {/* Article Detail Modal */}
      <ArticleDetailModal
        visible={showArticleModal}
        article={selectedArticle}
        onClose={handleCloseArticleModal}
      />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 32,
  },
  
  // Content
  listContainer: {
    flex: 1,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});