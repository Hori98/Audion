/**
 * Article Card Component
 * HomeタブとFeedタブで共通利用する記事カードUI
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

interface ArticleCardProps {
  article: Article;
  isSaved?: boolean;
  isManualPickMode?: boolean;
  isSelected?: boolean;
  isRead?: boolean;
  isReadMode?: boolean;
  showManualPickIcon?: boolean; // New prop for Feed tab read articles
  isFeedTab?: boolean; // New prop to identify Feed tab
  variant?: 'card' | 'cell' | 'flat';
  tightTop?: boolean; // セクション先頭で上マージンを詰める
  onPress: (article: Article) => void;
  onSave?: (articleId: string) => void;
  onSelect?: (articleId: string) => void;
  onToggleRead?: (articleId: string) => void;
  onManualPick?: (articleId: string) => void; // New prop for ManualPick action
}

export default function ArticleCard({
  article,
  isSaved = false,
  isManualPickMode = false,
  isSelected = false,
  isRead = false,
  isReadMode = false,
  showManualPickIcon = false,
  isFeedTab = false,
  variant = 'card',
  tightTop = false,
  onPress,
  onSave,
  onSelect,
  onToggleRead,
  onManualPick
}: ArticleCardProps) {

  const isCompact = UI_FLAGS.DENSITY_COMPACT && variant !== 'card';

  const handleCardPress = () => {
    if (isManualPickMode && onSelect) {
      onSelect(article.id);
    } else {
      onPress(article);
    }
  };

  const handleSavePress = () => {
    if (onSave) {
      onSave(article.id);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '配信時刻不明';
    }
  };

  return (
    <TouchableOpacity 
      onPress={handleCardPress} 
      style={[
        styles.card,
        variant === 'cell' && styles.cardCell,
        variant === 'flat' && styles.cardFlat,
        isCompact && styles.compactCard,
        UI_FLAGS.SQUARE_CARDS && styles.squareCard,
        UI_FLAGS.ZERO_CARD_GAP && styles.noMargin,
        tightTop && styles.noTopMargin,
        isSelected && styles.selectedCard,
        isRead && styles.readCard
      ]}
      activeOpacity={0.8}
    >
      {/* 横長レイアウト：サムネイル（左）＋ コンテンツ（右） */}
      <View style={[
        styles.cardContent,
        isCompact && styles.compactContent
      ]}>
        {/* サムネイル画像（左側） */}
        <View style={styles.thumbnailContainer}>
          {article.thumbnail_url ? (
            <Image 
              source={{ uri: article.thumbnail_url }}
              style={[
                styles.thumbnail,
                isCompact && styles.thumbnailCompact,
                UI_FLAGS.SQUARE_CARDS && styles.thumbnailSquare,
              ]}
              resizeMode="cover"
            />
          ) : (
            <View style={[
              styles.thumbnail,
              isCompact && styles.thumbnailCompact,
              UI_FLAGS.SQUARE_CARDS && styles.thumbnailSquare,
              styles.placeholderImage
            ]}>
              <Ionicons name="image-outline" size={18} color="#666666" />
            </View>
          )}
        </View>

        {/* コンテンツエリア（右側） - inoreader スタイル縦レイアウト */}
        <View style={[styles.contentContainer, isCompact && styles.contentContainerCompact]}>
          {/* タイトル（2行まで） */}
          <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={2}>
            {article.title}
          </Text>

          {/* 本文（2行まで） */}
          <Text style={[styles.snippet, isCompact && styles.snippetCompact]} numberOfLines={2}>
            {article.summary || article.content || '記事の詳細情報はありません...'}
          </Text>

          {/* メタデータとアクションボタンの横並び */}
          <View style={styles.footer}>
            <View style={styles.metadata}>
              <Text style={styles.source}>
                {article.source_name || 'Unknown Source'}
              </Text>
              <Text style={styles.dateSeparator}> • </Text>
              <Text style={styles.genre}>
                {article.genre || 'その他'}
              </Text>
              <Text style={styles.dateSeparator}> • </Text>
              <Text style={styles.date}>
                {formatDate(article.published_at)}
              </Text>
            </View>

            <View style={styles.actions}>
              {/* ManualPickアイコン（Feedタブで既読記事の場合のみ表示） */}
              {isFeedTab && isRead && showManualPickIcon && onManualPick && (
                <TouchableOpacity
                  onPress={() => onManualPick(article.id)}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="musical-note"
                    size={16}
                    color="#FF6B35"
                  />
                </TouchableOpacity>
              )}

              {/* 既読切り替えボタン（既読モード時のみ表示） */}
              {isReadMode && onToggleRead && (
                <TouchableOpacity
                  onPress={() => onToggleRead(article.id)}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isRead ? "checkmark-circle" : "checkmark-circle-outline"}
                    size={16}
                    color={isRead ? "#4CAF50" : "#CCCCCC"}
                  />
                </TouchableOpacity>
              )}

              {/* 記事保存ボタン */}
              {onSave && (
                <TouchableOpacity
                  onPress={handleSavePress}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isSaved ? "bookmark" : "bookmark-outline"}
                    size={16}
                    color={isSaved ? "#FFD700" : "#CCCCCC"}
                  />
                </TouchableOpacity>
              )}

            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111111',
    borderRadius: 6,
    marginVertical: 2, // 1→2に調整（inoreaderスタイル）
    marginHorizontal: 0, // 4→0にして画面幅最大化
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222222',
    minHeight: 100, // 60→100に拡大（縦レイアウト対応）
  },
  squareCard: {
    borderRadius: 0,
  },
  noMargin: {
    marginVertical: 0,
  },
  noTopMargin: {
    marginTop: 0,
  },
  compactCard: {
    minHeight: 84,
  },
  cardCell: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    marginVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  cardFlat: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    marginVertical: 0,
  },
  selectedCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  readCard: {
    opacity: 0.7,
    backgroundColor: '#0a0a0a',
  },
  cardContent: {
    flexDirection: 'row', // 横レイアウト（サムネ左、コンテンツ右）
    alignItems: 'flex-start', // 上揃えに変更（inoreaderスタイル）
    padding: 12, // 6→12に拡大（適切な余白確保）
  },
  compactContent: {
    padding: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12, // サムネイルと右のコンテンツとの間隔
  },
  thumbnail: {
    width: 72, // 正方形サムネイル（inoreaderスタイル）
    height: 72, // 正方形サムネイル
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  thumbnailSquare: {
    borderRadius: 0,
  },
  thumbnailCompact: {
    width: 60,
    height: 60,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1, // 残りのスペースを全て使用
    justifyContent: 'space-between', // 縦方向の配置（タイトル→本文→メタデータ）
    paddingVertical: 0,
    minHeight: 72, // サムネイルの高さに合わせる
  },
  contentContainerCompact: {
    minHeight: 60,
  },
  title: {
    fontSize: 15, // inoreaderスタイルに合わせて調整
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20, // 2行表示に適したline-height
    marginBottom: 4, // タイトルと本文の間隔
  },
  titleCompact: {
    marginBottom: 2,
  },
  snippet: {
    fontSize: 13, // 本文を読みやすいサイズに
    color: '#cccccc',
    lineHeight: 18, // 2行表示に適したline-height
    marginBottom: 8, // 本文とメタデータの間隔
  },
  snippetCompact: {
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2, // 'auto'→固定値に変更でよりタイト
  },
  metadata: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    fontSize: 10, // 11→10に縮小
    fontWeight: '600',
    color: '#888888',
  },
  dateSeparator: {
    fontSize: 10, // 11→10に縮小
    color: '#666666',
  },
  date: {
    fontSize: 10,
    color: '#888888',
  },
  genre: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 8,
    padding: 4,
  },
});
