/**
 * Trending Carousel Component
 * エンゲージメントスコアが高いトレンド記事の横スクロールカルーセル
 * CompactCardを使用した軽量で高速なカルーセル実装
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Article } from '../services/ArticleService';
import CompactCard from './CompactCard';
import { commonStyles, SPACING } from '../styles/commonStyles';

interface TrendingCarouselProps {
  articles: Article[];
  loading?: boolean;
  onArticlePress: (article: Article) => void;
  onSeeMore?: () => void;
  maxItems?: number;
}

export default function TrendingCarousel({
  articles,
  loading = false,
  onArticlePress,
  onSeeMore,
  maxItems = 8,
}: TrendingCarouselProps) {

  const displayArticles = React.useMemo(() => {
    if (articles.length === 0) return [];
    return articles.slice(0, maxItems);
  }, [articles, maxItems]);

  const hasMore = articles.length > maxItems;

  const renderTrendingCard = ({ item: article }: { item: Article }) => (
    <View style={styles.cardWrapper}>
      <CompactCard
        article={article}
        variant="trending"
        size="trending"
        onPress={onArticlePress}
      />
    </View>
  );

  const renderSeeMoreCard = () => (
    <TouchableOpacity
      style={styles.seeMoreCard}
      onPress={onSeeMore}
      activeOpacity={0.8}
    >
      <View style={styles.seeMoreContent}>
        <Ionicons name="chevron-forward-circle" size={32} color="#FF6B35" />
        <Text style={styles.seeMoreText}>もっと見る</Text>
        <Text style={styles.seeMoreCount}>
          +{articles.length - maxItems}件
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="trending-up" size={24} color="#666666" />
          <Text style={styles.loadingText}>トレンド記事を読み込み中...</Text>
        </View>
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="trending-down" size={32} color="#666666" />
          <Text style={styles.emptyText}>トレンド記事がありません</Text>
          <Text style={styles.emptySubText}>
            しばらくしてから確認してください
          </Text>
        </View>
      </View>
    );
  }

  const flatListData = hasMore && onSeeMore
    ? [...displayArticles, { id: 'see-more', isSpecial: true }]
    : displayArticles;

  return (
    <View style={styles.container}>
      <FlatList
        data={flatListData}
        renderItem={({ item }) => {
          if ('isSpecial' in item && item.isSpecial) {
            return renderSeeMoreCard();
          }
          return renderTrendingCard({ item: item as Article });
        }}
        keyExtractor={(item, index) =>
          'isSpecial' in item ? 'see-more' : `${item.id}-${index}`
        }
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        snapToInterval={174} // TEMP: width 168 + margin左右(3+3)=174 (2.x cards visible)
        decelerationRate="fast"
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    color: '#888888',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubText: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  flatListContent: {
    paddingLeft: SPACING.SCREEN_HORIZONTAL, // match AudioRecommendation left
    paddingRight: SPACING.SCREEN_HORIZONTAL,
  },
  cardWrapper: {
    marginRight: 0,
  },
  seeMoreCard: {
    width: 160,
    height: 200,
    marginRight: 6,
    borderRadius: 12,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  seeMoreContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  seeMoreText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  seeMoreCount: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
  },
});
