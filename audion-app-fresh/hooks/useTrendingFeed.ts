/**
 * Trending Feed Hook
 * トレンド記事一覧ページ用のデータ管理
 * ArticleService.getTrendingArticles + フィルタ・ソート・Load More機能
 */

import { useState, useEffect, useMemo } from 'react';
import ArticleService, { Article } from '../services/ArticleService';
import { Genre } from '../types/rss';
import { applyGenreFilterForHome } from '../utils/genreUtils';

export type SortOrder = 'latest' | 'popular';

interface UseTrendingFeedReturn {
  // Data
  articles: Article[];
  visibleArticles: Article[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  
  // Filters
  selectedGenre: Genre;
  selectedSort: SortOrder;
  availableGenres: Genre[];
  
  // Pagination
  visibleCount: number;
  hasMore: boolean;
  
  // Actions
  setSelectedGenre: (genre: Genre) => void;
  setSelectedSort: (sort: SortOrder) => void;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

export const useTrendingFeed = (): UseTrendingFeedReturn => {
  // Data state
  const [rawArticles, setRawArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<Genre>('すべて');
  const [selectedSort, setSelectedSort] = useState<SortOrder>('popular');
  
  // Pagination state
  const [visibleCount, setVisibleCount] = useState(20);
  
  // Genre extraction
  const availableGenres = useMemo(() => {
    const genres = new Set<Genre>();
    rawArticles.forEach(article => {
      if (article.genre && article.genre !== 'その他') {
        genres.add(article.genre as Genre);
      }
    });
    return ['すべて', ...Array.from(genres)] as Genre[];
  }, [rawArticles]);
  
  // Apply filters and sorting
  const processedArticles = useMemo(() => {
    // Genre filtering
    let filtered = applyGenreFilterForHome(rawArticles, selectedGenre);
    
    // Sorting
    switch (selectedSort) {
      case 'latest':
        filtered = [...filtered].sort((a, b) => {
          const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
          const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'popular':
      default:
        // getTrendingArticles already sorted by trending score
        break;
    }
    
    return filtered;
  }, [rawArticles, selectedGenre, selectedSort]);
  
  // Visible articles for Load More
  const visibleArticles = useMemo(() => {
    return processedArticles.slice(0, visibleCount);
  }, [processedArticles, visibleCount]);
  
  const hasMore = processedArticles.length > visibleCount;
  
  // Load trending articles
  const loadTrendingArticles = async () => {
    try {
      setError(null);
      const articles = await ArticleService.getTrendingArticles(100); // Large limit for client-side filtering
      setRawArticles(articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トレンド記事の取得に失敗しました');
      console.error('Failed to load trending articles:', err);
    }
  };
  
  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadTrendingArticles();
      setLoading(false);
    };
    
    initialLoad();
  }, []);
  
  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedGenre, selectedSort]);
  
  // Actions
  const loadMore = () => {
    setVisibleCount(prev => prev + 10);
  };
  
  const refresh = async () => {
    setRefreshing(true);
    await loadTrendingArticles();
    setVisibleCount(20);
    setRefreshing(false);
  };
  
  return {
    // Data
    articles: processedArticles,
    visibleArticles,
    loading,
    refreshing,
    error,
    
    // Filters
    selectedGenre,
    selectedSort,
    availableGenres,
    
    // Pagination
    visibleCount,
    hasMore,
    
    // Actions
    setSelectedGenre,
    setSelectedSort,
    loadMore,
    refresh,
  };
};