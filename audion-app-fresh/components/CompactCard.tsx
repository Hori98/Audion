/**
 * Compact Card Component
 * 速報・パーソナライズセクション用の小型記事カード
 * 縦向きレイアウト、最小限の情報表示に特化
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Article } from '../services/ArticleService';
import { UI_FLAGS } from '../config/uiFlags';
import { getCardColors } from '../styles/sectionTheme';

interface CompactCardProps {
  article: Article;
  variant?: 'emergency' | 'personalized' | 'trending';
  size?: 'small' | 'medium' | 'large' | 'trending' | 'personalized';
  layout?: 'vertical' | 'horizontal';
  showSource?: boolean;
  breakingScore?: number; // 将来の優先度表示用（現在未使用）
  onPress: (article: Article) => void;
}

export default function CompactCard({
  article,
  variant = 'personalized',
  size = 'medium',
  layout = 'vertical',
  showSource = true,
  breakingScore, // 将来の優先度表示用（現在未使用）
  onPress,
}: CompactCardProps) {

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

  // 将来のbreaking news優先度表示用（現在未使用）
  // const getPriorityInfo = () => {
  //   if (!breakingScore || variant !== 'emergency') return null;
  //   
  //   if (breakingScore >= 70) {
  //     return { level: 'high', color: '#FF4444', label: '高' };
  //   } else if (breakingScore >= 50) {
  //     return { level: 'medium', color: '#FF9500', label: '中' };
  //   } else {
  //     return { level: 'low', color: '#FFD700', label: '低' };
  //   }
  // };

  // カードのハイライト戦略（全体統一 or セクション別上書き）
  const highlightStrategy = (UI_FLAGS.CARD_HIGHLIGHT_BY_SECTION as any)?.[variant] || UI_FLAGS.CARD_HIGHLIGHT_STRATEGY;
  const variantColors = getCardColors(variant as any, highlightStrategy);

  const cardStyles = [
    styles.card,
    layout === 'horizontal' ? styles.horizontalCard : 
      (size === 'small' ? styles.smallCard : 
       size === 'large' ? styles.largeCard :
       size === 'trending' ? styles.trendingCard :
       size === 'personalized' ? styles.personalizedCard : styles.mediumCard),
    {
      borderColor: variantColors.borderColor,
      backgroundColor: variantColors.backgroundColor,
    },
    highlightStrategy === 'border' && styles.cardBorder,
    (variant === 'trending' || variant === 'personalized') && styles.tightTop,
    (size === 'trending' || size === 'personalized') && styles.halfMargin,
  ];

  const thumbnailStyles = [
    styles.thumbnail,
    layout === 'horizontal' ? styles.horizontalThumbnail : 
      (size === 'small' ? styles.smallThumbnail : 
       size === 'large' ? styles.largeThumbnail :
       size === 'trending' ? styles.trendingThumbnail :
       size === 'personalized' ? styles.personalizedThumbnail : styles.mediumThumbnail),
    UI_FLAGS.SQUARE_CARDS && styles.thumbnailSquare,
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={cardStyles}
      activeOpacity={0.8}
    >
      {layout === 'horizontal' ? (
        /* 横向きレイアウト（ミニマル化：サムネイル無効化） */
        <View style={styles.horizontalContent}>
          {/* 左部：サムネイル画像 */}
          <View style={styles.horizontalThumbnailContainer}>
            {article.thumbnail_url ? (
              <Image
                source={{ uri: article.thumbnail_url }}
                style={thumbnailStyles}
                resizeMode="cover"
              />
            ) : (
              <View style={[thumbnailStyles, styles.placeholderImage]}>
                <Ionicons name="image-outline" size={20} color="#666666" />
              </View>
            )}
          </View>

          {/* 右部：コンテンツ */}
          <View style={styles.horizontalContentContainer}>
            {/* タイトル */}
            <Text
              style={styles.horizontalTitle}
              numberOfLines={2}
            >
              {article.title}
            </Text>

            {/* メタデータ */}
            <View style={styles.horizontalMetadata}>
              {showSource && (
                <Text style={styles.source} numberOfLines={1}>
                  {article.source_name || 'Unknown'}
                </Text>
              )}
              <Text style={styles.date}>
                {formatDate(article.published_at)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* 縦向きレイアウト */
        <View style={styles.cardContent}>
          {/* 上部：サムネイル画像 */}
          <View style={styles.thumbnailContainer}>
            {article.thumbnail_url ? (
              <Image
                source={{ uri: article.thumbnail_url }}
                style={thumbnailStyles}
                resizeMode="cover"
              />
            ) : (
              <View style={[thumbnailStyles, styles.placeholderImage]}>
                <Ionicons name="image-outline" size={size === 'small' ? 16 : 20} color="#666666" />
              </View>
            )}
            {/* subtle badges per variant (optional, minimal) */}
            {variant === 'trending' && (
              <View style={styles.trendingBadge}>
                <Ionicons name="flame" size={12} color="rgba(255,255,255,0.55)" />
              </View>
            )}
            {variant === 'emergency' && (
              <View style={styles.emergencyBadge}>
                <Ionicons name="warning" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* 下部：コンテンツ */}
          <View style={[
            styles.contentContainer,
            size === 'personalized' && styles.personalizedContentContainer
          ]}>
            {/* タイトル */}
            <Text
              style={[
                styles.title,
                size === 'small' ? styles.smallTitle : 
                size === 'personalized' ? styles.personalizedTitle : styles.mediumTitle
              ]}
              numberOfLines={size === 'small' ? 2 : 3}
            >
              {article.title}
            </Text>

            {/* メタデータ */}
            <View style={styles.metadata}>
              {showSource && (
                <Text style={styles.source} numberOfLines={1}>
                  {article.source_name || 'Unknown'}
                </Text>
              )}
              <Text style={styles.date}>
                {formatDate(article.published_at)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0, // 境界線なしは維持（良い方針）
    margin: 6,
  },
  cardBorder: {
    borderWidth: 1,
  },
  // 帯直下の黒を見せないために上マージンを0に（トレンド/おすすめ）
  tightTop: {
    marginTop: 0,
  },
  cardSquare: {
    borderRadius: 0,
  },
  cardNoMargin: {
    margin: 0,
  },
  // トレンドのカード間隔を半分に（デフォ6→3）
  halfMargin: {
    margin: 3,
  },
  smallCard: {
    width: 140,
    height: 180,
  },
  mediumCard: {
    width: '100%',
    height: 200,
  },
  largeCard: {
    width: '100%',
    height: 220,
  },
  trendingCard: {
    // width: 120, // original width (3+ cards visible)
    width: 168, // TEMP: widen to show ~2 cards + hint
    height: 200,
  },
  personalizedCard: {
    width: 180,
    height: 200,
  },
  cardContent: {
    flex: 1,
    padding: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  thumbnail: {
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  smallThumbnail: {
    width: '100%',
    height: 80,
  },
  mediumThumbnail: {
    width: '100%',
    height: 100,
  },
  largeThumbnail: {
    width: '100%',
    height: 120,
  },
  trendingThumbnail: {
    width: '100%',
    height: 100,
  },
  personalizedThumbnail: {
    width: '100%',
    height: 90,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 4, // 下部に明確な余白を設定
  },
  personalizedContentContainer: {
    paddingVertical: 2, // PersonalizedCardの縦余白をさらに削減
  },
  title: {
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 16,
    marginBottom: 2, // 4→2に縮小（半分）
  },
  smallTitle: {
    fontSize: 12,
  },
  mediumTitle: {
    fontSize: 13,
  },
  personalizedTitle: {
    fontSize: 13,
    lineHeight: 16, // より密集したレイアウト
    marginBottom: 1, // タイトル下余白をさらに削減
  },
  metadata: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  source: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
    flex: 1,
  },
  date: {
    fontSize: 10,
    color: '#666666',
  },
  // 横向きレイアウト用スタイル
  horizontalCard: {
    width: '100%',
    height: 100,
    marginHorizontal: 0,
    marginVertical: 3,
  },
  horizontalContent: {
    flexDirection: 'row',
    flex: 1,
    padding: 12,
  },
  horizontalThumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  horizontalThumbnail: {
    width: 80,
    height: 76,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  horizontalContentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  horizontalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 18,
    marginBottom: 8,
  },
  horizontalMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priorityIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // タイトルと時間の横並びスタイル
  titleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18, // テキストの高さに合わせて最小高さ設定
  },
});
