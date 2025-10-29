/**
 * RSS Sources Configuration - LEGAL SOURCES ONLY
 * HomeタブとFeedタブのRSSソース設定
 *
 * ⚠️ IMPORTANT: All sources in this file are commercial-use permitted.
 * These are FALLBACK sources. Primary sources should be loaded from:
 * - GET /api/rss-sources/system - All system sources from backend config
 * - GET /api/rss-sources/sections/{section} - Section-specific sources
 * - GET /api/articles/curated - Articles from curated sources
 *
 * LEGAL BASIS:
 * - Public domain works (US Government)
 * - Government standard licenses (Japanese Government)
 * - Creative Commons licenses (BY, BY-SA)
 * - Open access publications
 *
 * REMOVED ILLEGAL SOURCES:
 * ❌ NHK (public broadcaster - copyright restrictions)
 * ❌ Asahi Shimbun (commercial publisher - prohibits podcast use)
 * ❌ Nikkei (commercial publisher - no commercial use allowed)
 * ❌ TechCrunch (commercial use prohibited with advertisements)
 * ❌ CNN (commercial news - derivative works prohibited)
 * ❌ Wall Street Journal (commercial publisher - restricted access)
 * ❌ Wired (commercial publisher)
 * ❌ BBC (broadcast media - copyright restricted)
 */

export interface RSSSourceConfig {
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
  credit_required?: boolean;
  source_type?: string;
  is_active?: boolean;
  priority?: number;
}

/**
 * Home タブ用固定RSS - 合法的なオープンソース
 * 公開ドメイン・政府・学術・CC ライセンス ソースのみを使用
 */
export const HOME_FIXED_RSS_SOURCES: RSSSourceConfig[] = [
  // US Government (Public Domain)
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
    podcast_allowed: true,
    credit_required: false
  },
  {
    id: 'noaa_weather',
    name: 'NOAA National Weather Service',
    url: 'https://www.weather.gov/rss/',
    category: 'サイエンス',
    description: '米国気象局 (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: false
  },
  {
    id: 'usgs_news',
    name: 'USGS News & Announcements',
    url: 'https://www.usgs.gov/news/news-releases/feed.xml',
    category: 'サイエンス',
    description: '米国地質調査所 (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: false
  },
  {
    id: 'nih_news',
    name: 'NIH News Releases',
    url: 'https://www.nih.gov/news-releases/feed.xml',
    category: 'サイエンス',
    description: '米国国立衛生研究所 (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: false
  },
  {
    id: 'epa_news',
    name: 'EPA News Releases',
    url: 'https://www.epa.gov/newsreleases/search/rss',
    category: '環境・政治',
    description: '米国環保護庁 (公開ドメイン)',
    language: 'en',
    country: 'US',
    license: 'public-domain',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: false
  },

  // Japanese Government (Government License)
  {
    id: 'jp_kantei',
    name: '総理大臣官邸',
    url: 'https://japan.kantei.go.jp/rss.html',
    category: '政治',
    description: '日本首相官邸公式ニュース (政府ライセンス)',
    language: 'ja',
    country: 'JP',
    license: 'jp-government',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: true
  },
  {
    id: 'jp_cao',
    name: '内閣府',
    url: 'https://www.cao.go.jp/rss/',
    category: '政治',
    description: '日本内閣府公式ニュース (政府ライセンス)',
    language: 'ja',
    country: 'JP',
    license: 'jp-government',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: true
  },
  {
    id: 'jp_meti',
    name: '経済産業省',
    url: 'https://www.meti.go.jp/rss/',
    category: '経済',
    description: 'METI公式ニュース (政府ライセンス)',
    language: 'ja',
    country: 'JP',
    license: 'jp-government',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: true
  },

  // Open Access & Creative Commons
  {
    id: 'wikipedia_current_events',
    name: 'Wikipedia Current Events',
    url: 'https://en.wikipedia.org/wiki/Wikipedia:Current_events',
    category: '国際・社会',
    description: 'ウィキペディア時事ニュース (CC BY-SA 3.0)',
    language: 'en',
    country: 'Multi',
    license: 'cc-by-sa-3.0',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: true
  },
  {
    id: 'arxiv_cs',
    name: 'ArXiv Computer Science',
    url: 'https://rss.arxiv.org/rss/cs',
    category: 'テクノロジー',
    description: 'コンピュータ科学研究論文 (オープンアクセス)',
    language: 'en',
    country: 'US',
    license: 'open-access',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: true
  },
  {
    id: 'plos_one',
    name: 'PLOS ONE',
    url: 'http://www.plosone.org/article/feed?representation=RSS',
    category: 'サイエンス',
    description: 'オープンアクセス研究誌 (CC BY 4.0)',
    language: 'en',
    country: 'US',
    license: 'cc-by-4.0',
    commercial_use: true,
    podcast_allowed: true,
    credit_required: true
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
    podcast_allowed: true,
    credit_required: true
  }
];

/**
 * Feed タブ用デフォルトRSS - 日米混合の合法的なソース
 * ユーザーがカスタマイズする起点となる、バランスの取れた選択肢
 */
export const FEED_DEFAULT_RSS_SOURCES: RSSSourceConfig[] = [
  // 日本政府・学術ソース（5選）
  {
    id: 'jp_kantei',
    name: '総理大臣官邸',
    url: 'https://japan.kantei.go.jp/rss.html',
    category: '政治',
    description: '日本首相官邸',
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
    description: '日本の産業・経済ニュース',
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
  {
    id: 'arxiv_cs',
    name: 'ArXiv Computer Science',
    url: 'https://rss.arxiv.org/rss/cs',
    category: 'テクノロジー',
    description: 'コンピュータ科学研究 (日本と国際)',
    language: 'en',
    country: 'US',
    license: 'open-access',
    commercial_use: true,
    podcast_allowed: true
  },
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

  // 米国政府・学術ソース（5選）
  {
    id: 'nasa_breaking',
    name: 'NASA Breaking News',
    url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    category: 'サイエンス',
    description: '米国宇宙局公式ニュース',
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
    description: '米国気象・気候ニュース',
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
    description: '米国地質・環境ニュース',
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
    description: '米国医療・健康科学ニュース',
    language: 'en',
    country: 'US',
    license: 'public-domain',
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
  }
];

/**
 * カテゴリー別RSS管理用のヘルパー関数
 */
export const getRSSSourcesByCategory = (
  sources: RSSSourceConfig[],
  category?: string
): RSSSourceConfig[] => {
  if (!category || category === 'すべて') {
    return sources;
  }
  return sources.filter(source => source.category === category);
};

/**
 * 言語別RSS管理用のヘルパー関数
 */
export const getRSSSourcesByLanguage = (
  sources: RSSSourceConfig[],
  language?: string
): RSSSourceConfig[] => {
  if (!language) {
    return sources;
  }
  return sources.filter(source => source.language === language);
};
