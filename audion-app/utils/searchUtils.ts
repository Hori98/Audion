import { Article } from '../types';

// 共通の記事検索・フィルタリングロジック
export class SearchUtils {
  /**
   * 記事を検索クエリでフィルタリング
   */
  static filterArticlesByQuery(articles: Article[], searchQuery: string): Article[] {
    if (!searchQuery.trim()) {
      return articles;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return articles.filter(article => {
      return (
        article.title?.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.source_name?.toLowerCase().includes(query) ||
        article.genre?.toLowerCase().includes(query)
      );
    });
  }

  /**
   * 記事をジャンルでフィルタリング
   */
  static filterArticlesByGenre(articles: Article[], genre: string): Article[] {
    if (!genre || genre === 'All') {
      return articles;
    }
    
    return articles.filter(article => article.genre === genre);
  }

  /**
   * 記事をソースでフィルタリング
   */
  static filterArticlesBySource(articles: Article[], sourceName: string): Article[] {
    if (!sourceName || sourceName === 'All') {
      return articles;
    }
    
    return articles.filter(article => article.source_name === sourceName);
  }

  /**
   * 複合フィルタリング（検索クエリ + ジャンル + ソース）
   */
  static filterArticles(
    articles: Article[], 
    filters: {
      searchQuery?: string;
      genre?: string;
      source?: string;
    }
  ): Article[] {
    let filtered = articles;

    // 検索クエリでフィルタリング
    if (filters.searchQuery) {
      filtered = this.filterArticlesByQuery(filtered, filters.searchQuery);
    }

    // ジャンルでフィルタリング
    if (filters.genre) {
      filtered = this.filterArticlesByGenre(filtered, filters.genre);
    }

    // ソースでフィルタリング
    if (filters.source) {
      filtered = this.filterArticlesBySource(filtered, filters.source);
    }

    return filtered;
  }

  /**
   * 記事からユニークなジャンル一覧を取得
   */
  static getUniqueGenres(articles: Article[]): string[] {
    const genres = articles
      .map(article => article.genre)
      .filter(Boolean)
      .filter((genre, index, array) => array.indexOf(genre) === index)
      .sort();
    
    return ['All', ...genres];
  }

  /**
   * 記事からユニークなソース一覧を取得
   */
  static getUniqueSources(articles: Article[]): string[] {
    const sources = articles
      .map(article => article.source_name)
      .filter(Boolean)
      .filter((source, index, array) => array.indexOf(source) === index)
      .sort();
    
    return ['All', ...sources];
  }

  /**
   * 検索結果のハイライト用ヘルパー
   */
  static highlightSearchTerm(text: string, searchQuery: string): string {
    if (!searchQuery.trim()) {
      return text;
    }

    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * 検索クエリの正規化
   */
  static normalizeSearchQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  /**
   * 検索履歴の管理
   */
  static async saveSearchHistory(query: string, storageKey: string = 'search_history'): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const existingHistory = await AsyncStorage.getItem(storageKey);
      let history: string[] = existingHistory ? JSON.parse(existingHistory) : [];
      
      // 重複削除 & 先頭に追加
      history = history.filter(item => item !== query);
      history.unshift(query);
      
      // 最大10件まで保持
      history = history.slice(0, 10);
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.warn('Error saving search history:', error);
    }
  }

  /**
   * 検索履歴の取得
   */
  static async getSearchHistory(storageKey: string = 'search_history'): Promise<string[]> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const history = await AsyncStorage.getItem(storageKey);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('Error loading search history:', error);
      return [];
    }
  }
}

export default SearchUtils;