/**
 * SmallArticleCard - 小さなサムネイルと長方形レイアウトのカード
 * ホームタブの下部セクション用コンポーネント
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Article } from '../services/ArticleService';

interface SmallArticleCardProps {
  article: Article;
  onPress: (article: Article) => void;
  onPlayPress?: (article: Article) => void;
  style?: any;
}

export default function SmallArticleCard({
  article,
  onPress,
  onPlayPress,
  style,
}: SmallArticleCardProps) {
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '時刻不明';
    
    const now = new Date();
    const publishedDate = new Date(dateString);
    
    // 不正な日付の場合のフォールバック
    if (isNaN(publishedDate.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '時刻不明';
    }
    
    const diffInMs = now.getTime() - publishedDate.getTime();
    
    // 未来の日付の場合
    if (diffInMs < 0) {
      return '配信予定';
    }
    
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return '数分前';
    if (diffInHours < 24) return `${diffInHours}時間前`;
    if (diffInDays < 30) return `${diffInDays}日前`;
    
    // 30日以上前は月単位で表示
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}ヶ月前`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(article)}
      activeOpacity={0.8}
    >
      {/* 左側：小さなサムネイル */}
      <View style={styles.thumbnailContainer}>
        {article.thumbnail_url ? (
          <Image
            source={{ uri: article.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <Text style={styles.placeholderIcon}>📰</Text>
          </View>
        )}
        
      </View>

      {/* 右側：テキストコンテンツ */}
      <View style={styles.textContainer}>
        {/* タイトル */}
        <Text style={styles.title} numberOfLines={2}>
          {truncateText(article.title, 80)}
        </Text>

        {/* サマリー */}
        <Text style={styles.summary} numberOfLines={2}>
          {truncateText(article.summary, 100)}
        </Text>

        {/* メタ情報 */}
        <View style={styles.metaContainer}>
          <Text style={styles.source}>{article.source_name}</Text>
          <Text style={styles.time}>{formatTimeAgo(article.published_at)}</Text>
        </View>

        {/* 音声再生ボタン（オプション） */}
        {onPlayPress && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => onPlayPress(article)}
            activeOpacity={0.7}
          >
            <Text style={styles.playButtonText}>🎧 再生</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#222222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholderThumbnail: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  categoryLabel: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 18,
    marginBottom: 4,
  },
  summary: {
    fontSize: 12,
    color: '#cccccc',
    lineHeight: 16,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  source: {
    fontSize: 10,
    color: '#007bff',
    fontWeight: '600',
  },
  time: {
    fontSize: 10,
    color: '#888888',
  },
  playButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
});