/**
 * RSS Feed Custom Hook - ビジネスロジック層
 * UI刷新時の影響を避けるため、ロジックを完全分離
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import RSSSourceService, { 
  RSSCategory, 
  PreConfiguredRSSSource, 
  UserRSSSource 
} from '../services/RSSSourceService';
import ArticleService, { Article } from '../services/ArticleService';
import AudioService, { AudioGenerationResponse, AudioStatusResponse } from '../services/AudioService';
import UnifiedAudioGenerationService from '../services/UnifiedAudioGenerationService';
import { FEATURE_FLAGS } from '../services/config';

export interface RSSFeedState {
  // Data
  articles: Article[];
  categories: RSSCategory[];
  preConfiguredSources: PreConfiguredRSSSource[];
  userSources: UserRSSSource[];
  
  // UI State
  loading: boolean;
  refreshing: boolean;
  sourcesLoading: boolean;
  importing: boolean;
  showSourceModal: boolean;
  selectedSource: string;
  selectedGenre: string;
  selectedReadStatus: string;
  rssUrl: string;
  
  // Audio generation state
  audioGenerating: { [key: string]: boolean }; // articleId -> isGenerating
  audioProgress: { [key: string]: AudioStatusResponse }; // articleId -> progress
}

export interface RSSFeedActions {
  // Data fetching
  fetchArticles: () => Promise<void>;
  fetchRSSData: () => Promise<void>;
  onRefresh: () => void;
  
  // Source management
  addPreConfiguredSource: (sourceId: string, sourceName: string) => Promise<void>;
  
  // UI actions
  setShowSourceModal: (show: boolean) => void;
  setSelectedSource: (source: string) => void;
  setSelectedGenre: (genre: string) => void;
  setSelectedReadStatus: (status: string) => void;
  setRssUrl: (url: string) => void;
  
  // Audio generation
  generateAudio: (articleId: string, articleTitle: string) => Promise<void>;
}

export const useRSSFeed = (): RSSFeedState & RSSFeedActions => {
  const { token } = useAuth();
  
  // Data state
  const [allArticles, setAllArticles] = useState<Article[]>([]); // 全記事を保持
  const [categories, setCategories] = useState<RSSCategory[]>([]);
  const [preConfiguredSources, setPreConfiguredSources] = useState<PreConfiguredRSSSource[]>([]);
  const [userSources, setUserSources] = useState<UserRSSSource[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedReadStatus, setSelectedReadStatus] = useState('all');
  const [rssUrl, setRssUrl] = useState('');
  
  // Audio generation state
  const [audioGenerating, setAudioGenerating] = useState<{ [key: string]: boolean }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: AudioStatusResponse }>({});

  const fetchRSSData = useCallback(async () => {
    if (!token) {
      console.error('No auth token available');
      return;
    }
    
    try {
      setSourcesLoading(true);
      
      const [categoriesData, sourcesData, userSourcesData] = await Promise.all([
        RSSSourceService.getCategories(token),
        RSSSourceService.searchSources({ per_page: 50 }, token),
        RSSSourceService.getUserSources({}, token)
      ]);
      
      setCategories(categoriesData);
      setPreConfiguredSources(sourcesData.sources);
      setUserSources(userSourcesData);
      
    } catch (error) {
      console.error('Error fetching RSS data:', error);
      Alert.alert('エラー', 'RSSデータの読み込みに失敗しました');
    } finally {
      setSourcesLoading(false);
    }
  }, [token]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        console.error('⚠️  No auth token - authentication required');
        setAllArticles([]);
        return;
      }
      
      // 全記事を一度に取得（ジャンルフィルターなし）
      const apiParams: any = { per_page: 50 }; // より多くの記事を取得
      if (selectedReadStatus && selectedReadStatus !== 'all') {
        apiParams.read_filter = selectedReadStatus;
      }
      
      const data = selectedReadStatus !== 'all' 
        ? await ArticleService.getArticlesWithReadStatus(apiParams)
        : await ArticleService.getArticles(apiParams);

      // Handle both array responses and object responses
      const articles = Array.isArray(data) ? data : (data?.articles || []);
      setAllArticles(articles); // 全記事を保存
    } catch (error) {
      console.error('❌ Error fetching articles:', error);
      setAllArticles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedReadStatus]);  // selectedGenreを依存から削除

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles();
  }, [fetchArticles]);

  // ジャンル変更時はローディングなしで即座切り替え
  const setSelectedGenreWithRefresh = useCallback((genre: string) => {
    setSelectedGenre(genre);
    // setLoading(true); コメントアウト - クライアントサイドフィルタリングのためローディング不要
  }, []);

  const addPreConfiguredSource = useCallback(async (sourceId: string, sourceName: string) => {
    if (!token) {
      Alert.alert('エラー', '認証トークンがありません');
      return;
    }
    
    try {
      await RSSSourceService.addUserSource({ 
        preconfigured_source_id: sourceId,
        custom_alias: sourceName 
      }, token);
      
      Alert.alert('成功', `${sourceName}を追加しました`);
      await fetchRSSData(); // Refresh user sources
      
    } catch (error) {
      console.error('Error adding RSS source:', error);
      const errorMessage = error instanceof Error ? error.message : 'RSSソースの追加に失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  }, [token, fetchRSSData]);

  const generateAudio = useCallback(async (articleId: string, articleTitle: string) => {
    if (!token) {
      Alert.alert('エラー', '認証トークンがありません');
      return;
    }
    
    if (audioGenerating[articleId]) {
      Alert.alert('情報', 'この記事の音声は既に生成中です');
      return;
    }
    
    try {
      // Set generating state before starting
      setAudioGenerating(prev => ({ ...prev, [articleId]: true }));
      
      const result = await UnifiedAudioGenerationService.generateAudioWithProgress({
        articleId,
        articleTitle,
        language: 'ja',
        voice_type: 'standard',
        showUserAlerts: true, // useRSSFeedではユーザーアラートを表示
        onProgress: (status) => {
          setAudioProgress(prev => ({ ...prev, [articleId]: status }));
        },
        onSuccess: (audioUrl) => {
          setAudioGenerating(prev => ({ ...prev, [articleId]: false }));
        },
        onError: (errorMessage) => {
          setAudioGenerating(prev => ({ ...prev, [articleId]: false }));
        }
      }, token);
      
      // If user cancelled, reset generating state
      if (!result) {
        setAudioGenerating(prev => ({ ...prev, [articleId]: false }));
      }
      
    } catch (error) {
      setAudioGenerating(prev => ({ ...prev, [articleId]: false }));
      console.error('Error in generateAudio:', error);
    }
  }, [token, audioGenerating]);

  // Initialize data on mount
  useEffect(() => {
    fetchArticles();
    fetchRSSData();
  }, [fetchArticles, fetchRSSData]);

  // selectedGenreが変更されてもAPIコールは不要 - クライアントサイドフィルタリングで対応
  // useEffect(() => {
  //   if (token) {
  //     fetchArticles();
  //   }
  // }, [selectedGenre, token, fetchArticles]);

  // クライアントサイドフィルタリング: 選択したジャンルに基づいて記事をフィルタ
  const filteredArticles = useMemo(() => {
    if (selectedGenre === 'all' || !selectedGenre) {
      return allArticles;
    }
    return allArticles.filter(article => {
      const articleGenre = article.genre || article.category; // genre優先、categoryをfallback
      return articleGenre?.toLowerCase() === selectedGenre.toLowerCase();
    });
  }, [allArticles, selectedGenre]);

  return {
    // State
    articles: filteredArticles, // フィルタされた記事を返す
    categories,
    preConfiguredSources,
    userSources,
    loading,
    refreshing,
    sourcesLoading,
    importing,
    showSourceModal,
    selectedSource,
    selectedGenre,
    selectedReadStatus,
    rssUrl,
    audioGenerating,
    audioProgress,
    
    // Actions
    fetchArticles,
    fetchRSSData,
    onRefresh,
    addPreConfiguredSource,
    setShowSourceModal,
    setSelectedSource,
    setSelectedGenre: setSelectedGenreWithRefresh,
    setSelectedReadStatus,
    setRssUrl,
    generateAudio,
  };
};