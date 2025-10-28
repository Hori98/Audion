/**
 * Breaking News Card Component
 * 速報記事専用の超ミニマルカード
 * タイトル + 時間の1行表示に特化
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Article } from '../services/ArticleService';

interface BreakingNewsCardProps {
  article: Article;
  breakingScore?: number;
  onPress: (article: Article) => void;
}

export default function BreakingNewsCard({
  article,
  breakingScore,
  onPress,
}: BreakingNewsCardProps) {

  const handlePress = () => {
    onPress(article);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffHours < 1) return '今';
      if (diffHours < 24) return `${diffHours}時間前`;
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.card}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.titleTimeRow}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {article.title}
          </Text>
          <Text style={styles.time}>
            {formatDate(article.published_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 32, // テキスト18px + パディング8px + 余白6px
    marginHorizontal: 0,
    marginVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  content: {
    flex: 1,
    padding: 4,
    justifyContent: 'center',
  },
  titleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 10,
    color: '#666666',
    flexShrink: 0,
  },
});