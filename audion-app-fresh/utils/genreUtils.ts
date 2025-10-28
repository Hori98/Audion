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
 * バックエンドのジャンル名をフロントエンドの型に統一
 */
export const normalizeGenre = (backendGenre: string | undefined): Genre => {
  if (!backendGenre) return 'その他';
  
  // バックエンドのジャンル名をフロントエンドの型にマッピング
  const genreMapping: Record<string, Genre> = {
    'General': 'その他',
    'テクノロジー': 'テクノロジー',
    'ビジネス・経済': '経済・ビジネス',
    '科学': '科学・環境',
    '国際': '国際',
    '政府・公的機関': 'その他', // 政府機関情報は「その他」に分類
    '総合ニュース': 'その他',  // 総合ニュースは「その他」に分類
  };

  // マッピングに存在する場合はそれを使用
  if (genreMapping[backendGenre]) {
    return genreMapping[backendGenre];
  }

  // AVAILABLE_GENRESに直接含まれているかチェック
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
 * 優先ジャンル対応版
 */
export const applyGenreFilterForHome = (
  articles: Article[], 
  selectedGenre: Genre, 
  priorityGenres: Genre[] = []
): Article[] => {
  if (selectedGenre === 'すべて') {
    // 優先ジャンルが設定されている場合、優先ジャンルの記事を上位に表示
    if (priorityGenres && priorityGenres.length > 0) {
      return applyPriorityGenreSort(articles, priorityGenres);
    }
    return articles;
  }

  return articles.filter(article => {
    const normalizedGenre = normalizeGenre(article.genre);
    return normalizedGenre === selectedGenre;
  });
};

/**
 * 優先ジャンルに基づく記事ソート
 * 優先ジャンルの記事を上位に、その他を下位に配置
 */
export const applyPriorityGenreSort = (articles: Article[], priorityGenres: Genre[]): Article[] => {
  if (!priorityGenres || priorityGenres.length === 0) {
    return articles;
  }

  const priorityArticles: Article[] = [];
  const otherArticles: Article[] = [];

  articles.forEach(article => {
    const normalizedGenre = normalizeGenre(article.genre);
    if (priorityGenres.includes(normalizedGenre)) {
      priorityArticles.push(article);
    } else {
      otherArticles.push(article);
    }
  });

  // 優先ジャンル内での順序は優先ジャンルの設定順に従う
  priorityArticles.sort((a, b) => {
    const genreA = normalizeGenre(a.genre);
    const genreB = normalizeGenre(b.genre);
    const indexA = priorityGenres.indexOf(genreA);
    const indexB = priorityGenres.indexOf(genreB);
    
    // 同じ優先度の場合は公開日時順
    if (indexA === indexB) {
      return new Date(b.published).getTime() - new Date(a.published).getTime();
    }
    
    return indexA - indexB;
  });

  // 優先記事 + その他記事の順で結合
  return [...priorityArticles, ...otherArticles];
};

/**
 * ジャンル用タブデータの生成
 * UIコンポーネント向けに id/name 形式で提供
 */
export const generateGenreTabs = (availableGenres: Genre[]) => {
  return availableGenres.map(genre => ({ id: genre, name: genre }));
};

/**
 * 軽量ランダムソート（ソース名ベース）
 * 処理軽量化を優先したシャッフル実装
 */
export const lightweightRandomSort = (articles: Article[]): Article[] => {
  if (articles.length <= 1) return articles;

  // ソース名をベースにした軽量ハッシュ値計算
  const getSourceHash = (sourceName: string): number => {
    let hash = 0;
    for (let i = 0; i < sourceName.length; i++) {
      const char = sourceName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash);
  };

  // ソースごとにグループ化
  const sourceGroups = new Map<string, Article[]>();
  articles.forEach(article => {
    const sourceName = article.source_name || 'unknown';
    if (!sourceGroups.has(sourceName)) {
      sourceGroups.set(sourceName, []);
    }
    sourceGroups.get(sourceName)!.push(article);
  });

  // ソースリストをハッシュベースでシャッフル
  const sourceNames = Array.from(sourceGroups.keys());
  const shuffledSources = sourceNames.sort((a, b) => {
    const hashA = getSourceHash(a + Date.now().toString().slice(-3)); // 軽微な時間要素追加
    const hashB = getSourceHash(b + Date.now().toString().slice(-3));
    return hashA - hashB;
  });

  // 各ソースから1記事ずつラウンドロビン方式で配置
  const result: Article[] = [];
  let maxArticlesPerSource = Math.max(...Array.from(sourceGroups.values()).map(group => group.length));
  
  for (let round = 0; round < maxArticlesPerSource; round++) {
    shuffledSources.forEach(sourceName => {
      const sourceArticles = sourceGroups.get(sourceName)!;
      if (sourceArticles.length > round) {
        result.push(sourceArticles[round]);
      }
    });
  }

  return result;
};