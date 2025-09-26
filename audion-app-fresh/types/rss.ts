/**
 * RSS記事とジャンル分類の型定義
 * MECEで代表的なジャンル分類を提供
 */

export type Genre =
  | 'すべて'
  | '国内'
  | '国際'
  | '政治'
  | '経済・ビジネス'
  | 'テクノロジー'
  | '科学・環境'
  | '健康・医療'
  | 'スポーツ'
  | 'エンタメ・文化'
  | 'ライフスタイル'
  | 'その他';

export const GENRE_LABELS: Record<Genre, string> = {
  'すべて': 'すべて',
  '国内': '国内',
  '国際': '国際',
  '政治': '政治',
  '経済・ビジネス': '経済・ビジネス',
  'テクノロジー': 'テクノロジー',
  '科学・環境': '科学・環境',
  '健康・医療': '健康・医療',
  'スポーツ': 'スポーツ',
  'エンタメ・文化': 'エンタメ・文化',
  'ライフスタイル': 'ライフスタイル',
  'その他': 'その他'
};

export const AVAILABLE_GENRES: readonly Genre[] = [
  'すべて',
  '国内',
  '国際',
  '政治',
  '経済・ビジネス',
  'テクノロジー',
  '科学・環境',
  '健康・医療',
  'スポーツ',
  'エンタメ・文化',
  'ライフスタイル',
  'その他'
] as const;

export interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source_name: string;
  source_id?: string;
  content?: string;
  genre?: Genre;
  thumbnail_url?: string;
}

export interface RSSSource {
  id: string;
  user_id: string;
  preconfigured_source_id?: string;
  custom_name?: string;
  custom_url?: string;
  custom_alias?: string;
  display_name?: string;
  is_active: boolean;
}
