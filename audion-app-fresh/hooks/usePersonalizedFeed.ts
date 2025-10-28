/**
 * Personalized Feed Hook
 * おすすめ記事一覧ページ用のデータ管理
 * ArticleService.getPersonalizedArticles + フィルタ・ソート・Load More機能
 */

import { useState, useEffect, useMemo } from 'react';
import ArticleService, { Article } from '../services/ArticleService';
import { Genre } from '../types/rss';
import { applyGenreFilterForHome } from '../utils/genreUtils';
import { useAuth } from '../context/AuthContext';

export type SortOrder = 'latest' | 'popular';

interface UsePersonalizedFeedReturn {
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

export const usePersonalizedFeed = (): UsePersonalizedFeedReturn => {
  const { user } = useAuth();
  
  // Data state
  const [rawArticles, setRawArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<Genre>('すべて');
  const [selectedSort, setSelectedSort] = useState<SortOrder>('latest');
  
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
        // For personalized, use engagement as popular metric
        filtered = ArticleService.sortArticlesByEngagement(filtered);
        break;
      default:
        break;
    }
    
    return filtered;
  }, [rawArticles, selectedGenre, selectedSort]);
  
  // Visible articles for Load More
  const visibleArticles = useMemo(() => {
    return processedArticles.slice(0, visibleCount);
  }, [processedArticles, visibleCount]);
  
  const hasMore = processedArticles.length > visibleCount;
  
  // Load personalized articles
  const loadPersonalizedArticles = async () => {
    try {
      setError(null);
      
      if (!user?.id) {
        // Fallback to curated articles if user not available
        const articles = await ArticleService.getCuratedArticles();
        setRawArticles(articles);
        return;
      }
      
      const articles = await ArticleService.getPersonalizedArticles(user.id, 100); // Large limit for client-side filtering
      setRawArticles(articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'おすすめ記事の取得に失敗しました');
      console.error('Failed to load personalized articles:', err);
    }
  };
  
  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadPersonalizedArticles();
      setLoading(false);
    };
    
    initialLoad();
  }, [user?.id]);
  
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
    await loadPersonalizedArticles();
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