/**
 * RSS Feed Custom Hook - ビジネスロジック層
 * UI刷新時の影響を避けるため、ロジックを完全分離
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import RSSSourceService, { 
  RSSCategory, 
  PreConfiguredRSSSource, 
  UserRSSSource 
} from '../services/RSSSourceService';
import ArticleService, { Article } from '../services/ArticleService';
import AudioService, { AudioGenerationResponse, AudioStatusResponse } from '../services/AudioService';

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
  setRssUrl: (url: string) => void;
  
  // Audio generation
  generateAudio: (articleId: string, articleTitle: string) => Promise<void>;
}

export const useRSSFeed = (): RSSFeedState & RSSFeedActions => {
  const { token } = useAuth();
  
  // Data state
  const [articles, setArticles] = useState<Article[]>([]);
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
    try {
      // Debug: Check if token exists
      console.log('🔑 [DEBUG] Checking auth token...');
      console.log('🔑 [DEBUG] Token from useAuth:', token ? 'EXISTS' : 'MISSING');
      
      if (!token) {
        console.error('🚨 [DEBUG] No auth token available - using mock data');
        // Fallback to mock data for demo purposes
        const mockArticles = [
          {
            id: 'mock-1',
            title: '【暫定データ】AI技術の最新動向について',
            summary: '人工知能技術の最新トレンドと今後の展望について解説します。',
            url: 'https://www3.nhk.or.jp/news/',
            source_name: 'NHK NEWS WEB',
            published_at: new Date().toISOString(),
            category: 'technology',
            reading_time: 5,
            audio_available: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'mock-2', 
            title: '【暫定データ】経済市場の最新レポート',
            summary: '今週の経済動向と市場分析をお届けします。',
            url: 'https://www.nikkei.com/',
            source_name: '日本経済新聞',
            published_at: new Date(Date.now() - 3600000).toISOString(),
            category: 'business',
            reading_time: 8,
            audio_available: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setArticles(mockArticles);
        return;
      }
      
      console.log('📰 [DEBUG] Fetching articles...');
      const data = await ArticleService.getArticles({ per_page: 20 });
      console.log('📰 [DEBUG] Articles fetched successfully:', data.articles.length, 'items');
      setArticles(data.articles);
    } catch (error) {
      console.error('❌ [DEBUG] Error fetching articles:', error);
      console.log('🔄 [DEBUG] Falling back to mock data due to error');
      
      // Fallback to mock data when API fails
      const mockArticles = [
        {
          id: 'fallback-1',
          title: '【API エラー時のフォールバック】サンプル記事 1',
          summary: 'APIエラーのため、サンプルデータを表示しています。',
          url: 'https://www3.nhk.or.jp/news/',
          source_name: 'Mock Data',
          published_at: new Date().toISOString(),
          category: 'news',
          reading_time: 3,
          audio_available: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setArticles(mockArticles);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

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
      Alert.alert(
        '音声生成',
        `"${articleTitle}"の音声を生成しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '生成開始',
            onPress: async () => {
              try {
                // Set generating state
                setAudioGenerating(prev => ({ ...prev, [articleId]: true }));
                
                // Start audio generation
                const response = await AudioService.generateAudio({
                  article_id: articleId,
                  title: articleTitle,
                  language: 'ja',
                  voice_type: 'standard'
                }, token);
                
                Alert.alert('成功', '音声生成を開始しました。完了まで数分お待ちください。');
                
                // Poll status with progress updates
                AudioService.pollAudioStatus(
                  response.id,
                  token,
                  (status) => {
                    setAudioProgress(prev => ({ ...prev, [articleId]: status }));
                  },
                  3000 // Poll every 3 seconds
                )
                .then((finalStatus) => {
                  setAudioGenerating(prev => ({ ...prev, [articleId]: false }));
                  if (finalStatus.status === 'completed') {
                    Alert.alert('完了', '音声生成が完了しました！');
                  }
                })
                .catch((error) => {
                  console.error('Audio generation polling failed:', error);
                  setAudioGenerating(prev => ({ ...prev, [articleId]: false }));
                  Alert.alert('エラー', '音声生成に失敗しました');
                });
                
              } catch (error) {
                console.error('Error generating audio:', error);
                setAudioGenerating(prev => ({ ...prev, [articleId]: false }));
                const errorMessage = error instanceof Error ? error.message : '音声生成に失敗しました';
                Alert.alert('エラー', errorMessage);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in generateAudio:', error);
    }
  }, [token, audioGenerating]);

  // Initialize data on mount
  useEffect(() => {
    fetchArticles();
    fetchRSSData();
  }, [fetchArticles, fetchRSSData]);

  return {
    // State
    articles,
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
    setSelectedGenre,
    setRssUrl,
    generateAudio,
  };
};