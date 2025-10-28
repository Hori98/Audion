/**
 * Mock Audio Recommendations Data
 * おすすめ音声セクション用のモックデータ
 * Discover Tab統合前の仮データとして使用
 */

import { AudioRecommendation } from '../components/AudioRecommendationCard';

export const mockAudioRecommendations: AudioRecommendation[] = [
  {
    id: 'mock-audio-1',
    title: '今日のニュースダイジェスト',
    creator: 'AI音声システム',
    creatorType: 'system',
    thumbnail: 'placeholder_url',
    duration: 180, // 3分
    playCount: 1247,
    likeCount: 89,
    type: 'autopick',
    category: 'ニュース',
    tags: ['準備中', 'ダイジェスト'],
    description: 'AIが厳選した今日の重要ニュースをまとめてお届け',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2時間前
    engagementScore: 78
  },
  {
    id: 'mock-audio-2',
    title: 'テクノロジートレンド解説',
    creator: 'テックライター田中',
    creatorType: 'user',
    thumbnail: 'placeholder_url',
    duration: 420, // 7分
    playCount: 856,
    likeCount: 124,
    type: 'manualpick',
    category: 'テクノロジー',
    tags: ['準備中', 'トレンド', '解説'],
    description: '最新のテクノロジートレンドを分かりやすく解説',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5時間前
    engagementScore: 85
  },
  {
    id: 'mock-audio-3',
    title: '朝の経済ニュース',
    creator: 'AI音声システム',
    creatorType: 'system',
    thumbnail: 'placeholder_url',
    duration: 300, // 5分
    playCount: 2103,
    likeCount: 67,
    type: 'schedulepick',
    category: '経済',
    tags: ['準備中', '朝のニュース'],
    description: '毎朝定時配信される経済ニュースのまとめ',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8時間前
    engagementScore: 72
  },
  {
    id: 'mock-audio-4',
    title: 'スポーツハイライト',
    creator: 'スポーツファン山田',
    creatorType: 'user',
    thumbnail: 'placeholder_url',
    duration: 240, // 4分
    playCount: 543,
    likeCount: 45,
    type: 'ugc',
    category: 'スポーツ',
    tags: ['準備中', 'ハイライト'],
    description: '今週のスポーツハイライトをファン目線で紹介',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12時間前
    engagementScore: 68
  },
  {
    id: 'mock-audio-5',
    title: 'エンタメ業界の話題',
    creator: 'AI音声システム',
    creatorType: 'system',
    thumbnail: 'placeholder_url',
    duration: 210, // 3分30秒
    playCount: 789,
    likeCount: 56,
    type: 'autopick',
    category: 'エンタメ',
    tags: ['準備中', '業界ニュース'],
    description: 'エンタメ業界の最新話題を素早くキャッチアップ',
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18時間前
    engagementScore: 64
  },
  {
    id: 'mock-audio-6',
    title: '天気と交通情報',
    creator: 'AI音声システム',
    creatorType: 'system',
    thumbnail: 'placeholder_url',
    duration: 120, // 2分
    playCount: 1567,
    likeCount: 23,
    type: 'schedulepick',
    category: '生活情報',
    tags: ['準備中', '定時配信'],
    description: '毎朝の天気と交通情報をコンパクトにお届け',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24時間前
    engagementScore: 55
  }
];

/**
 * エンゲージメントスコア順にソートされたおすすめ音声を取得
 */
export const getTopAudioRecommendations = (limit: number = 5): AudioRecommendation[] => {
  return mockAudioRecommendations
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, limit);
};

/**
 * カテゴリ別おすすめ音声を取得
 */
export const getAudioRecommendationsByCategory = (category: string, limit: number = 3): AudioRecommendation[] => {
  return mockAudioRecommendations
    .filter(audio => audio.category === category)
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, limit);
};

/**
 * タイプ別おすすめ音声を取得
 */
export const getAudioRecommendationsByType = (type: AudioRecommendation['type'], limit: number = 3): AudioRecommendation[] => {
  return mockAudioRecommendations
    .filter(audio => audio.type === type)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
};

/**
 * 新しい音声コンテンツを取得（作成日順）
 */
export const getLatestAudioRecommendations = (limit: number = 5): AudioRecommendation[] => {
  return mockAudioRecommendations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

/**
 * デバッグ用：全音声データの統計情報を取得
 */
export const getAudioRecommendationsStats = () => {
  const totalCount = mockAudioRecommendations.length;
  const avgDuration = mockAudioRecommendations.reduce((sum, audio) => sum + audio.duration, 0) / totalCount;
  const totalPlays = mockAudioRecommendations.reduce((sum, audio) => sum + audio.playCount, 0);
  const totalLikes = mockAudioRecommendations.reduce((sum, audio) => sum + audio.likeCount, 0);
  
  const typeDistribution = mockAudioRecommendations.reduce((acc, audio) => {
    acc[audio.type] = (acc[audio.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryDistribution = mockAudioRecommendations.reduce((acc, audio) => {
    acc[audio.category] = (acc[audio.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCount,
    avgDuration: Math.round(avgDuration),
    totalPlays,
    totalLikes,
    typeDistribution,
    categoryDistribution
  };
};