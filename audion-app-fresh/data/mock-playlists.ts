/**
 * Mock playlist data for beta testing
 * Structure similar to Spotify playlists
 */

export interface MockPlaylist {
  id: string;
  title: string;
  description?: string;
  coverImage: string;
  creator: {
    name: string;
    avatar?: string;
  };
  trackCount: number;
  duration: string; // formatted duration
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  tracks: MockTrack[];
}

export interface MockTrack {
  id: string;
  title: string;
  article: {
    title: string;
    source: string;
    url: string;
  };
  duration: string;
  createdAt: string;
  audioUrl?: string;
}

export const mockPlaylists: MockPlaylist[] = [
  {
    id: 'pl_1',
    title: '今日のニュースダイジェスト',
    description: '今日の重要なニュースをまとめたプレイリスト',
    coverImage: 'https://picsum.photos/300/300?random=1',
    creator: {
      name: 'あなた',
      avatar: 'https://picsum.photos/50/50?random=100'
    },
    trackCount: 8,
    duration: '24分',
    isPublic: false,
    createdAt: '2025-01-08',
    updatedAt: '2025-01-08',
    tracks: [
      {
        id: 'tr_1',
        title: '経済ニュース：円相場の動向',
        article: {
          title: '円相場、対ドルで148円台に上昇',
          source: 'NHK NEWS WEB',
          url: 'https://example.com/news1'
        },
        duration: '3:15',
        createdAt: '2025-01-08T09:00:00Z'
      },
      {
        id: 'tr_2',
        title: 'テクノロジー：AI技術の最新動向',
        article: {
          title: 'AI技術が変える未来の働き方',
          source: 'ITmedia NEWS',
          url: 'https://example.com/news2'
        },
        duration: '4:20',
        createdAt: '2025-01-08T10:30:00Z'
      },
      {
        id: 'tr_3',
        title: 'スポーツ：プロ野球開幕情報',
        article: {
          title: 'プロ野球、2025年シーズン開幕へ',
          source: 'スポニチ',
          url: 'https://example.com/news3'
        },
        duration: '2:45',
        createdAt: '2025-01-08T11:15:00Z'
      }
    ]
  },
  {
    id: 'pl_2',
    title: 'テクノロジーウィークリー',
    description: '今週のテクノロジー関連ニュース',
    coverImage: 'https://picsum.photos/300/300?random=2',
    creator: {
      name: 'あなた',
      avatar: 'https://picsum.photos/50/50?random=100'
    },
    trackCount: 12,
    duration: '36分',
    isPublic: true,
    createdAt: '2025-01-06',
    updatedAt: '2025-01-08',
    tracks: [
      {
        id: 'tr_4',
        title: 'AI開発の最前線レポート',
        article: {
          title: 'ChatGPTの次世代モデル発表',
          source: 'TechCrunch Japan',
          url: 'https://example.com/tech1'
        },
        duration: '5:30',
        createdAt: '2025-01-06T14:00:00Z'
      },
      {
        id: 'tr_5',
        title: 'メタバース市場の現状',
        article: {
          title: 'VR/AR技術が切り開く新しい世界',
          source: 'CNET Japan',
          url: 'https://example.com/tech2'
        },
        duration: '4:15',
        createdAt: '2025-01-07T16:30:00Z'
      }
    ]
  },
  {
    id: 'pl_3',
    title: 'お気に入りの記事集',
    description: 'ブックマークした記事の音声版',
    coverImage: 'https://picsum.photos/300/300?random=3',
    creator: {
      name: 'あなた',
      avatar: 'https://picsum.photos/50/50?random=100'
    },
    trackCount: 5,
    duration: '15分',
    isPublic: false,
    createdAt: '2025-01-05',
    updatedAt: '2025-01-07',
    tracks: [
      {
        id: 'tr_6',
        title: '健康とウェルネスの最新研究',
        article: {
          title: '睡眠の質を改善する5つの方法',
          source: 'Medical Tribune',
          url: 'https://example.com/health1'
        },
        duration: '3:45',
        createdAt: '2025-01-05T12:00:00Z'
      }
    ]
  },
  {
    id: 'pl_4',
    title: 'ビジネス分析レポート',
    description: '経済・ビジネス関連の深堀り記事',
    coverImage: 'https://picsum.photos/300/300?random=4',
    creator: {
      name: 'あなた',
      avatar: 'https://picsum.photos/50/50?random=100'
    },
    trackCount: 7,
    duration: '28分',
    isPublic: false,
    createdAt: '2025-01-03',
    updatedAt: '2025-01-06',
    tracks: []
  }
];

export const getMockPlaylistById = (id: string): MockPlaylist | undefined => {
  return mockPlaylists.find(playlist => playlist.id === id);
};

export const getMockPlaylistsByUser = (userId?: string): MockPlaylist[] => {
  // For mock purposes, return all playlists as user's playlists
  return mockPlaylists;
};