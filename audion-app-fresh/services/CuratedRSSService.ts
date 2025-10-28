/**
 * Curated RSS Service
 * 編集者による厳選RSS管理システム
 * 信頼性の高いニュースソースから高品質コンテンツを配信
 */

import { Article } from './ArticleService';

export interface CuratedSource {
  id: string;
  name: string;
  displayName: string;
  url: string;
  category: 'news' | 'tech' | 'business' | 'sports' | 'entertainment' | 'lifestyle' | 'science';
  language: 'ja' | 'en' | 'multi';
  trustScore: number; // 1-10 (10が最高信頼度)
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  enabled: boolean;
  featured: boolean; // 注目ソースかどうか
  description: string;
  lastUpdated?: string;
  articleCount: number;
  errorCount: number;
  metadata: {
    publisher: string;
    country: string;
    founded?: string;
    website: string;
    twitter?: string;
    tags: string[];
  };
}

export interface SourceGroup {
  id: string;
  name: string;
  description: string;
  sources: string[]; // source IDs
  priority: number;
  enabled: boolean;
}

class CuratedRSSService {
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30分
  private sourceCache: Map<string, { articles: Article[]; ts: number }> = new Map();

  // 厳選されたRSSソース一覧
  private readonly curatedSources: CuratedSource[] = [
    // 総合ニュース
    {
      id: 'nhk_news',
      name: 'NHK News',
      displayName: 'NHKニュース',
      url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
      category: 'news',
      language: 'ja',
      trustScore: 10,
      updateFrequency: 'realtime',
      enabled: true,
      featured: true,
      description: '日本放送協会による信頼性の高い総合ニュース',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: '日本放送協会',
        country: 'JP',
        founded: '1925',
        website: 'https://www.nhk.or.jp',
        tags: ['公共放送', '速報', '信頼性']
      }
    },
    {
      id: 'asahi_news',
      name: 'Asahi Shimbun',
      displayName: '朝日新聞デジタル',
      url: 'https://www.asahi.com/rss/asahi/newsheadlines.rdf',
      category: 'news',
      language: 'ja',
      trustScore: 9,
      updateFrequency: 'hourly',
      enabled: true,
      featured: true,
      description: '朝日新聞社による幅広いニュース報道',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: '朝日新聞社',
        country: 'JP',
        founded: '1879',
        website: 'https://www.asahi.com',
        tags: ['新聞', '政治', '社会']
      }
    },
    {
      id: 'nikkei_news',
      name: 'Nikkei',
      displayName: '日経電子版',
      url: 'https://www.nikkei.com/news/feed/',
      category: 'business',
      language: 'ja',
      trustScore: 9,
      updateFrequency: 'hourly',
      enabled: true,
      featured: true,
      description: '日本経済新聞による経済・ビジネスニュース',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: '日本経済新聞社',
        country: 'JP',
        founded: '1876',
        website: 'https://www.nikkei.com',
        tags: ['経済', 'ビジネス', '市場']
      }
    },

    // テクノロジー
    {
      id: 'techcrunch_jp',
      name: 'TechCrunch Japan',
      displayName: 'TechCrunch Japan',
      url: 'https://jp.techcrunch.com/feed/',
      category: 'tech',
      language: 'ja',
      trustScore: 8,
      updateFrequency: 'hourly',
      enabled: true,
      featured: true,
      description: 'テクノロジー業界の最新ニュースとトレンド',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: 'TechCrunch',
        country: 'US',
        founded: '2005',
        website: 'https://jp.techcrunch.com',
        tags: ['スタートアップ', 'AI', 'ガジェット']
      }
    },
    {
      id: 'itmedia_news',
      name: 'ITmedia NEWS',
      displayName: 'ITmedia ニュース',
      url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
      category: 'tech',
      language: 'ja',
      trustScore: 8,
      updateFrequency: 'hourly',
      enabled: true,
      featured: false,
      description: 'IT業界の最新ニュースと技術トレンド',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: 'ITmedia',
        country: 'JP',
        website: 'https://www.itmedia.co.jp',
        tags: ['IT', '技術', 'ガジェット']
      }
    },

    // エンターテイメント
    {
      id: 'oricon_news',
      name: 'ORICON NEWS',
      displayName: 'オリコンニュース',
      url: 'https://www.oricon.co.jp/rss/news/',
      category: 'entertainment',
      language: 'ja',
      trustScore: 7,
      updateFrequency: 'hourly',
      enabled: true,
      featured: false,
      description: '音楽・芸能・エンタメ業界の最新情報',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: 'オリコン',
        country: 'JP',
        website: 'https://www.oricon.co.jp',
        tags: ['音楽', '芸能', 'エンタメ']
      }
    },

    // スポーツ
    {
      id: 'sponichi_news',
      name: 'Sponichi',
      displayName: 'スポニチ',
      url: 'https://www.sponichi.co.jp/rss/general.rdf',
      category: 'sports',
      language: 'ja',
      trustScore: 8,
      updateFrequency: 'hourly',
      enabled: true,
      featured: false,
      description: 'スポーツ専門紙による総合スポーツニュース',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: 'スポーツニッポン新聞社',
        country: 'JP',
        website: 'https://www.sponichi.co.jp',
        tags: ['スポーツ', '野球', 'サッカー']
      }
    },

    // 科学・学術
    {
      id: 'newsweek_jp',
      name: 'Newsweek Japan',
      displayName: 'ニューズウィーク日本版',
      url: 'https://www.newsweekjapan.jp/rss.xml',
      category: 'science',
      language: 'ja',
      trustScore: 8,
      updateFrequency: 'daily',
      enabled: true,
      featured: false,
      description: '国際的な視点での科学・社会ニュース',
      articleCount: 0,
      errorCount: 0,
      metadata: {
        publisher: 'Newsweek',
        country: 'US',
        website: 'https://www.newsweekjapan.jp',
        tags: ['国際', '科学', '分析']
      }
    }
  ];

  // ソースグループ定義
  private readonly sourceGroups: SourceGroup[] = [
    {
      id: 'breaking_news',
      name: '速報ニュース',
      description: 'リアルタイム速報に特化したソース群',
      sources: ['nhk_news', 'asahi_news'],
      priority: 10,
      enabled: true
    },
    {
      id: 'business_tech',
      name: 'ビジネス・テック',
      description: '経済・技術関連の専門情報',
      sources: ['nikkei_news', 'techcrunch_jp', 'itmedia_news'],
      priority: 8,
      enabled: true
    },
    {
      id: 'lifestyle_entertainment',
      name: 'ライフスタイル・エンタメ',
      description: '生活・娯楽に関する情報',
      sources: ['oricon_news', 'sponichi_news'],
      priority: 6,
      enabled: true
    },
    {
      id: 'quality_analysis',
      name: '高品質分析記事',
      description: '深い分析と国際的視点の記事',
      sources: ['newsweek_jp'],
      priority: 7,
      enabled: true
    }
  ];

  /**
   * 全キュレーションソースの取得
   */
  public getAllCuratedSources(): CuratedSource[] {
    return this.curatedSources.filter(source => source.enabled);
  }

  /**
   * 注目ソースの取得
   */
  public getFeaturedSources(): CuratedSource[] {
    return this.curatedSources.filter(source => source.enabled && source.featured);
  }

  /**
   * カテゴリ別ソースの取得
   */
  public getSourcesByCategory(category: CuratedSource['category']): CuratedSource[] {
    return this.curatedSources.filter(source =>
      source.enabled && source.category === category
    );
  }

  /**
   * 信頼度別ソースの取得
   */
  public getSourcesByTrustScore(minScore: number = 8): CuratedSource[] {
    return this.curatedSources.filter(source =>
      source.enabled && source.trustScore >= minScore
    );
  }

  /**
   * ソースグループ別記事取得
   */
  public async getArticlesByGroup(groupId: string, limit: number = 20): Promise<Article[]> {
    const group = this.sourceGroups.find(g => g.id === groupId && g.enabled);
    if (!group) {
      console.warn(`[CuratedRSSService] Group not found or disabled: ${groupId}`);
      return [];
    }

    const allArticles: Article[] = [];

    for (const sourceId of group.sources) {
      const source = this.curatedSources.find(s => s.id === sourceId && s.enabled);
      if (source) {
        const articles = await this.getArticlesFromSource(source);
        allArticles.push(...articles);
      }
    }

    // 信頼度と公開日時でソート
    return allArticles
      .sort((a, b) => {
        const sourceA = this.curatedSources.find(s => s.id === a.source_id);
        const sourceB = this.curatedSources.find(s => s.id === b.source_id);

        // 信頼度が高い順
        if (sourceA && sourceB && sourceA.trustScore !== sourceB.trustScore) {
          return sourceB.trustScore - sourceA.trustScore;
        }

        // 新しい順
        const dateA = new Date(a.published_at || 0).getTime();
        const dateB = new Date(b.published_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  /**
   * 高品質記事の取得
   */
  public async getHighQualityArticles(limit: number = 15): Promise<Article[]> {
    const highTrustSources = this.getSourcesByTrustScore(9);
    const allArticles: Article[] = [];

    for (const source of highTrustSources) {
      const articles = await this.getArticlesFromSource(source);
      allArticles.push(...articles);
    }

    return allArticles
      .sort((a, b) => {
        const sourceA = this.curatedSources.find(s => s.id === a.source_id);
        const sourceB = this.curatedSources.find(s => s.id === b.source_id);

        return (sourceB?.trustScore || 0) - (sourceA?.trustScore || 0);
      })
      .slice(0, limit);
  }

  /**
   * 特定ソースからの記事取得
   */
  private async getArticlesFromSource(source: CuratedSource): Promise<Article[]> {
    try {
      // キャッシュチェック
      const cached = this.sourceCache.get(source.id);
      if (cached && Date.now() - cached.ts < this.CACHE_DURATION) {
        return cached.articles;
      }

      console.log(`[CuratedRSSService] Fetching from ${source.displayName}...`);

      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'AudionApp/1.0 RSS Reader',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlText = await response.text();
      const articles = this.parseRSSFeed(xmlText, source);

      // キャッシュ更新
      this.sourceCache.set(source.id, {
        articles,
        ts: Date.now()
      });

      // 統計更新
      source.articleCount = articles.length;
      source.errorCount = 0;
      source.lastUpdated = new Date().toISOString();

      console.log(`[CuratedRSSService] Fetched ${articles.length} articles from ${source.displayName}`);
      return articles;

    } catch (error) {
      console.error(`[CuratedRSSService] Error fetching from ${source.displayName}:`, error);
      source.errorCount++;

      // エラーが続く場合は一時無効化
      if (source.errorCount >= 5) {
        source.enabled = false;
        console.warn(`[CuratedRSSService] Disabled source ${source.displayName} due to repeated errors`);
      }

      return [];
    }
  }

  /**
   * RSSフィードのパース
   */
  private parseRSSFeed(xmlText: string, source: CuratedSource): Article[] {
    const articles: Article[] = [];

    try {
      // RSS/Atomアイテムの抽出
      const itemRegex = /<(?:item|entry)>(.*?)<\/(?:item|entry)>/gs;
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];

        const title = this.extractXMLContent(itemContent, ['title']);
        const description = this.extractXMLContent(itemContent, ['description', 'summary', 'content']);
        const link = this.extractXMLContent(itemContent, ['link', 'guid']);
        const pubDate = this.extractXMLContent(itemContent, ['pubDate', 'published', 'updated']);
        const category = this.extractXMLContent(itemContent, ['category']);

        if (title && link) {
          articles.push({
            id: `${source.id}_${Date.now()}_${articles.length}`,
            title: this.cleanText(title),
            summary: this.cleanText(description).substring(0, 300),
            content: this.cleanText(description),
            link: link.includes('http') ? link : source.metadata.website + link,
            source_name: source.displayName,
            source_id: source.id,
            published_at: this.parseDate(pubDate),
            category: category || source.category,
            genre: this.mapCategoryToGenre(source.category),
            reading_time: Math.ceil(description.length / 400),
            audio_available: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error(`[CuratedRSSService] RSS parse error for ${source.displayName}:`, error);
    }

    return articles;
  }

  /**
   * XML要素の内容抽出
   */
  private extractXMLContent(content: string, tags: string[]): string {
    for (const tag of tags) {
      const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's');
      const match = content.match(regex);
      if (match) {
        return match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1');
      }

      // 自己完結タグの場合（例：<link href="..."/>）
      const selfClosingRegex = new RegExp(`<${tag}[^>]*?href="([^"]*)"`, 's');
      const selfClosingMatch = content.match(selfClosingRegex);
      if (selfClosingMatch) {
        return selfClosingMatch[1];
      }
    }
    return '';
  }

  /**
   * テキストのクリーニング
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // HTMLタグ除去
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 日付のパース
   */
  private parseDate(dateString: string): string {
    if (!dateString) return new Date().toISOString();

    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * カテゴリからジャンルへのマッピング
   */
  private mapCategoryToGenre(category: CuratedSource['category']): string {
    const mapping = {
      'news': '総合',
      'tech': 'テクノロジー',
      'business': 'ビジネス',
      'sports': 'スポーツ',
      'entertainment': 'エンターテイメント',
      'lifestyle': 'ライフスタイル',
      'science': '科学・学術'
    };

    return mapping[category] || '総合';
  }

  /**
   * ソース統計の取得
   */
  public getSourceStatistics(): { [sourceId: string]: { articles: number; errors: number; lastUpdate: string } } {
    const stats: { [sourceId: string]: { articles: number; errors: number; lastUpdate: string } } = {};

    for (const source of this.curatedSources) {
      stats[source.id] = {
        articles: source.articleCount,
        errors: source.errorCount,
        lastUpdate: source.lastUpdated || 'Never'
      };
    }

    return stats;
  }

  /**
   * キャッシュのクリア
   */
  public clearCache(): void {
    this.sourceCache.clear();
    console.log('[CuratedRSSService] Cache cleared');
  }
}

export default new CuratedRSSService();