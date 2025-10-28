/**
 * Common UI Styles for Feed and Article Sections
 * HomeタブとFeedタブで統一されたスタイル管理
 */

import { StyleSheet } from 'react-native';
import { UI_FLAGS } from '../config/uiFlags';

// 共通の間隔・余白定数
export const SPACING = {
  // 画面端からの基本余白（Feedタブに統一）- より小さく調整
  SCREEN_HORIZONTAL: 8,
  GRID: 4, // 4ptグリッド基準
  
  // フィルタセクションの余白
  FILTER_HORIZONTAL: 8,
  FILTER_VERTICAL: 8,
  
  // 記事リストの余白
  ARTICLES_HORIZONTAL: 0,  // 画面いっぱいに表示
  ARTICLES_VERTICAL: UI_FLAGS.DENSITY_COMPACT ? 4 : 8,
  
  // セクション間の余白
  SECTION_BOTTOM: UI_FLAGS.DENSITY_COMPACT ? 8 : 12,
  
  // 記事カード間の余白（ArticleCard内で管理）
  CARD_VERTICAL: 2,
  CARD_HORIZONTAL: 0,
} as const;

// 共通の色定数
export const COLORS = {
  // 基本背景色
  BACKGROUND: '#000000',
  CARD_BACKGROUND: '#111111',
  SURFACE: '#0a0a0a',
  SURFACE_1: '#0b0b0b',
  SURFACE_2: '#121212',
  
  // ボーダー色
  FILTER_BORDER: 'rgba(255,255,255,0.1)',
  CARD_BORDER: '#222222',
  HAIRLINE: UI_FLAGS.USE_STRONGER_HAIRLINE ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#cccccc',
  TEXT_MUTED: '#888888',
  ACCENT: '#007bff',
} as const;

// 角丸や影などの面表現（カード→セル基調）
export const RADIUS = {
  SM: 6,
  MD: 8,
  LG: 12,
} as const;

export const ELEVATION = {
  LOW: 0, // フラット基調
  MID: 2,
} as const;

// タイポグラフィ（ニュース向けの密度）
export const TYPOGRAPHY = {
  HERO_TITLE: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  TITLE: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  BODY: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  META: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  LABEL: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
} as const;

// 密度モード（将来拡張用）
export const DENSITY = {
  DEFAULT: 'compact',
} as const;

// 共通のスタイルオブジェクト
export const commonStyles = StyleSheet.create({
  // フィルタセクション用スタイル（HorizontalTabsなど）
  filterSection: {
    paddingHorizontal: SPACING.FILTER_HORIZONTAL,
    paddingVertical: SPACING.FILTER_VERTICAL,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.FILTER_BORDER,
  },
  
  // 記事リストコンテナ用スタイル
  articlesContainer: {
    paddingHorizontal: SPACING.ARTICLES_HORIZONTAL,
    paddingTop: 0,
    paddingBottom: SPACING.ARTICLES_VERTICAL,
  },
  
  // 記事アイテム用スタイル
  articleItem: {
    width: '100%',
  },
  
  // セクションコンテナ用スタイル
  sectionContainer: {
    marginBottom: SPACING.SECTION_BOTTOM,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.HAIRLINE,
  },
  
  // 基本コンテナスタイル
  baseContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
});

// 記事リスト表示用の統一スタイルプリセット
export const ARTICLE_LIST_PRESETS = {
  // Feedタブ用（FlatListベース）
  FEED_STYLE: {
    containerStyle: commonStyles.baseContainer,
    filterStyle: commonStyles.filterSection,
    contentContainerStyle: commonStyles.articlesContainer,
    itemStyle: commonStyles.articleItem,
  },
  
  // Homeタブ用（ScrollView + map）
  HOME_STYLE: {
    containerStyle: commonStyles.sectionContainer,
    filterStyle: commonStyles.filterSection,
    listContainerStyle: commonStyles.articlesContainer,
    itemStyle: commonStyles.articleItem,
  },
} as const;

/**
 * 記事リスト用の統一されたコンテナスタイルを取得
 * @param preset 'feed' | 'home'
 * @returns スタイルオブジェクト
 */
export const getArticleListStyles = (preset: 'feed' | 'home') => {
  return preset === 'feed' 
    ? ARTICLE_LIST_PRESETS.FEED_STYLE 
    : ARTICLE_LIST_PRESETS.HOME_STYLE;
};
