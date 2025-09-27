/**
 * ジャンルフィルタリング共通ユーティリティ
 * HomeタブとFeedタブで共通使用
 */

import { Genre, AVAILABLE_GENRES } from '../types/rss';
import { Article } from '../services/ArticleService';

/**
 * 利用可能なジャンルを動的に計算
 * ソースフィルタ適用後の記事から実際に存在するジャンルのみを抽出
 */
export const getAvailableGenres = (
  sourceArticles: Article[],
  currentSource: string = 'all'
): Genre[] => {
  const genresWithArticles = new Set<Genre>();
  genresWithArticles.add('すべて'); // 常に表示

  // ソースフィルタを適用してからジャンルを計算
  let articlesToCheck = sourceArticles;
  if (currentSource !== 'all') {
    articlesToCheck = sourceArticles.filter(article =>
      article.source_name === currentSource || article.source_id === currentSource
    );
  }

  articlesToCheck.forEach(article => {
    // バックエンドの "General" を "その他" にマッピング
    const normalizedGenre = article.genre === 'General' ? 'その他' : article.genre;
    if (normalizedGenre && AVAILABLE_GENRES.includes(normalizedGenre as Genre)) {
      genresWithArticles.add(normalizedGenre as Genre);
    }
  });

  return AVAILABLE_GENRES.filter(genre => genresWithArticles.has(genre));
};

/**
 * 記事の多段階フィルタリング（共通ロジック）
 * 順序: ソース → ジャンル → その他（既読状態等）
 */
export const applyGenreFilter = (
  articles: Article[],
  selectedGenre: Genre,
  selectedSource: string = 'all'
): Article[] => {
  let filtered = [...articles];

  // 1. ソースフィルタ（最初に適用）
  if (selectedSource !== 'all') {
    filtered = filtered.filter(article =>
      article.source_name === selectedSource || article.source_id === selectedSource
    );
  }

  // 2. ジャンルフィルタ（バックエンドの "General" を "その他" として処理）
  if (selectedGenre !== 'すべて') {
    filtered = filtered.filter(article => {
      const normalizedGenre = article.genre === 'General' ? 'その他' : article.genre;
      return normalizedGenre === selectedGenre;
    });
  }

  return filtered;
};

/**
 * ジャンル変更時のソース更新ハンドラー
 * ソース変更時はジャンルを「すべて」にリセット
 */
export const handleSourceChange = (
  newSource: string,
  articles: Article[],
  setSelectedSource: (source: string) => void,
  setSelectedGenre: (genre: Genre) => void,
  setAvailableGenres: (genres: Genre[]) => void
) => {
  setSelectedSource(newSource);
  setAvailableGenres(getAvailableGenres(articles, newSource));
  // ソース変更時はジャンルを「すべて」にリセット
  setSelectedGenre('すべて');
};

/**
 * バックエンドからのジャンル名正規化
 * "General" → "その他" の一貫したマッピング
 */
export const normalizeGenre = (backendGenre: string | undefined): Genre => {
  if (!backendGenre) return 'その他';
  if (backendGenre === 'General') return 'その他';

  // AVAILABLE_GENRESに含まれているかチェック
  if (AVAILABLE_GENRES.includes(backendGenre as Genre)) {
    return backendGenre as Genre;
  }

  return 'その他'; // 未知のジャンルは「その他」として扱う
};

/**
 * Home専用：シンプルなジャンル計算（ソースフィルタなし）
 * 運営管理の固定RSSソース向け
 */
export const getAvailableGenresForHome = (articles: Article[]): Genre[] => {
  const genresWithArticles = new Set<Genre>();
  genresWithArticles.add('すべて'); // 常に表示

  articles.forEach(article => {
    // バックエンドの "General" を "その他" にマッピング
    const normalizedGenre = normalizeGenre(article.genre);
    if (AVAILABLE_GENRES.includes(normalizedGenre)) {
      genresWithArticles.add(normalizedGenre);
    }
  });

  return AVAILABLE_GENRES.filter(genre => genresWithArticles.has(genre));
};

/**
 * Home専用：シンプルなジャンルフィルタリング（ソースフィルタなし）
 */
export const applyGenreFilterForHome = (articles: Article[], selectedGenre: Genre): Article[] => {
  if (selectedGenre === 'すべて') {
    return articles;
  }

  return articles.filter(article => {
    const normalizedGenre = normalizeGenre(article.genre);
    return normalizedGenre === selectedGenre;
  });
};

/**
 * ジャンル用タブデータの生成
 * UIコンポーネント向けに id/name 形式で提供
 */
export const generateGenreTabs = (availableGenres: Genre[]) => {
  return availableGenres.map(genre => ({ id: genre, name: genre }));
};