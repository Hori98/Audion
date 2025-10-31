/**
 * Clean Feed UI Component - プレゼンテーショナル層
 * propsで渡されたデータの表示のみ担当（Context依存なし）
 * ユーザー登録RSSソースからの記事表示専用
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  View,
  Text,
  Alert,
} from 'react-native';
import { Article } from '../services/ArticleService';
import { UserRSSSource } from '../services/RSSSourceService';
import { Genre } from '../types/rss';
import { generateGenreTabs } from '../utils/genreUtils';
import HorizontalTabs from './HorizontalTabs';
import UnifiedHeader from './UnifiedHeader';
import ArticleCard from './ArticleCard';
import ArticleDetailModal from './ArticleDetailModal';
import { commonStyles, getArticleListStyles, COLORS } from '../styles/commonStyles';
import SectionPlaceholder from './common/SectionPlaceholder';
import UnifiedArticleList from './common/UnifiedArticleList';
import { UI_FLAGS } from '../config/uiFlags';
import { useArticle } from '../context/ArticleContext';
import AudioService from '../services/AudioService';
import SettingsSyncService from '../services/SettingsSyncService';
import { useSettings } from '../context/SettingsContext';

interface CleanFeedUIProps {
  // Core data
  user: any;
  articles: Article[];
  userSources: UserRSSSource[];
  loading: boolean;
  refreshing: boolean;

  // Filter state
  selectedGenre: Genre;
  selectedSource: string;
  selectedReadStatus: 'all' | 'unread' | 'read';
  availableGenres: Genre[];

  // Actions
  onRefresh: () => void;
  setSelectedGenre: (genre: Genre) => void;
  setSelectedSource: (source: string) => void;
  setSelectedReadStatus?: (status: 'all' | 'unread' | 'read') => void;
  onSearchPress?: () => void;
  markArticleAsRead?: (articleId: string) => void;
}


export const CleanFeedUI: React.FC<CleanFeedUIProps> = ({
  user,
  articles,
  userSources,
  loading,
  refreshing,
  selectedGenre,
  selectedSource,
  selectedReadStatus,
  availableGenres,
  onRefresh,
  setSelectedGenre,
  setSelectedSource,
  setSelectedReadStatus,
  onSearchPress,
  markArticleAsRead,
}) => {
  // 既読管理Context
  const { isArticleRead, toggleReadStatus, isReadMode } = useArticle();
  
  // 設定Context
  const { settings } = useSettings();
  
  // Local state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);

  const handleArticlePress = (article: Article) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
    // 記事を開いた時に既読としてマーク
    if (markArticleAsRead) {
      markArticleAsRead(article.id);
    }
  };

  const handleCloseArticleModal = () => {
    setShowArticleModal(false);
    setSelectedArticle(null);
  };

  // ManualPickアイコンが押された時のハンドラー (ヘッダー用)
  const handleManualPickIcon = async () => {
    Alert.alert('ManualPick', '既読記事の音声生成機能です。記事の音楽ノートアイコンをタップして個別音声生成を行ってください。');
  };

  // ManualPickアイコンが押された時のハンドラー (記事個別用)
  const handleManualPickArticle = async (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;
    
    Alert.alert(
      'ManualPick',
      `「${article.title}」を音声生成しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '生成開始', 
          onPress: async () => {
            try {
              // Create ManualPick request using settings synchronization
              const request = SettingsSyncService.createManualPickRequest(
                settings,
                [article.id],
                [article.title],
                {
                  article_summaries: [article.summary],
                }
              );

              await AudioService.generateManualPickAudio(request);
              Alert.alert('音声生成開始', '音声生成を開始しました。完了後はライブラリで再生できます。');
            } catch (error) {
              console.error('Manual pick generation failed:', error);
              Alert.alert('エラー', '音声生成に失敗しました');
            }
          }
        }
      ]
    );
  };

  // ソースフィルタ用のソース一覧（アクティブソースのみ）
  const activeUserSources = userSources.filter(source => source.is_active);
  const sourceOptions = [
    { id: 'all', name: 'すべて' },
    ...activeUserSources.map(source => ({
      id: source.display_name || source.name,
      name: source.display_name || source.name
    }))
  ];

  // ジャンル選択のハンドラー（string から Genre にキャスト）
  const handleGenreSelect = (tabId: string) => {
    setSelectedGenre(tabId as Genre);
  };

  return (
    <View style={styles.container}>
      {/* 固定ヘッダー */}
      <UnifiedHeader
        onSearchPress={onSearchPress}
        onReadStatusPress={setSelectedReadStatus}
        currentReadStatus={selectedReadStatus}
        onManualPickPress={handleManualPickIcon}
        showManualPickIcon={selectedReadStatus === 'read'}
      />

      {/* 固定フィルターセクション */}
      <View style={commonStyles.filterSection}>
        {/* ソースフィルター */}
        <HorizontalTabs
          tabs={sourceOptions}
          selectedTab={selectedSource}
          onTabSelect={setSelectedSource}
        />

        {/* ジャンルフィルター（動的表示） */}
        <HorizontalTabs
          tabs={generateGenreTabs(availableGenres)}
          selectedTab={selectedGenre}
          onTabSelect={handleGenreSelect}
        />
      </View>

      {/* スクロール可能な記事一覧エリア */}
      <View style={styles.contentContainer}>
        {loading ? (
          <SectionPlaceholder message="読み込み中…" lines={2} />
        ) : articles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeUserSources.length === 0
                ? 'RSSソースが登録されていません。設定からRSSソースを追加してください。'
                : '条件に合う記事がありません。フィルターを変更してみてください。'
              }
            </Text>
          </View>
        ) : (
          <>
            {/** 旧スタイル（カード基調） - いつでも戻せるように残しています
            <UnifiedArticleList
              articles={articles}
              onArticlePress={handleArticlePress}
              refreshing={refreshing}
              onRefresh={onRefresh}
              mode="flatlist"
              showManualPickIcon={true}
              isFeedTab={true}
              isReadMode={isReadMode}
              onToggleRead={toggleReadStatus}
              onManualPick={handleManualPickArticle}
              isArticleRead={isArticleRead}
            />
            */}

            {/* 新スタイル（セル＝行基調、直角＋下線区切り） */}
            <UnifiedArticleList
              articles={articles}
              onArticlePress={handleArticlePress}
              refreshing={refreshing}
              onRefresh={onRefresh}
              mode="flatlist"
              variant={UI_FLAGS.USE_CELL_FEED_LIST ? 'cell' : 'card'}
              showManualPickIcon={true}
              isFeedTab={true}
              isReadMode={isReadMode}
              onToggleRead={toggleReadStatus}
              onManualPick={handleManualPickArticle}
              isArticleRead={isArticleRead}
            />
          </>
        )}
      </View>

      {/* 記事詳細モーダル */}
      <ArticleDetailModal
        visible={showArticleModal}
        article={selectedArticle}
        onClose={handleCloseArticleModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  // filterSection - 共通スタイル(commonStyles.filterSection)を使用
  // articlesList - 共通スタイル(UnifiedArticleList)を使用
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
