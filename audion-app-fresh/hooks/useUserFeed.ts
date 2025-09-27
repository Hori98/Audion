import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Genre } from '../types/rss';
import ArticleService, { Article } from '../services/ArticleService';
import RSSSourceService, { UserRSSSource } from '../services/RSSSourceService';
import RSSChangeNotifier from '../services/RSSChangeNotifier';
import { getAvailableGenres, applyGenreFilter, handleSourceChange } from '../utils/genreUtils';

interface UseUserFeedState {
  articles: Article[];
  filteredArticles: Article[];
  userSources: UserRSSSource[];
  loading: boolean;
  refreshing: boolean;
  sourcesLoading: boolean;
  error: string | null;

  // Filter states
  selectedGenre: Genre;
  selectedSource: string;
  selectedReadStatus: 'all' | 'unread' | 'read';
  availableGenres: Genre[];
}

interface UseUserFeedActions {
  fetchArticles: () => Promise<void>;
  refreshArticles: () => Promise<void>;
  fetchUserSources: () => Promise<void>;

  // Filtering
  setSelectedGenre: (genre: Genre) => void;
  setSelectedSource: (source: string) => void;
  setSelectedReadStatus: (status: 'all' | 'unread' | 'read') => void;

  // Read status management
  markArticleAsRead: (articleId: string) => void;

  // Source management
  addRSSSource: (name: string, url: string) => Promise<boolean>;
  deleteRSSSource: (sourceId: string) => Promise<boolean>;
  toggleRSSSource: (sourceId: string, isActive: boolean) => Promise<boolean>;
}

/**
 * FEEDタブ専用：ユーザー登録RSSからの記事管理
 * - ユーザーが追加・管理するRSSソース
 * - ソース・ジャンル・既読状態でのフィルタリング
 * - HOMEタブとは完全分離
 */
export function useUserFeed(): UseUserFeedState & UseUserFeedActions {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [userSources, setUserSources] = useState<UserRSSSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedGenre, setSelectedGenre] = useState<Genre>('すべて');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedReadStatus, setSelectedReadStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [availableGenres, setAvailableGenres] = useState<Genre[]>(['すべて']);

  // 既読記事IDのセット（30日間保持、シンプルなクライアントサイド管理）
  const [readArticleIds, setReadArticleIds] = useState<Set<string>>(new Set());

  // 既読データの有効期限（30日間）
  const READ_DATA_TTL = 30 * 24 * 60 * 60 * 1000; // 30日をミリ秒で表現

  // 共通ユーティリティを使用した利用可能ジャンル計算
  const getAvailableGenresForFeed = useCallback((sourceArticles: Article[], currentSource: string) => {
    return getAvailableGenres(sourceArticles, currentSource);
  }, []);

  // 共通ユーティリティを使用したフィルタリング（既読状態追加）
  const applyFilters = useCallback((sourceArticles: Article[]) => {
    // 1. ソース・ジャンルフィルタを共通ユーティリティで適用
    let filtered = applyGenreFilter(sourceArticles, selectedGenre, selectedSource);

    // 2. 既読状態フィルタ（最後に適用）
    if (selectedReadStatus === 'read') {
      filtered = filtered.filter(article => readArticleIds.has(article.id));
    } else if (selectedReadStatus === 'unread') {
      filtered = filtered.filter(article => !readArticleIds.has(article.id));
    }

    return filtered;
  }, [selectedGenre, selectedSource, selectedReadStatus, readArticleIds]);

  // ユーザー登録RSS記事取得
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // FEEDタブ用：ユーザー登録RSSからの記事取得（シンプルバージョン）
      const response = await ArticleService.getArticles({
        per_page: 50,
        genre: selectedGenre !== 'すべて' ? selectedGenre : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined
      });

      // レスポンス安全性チェック
      if (!response) {
        throw new Error('API response is null or undefined');
      }

      const articles = response.articles || [];
      setArticles(articles);
      setAvailableGenres(getAvailableGenresForFeed(articles, selectedSource));
      setFilteredArticles(applyFilters(articles));
      
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user RSS articles';
      setError(errorMessage);
      console.error('❌ [useUserFeed] Error fetching articles:', err);
      
      // エラー時は空配列をセット
      setArticles([]);
      setFilteredArticles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, selectedSource, applyFilters]);

  // プルツーリフレッシュ
  const refreshArticles = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await ArticleService.getArticles({
        per_page: 50,
        genre: selectedGenre !== 'すべて' ? selectedGenre : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined
      });

      if (!response) {
        throw new Error('Refresh API response is null or undefined');
      }
      
      const articles = response.articles || [];
      setArticles(articles);
      setAvailableGenres(getAvailableGenresForFeed(articles, selectedSource));
      setFilteredArticles(applyFilters(articles));
      
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh articles';
      setError(errorMessage);
      console.error('❌ [useUserFeed] Error refreshing articles:', err);
      
      // エラー時は空配列をセット
      setArticles([]);
      setFilteredArticles([]);
    } finally {
      setRefreshing(false);
    }
  }, [selectedGenre, selectedSource, applyFilters]);

  // ユーザーRSSソース取得
  const fetchUserSources = useCallback(async () => {
    try {
      setSourcesLoading(true);
      const sources = await RSSSourceService.getUserSources({});
      setUserSources(sources);
    } catch (err) {
      console.error('❌ [useUserFeed] Error fetching user sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  // RSSソース追加
  const addRSSSource = useCallback(async (name: string, url: string): Promise<boolean> => {
    try {
      await RSSSourceService.addUserSource({ custom_name: name, custom_url: url });
      await fetchUserSources(); // ソース一覧更新
      await fetchArticles(); // 記事一覧更新
      return true;
    } catch (err) {
      console.error('❌ [useUserFeed] Error adding RSS source:', err);
      return false;
    }
  }, [fetchUserSources, fetchArticles]);

  // RSSソース削除
  const deleteRSSSource = useCallback(async (sourceId: string): Promise<boolean> => {
    try {
      await RSSSourceService.deleteUserSource(sourceId);
      await fetchUserSources();
      await fetchArticles();
      return true;
    } catch (err) {
      console.error('❌ [useUserFeed] Error deleting RSS source:', err);
      return false;
    }
  }, [fetchUserSources, fetchArticles]);

  // RSSソース有効化切り替え
  const toggleRSSSource = useCallback(async (sourceId: string, isActive: boolean): Promise<boolean> => {
    try {
      await RSSSourceService.updateUserSource(sourceId, { is_active: isActive });
      await fetchUserSources();
      await fetchArticles();
      return true;
    } catch (err) {
      console.error('❌ [useUserFeed] Error toggling RSS source:', err);
      return false;
    }
  }, [fetchUserSources, fetchArticles]);

  // 期限切れの既読データを削除
  const cleanupExpiredReadData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@audion_read_articles');
      if (!stored) return;

      const readData = JSON.parse(stored);
      const now = Date.now();

      const validData = readData.filter((item: any) => {
        const readTime = new Date(item.timestamp || item.read_at || 0).getTime();
        return (now - readTime) < READ_DATA_TTL;
      });

      if (validData.length !== readData.length) {
        await AsyncStorage.setItem('@audion_read_articles', JSON.stringify(validData));
        const validIds = new Set(validData.map((item: any) => item.id));
        setReadArticleIds(validIds);
      }
    } catch (error) {
      console.error('既読データのクリーンアップに失敗:', error);
    }
  }, [READ_DATA_TTL]);

  // 既読記事をマーク（30日間保持）
  const markArticleAsRead = useCallback(async (articleId: string) => {
    const timestamp = new Date().toISOString();

    try {
      const stored = await AsyncStorage.getItem('@audion_read_articles');
      const existingData = stored ? JSON.parse(stored) : [];

      const newData = [
        ...existingData.filter((item: any) => item.id !== articleId),
        { id: articleId, timestamp, read_at: timestamp }
      ];

      await AsyncStorage.setItem('@audion_read_articles', JSON.stringify(newData));

      setReadArticleIds(prev => {
        const newSet = new Set(prev);
        newSet.add(articleId);
        return newSet;
      });
    } catch (error) {
      console.error('既読状態の保存に失敗:', error);
      // フォールバック：メモリ内のみの更新
      setReadArticleIds(prev => {
        const newSet = new Set(prev);
        newSet.add(articleId);
        return newSet;
      });
    }
  }, []);

  // アプリ起動時に既読データを復元
  const loadReadArticles = useCallback(async () => {
    try {
      await cleanupExpiredReadData(); // まず期限切れデータを削除

      const stored = await AsyncStorage.getItem('@audion_read_articles');
      if (stored) {
        const readData = JSON.parse(stored);
        const readIds = new Set(readData.map((item: any) => item.id));
        setReadArticleIds(readIds);
      }
    } catch (error) {
      console.error('既読データの読み込みに失敗:', error);
    }
  }, [cleanupExpiredReadData]);

  // フィルター変更時の記事更新（useEffectで自動更新）
  const handleSetSelectedGenre = useCallback((genre: Genre) => {
    setSelectedGenre(genre);
  }, []);

  const handleSetSelectedSource = useCallback((source: string) => {
    handleSourceChange(
      source,
      articles,
      setSelectedSource,
      setSelectedGenre,
      setAvailableGenres
    );
  }, [articles]);

  const handleSetSelectedReadStatus = useCallback((status: 'all' | 'unread' | 'read') => {
    setSelectedReadStatus(status);
  }, []);

  // RSS変更監視とアプリフォアグラウンド復帰時のリロード
  useEffect(() => {

    // RSS変更イベントリスナー
    const unsubscribeRSSChanges = RSSChangeNotifier.subscribeToRSSChanges((event) => {

      // RSS変更時は両方の情報を更新
      fetchUserSources();
      fetchArticles();
    });

    // アプリがフォアグラウンドに復帰したときのリロード
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {

        // フォアグラウンド復帰時は最新データを取得
        fetchUserSources();
        fetchArticles();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // クリーンアップ
    return () => {
      unsubscribeRSSChanges();
      subscription?.remove();
    };
  }, [fetchUserSources, fetchArticles]);

  // フィルター状態が変更された時にフィルタリングを更新
  useEffect(() => {
    setFilteredArticles(applyFilters(articles));
  }, [readArticleIds, articles, selectedGenre, selectedSource, selectedReadStatus, applyFilters]);

  // 初期化
  useEffect(() => {
    loadReadArticles(); // 既読データを復元
    fetchUserSources();
    fetchArticles();
  }, [loadReadArticles]);

  return {
    // State
    articles,
    filteredArticles,
    userSources,
    loading,
    refreshing,
    sourcesLoading,
    error,
    selectedGenre,
    selectedSource,
    selectedReadStatus,
    availableGenres,
    
    // Actions
    fetchArticles,
    refreshArticles,
    fetchUserSources,
    setSelectedGenre: handleSetSelectedGenre,
    setSelectedSource: handleSetSelectedSource,
    setSelectedReadStatus: handleSetSelectedReadStatus,
    markArticleAsRead,
    addRSSSource,
    deleteRSSSource,
    toggleRSSSource,
  };
}

export default useUserFeed;