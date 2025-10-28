/**
 * Personalized Grid Component
 * ユーザーの嗜好に基づいたパーソナライズ記事のグリッド表示
 * CompactCardを使用して2列のグリッドレイアウトを構成
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Article } from '../services/ArticleService';
import CompactCard from './CompactCard';
import { commonStyles, SPACING } from '../styles/commonStyles';
import { UI_FLAGS } from '../config/uiFlags';

interface PersonalizedGridProps {
  articles: Article[];
  loading?: boolean;
  onArticlePress: (article: Article) => void;
  onSeeMore?: () => void;
  maxItems?: number;
}

export default function PersonalizedGrid({
  articles,
  loading = false,
  onArticlePress,
  onSeeMore,
  maxItems = 4,
}: PersonalizedGridProps) {

  const displayArticles = articles.slice(0, 4);
  const hasMore = articles.length > maxItems;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>パーソナライズ記事を準備中...</Text>
        </View>
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={32} color="#666666" />
          <Text style={styles.emptyText}>パーソナライズ記事がありません</Text>
          <Text style={styles.emptySubText}>
            記事を読んで好みを学習させましょう
          </Text>
        </View>
      </View>
    );
  }


  const renderGrid = () => {
    // 2セットの縦長カードを2列で表示
    const leftColumn = [displayArticles[0], displayArticles[1]]; // 左セット（上下）
    const rightColumn = [displayArticles[2], displayArticles[3]]; // 右セット（上下）
    
    return [
      <View key="grid-row" style={styles.gridRow}>
        <View style={styles.columnContainer}>
          {leftColumn.map((article, index) => (
            article && (
              <View key={article.id} style={styles.columnItem}>
                <CompactCard
                  article={article}
                  variant="personalized"
                  size="personalized"
                  onPress={onArticlePress}
                />
              </View>
            )
          ))}
        </View>
        <View style={styles.columnContainer}>
          {rightColumn.map((article, index) => (
            article && (
              <View key={article.id} style={styles.columnItem}>
                <CompactCard
                  article={article}
                  variant="personalized"
                  size="personalized"
                  onPress={onArticlePress}
                />
              </View>
            )
          ))}
        </View>
      </View>
    ];
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* グリッドコンテンツ */}
        <View style={styles.gridContainer}>
          {renderGrid()}
        </View>

        {/* もっと見るボタン */}
        {hasMore && onSeeMore && (
          <TouchableOpacity
            style={styles.seeMoreButton}
            onPress={onSeeMore}
            activeOpacity={0.8}
          >
            <View style={styles.seeMoreContent}>
              <Text style={styles.seeMoreText}>もっと見る</Text>
              <Text style={styles.seeMoreCount}>
                +{articles.length - maxItems}件
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#888888" />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  scrollContent: {
    // offset first card margin like trending (3px)
    paddingLeft: 5,
    paddingRight: SPACING.SCREEN_HORIZONTAL,
  },
  gridContainer: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
  },
  columnContainer: {
    width: 180,
    marginHorizontal: 3,
  },
  columnItem: {
    marginBottom: 3,
  },
  seeMoreButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 85,
    minHeight: 200,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  seeMoreContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  seeMoreText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  seeMoreCount: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
});
