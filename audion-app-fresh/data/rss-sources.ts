/**
 * RSS Sources Configuration
 * HomeタブとFeedタブのRSSソース設定
 */

export interface RSSSourceConfig {
  name: string;
  url: string;
  category: string;
  description?: string;
  language: string;
  country: string;
}

/**
 * Home タブ用固定RSS - 全ユーザーが満足できる網羅的ソース
 * 各ジャンルから最も信頼性が高く、ユーザー層が広いメディアを選定
 */
export const HOME_FIXED_RSS_SOURCES: RSSSourceConfig[] = [
  // 総合ニュース（日本）
  {
    name: 'NHK NEWS WEB',
    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    category: '国際・社会',
    description: '日本を代表する公共放送の総合ニュース',
    language: 'ja',
    country: 'JP'
  },
  {
    name: '朝日新聞デジタル',
    url: 'https://www.asahi.com/rss/asahi/newsheadlines.rdf',
    category: '国際・社会',
    description: '日本の主要新聞社による総合ニュース',
    language: 'ja',
    country: 'JP'
  },
  {
    name: '毎日新聞',
    url: 'https://mainichi.jp/rss/etc/mainichi-flash.rss',
    category: '国際・社会',
    description: '毎日新聞の速報・総合ニュース',
    language: 'ja',
    country: 'JP'
  },

  // 経済・ビジネス（日本）
  {
    name: '日本経済新聞',
    url: 'https://www.nikkei.com/rss/',
    category: '経済・ビジネス',
    description: '日本最大の経済メディア',
    language: 'ja',
    country: 'JP'
  },
  {
    name: '東洋経済オンライン',
    url: 'https://toyokeizai.net/list/feed/rss',
    category: '経済・ビジネス',
    description: 'ビジネス・経済分析の専門メディア',
    language: 'ja',
    country: 'JP'
  },

  // テクノロジー（日本）
  {
    name: 'ITmedia NEWS',
    url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
    category: 'テクノロジー',
    description: 'ITに特化した日本最大級のメディア',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'GIGAZINE',
    url: 'https://gigazine.net/news/rss_2.0/',
    category: 'テクノロジー',
    description: 'テック・サイエンス情報の人気メディア',
    language: 'ja',
    country: 'JP'
  },
  {
    name: '日経xTECH',
    url: 'https://xtech.nikkei.com/rss/index.rdf',
    category: 'テクノロジー',
    description: '日経のテクノロジー専門メディア',
    language: 'ja',
    country: 'JP'
  },

  // 国際ニュース（英語圏・多言語対応）
  {
    name: 'BBC News Japan',
    url: 'https://feeds.bbci.co.uk/japanese/rss.xml',
    category: '国際・社会',
    description: 'BBCの日本語国際ニュース',
    language: 'ja',
    country: 'UK'
  },
  {
    name: 'CNN Japan',
    url: 'https://www.cnn.co.jp/rss/cnn/cnn.rdf',
    category: '国際・社会',
    description: 'CNNの日本語国際ニュース',
    language: 'ja',
    country: 'US'
  },

  // ライフスタイル・エンタメ
  {
    name: 'Yahoo!ニュース エンタメ',
    url: 'https://news.yahoo.co.jp/rss/categories/entertainment.xml',
    category: 'エンタメ・スポーツ',
    description: 'エンターテインメント総合ニュース',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'ORICON NEWS',
    url: 'https://www.oricon.co.jp/rss/index_all.rdf',
    category: 'エンタメ・スポーツ',
    description: '音楽・エンタメ業界の権威メディア',
    language: 'ja',
    country: 'JP'
  },

  // ライフスタイル・健康
  {
    name: 'ライブドアニュース',
    url: 'http://news.livedoor.com/rss/summary/52.xml',
    category: 'ライフスタイル',
    description: '幅広いライフスタイル・トレンド情報',
    language: 'ja',
    country: 'JP'
  }
];

/**
 * Feed タブ用デフォルトRSS - 日米混合の多様な10選
 * ユーザーがカスタマイズする起点となる、バランスの取れた選択肢
 */
export const FEED_DEFAULT_RSS_SOURCES: RSSSourceConfig[] = [
  // 日本（5選）
  {
    name: 'NHK NEWS WEB',
    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    category: '国際・社会',
    description: '日本の代表的公共放送',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'ITmedia NEWS',
    url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
    category: 'テクノロジー',
    description: '日本のIT専門メディア',
    language: 'ja',
    country: 'JP'
  },
  {
    name: '日本経済新聞',
    url: 'https://www.nikkei.com/rss/',
    category: '経済・ビジネス',
    description: '日本最大の経済新聞',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'GIGAZINE',
    url: 'https://gigazine.net/news/rss_2.0/',
    category: 'テクノロジー',
    description: 'テック・サイエンス情報',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'Yahoo!ニュース',
    url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    category: '国際・社会',
    description: 'Yahoo!の厳選トップニュース',
    language: 'ja',
    country: 'JP'
  },

  // アメリカ（5選）
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'テクノロジー',
    description: 'グローバル・テックニュースの権威',
    language: 'en',
    country: 'US'
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'テクノロジー',
    description: 'テック・カルチャーの先端メディア',
    language: 'en',
    country: 'US'
  },
  {
    name: 'CNN Top Stories',
    url: 'http://rss.cnn.com/rss/edition.rss',
    category: '国際・社会',
    description: 'CNNのトップストーリー',
    language: 'en',
    country: 'US'
  },
  {
    name: 'Wall Street Journal',
    url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
    category: '経済・ビジネス',
    description: '世界最高峰の経済・金融メディア',
    language: 'en',
    country: 'US'
  },
  {
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'テクノロジー',
    description: 'テクノロジーと文化の最前線',
    language: 'en',
    country: 'US'
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