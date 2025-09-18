/**
 * RSS記事とジャンル分類の型定義
 * MECEで代表的なジャンル分類を提供
 */

export type Genre =
  | 'すべて'
  | 'テクノロジー'
  | '経済・ビジネス'
  | '国際・社会'
  | 'ライフスタイル'
  | 'エンタメ・スポーツ'
  | 'その他';

export const GENRE_LABELS: Record<Genre, string> = {
  'すべて': '全て',
  'テクノロジー': 'テクノロジー',
  '経済・ビジネス': '経済・ビジネス',
  '国際・社会': '国際・社会',
  'ライフスタイル': 'ライフスタイル',
  'エンタメ・スポーツ': 'エンタメ・スポーツ',
  'その他': 'その他'
};

export const AVAILABLE_GENRES: readonly Genre[] = [
  'すべて',
  'テクノロジー',
  '経済・ビジネス',
  '国際・社会',
  'ライフスタイル',
  'エンタメ・スポーツ',
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