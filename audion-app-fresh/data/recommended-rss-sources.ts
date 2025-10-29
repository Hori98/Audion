/**
 * おすすめRSSソース（ランダム選択用）
 * LEGAL SOURCES ONLY - 商用利用可能なソースのみ
 *
 * NOTE: All sources are:
 * - Public domain / Government works / Open Access
 * - Commercial use permitted
 * - Podcast-friendly
 *
 * REMOVED: Asahi Shimbun (prohibits commercial/podcast use)
 */

export interface RecommendedRSSSource {
  id?: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  language: string;
  country: string;
  license?: string;
  commercial_use?: boolean;
  podcast_allowed?: boolean;
}

/**
 * おすすめRSSソース一覧（10選）
 * ユーザー指定の信頼性の高い合法的なソースを厳選
 */
export const RECOMMENDED_RSS_SOURCES: RecommendedRSSSource[] = [
  // 日本政府ソース
  {
    id: 'jp_kantei',
    name: '総理大臣官邸',
    url: 'https://japan.kantei.go.jp/rss.html',
    category: '政治',
    description: '日本首相官邸公式ニュース',
    language: 'ja',
    country: 'JP',
    license: 'jp-government',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'jp_meti',
    name: '経済産業省',
    url: 'https://www.meti.go.jp/rss/',
    category: '経済',
    description: 'METI産業・経済ニュース',
    language: 'ja',
    country: 'JP',
    license: 'jp-government',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'jp_cao',
    name: '内閣府',
    url: 'https://www.cao.go.jp/rss/',
    category: '政治',
    description: '日本内閣府公式ニュース',
    language: 'ja',
    country: 'JP',
    license: 'jp-government',
    commercial_use: true,
    podcast_allowed: true
  },
  // 学術・研究ソース
  {
    id: 'arxiv_cs',
    name: 'ArXiv Computer Science',
    url: 'https://rss.arxiv.org/rss/cs',
    category: 'テクノロジー',
    description: 'コンピュータ科学研究論文',
    language: 'en',
    country: 'US',
    license: 'open-access',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'plos_one',
    name: 'PLOS ONE',
    url: 'http://www.plosone.org/article/feed?representation=RSS',
    category: 'サイエンス',
    description: 'オープンアクセス研究誌',
    language: 'en',
    country: 'US',
    license: 'cc-by-4.0',
    commercial_use: true,
    podcast_allowed: true
  },
  // クリエイティブコモンズ / パブリック
  {
    id: 'wikipedia_current_events',
    name: 'Wikipedia Current Events',
    url: 'https://en.wikipedia.org/wiki/Wikipedia:Current_events',
    category: '国際・社会',
    description: 'ウィキペディア時事ニュース',
    language: 'en',
    country: 'Multi',
    license: 'cc-by-sa-3.0',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'nasa_breaking',
    name: 'NASA Breaking News',
    url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    category: 'サイエンス',
    description: 'NASA公式ニュース (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'noaa_weather',
    name: 'NOAA National Weather Service',
    url: 'https://www.weather.gov/rss/',
    category: 'サイエンス',
    description: '米国気象局ニュース (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'usgs_news',
    name: 'USGS News',
    url: 'https://www.usgs.gov/news/news-releases/feed.xml',
    category: 'サイエンス',
    description: '米国地質調査所ニュース (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'nih_news',
    name: 'NIH News Releases',
    url: 'https://www.nih.gov/news-releases/feed.xml',
    category: 'サイエンス',
    description: '米国医療科学ニュース (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true
  },
  {
    id: 'nature_communications',
    name: 'Nature Communications',
    url: 'http://feeds.nature.com/ncomms/rss/current',
    category: 'サイエンス',
    description: 'ネイチャー・コミュニケーション (CC BY 4.0)',
    language: 'en',
    country: 'UK',
    license: 'cc-by-4.0',
    commercial_use: true,
    podcast_allowed: true
  }
];

/**
 * ランダムに5つのRSSソースを選択
 * 重複を避けつつ、多様なカテゴリから選出
 */
export const getRandomRecommendedSources = (excludeUrls: string[] = []): RecommendedRSSSource[] => {
  // 既に追加済みのURLを除外
  const availableSources = RECOMMENDED_RSS_SOURCES.filter(
    source => !excludeUrls.includes(source.url)
  );

  // シャッフル
  const shuffled = [...availableSources].sort(() => Math.random() - 0.5);

  // 5つ選択（利用可能数が5未満の場合は全て）
  return shuffled.slice(0, Math.min(5, shuffled.length));
};

/**
 * カテゴリ別の分散を考慮したランダム選択
 * より多様性のある選択を実現
 */
export const getBalancedRandomSources = (excludeUrls: string[] = []): RecommendedRSSSource[] => {
  const availableSources = RECOMMENDED_RSS_SOURCES.filter(
    source => !excludeUrls.includes(source.url)
  );

  // カテゴリ別にグループ化
  const categoryGroups: { [key: string]: RecommendedRSSSource[] } = {};
  availableSources.forEach(source => {
    if (!categoryGroups[source.category]) {
      categoryGroups[source.category] = [];
    }
    categoryGroups[source.category].push(source);
  });

  const categories = Object.keys(categoryGroups);
  const selectedSources: RecommendedRSSSource[] = [];

  // 各カテゴリから最低1つずつ選択（5つまで）
  for (let i = 0; i < 5 && categories.length > 0; i++) {
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const category = categories[categoryIndex];
    const sources = categoryGroups[category];

    if (sources.length > 0) {
      const sourceIndex = Math.floor(Math.random() * sources.length);
      selectedSources.push(sources[sourceIndex]);

      // 使用したソースを削除
      sources.splice(sourceIndex, 1);

      // カテゴリが空になったら削除
      if (sources.length === 0) {
        categories.splice(categoryIndex, 1);
      }
    }
  }

  return selectedSources;
};
