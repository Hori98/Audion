/**
 * Emergency News Service
 * 緊急情報・速報ニュースの取得と管理を行うサービス
 * 官公庁API・気象庁・J-ALERT等の公式データソースから緊急情報を統合
 */

import { Article } from './ArticleService';

// 緊急情報ソースの定義
export interface EmergencySource {
  id: string;
  name: string;
  type: 'jma' | 'jalert' | 'cabinet' | 'rss' | 'api';
  url: string;
  enabled: boolean;
  priority: number; // 1-10 (10が最高優先度)
  updateInterval: number; // 分単位
  lastChecked?: string;
  errorCount: number;
}

export interface EmergencyAlert {
  id: string;
  sourceId: string;
  type: 'earthquake' | 'tsunami' | 'weather' | 'disaster' | 'security' | 'health' | 'other';
  level: 'info' | 'warning' | 'alert' | 'emergency';
  title: string;
  message: string;
  area?: string; // 対象地域
  issuedAt: string;
  expiresAt?: string;
  url?: string;
  processed: boolean; // 記事化済みかどうか
}

class EmergencyNewsService {
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2分
  private alertCache: Map<string, { alerts: EmergencyAlert[]; ts: number }> = new Map();
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();

  // デフォルト緊急情報ソース
  private readonly defaultSources: EmergencySource[] = [
    {
      id: 'jma_weather',
      name: '気象庁 気象警報',
      type: 'jma',
      url: 'https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json',
      enabled: true,
      priority: 9,
      updateInterval: 5,
      errorCount: 0
    },
    {
      id: 'jma_earthquake',
      name: '気象庁 地震情報',
      type: 'jma',
      url: 'https://www.jma.go.jp/bosai/forecast/data/seismicity/110000.json',
      enabled: true,
      priority: 10,
      updateInterval: 1,
      errorCount: 0
    },
    {
      id: 'cabinet_crisis',
      name: '内閣官房 危機管理',
      type: 'cabinet',
      url: 'https://www.cas.go.jp/jp/info/covid-19/xml/index.xml',
      enabled: true,
      priority: 8,
      updateInterval: 10,
      errorCount: 0
    },
    {
      id: 'usgs_earthquakes',
      name: 'USGS 地震情報（グローバル）',
      type: 'rss',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.atom',
      enabled: true,
      priority: 8,
      updateInterval: 5,
      errorCount: 0
    },
    {
      id: 'kyodo_urgent',
      name: '共同通信 速報',
      type: 'rss',
      url: 'https://this.kiji.is/rss/urgent',
      enabled: true,
      priority: 8,
      updateInterval: 2,
      errorCount: 0
    }
  ];

  /**
   * 緊急情報の取得開始
   */
  public async startEmergencyMonitoring(): Promise<void> {
    console.log('[EmergencyNewsService] Starting emergency monitoring...');

    for (const source of this.defaultSources) {
      if (source.enabled) {
        await this.scheduleSourceUpdate(source);
      }
    }
  }

  /**
   * 緊急情報監視の停止
   */
  public stopEmergencyMonitoring(): void {
    console.log('[EmergencyNewsService] Stopping emergency monitoring...');

    for (const timer of this.updateTimers.values()) {
      clearInterval(timer);
    }
    this.updateTimers.clear();
  }

  /**
   * ソース別の更新スケジューリング
   */
  private async scheduleSourceUpdate(source: EmergencySource): Promise<void> {
    // 初回実行
    await this.fetchFromSource(source);

    // 定期更新スケジュール
    const timer = setInterval(async () => {
      await this.fetchFromSource(source);
    }, source.updateInterval * 60 * 1000);

    this.updateTimers.set(source.id, timer);
  }

  /**
   * 指定ソースからデータ取得
   */
  private async fetchFromSource(source: EmergencySource): Promise<void> {
    try {
      console.log(`[EmergencyNewsService] Fetching from ${source.name}...`);

      let alerts: EmergencyAlert[] = [];

      switch (source.type) {
        case 'jma':
          alerts = await this.fetchJMAData(source);
          break;
        case 'cabinet':
          alerts = await this.fetchCabinetData(source);
          break;
        case 'rss':
          alerts = await this.fetchRSSData(source);
          break;
        default:
          console.warn(`[EmergencyNewsService] Unsupported source type: ${source.type}`);
          return;
      }

      // キャッシュ更新
      this.alertCache.set(source.id, {
        alerts,
        ts: Date.now()
      });

      // エラーカウントリセット
      source.errorCount = 0;
      source.lastChecked = new Date().toISOString();

      console.log(`[EmergencyNewsService] Fetched ${alerts.length} alerts from ${source.name}`);

    } catch (error) {
      console.error(`[EmergencyNewsService] Error fetching from ${source.name}:`, error);
      source.errorCount++;

      // エラーが続く場合は一時無効化
      if (source.errorCount >= 3) {
        source.enabled = false;
        console.warn(`[EmergencyNewsService] Disabled source ${source.name} due to repeated errors`);
      }
    }
  }

  /**
   * 気象庁データの取得
   */
  private async fetchJMAData(source: EmergencySource): Promise<EmergencyAlert[]> {
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'AudionApp/1.0 Emergency Monitor'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.parseJMAData(data, source.id);

    } catch (error) {
      console.error(`[EmergencyNewsService] JMA fetch error:`, error);
      return [];
    }
  }

  /**
   * 内閣官房データの取得
   */
  private async fetchCabinetData(source: EmergencySource): Promise<EmergencyAlert[]> {
    try {
      const response = await fetch(source.url);
      const xmlText = await response.text();
      return this.parseXMLData(xmlText, source.id);

    } catch (error) {
      console.error(`[EmergencyNewsService] Cabinet fetch error:`, error);
      return [];
    }
  }

  /**
   * RSSデータの取得
   */
  private async fetchRSSData(source: EmergencySource): Promise<EmergencyAlert[]> {
    try {
      const response = await fetch(source.url);
      const xmlText = await response.text();
      return this.parseRSSData(xmlText, source.id);

    } catch (error) {
      console.error(`[EmergencyNewsService] RSS fetch error:`, error);
      return [];
    }
  }

  /**
   * 気象庁JSONデータのパース
   */
  private parseJMAData(data: any, sourceId: string): EmergencyAlert[] {
    const alerts: EmergencyAlert[] = [];

    try {
      // 気象庁データの構造に応じてパース
      // 実際のAPIレスポンス構造に合わせて実装
      if (data && Array.isArray(data)) {
        data.forEach((item: any, index: number) => {
          alerts.push({
            id: `${sourceId}_${Date.now()}_${index}`,
            sourceId,
            type: this.determineAlertType(item.title || ''),
            level: this.determineAlertLevel(item.severity || ''),
            title: item.title || 'JMA Alert',
            message: item.description || '',
            area: item.area || '全国',
            issuedAt: item.issued || new Date().toISOString(),
            expiresAt: item.expires,
            processed: false
          });
        });
      }

    } catch (error) {
      console.error('[EmergencyNewsService] JMA parse error:', error);
    }

    return alerts;
  }

  /**
   * XMLデータのパース（内閣官房等）
   */
  private parseXMLData(xmlText: string, sourceId: string): EmergencyAlert[] {
    const alerts: EmergencyAlert[] = [];

    try {
      // 簡易XMLパース（本格実装時はXMLパーサー使用推奨）
      const itemRegex = /<item>(.*?)<\/item>/gs;
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];
        const title = this.extractXMLTag(itemContent, 'title');
        const description = this.extractXMLTag(itemContent, 'description');
        const pubDate = this.extractXMLTag(itemContent, 'pubDate');

        alerts.push({
          id: `${sourceId}_${Date.now()}_${alerts.length}`,
          sourceId,
          type: this.determineAlertType(title),
          level: this.determineAlertLevel(title + ' ' + description),
          title,
          message: description,
          issuedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          processed: false
        });
      }

    } catch (error) {
      console.error('[EmergencyNewsService] XML parse error:', error);
    }

    return alerts;
  }

  /**
   * RSSデータのパース
   */
  private parseRSSData(xmlText: string, sourceId: string): EmergencyAlert[] {
    const alerts: EmergencyAlert[] = [];

    try {
      const itemRegex = /<item>(.*?)<\/item>/gs;
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];
        const title = this.extractXMLTag(itemContent, 'title');
        const description = this.extractXMLTag(itemContent, 'description');
        const link = this.extractXMLTag(itemContent, 'link');
        const pubDate = this.extractXMLTag(itemContent, 'pubDate');

        // 緊急性のあるニュースのみフィルタリング
        if (this.isEmergencyNews(title + ' ' + description)) {
          alerts.push({
            id: `${sourceId}_${Date.now()}_${alerts.length}`,
            sourceId,
            type: this.determineAlertType(title),
            level: this.determineAlertLevel(title + ' ' + description),
            title,
            message: description,
            issuedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            url: link,
            processed: false
          });
        }
      }

    } catch (error) {
      console.error('[EmergencyNewsService] RSS parse error:', error);
    }

    return alerts;
  }

  /**
   * XML要素の抽出
   */
  private extractXMLTag(content: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 's');
    const match = content.match(regex);
    return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1') : '';
  }

  /**
   * 緊急ニュースかどうかの判定
   */
  private isEmergencyNews(content: string): boolean {
    const emergencyKeywords = [
      '速報', '緊急', '警報', '注意報', '避難', '地震', '津波', '台風', '豪雨',
      '災害', '火災', '事故', 'テロ', '警察', '救急', 'Breaking', 'URGENT', 'ALERT'
    ];

    return emergencyKeywords.some(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * アラートタイプの判定
   */
  private determineAlertType(content: string): EmergencyAlert['type'] {
    if (/地震|震度|余震/.test(content)) return 'earthquake';
    if (/津波/.test(content)) return 'tsunami';
    if (/台風|豪雨|警報|注意報|気象/.test(content)) return 'weather';
    if (/災害|避難|火災|土砂/.test(content)) return 'disaster';
    if (/テロ|事件|事故|警察/.test(content)) return 'security';
    if (/感染|ウイルス|医療|健康/.test(content)) return 'health';
    return 'other';
  }

  /**
   * アラートレベルの判定
   */
  private determineAlertLevel(content: string): EmergencyAlert['level'] {
    if (/特別警報|緊急事態|避難指示|EMERGENCY|CRITICAL/.test(content)) return 'emergency';
    if (/警報|避難勧告|WARNING|ALERT/.test(content)) return 'alert';
    if (/注意報|WARNING/.test(content)) return 'warning';
    return 'info';
  }

  /**
   * 全緊急アラートの取得
   */
  public async getAllEmergencyAlerts(): Promise<EmergencyAlert[]> {
    const allAlerts: EmergencyAlert[] = [];

    for (const [sourceId, cache] of this.alertCache) {
      // キャッシュが有効な場合のみ使用
      if (Date.now() - cache.ts < this.CACHE_TTL) {
        allAlerts.push(...cache.alerts);
      }
    }

    // 優先度と発行時刻でソート
    return allAlerts.sort((a, b) => {
      const sourceA = this.defaultSources.find(s => s.id === a.sourceId);
      const sourceB = this.defaultSources.find(s => s.id === b.sourceId);

      // 優先度が高い順
      if (sourceA && sourceB && sourceA.priority !== sourceB.priority) {
        return sourceB.priority - sourceA.priority;
      }

      // 新しい順
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    });
  }

  /**
   * 緊急アラートの記事化
   */
  public async convertAlertsToArticles(): Promise<Article[]> {
    const alerts = await this.getAllEmergencyAlerts();
    const articles: Article[] = [];

    for (const alert of alerts.filter(a => !a.processed)) {
      const article: Article = {
        id: `emergency_${alert.id}`,
        title: alert.title,
        summary: alert.message,
        content: alert.message,
        link: alert.url || '',
        source_name: this.defaultSources.find(s => s.id === alert.sourceId)?.name || 'Emergency Alert',
        source_id: alert.sourceId,
        published_at: alert.issuedAt,
        category: 'emergency',
        genre: alert.type,
        thumbnail_url: this.getEmergencyThumbnail(alert.type),
        reading_time: Math.ceil(alert.message.length / 400), // 日本語読み取り速度概算
        audio_available: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      articles.push(article);
      alert.processed = true;
    }

    console.log(`[EmergencyNewsService] Converted ${articles.length} alerts to articles`);
    return articles;
  }

  /**
   * 緊急情報用サムネイル取得
   */
  private getEmergencyThumbnail(type: EmergencyAlert['type']): string {
    const thumbnails = {
      earthquake: 'https://example.com/emergency/earthquake.png',
      tsunami: 'https://example.com/emergency/tsunami.png',
      weather: 'https://example.com/emergency/weather.png',
      disaster: 'https://example.com/emergency/disaster.png',
      security: 'https://example.com/emergency/security.png',
      health: 'https://example.com/emergency/health.png',
      other: 'https://example.com/emergency/general.png'
    };

    return thumbnails[type] || thumbnails.other;
  }

  /**
   * サービスのクリーンアップ
   */
  public cleanup(): void {
    this.stopEmergencyMonitoring();
    this.alertCache.clear();
  }
}

export default new EmergencyNewsService();