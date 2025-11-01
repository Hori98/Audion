import { useState, useEffect, useCallback } from 'react';
import ArticleService, { Article } from '../services/ArticleService';
import { Genre } from '../types/rss';
import { HOME_FIXED_RSS_SOURCES } from '../data/rss-sources';
import { getAvailableGenresForHome, applyGenreFilterForHome, generateGenreTabs } from '../utils/genreUtils';
import { useSettings } from '../context/SettingsContext';

interface UseCuratedFeedState {
  articles: Article[];
  filteredArticles: Article[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  selectedGenre: Genre;
  availableGenres: Genre[];
  priorityGenres: Genre[];
}

interface UseCuratedFeedActions {
  fetchArticles: () => Promise<void>;
  refreshArticles: () => Promise<void>;
  setSelectedGenre: (genre: Genre) => void;
  setPriorityGenres: (genres: Genre[]) => void;
}

/**
 * HOMEタブ専用：システム固定RSSからのキュレーション記事管理
 * - jp_rss_sources.jsonからの記事取得
 * - クライアントサイドジャンルフィルタリング
 * - FEEDタブとは完全分離
 */
export function useCuratedFeed(): UseCuratedFeedState & UseCuratedFeedActions {
  const { settings } = useSettings();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre>('すべて');
  const [availableGenres, setAvailableGenres] = useState<Genre[]>(['すべて']);
  const [priorityGenres, setPriorityGenres] = useState<Genre[]>([]);

  // Home専用ユーティリティを使用したフィルタリング（ソースフィルタなし）
  // 優先ジャンル対応版
  const applyFilters = useCallback((sourceArticles: Article[], genre: Genre) => {
    return applyGenreFilterForHome(sourceArticles, genre, priorityGenres);
  }, [priorityGenres]);

  // キュレーション記事取得 - フィルタリングなしで全記事を取得
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ユーザーの言語設定を取得して言語フィルタリングを適用
      const userLanguage = settings.general.language;
      console.log('🌍 [useCuratedFeed] Using language setting:', userLanguage);

      const curatedArticles = await ArticleService.getCuratedArticles(
        undefined, // ジャンルフィルタなし
        50,
        undefined, // セクションフィルタなし
        userLanguage // 言語設定を渡す
      );
      setArticles(curatedArticles);
      setAvailableGenres(getAvailableGenresForHome(curatedArticles));
      setFilteredArticles(curatedArticles); // フィルタリングなしで全記事を設定
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch curated articles';
      setError(errorMessage);
      console.error('❌ [useCuratedFeed] Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, [settings.general.language]);

  // プルツーリフレッシュ - フィルタリングなしで全記事を取得
  const refreshArticles = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // ユーザーの言語設定を取得して言語フィルタリングを適用
      const userLanguage = settings.general.language;
      console.log('🔄 [useCuratedFeed] Refreshing with language setting:', userLanguage);

      const curatedArticles = await ArticleService.getCuratedArticles(
        undefined, // ジャンルフィルタなし
        50,
        undefined, // セクションフィルタなし
        userLanguage // 言語設定を渡す
      );
      setArticles(curatedArticles);
      setAvailableGenres(getAvailableGenresForHome(curatedArticles));
      setFilteredArticles(curatedArticles); // フィルタリングなしで全記事を設定
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh curated articles';
      setError(errorMessage);
      console.error('❌ [useCuratedFeed] Error refreshing articles:', err);
    } finally {
      setRefreshing(false);
    }
  }, [settings.general.language]);

  // ジャンル変更時のハンドラー - フィルタリングはコンポーネント側で実行
  const handleSetSelectedGenre = useCallback((genre: Genre) => {
    setSelectedGenre(genre);
    // フィルタリングはコンポーネント側で実行するため、ここではジャンルのみ更新
  }, []);

  // 初期化
  useEffect(() => {
    fetchArticles();
  }, []); // selectedGenreは依存に含めない（fetchArticles内で処理）

  return {
    // State
    articles,
    filteredArticles,
    loading,
    error,
    refreshing,
    selectedGenre,
    availableGenres,
    priorityGenres,
    
    // Actions
    fetchArticles,
    refreshArticles,
    setSelectedGenre: handleSetSelectedGenre,
    setPriorityGenres,
  };
}

export default useCuratedFeed;