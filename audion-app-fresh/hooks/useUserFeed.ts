import { useState, useEffect, useCallback } from 'react';
import { Genre } from '../types/rss';
import ArticleService, { Article } from '../services/ArticleService';
import RSSSourceService, { UserRSSSource } from '../services/RSSSourceService';

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
  selectedReadStatus: 'all' | 'unread' | 'read' | 'saved';
}

interface UseUserFeedActions {
  fetchArticles: () => Promise<void>;
  refreshArticles: () => Promise<void>;
  fetchUserSources: () => Promise<void>;
  
  // Filtering
  setSelectedGenre: (genre: Genre) => void;
  setSelectedSource: (source: string) => void;
  setSelectedReadStatus: (status: 'all' | 'unread' | 'read' | 'saved') => void;
  
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
  const [selectedReadStatus, setSelectedReadStatus] = useState<'all' | 'unread' | 'read' | 'saved'>('all');

  // クライアントサイドフィルタリング
  const applyFilters = useCallback((sourceArticles: Article[]) => {
    let filtered = [...sourceArticles];

    // ジャンルフィルタ
    if (selectedGenre !== 'すべて') {
      filtered = filtered.filter(article => article.genre === selectedGenre);
    }

    // ソースフィルタ
    if (selectedSource !== 'all') {
      filtered = filtered.filter(article => 
        article.source_name === selectedSource || article.source_id === selectedSource
      );
    }

    // 既読状態フィルタ
    if (selectedReadStatus !== 'all') {
      filtered = filtered.filter(article => article.read_status === selectedReadStatus);
    }

    return filtered;
  }, [selectedGenre, selectedSource, selectedReadStatus]);

  // ユーザー登録RSS記事取得
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // FEEDタブ用：ユーザー登録RSSからの記事取得
      const response = await ArticleService.getArticlesWithReadStatus({
        per_page: 50,
        genre: selectedGenre !== 'すべて' ? selectedGenre : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined,
        read_filter: selectedReadStatus
      });

      // レスポンス安全性チェック
      if (!response) {
        throw new Error('API response is null or undefined');
      }

      const articles = response.articles || [];
      setArticles(articles);
      setFilteredArticles(applyFilters(articles));
      
      console.log(`✅ [useUserFeed] Fetched ${articles.length} articles successfully`);
      
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
  }, [selectedGenre, selectedSource, selectedReadStatus, applyFilters]);

  // プルツーリフレッシュ
  const refreshArticles = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await ArticleService.getArticlesWithReadStatus({
        per_page: 50,
        genre: selectedGenre !== 'すべて' ? selectedGenre : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined,
        read_filter: selectedReadStatus
      });

      if (!response) {
        throw new Error('Refresh API response is null or undefined');
      }
      
      const articles = response.articles || [];
      setArticles(articles);
      setFilteredArticles(applyFilters(articles));
      
      console.log(`✅ [useUserFeed] Refreshed ${articles.length} articles successfully`);
      
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
  }, [selectedGenre, selectedSource, selectedReadStatus, applyFilters]);

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

  // フィルター変更時の記事更新
  const handleSetSelectedGenre = useCallback((genre: Genre) => {
    setSelectedGenre(genre);
    setFilteredArticles(applyFilters(articles));
  }, [articles, applyFilters]);

  const handleSetSelectedSource = useCallback((source: string) => {
    setSelectedSource(source);
    setFilteredArticles(applyFilters(articles));
  }, [articles, applyFilters]);

  const handleSetSelectedReadStatus = useCallback((status: 'all' | 'unread' | 'read' | 'saved') => {
    setSelectedReadStatus(status);
    setFilteredArticles(applyFilters(articles));
  }, [articles, applyFilters]);

  // 初期化
  useEffect(() => {
    fetchUserSources();
    fetchArticles();
  }, []);

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
    
    // Actions
    fetchArticles,
    refreshArticles,
    fetchUserSources,
    setSelectedGenre: handleSetSelectedGenre,
    setSelectedSource: handleSetSelectedSource,
    setSelectedReadStatus: handleSetSelectedReadStatus,
    addRSSSource,
    deleteRSSSource,
    toggleRSSSource,
  };
}

export default useUserFeed;