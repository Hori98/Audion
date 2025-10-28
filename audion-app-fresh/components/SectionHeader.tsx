/**
 * Section Header Component
 * Home UIの各セクション（速報、パーソナライズ、トレンドなど）用の統一ヘッダー
 * アイコン、タイトル、アクションボタンを含む
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/commonStyles';
import { UI_FLAGS } from '../config/uiFlags';

type SectionType = 'emergency' | 'personalized' | 'trending' | 'latest' | 'hero' | 'audio';

interface SectionHeaderProps {
  type: SectionType;
  title: string;
  subtitle?: string;
  showSeeMore?: boolean;
  onSeeMorePress?: () => void;
  onRefreshPress?: () => void;
  articleCount?: number;
  loading?: boolean;
  divider?: 'none' | 'bottom' | 'top' | 'both';
}

const SECTION_CONFIG = {
  emergency: {
    color: '#FF4444',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  personalized: {
    color: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  trending: {
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  latest: {
    color: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  hero: {
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  audio: {
    color: '#9B59B6',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
  },
};

export default function SectionHeader({
  type,
  title,
  subtitle,
  showSeeMore = false,
  onSeeMorePress,
  onRefreshPress,
  articleCount,
  loading = false,
  divider = 'bottom',
}: SectionHeaderProps) {

  const config = SECTION_CONFIG[type];
  // 背景色を透明に設定（背景色なし）
  const bandColor = 'transparent';

  const formatArticleCount = (count?: number): string => {
    if (count === undefined) return '';
    if (count === 0) return '記事なし';
    if (count === 1) return '1件';
    return `${count}件`;
  };

  return (
    <View style={styles.wrapper}>
      {['top','both'].includes(divider) && (
        <View style={styles.hairline} />
      )}
      <View style={styles.container}>
        {/* タイトル/件数/もっと見るを包括する全幅ハイライト帯 */}
        <View style={[styles.fullBand, { backgroundColor: bandColor }]} />
        {/* 左アクセントバー（任意） */}
        {UI_FLAGS.ACCENT_BAR && (
          <View style={[styles.accentBar, { backgroundColor: config.color }]} />
        )}
      {/* 左側：タイトル（テキストのみ） */}
      <View style={styles.leftContent}>
        <View style={styles.titleContainer}>
          <View style={styles.titleHighlightWrapper}>
            <Text style={[styles.title]}>
              {title}
            </Text>
          </View>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
          {articleCount !== undefined && (
            <Text style={styles.count}>
              {formatArticleCount(articleCount)}
            </Text>
          )}
        </View>
      </View>

      {/* 右側：アクションボタン */}
      <View style={styles.rightContent}>
        {/* リフレッシュボタン */}
        {onRefreshPress && (
          <TouchableOpacity
            onPress={onRefreshPress}
            style={styles.actionButton}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="refresh"
              size={16}
              color={loading ? '#666666' : '#888888'}
            />
          </TouchableOpacity>
        )}

        {/* もっと見るボタン */}
        {showSeeMore && onSeeMorePress && (
          <TouchableOpacity
            onPress={onSeeMorePress}
            style={styles.seeMoreButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.seeMoreText}>もっと見る</Text>
          </TouchableOpacity>
        )}
      </View>
      </View>
      {['bottom','both'].includes(divider) && (
        <View style={styles.hairline} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#000000',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: UI_FLAGS.HEADER_TIGHT ? 6 : (UI_FLAGS.DENSITY_COMPACT ? 8 : 10),
    backgroundColor: '#000000',
  },
  hairline: {
    height: 1,
    backgroundColor: COLORS.HAIRLINE,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    flex: 1,
  },
  titleHighlightWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 2,
  },
  count: {
    fontSize: 11,
    color: '#666666',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 1,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 2,
    opacity: 1,
  },
  actionButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
  },
  seeMoreButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  seeMoreText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

// ヘックスカラーにアルファを適用
function applyAlpha(hex: string, alpha: number) {
  // hex like #RRGGBB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
