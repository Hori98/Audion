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
import UnifiedAudioPlayer from './UnifiedAudioPlayer';

type PlaybackState = 'idle' | 'playing' | 'paused' | 'loading' | 'ready' | 'error';

interface ArticleCardProps {
  article: Article;
  isSaved?: boolean;
  playbackState?: PlaybackState;
  isManualPickMode?: boolean;
  isSelected?: boolean;
  isRead?: boolean;
  isReadMode?: boolean;
  onPress: (article: Article) => void;
  onSave?: (articleId: string) => void;
  onSelect?: (articleId: string) => void;
  onToggleRead?: (articleId: string) => void;
  showAudioPlayer?: boolean;
}

export default function ArticleCard({
  article,
  isSaved = false,
  playbackState = 'idle',
  isManualPickMode = false,
  isSelected = false,
  isRead = false,
  isReadMode = false,
  onPress,
  onSave,
  onSelect,
  onToggleRead,
  showAudioPlayer = true
}: ArticleCardProps) {

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
        isSelected && styles.selectedCard,
        isRead && styles.readCard
      ]}
      activeOpacity={0.8}
    >
      {/* 横長レイアウト：サムネイル（左）＋ コンテンツ（右） */}
      <View style={styles.cardContent}>
        {/* サムネイル画像（左側） */}
        <View style={styles.thumbnailContainer}>
          {article.thumbnail_url ? (
            <Image 
              source={{ uri: article.thumbnail_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={24} color="#666666" />
            </View>
          )}
        </View>

        {/* コンテンツエリア（右側） */}
        <View style={styles.contentContainer}>
          {/* タイトル */}
          <Text style={styles.title} numberOfLines={2}>
            {article.title}
          </Text>

          {/* 本文（サマリー） */}
          {article.summary && (
            <Text style={styles.snippet} numberOfLines={2}>
              {article.summary}
            </Text>
          )}

          {/* フッター：メタデータとアクションボタン */}
          <View style={styles.footer}>
            <View style={styles.metadata}>
              <Text style={styles.source}>
                {article.source_name || 'Unknown Source'}
              </Text>
              <Text style={styles.date}>
                {formatDate(article.published_at)}
              </Text>
            </View>

            <View style={styles.actions}>
              {/* 既読切り替えボタン（既読モード時のみ表示） */}
              {isReadMode && onToggleRead && (
                <TouchableOpacity
                  onPress={onToggleRead}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isRead ? "checkmark-circle" : "checkmark-circle-outline"}
                    size={18}
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
                    size={18}
                    color={isSaved ? "#FFD700" : "#CCCCCC"}
                  />
                </TouchableOpacity>
              )}

              {/* 音声プレイヤー */}
              {showAudioPlayer && !isManualPickMode && (
                <View style={styles.audioPlayerContainer}>
                  <UnifiedAudioPlayer
                    articleId={article.id}
                    articleTitle={article.title}
                    articleContent={article.summary}
                    size="mini"
                    showTitle={false}
                  />
                </View>
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
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222222',
    minHeight: 100, // 横長カードの最小高さ
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
    flexDirection: 'row', // 横長レイアウトの基本
    alignItems: 'flex-start', // 上揃え
    padding: 12,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12, // サムネイルと右のコンテンツとの間隔
  },
  thumbnail: {
    width: 90, // 小さなサムネイル
    height: 90,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1, // 残りのスペースを全て使用
    paddingVertical: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 6,
  },
  snippet: {
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto', // フッターを下部に配置
  },
  metadata: {
    flex: 1,
  },
  source: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    color: '#888888',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 8,
    padding: 4,
  },
  audioPlayerContainer: {
    marginLeft: 6,
  },
});