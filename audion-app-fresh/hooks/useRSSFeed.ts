/**
 * RSS Feed Custom Hook - Clean & Simple RSS Reader
 * シンプルで保守性の高いRSSリーダー実装
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import RSSSourceService, {
  RSSCategory,
  PreConfiguredRSSSource,
  UserRSSSource
} from '../services/RSSSourceService';
import ArticleService from '../services/ArticleService';
import AudioService, { AudioGenerationResponse, AudioStatusResponse } from '../services/AudioService';
import UnifiedAudioGenerationService from '../services/UnifiedAudioGenerationService';
import { FEATURE_FLAGS } from '../services/config';
import { Article, RSSSource, Genre, AVAILABLE_GENRES } from '../types/rss';
import { FEED_DEFAULT_RSS_SOURCES } from '../data/rss-sources';

export interface RSSFeedState {
  // Data
  articles: Article[];
  allArticles: Article[]; // マスターリスト（フィルタリング前）
  categories: RSSCategory[];
  preConfiguredSources: PreConfiguredRSSSource[];
  userSources: UserRSSSource[];
  
  // UI State
  loading: boolean;
  refreshing: boolean;
  sourcesLoading: boolean;
  importing: boolean;
  showSourceModal: boolean;
  selectedGenre: Genre; // 型安全に
  selectedSource: string;
  selectedReadStatus: string;
  rssUrl: string;
  
  // Audio generation state
  audioGenerating: { [key: string]: boolean };
  audioProgress: { [key: string]: AudioStatusResponse };
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
  setSelectedGenre: (genre: Genre) => void; // 型安全に
  setSelectedSource: (source: string) => void;
  setSelectedReadStatus: (status: string) => void;
  setRssUrl: (url: string) => void;
  setFeedTabMode: (isFeedMode: boolean) => void;
  
  // Audio generation
  generateAudio: (articleId: string, articleTitle: string) => Promise<void>;
}

export const useRSSFeed = (): RSSFeedState & RSSFeedActions => {
  const { token } = useAuth();
  
  // Data state - Single Source of Truth
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<RSSCategory[]>([]);
  const [preConfiguredSources, setPreConfiguredSources] = useState<PreConfiguredRSSSource[]>([]);
  const [userSources, setUserSources] = useState<UserRSSSource[]>([]);
  
  // UI state - シンプル化
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre>('すべて'); // 型安全に
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedReadStatus, setSelectedReadStatus] = useState('all');
  const [rssUrl, setRssUrl] = useState('');
  const [feedTabMode, setFeedTabMode] = useState(false);
  const [allOffAlertShown, setAllOffAlertShown] = useState(false);
  
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
      // Reset the all-off alert flag if any source is active again
      if (userSourcesData.some(s => s.is_active)) {
        setAllOffAlertShown(false);
      }
      
      // デフォルトソースの初期化（初回のみ）
      if (userSourcesData.length === 0) {
        await initializeDefaultRSSources();
      }
      
    } catch (error) {
      console.error('Error fetching RSS data:', error);
      Alert.alert('エラー', 'RSSデータの読み込みに失敗しました');
    } finally {
      setSourcesLoading(false);
    }
  }, [token]);

  const initializeDefaultRSSources = useCallback(async () => {
    if (!token) return;
    
    console.log('🔧 Setting up default RSS sources...');
    
    // 新しい包括的なデフォルトRSSソース（日米混合10選）
    const defaultSources = FEED_DEFAULT_RSS_SOURCES.map(source => ({
      name: source.name,
      url: source.url
    }));
    
    try {
      for (const source of defaultSources) {
        await RSSSourceService.addUserSource({
          custom_name: source.name,
          custom_url: source.url,
          is_active: true
        }, token);
        console.log(`✅ Initialized: ${source.name}`);
      }
      
      // 再読み込み
      const updatedUserSources = await RSSSourceService.getUserSources({}, token);
      setUserSources(updatedUserSources);
      
    } catch (error) {
      console.error('❌ Error initializing default sources:', error);
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
      // Check active RSS sources first; if none active, avoid API error and show guidance
      try {
        const sources = await RSSSourceService.getUserSources({}, token);
        const activeSources = sources.filter(s => s.is_active);
        if (activeSources.length === 0) {
          setAllArticles([]);
          if (!allOffAlertShown) {
            Alert.alert(
              'RSSソースがオフです',
              'すべてのRSSソースがオフになっているため、フィードに表示する記事がありません。設定の「RSS管理」でソースをオンにしてください。',
              [{ text: 'OK' }]
            );
            setAllOffAlertShown(true);
          }
          return;
        }
      } catch (e) {
        // If sources check fails, continue to try fetching articles to avoid blocking
        console.warn('[useRSSFeed] Could not check active sources. Proceeding to fetch articles.');
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
  }, [token, selectedReadStatus, allOffAlertShown]);  // selectedGenreを依存から削除

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles();
  }, [fetchArticles]);


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

  /**
   * クリーンなフィルタリングロジック
   * シンプルなジャンルフィルタリングのみ実装
   */
  const filteredArticles = useMemo(() => {
    console.log(`📊 Filtering ${allArticles.length} articles by genre: ${selectedGenre} and source: ${selectedSource}`);
    
    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const activeSourceNames = new Set(
      userSources.filter(s => s.is_active).map(s => norm((s as any).display_name || (s as any).name || ''))
    );

    let articles = allArticles
      // 安全策: アクティブなソースのみ表示（バックエンド不整合時のフェイルセーフ）
      .filter(a => activeSourceNames.size === 0 || activeSourceNames.has(norm(a.source_name)));

    // 1. ジャンルフィルタリング
    if (selectedGenre !== 'すべて') {
      articles = articles.filter(article => {
        const articleGenre = article.genre;
        if (articleGenre === selectedGenre) {
          return true;
        }
        if (!articleGenre && selectedGenre === 'その他') {
          return true;
        }
        return false;
      });
    }

    // 2. ソースフィルタリング（ソース名ベース）
    if (selectedSource !== 'all') {
      const sel = norm(selectedSource);
      articles = articles.filter(article => norm(article.source_name) === sel);
    }

    // 3. 既読ステータスフィルタ（必要時のみ）
    if (selectedReadStatus !== 'all') {
      articles = articles.filter(article => (article as any).read_status === selectedReadStatus);
    }

    console.log(`✅ Filtered to ${articles.length} articles`);
    return articles;
  }, [allArticles, selectedGenre, selectedSource, selectedReadStatus, userSources]);

  return {
    // State - クリーン化
    articles: filteredArticles,
    allArticles, // デバッグ用
    categories,
    preConfiguredSources,
    userSources,
    loading,
    refreshing,
    sourcesLoading,
    importing,
    showSourceModal,
    selectedGenre,
    selectedSource,
    selectedReadStatus,
    rssUrl,
    feedTabMode,
    audioGenerating,
    audioProgress,
    
    // Actions - シンプル化
    fetchArticles,
    fetchRSSData,
    onRefresh,
    addPreConfiguredSource,
    setShowSourceModal,
    setSelectedGenre, // 直接設定（複雑なロジック削除）
    setSelectedSource,
    setSelectedReadStatus,
    setRssUrl,
    setFeedTabMode,
    generateAudio,
  };
};
