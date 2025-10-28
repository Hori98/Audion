/**
 * おすすめRSSソース（ランダム選択用）
 * 手動追加と同じ挙動で追加される高品質なRSSソース集
 */

export interface RecommendedRSSSource {
  name: string;
  url: string;
  category: string;
  description?: string;
  language: string;
  country: string;
}

/**
 * おすすめRSSソース一覧（10選）
 * ユーザー指定の信頼性の高いソースを厳選
 */
export const RECOMMENDED_RSS_SOURCES: RecommendedRSSSource[] = [
  {
    name: 'Yahoo!ニュース',
    url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    category: '国際・社会',
    description: 'Yahoo!の厳選トップニュース',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'ITmedia 総合',
    url: 'https://rss.itmedia.co.jp/rss/2.0/itmedia_all.xml',
    category: 'テクノロジー',
    description: 'ITに特化した日本最大級のメディア',
    language: 'ja',
    country: 'JP'
  },
  {
    name: '朝日新聞デジタル',
    url: 'http://www.asahi.com/rss/asahi/newsheadlines.rdf',
    category: '国際・社会',
    description: '日本の主要新聞社による総合ニュース',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'はてなブックマーク',
    url: 'https://b.hatena.ne.jp/hotentry.rss',
    category: 'ライフスタイル',
    description: '注目の記事・話題のまとめ',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'ハフポスト日本版',
    url: 'https://www.huffingtonpost.jp/feeds/index.xml',
    category: '国際・社会',
    description: '国際ニュース・社会問題の報道',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'ライフハッカー日本版',
    url: 'https://www.lifehacker.jp/feed/index.xml',
    category: 'ライフスタイル',
    description: '仕事・生活の効率化情報',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'デイリーポータルZ',
    url: 'https://dailyportalz.jp/feed/headline',
    category: 'エンタメ・スポーツ',
    description: 'ユニークな視点の記事・エンタメ',
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
    name: 'ロケットニュース24',
    url: 'https://rocketnews24.com/feed/',
    category: 'エンタメ・スポーツ',
    description: '世界のオモシロニュース',
    language: 'ja',
    country: 'JP'
  },
  {
    name: 'ギズモード・ジャパン',
    url: 'http://www.gizmodo.jp/atom.xml',
    category: 'テクノロジー',
    description: 'ガジェット・テクノロジー情報',
    language: 'ja',
    country: 'JP'
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