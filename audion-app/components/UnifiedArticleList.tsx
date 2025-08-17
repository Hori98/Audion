import React, { memo } from 'react';
import { FlatList, RefreshControl, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Article } from '../types';
import UnifiedArticleCard from './UnifiedArticleCard';
import { Ionicons } from '@expo/vector-icons';

interface UnifiedArticleListProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  showActions?: boolean;
  selectedArticleIds?: Set<string>;
  onToggleSelection?: (article: Article) => void;
  onLike?: (article: Article) => void;
  onDislike?: (article: Article) => void;
  onArchive?: (article: Article) => void;
  onBookmark?: (article: Article) => void;
  likedArticles?: Set<string>;
  dislikedArticles?: Set<string>;
  archivedArticles?: Set<string>;
  bookmarkedArticles?: Set<string>;
  readingHistory?: Map<string, Date>;
  variant?: 'default' | 'compact' | 'detailed';
  emptyMessage?: string;
  showScrollIndicator?: boolean;
}

const UnifiedArticleList = memo(({
  articles,
  onArticlePress,
  refreshing = false,
  onRefresh,
  loading = false,
  showActions = false,
  selectedArticleIds,
  onToggleSelection,
  onLike,
  onDislike,
  onArchive,
  onBookmark,
  likedArticles = new Set(),
  dislikedArticles = new Set(),
  archivedArticles = new Set(),
  bookmarkedArticles = new Set(),
  readingHistory = new Map(),
  variant = 'default',
  emptyMessage = 'No articles available',
  showScrollIndicator = true,
}: UnifiedArticleListProps) => {
  const { theme } = useTheme();

  const renderArticleItem = ({ item: article }: { item: Article }) => (
    <UnifiedArticleCard
      article={article}
      onPress={onArticlePress}
      showActions={showActions}
      isSelected={selectedArticleIds?.has(article.id)}
      onToggleSelection={onToggleSelection}
      onLike={onLike}
      onDislike={onDislike}
      onArchive={onArchive}
      onBookmark={onBookmark}
      isLiked={likedArticles.has(article.id)}
      isDisliked={dislikedArticles.has(article.id)}
      isArchived={archivedArticles.has(article.id)}
      isBookmarked={bookmarkedArticles.has(article.id)}
      isRead={readingHistory.has(article.id)}
      variant={variant}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="newspaper-outline" size={48} color={theme.textMuted} />
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        {emptyMessage}
      </Text>
      {!loading && onRefresh && (
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
          Pull down to refresh
        </Text>
      )}
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
        Loading articles...
      </Text>
    </View>
  );

  if (loading && articles.length === 0) {
    return renderLoadingState();
  }

  return (
    <FlatList
      data={articles}
      renderItem={renderArticleItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={showScrollIndicator}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        ) : undefined
      }
      ListEmptyComponent={renderEmptyState}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={15}
      windowSize={10}
      getItemLayout={(data, index) => ({
        length: variant === 'compact' ? 80 : variant === 'detailed' ? 200 : 140,
        offset: (variant === 'compact' ? 80 : variant === 'detailed' ? 200 : 140) * index,
        index,
      })}
      contentContainerStyle={[
        articles.length === 0 && styles.emptyContentContainer
      ]}
    />
  );
});

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default UnifiedArticleList;