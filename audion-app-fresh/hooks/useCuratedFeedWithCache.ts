import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ArticleService, { Article } from '../services/ArticleService';
import { Genre } from '../types/rss';
import { getAvailableGenresForHome, applyGenreFilterForHome } from '../utils/genreUtils';

interface UseCuratedFeedState {
  articles: Article[];
  filteredArticles: Article[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  selectedGenre: Genre;
  availableGenres: Genre[];
  isCachedData: boolean; // キャッシュデータかどうか
}

interface UseCuratedFeedActions {
  fetchArticles: () => Promise<void>;
  refreshArticles: () => Promise<void>;
  setSelectedGenre: (genre: Genre) => void;
}

/**
 * キャッシュ対応版 useCuratedFeed - 即座起動対応
 * - AsyncStorage による記事キャッシュ
 * - キャッシュファーストロード → バックグラウンド更新
 * - 開発環境でも瞬時起動を実現
 */
export function useCuratedFeedWithCache(): UseCuratedFeedState & UseCuratedFeedActions {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre>('すべて');
  const [availableGenres, setAvailableGenres] = useState<Genre[]>(['すべて']);
  const [isCachedData, setIsCachedData] = useState(false);

  const CACHE_KEY = '@audion_curated_articles';
  const CACHE_TIMESTAMP_KEY = '@audion_curated_timestamp';
  const CACHE_TTL = 10 * 60 * 1000; // 10分間有効

  // キャッシュからの読み込み
  const loadFromCache = useCallback(async (): Promise<Article[] | null> => {
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_TIMESTAMP_KEY)
      ]);

      if (!cachedData || !cachedTimestamp) {
        return null;
      }

      const timestamp = parseInt(cachedTimestamp);
      const isExpired = Date.now() - timestamp > CACHE_TTL;

      if (isExpired) {
        console.log('📦 [CuratedFeed] Cache expired, will fetch fresh data');
        return null;
      }

      const articles: Article[] = JSON.parse(cachedData);
      console.log(`📦 [CuratedFeed] Loaded ${articles.length} articles from cache`);
      return articles;

    } catch (error) {
      console.error('📦 [CuratedFeed] Cache load error:', error);
      return null;
    }
  }, []);

  // キャッシュへの保存
  const saveToCache = useCallback(async (articles: Article[]) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(articles)),
        AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
      ]);
      console.log(`📦 [CuratedFeed] Cached ${articles.length} articles`);
    } catch (error) {
      console.error('📦 [CuratedFeed] Cache save error:', error);
    }
  }, []);

  // フィルタリング
  const applyFilters = useCallback((sourceArticles: Article[], genre: Genre) => {
    return applyGenreFilterForHome(sourceArticles, genre);
  }, []);

  // API から記事取得
  const fetchFromAPI = useCallback(async (): Promise<Article[]> => {
    const curatedArticles = await ArticleService.getCuratedArticles(
      undefined, // ジャンルフィルタなし
      50
    );
    return curatedArticles;
  }, []);

  // キャッシュファースト記事取得
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. まずキャッシュから即座に読み込み
      const cachedArticles = await loadFromCache();
      if (cachedArticles && cachedArticles.length > 0) {
        setArticles(cachedArticles);
        setAvailableGenres(getAvailableGenresForHome(cachedArticles));
        setFilteredArticles(cachedArticles);
        setIsCachedData(true);
        console.log('⚡ [CuratedFeed] Instant load from cache completed');
      }

      // 2. バックグラウンドでAPIから最新データ取得
      try {
        const freshArticles = await fetchFromAPI();
        
        // 3. 新しいデータをUIと キャッシュに反映
        setArticles(freshArticles);
        setAvailableGenres(getAvailableGenresForHome(freshArticles));
        setFilteredArticles(freshArticles);
        setIsCachedData(false);
        await saveToCache(freshArticles);
        
        console.log('🔄 [CuratedFeed] Background refresh completed');
      } catch (apiError) {
        // APIエラー時はキャッシュデータで継続
        if (!cachedArticles) {
          throw apiError; // キャッシュもない場合はエラー表示
        }
        console.warn('🔄 [CuratedFeed] API failed, using cached data');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch curated articles';
      setError(errorMessage);
      console.error('❌ [CuratedFeed] Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, fetchFromAPI, saveToCache]);

  // 明示的リフレッシュ (プルツーリフレッシュ)
  const refreshArticles = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // 強制的にAPIから取得
      const freshArticles = await fetchFromAPI();
      setArticles(freshArticles);
      setAvailableGenres(getAvailableGenresForHome(freshArticles));
      setFilteredArticles(freshArticles);
      setIsCachedData(false);
      await saveToCache(freshArticles);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh curated articles';
      setError(errorMessage);
      console.error('❌ [CuratedFeed] Error refreshing articles:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFromAPI, saveToCache]);

  // ジャンル変更
  const handleSetSelectedGenre = useCallback((genre: Genre) => {
    setSelectedGenre(genre);
  }, []);

  // 初期化 - アプリ起動時に瞬時ロード
  useEffect(() => {
    fetchArticles();
  }, []);

  return {
    // State
    articles,
    filteredArticles,
    loading,
    error,
    refreshing,
    selectedGenre,
    availableGenres,
    isCachedData,
    
    // Actions
    fetchArticles,
    refreshArticles,
    setSelectedGenre: handleSetSelectedGenre,
  };
}

export default useCuratedFeedWithCache;