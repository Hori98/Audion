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

  // キュレーション記事取得
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const curatedArticles = await ArticleService.getCuratedArticles();
      
      setArticles(curatedArticles);
      setFilteredArticles(applyFilters(curatedArticles, selectedGenre));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch curated articles';
      setError(errorMessage);
      console.error('❌ [useCuratedFeed] Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, applyFilters]);

  // プルツーリフレッシュ
  const refreshArticles = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const curatedArticles = await ArticleService.getCuratedArticles();
      
      setArticles(curatedArticles);
      setFilteredArticles(applyFilters(curatedArticles, selectedGenre));
      
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