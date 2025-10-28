/**
 * Unified Article List Component
 * HomeタブとFeedタブで共通利用する記事リスト表示コンポーネント
 * 表示方式（FlatList vs ScrollView）に関わらず統一されたスタイルを提供
 */

import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Article } from '../../services/ArticleService';
import ArticleCard from '../ArticleCard';
import { commonStyles, ARTICLE_LIST_PRESETS } from '../../styles/commonStyles';

interface UnifiedArticleListProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  mode: 'flatlist' | 'scrollview';
  variant?: 'card' | 'cell' | 'flat';
  // 追加のカスタムスタイル
  containerStyle?: any;
  contentContainerStyle?: any;
  // 帯直下の余白を明示制御したい場合に使用（paddingVertical）
  listPaddingVertical?: number;
  // ArticleCard用のprops
  isManualPickMode?: boolean;
  selectedArticleIds?: Set<string>;
  readArticleIds?: Set<string>;
  onSelect?: (articleId: string) => void;
  onSave?: (articleId: string) => void;
  onToggleRead?: (articleId: string) => void;
  // ManualPick用のprops
  showManualPickIcon?: boolean;
  isFeedTab?: boolean;
  isReadMode?: boolean;
  onManualPick?: (articleId: string) => void;
  isArticleRead?: (articleId: string) => boolean;
}

export default function UnifiedArticleList({
  articles,
  onArticlePress,
  refreshing = false,
  onRefresh,
  mode,
  variant = 'card',
  containerStyle,
  contentContainerStyle,
  listPaddingVertical,
  isManualPickMode = false,
  selectedArticleIds,
  readArticleIds,
  onSelect,
  onSave,
  onToggleRead,
  showManualPickIcon = false,
  isFeedTab = false,
  isReadMode = false,
  onManualPick,
  isArticleRead,
}: UnifiedArticleListProps) {
  
  // 記事カード共通のrenderItem関数
  const renderArticleCard = (article: Article, index?: number) => {
    return (
      <View 
        key={article.id} 
        style={commonStyles.articleItem}
      >
        <ArticleCard
          article={article}
          onPress={onArticlePress}
          variant={variant}
          tightTop={index === 0}
          isManualPickMode={isManualPickMode}
          isSelected={selectedArticleIds?.has(article.id)}
          isRead={isArticleRead ? isArticleRead(article.id) : readArticleIds?.has(article.id)}
          isReadMode={isReadMode}
          showManualPickIcon={showManualPickIcon}
          isFeedTab={isFeedTab}
          onSelect={onSelect}
          onSave={onSave}
          onToggleRead={onToggleRead}
          onManualPick={onManualPick}
        />
      </View>
    );
  };

  // FlatListモード（Feedタブ用）
  if (mode === 'flatlist') {
    return (
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => renderArticleCard(item, index)}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        contentContainerStyle={[
          ARTICLE_LIST_PRESETS.FEED_STYLE.contentContainerStyle,
          listPaddingVertical !== undefined ? { paddingVertical: listPaddingVertical } : null,
          contentContainerStyle,
        ]}
        style={[
          ARTICLE_LIST_PRESETS.FEED_STYLE.containerStyle,
          containerStyle
        ]}
      />
    );
  }

  // ScrollViewモード（Homeタブ用）
  return (
    <View style={[
      ARTICLE_LIST_PRESETS.HOME_STYLE.listContainerStyle,
      listPaddingVertical !== undefined ? { paddingVertical: listPaddingVertical } : null,
      containerStyle
    ]}>
      {articles.map((article, index) => renderArticleCard(article, index))}
    </View>
  );
}
