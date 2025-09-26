import { useState, useEffect, useCallback } from 'react';
import ArticleService, { Article } from '../services/ArticleService';
import { Genre } from '../types/rss';

interface UseCuratedFeedState {
  articles: Article[];
  filteredArticles: Article[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  selectedGenre: Genre;
}

interface UseCuratedFeedActions {
  fetchArticles: () => Promise<void>;
  refreshArticles: () => Promise<void>;
  setSelectedGenre: (genre: Genre) => void;
}

/**
 * HOMEタブ専用：システム固定RSSからのキュレーション記事管理
 * - jp_rss_sources.jsonからの記事取得
 * - クライアントサイドジャンルフィルタリング
 * - FEEDタブとは完全分離
 */
export function useCuratedFeed(): UseCuratedFeedState & UseCuratedFeedActions {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre>('すべて');

  // クライアントサイドフィルタリング
  const applyFilters = useCallback((sourceArticles: Article[], genre: Genre) => {
    let filtered = [...sourceArticles];

    // ジャンルフィルタ
    if (genre !== 'すべて') {
      filtered = filtered.filter(article => article.genre === genre);
    }

    return filtered;
  }, []);

  // キュレーション記事取得（プログレッシブローディング対応）
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Phase 1: プログレッシブモードでキャッシュデータを即座に取得
      const cachedResult = await ArticleService.getCuratedArticles({
        genre: selectedGenre !== 'すべて' ? selectedGenre : undefined,
        maxArticles: 50,
        progressiveMode: true,
      });

      if (cachedResult.articles.length > 0) {
        console.log('📱 [useCuratedFeed] Loaded from cache:', cachedResult.articles.length);
        setArticles(cachedResult.articles);
        setFilteredArticles(applyFilters(cachedResult.articles, selectedGenre));
        setLoading(false); // キャッシュデータが表示できたのでローディング終了
      }

      // Phase 2: バックグラウンドで最新データを取得（背景で更新される）
      try {
        const freshResult = await ArticleService.getCuratedArticles({
          genre: selectedGenre !== 'すべて' ? selectedGenre : undefined,
          maxArticles: 50,
          forceRefresh: true,
        });

        console.log('🌐 [useCuratedFeed] Fresh data loaded:', freshResult.articles.length);
        setArticles(freshResult.articles);
        setFilteredArticles(applyFilters(freshResult.articles, selectedGenre));
      } catch (freshError) {
        // 最新データ取得失敗時はキャッシュデータを維持
        console.warn('⚠️ [useCuratedFeed] Fresh data failed, keeping cache:', freshError);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch curated articles';
      setError(errorMessage);
      console.error('❌ [useCuratedFeed] Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, applyFilters]);

  // プルツーリフレッシュ（強制リフレッシュ）
  const refreshArticles = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // プルツーリフレッシュの場合は強制的に最新データを取得
      const freshResult = await ArticleService.getCuratedArticles({
        genre: selectedGenre !== 'すべて' ? selectedGenre : undefined,
        maxArticles: 50,
        forceRefresh: true,
      });

      console.log('🔄 [useCuratedFeed] Force refreshed articles:', freshResult.articles.length);
      setArticles(freshResult.articles);
      setFilteredArticles(applyFilters(freshResult.articles, selectedGenre));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh curated articles';
      setError(errorMessage);
      console.error('❌ [useCuratedFeed] Error refreshing articles:', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedGenre, applyFilters]);

  // ジャンル変更時のフィルタリング更新
  const handleSetSelectedGenre = useCallback((genre: Genre) => {
    setSelectedGenre(genre);
    setFilteredArticles(applyFilters(articles, genre));
  }, [articles, applyFilters]);

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
    
    // Actions
    fetchArticles,
    refreshArticles,
    setSelectedGenre: handleSetSelectedGenre,
  };
}

export default useCuratedFeed;