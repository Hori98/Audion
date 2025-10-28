/**
 * Article Categorization Service
 * 記事の緊急度・ジャンル分類・カテゴリ判定を行うサービス
 * キーワードベースの分類とスコアリングを実装
 */

import { Article } from './ArticleService';

// キーワードデータの型定義
interface EmergencyKeywords {
  emergency: {
    disaster: string[];
    security: string[];
    health: string[];
    economic: string[];
    political: string[];
  };
  urgent_prefixes: string[];
  time_sensitive: string[];
}

interface TrendingKeywords {
  trending: {
    tech: string[];
    entertainment: string[];
    sports: string[];
    lifestyle: string[];
    social: string[];
  };
  engagement_indicators: string[];
  popularity_metrics: string[];
  viral_patterns: string[];
}

// キーワードデータ（インライン定義）
const emergencyKeywords: EmergencyKeywords = {
  emergency: {
    disaster: [
      "地震", "津波", "台風", "洪水", "豪雨", "土砂崩れ", "噴火", "火山",
      "豪雪", "竜巻", "落雷", "雷", "災害", "被災", "避難", "緊急事態",
      "非常事態", "警報", "注意報", "特別警報", "避難指示", "避難勧告",
      "停電", "断水", "交通麻痺", "運行見合わせ", "欠航", "運休"
    ],
    security: [
      "テロ", "爆発", "銃撃", "事件", "事故", "火事", "火災", "救急",
      "怪我", "死亡", "行方不明", "誘拐", "殺人", "強盗", "不審者",
      "警察", "消防", "救助", "捜索", "封鎖", "規制", "立入禁止"
    ],
    health: [
      "感染症", "ウイルス", "パンデミック", "緊急事態宣言", "外出自粛",
      "休校", "休業", "営業停止", "ワクチン", "治療薬", "症状", "陽性",
      "クラスター", "濃厚接触", "隔離", "検査", "医療崩壊", "病床"
    ],
    economic: [
      "暴落", "急落", "株価", "円安", "円高", "金融危機", "破綻", "倒産",
      "リコール", "業務停止", "営業停止", "サービス停止", "システム障害",
      "データ流出", "情報漏洩", "サイバー攻撃", "ハッキング"
    ],
    political: [
      "辞任", "解散", "総選挙", "緊急会見", "記者会見", "発表", "声明",
      "制裁", "禁輸", "国交断絶", "戦争", "紛争", "攻撃", "侵攻", "空爆"
    ]
  },
  urgent_prefixes: [
    "速報", "緊急", "至急", "重要", "警告", "注意", "最新", "号外",
    "Breaking", "URGENT", "ALERT", "WARNING", "LIVE", "NOW"
  ],
  time_sensitive: [
    "今", "現在", "只今", "本日", "今日", "今夜", "今朝", "午前", "午後",
    "時間前", "分前", "先ほど", "直前", "直後", "最中", "進行中"
  ]
};

const trendingKeywords: TrendingKeywords = {
  trending: {
    tech: [
      "AI", "人工知能", "ChatGPT", "OpenAI", "機械学習", "深層学習", "DX",
      "デジタル", "アプリ", "ソフト", "クラウド", "IoT", "5G", "6G",
      "メタバース", "VR", "AR", "ブロックチェーン", "NFT", "暗号通貨",
      "ビットコイン", "イーサリアム", "Web3", "スマホ", "iPhone", "Android"
    ],
    entertainment: [
      "映画", "ドラマ", "アニメ", "漫画", "ゲーム", "音楽", "アーティスト",
      "歌手", "俳優", "女優", "芸能人", "タレント", "バラエティ", "番組",
      "配信", "Netflix", "YouTube", "TikTok", "Instagram", "Twitter",
      "ライブ", "コンサート", "フェス", "イベント", "舞台", "展示"
    ],
    sports: [
      "オリンピック", "ワールドカップ", "野球", "サッカー", "テニス", "ゴルフ",
      "バスケ", "バレー", "水泳", "陸上", "体操", "フィギュア", "相撲",
      "格闘技", "ボクシング", "eスポーツ", "優勝", "勝利", "敗北", "記録",
      "新記録", "世界記録", "日本記録", "メダル", "金メダル", "銀メダル"
    ],
    lifestyle: [
      "グルメ", "レストラン", "カフェ", "料理", "レシピ", "食べ物", "飲み物",
      "ファッション", "ブランド", "コスメ", "美容", "健康", "ダイエット",
      "旅行", "観光", "ホテル", "温泉", "祭り", "イルミネーション",
      "ショッピング", "セール", "バーゲン", "限定", "新商品", "発売"
    ],
    social: [
      "トレンド", "話題", "人気", "注目", "バズ", "炎上", "議論", "論争",
      "賛否", "批判", "支持", "反対", "世論", "調査", "アンケート",
      "ランキング", "1位", "上位", "急上昇", "検索", "ニュース", "報道"
    ]
  },
  engagement_indicators: [
    "話題", "人気", "注目", "急上昇", "トレンド", "バズ", "炎上",
    "議論", "賛否", "反響", "評判", "口コミ", "レビュー", "感想",
    "コメント", "シェア", "拡散", "リツイート", "いいね", "フォロー"
  ],
  popularity_metrics: [
    "1位", "2位", "3位", "首位", "トップ", "上位", "ランキング", "順位",
    "記録", "最高", "最多", "最大", "過去最高", "史上最高", "初",
    "新記録", "更新", "達成", "突破", "超え", "万人", "億円", "億回"
  ],
  viral_patterns: [
    "拡散", "シェア", "リツイート", "バイラル", "口コミ", "評判",
    "SNS", "ソーシャル", "投稿", "動画", "画像", "写真", "まとめ",
    "反応", "コメント", "返信", "いいね", "フォロー", "登録者"
  ]
};

export type EmergencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type TrendingScore = 0 | 1 | 2 | 3 | 4 | 5; // 0-5の6段階
export type ArticleCategory = 'emergency' | 'trending' | 'personalized' | 'latest';

export interface ArticleClassification {
  emergencyLevel: EmergencyLevel;
  emergencyScore: number; // 0-100
  trendingScore: TrendingScore;
  trendingConfidence: number; // 0-1
  category: ArticleCategory;
  categoryConfidence: number; // 0-1
  keywords: string[]; // マッチしたキーワード
}

export interface ClassifiedArticle extends Article {
  classification?: ArticleClassification;
}

class ArticleCategorizationService {

  /**
   * 記事の緊急度を判定
   */
  private calculateEmergencyLevel(title: string, summary: string): {
    level: EmergencyLevel;
    score: number;
    keywords: string[];
  } {
    const text = `${title} ${summary}`.toLowerCase();
    const matchedKeywords: string[] = [];
    let totalScore = 0;

    // 緊急度プレフィックスの重み付きチェック
    emergencyKeywords.urgent_prefixes.forEach(prefix => {
      if (text.includes(prefix.toLowerCase())) {
        matchedKeywords.push(prefix);
        totalScore += 30; // 高い重み
      }
    });

    // 時間的緊急性の重み付きチェック
    emergencyKeywords.time_sensitive.forEach(timeWord => {
      if (text.includes(timeWord)) {
        matchedKeywords.push(timeWord);
        totalScore += 15; // 中程度の重み
      }
    });

    // カテゴリ別キーワードチェック
    Object.entries(emergencyKeywords.emergency).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          matchedKeywords.push(keyword);

          // カテゴリ別重み付け
          switch (category) {
            case 'disaster':
            case 'security':
              totalScore += 25; // 災害・セキュリティは高重み
              break;
            case 'health':
              totalScore += 20; // 健康関連は中高重み
              break;
            case 'economic':
            case 'political':
              totalScore += 15; // 経済・政治は中重み
              break;
          }
        }
      });
    });

    // スコアから緊急度レベルを決定
    let level: EmergencyLevel = 'none';
    if (totalScore >= 80) level = 'critical';
    else if (totalScore >= 60) level = 'high';
    else if (totalScore >= 40) level = 'medium';
    else if (totalScore >= 20) level = 'low';

    return {
      level,
      score: Math.min(totalScore, 100),
      keywords: Array.from(new Set(matchedKeywords)) // 重複除去
    };
  }

  /**
   * トレンドスコアを計算
   */
  private calculateTrendingScore(title: string, summary: string): {
    score: TrendingScore;
    confidence: number;
    keywords: string[];
  } {
    const text = `${title} ${summary}`.toLowerCase();
    const matchedKeywords: string[] = [];
    let totalScore = 0;

    // エンゲージメント指標の重み付きチェック
    trendingKeywords.engagement_indicators.forEach(indicator => {
      if (text.includes(indicator)) {
        matchedKeywords.push(indicator);
        totalScore += 20;
      }
    });

    // 人気メトリクスの重み付きチェック
    trendingKeywords.popularity_metrics.forEach(metric => {
      if (text.includes(metric)) {
        matchedKeywords.push(metric);
        totalScore += 15;
      }
    });

    // バイラルパターンの重み付きチェック
    trendingKeywords.viral_patterns.forEach(pattern => {
      if (text.includes(pattern)) {
        matchedKeywords.push(pattern);
        totalScore += 10;
      }
    });

    // カテゴリ別トレンドキーワードチェック
    Object.entries(trendingKeywords.trending).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);

          // カテゴリ別重み付け
          switch (category) {
            case 'tech':
            case 'entertainment':
              totalScore += 12; // テック・エンタメは高重み
              break;
            case 'sports':
            case 'social':
              totalScore += 10; // スポーツ・ソーシャルは中重み
              break;
            case 'lifestyle':
              totalScore += 8; // ライフスタイルは低重み
              break;
          }
        }
      });
    });

    // スコアをTrendingScore（0-5）に正規化
    const normalizedScore = Math.min(Math.floor(totalScore / 20), 5) as TrendingScore;
    const confidence = Math.min(totalScore / 100, 1);

    return {
      score: normalizedScore,
      confidence,
      keywords: Array.from(new Set(matchedKeywords))
    };
  }

  /**
   * 記事のカテゴリを決定
   */
  private determineCategory(emergencyLevel: EmergencyLevel, trendingScore: TrendingScore): {
    category: ArticleCategory;
    confidence: number;
  } {
    // 緊急度が高い場合は緊急カテゴリ
    if (emergencyLevel === 'critical' || emergencyLevel === 'high') {
      return { category: 'emergency', confidence: 0.9 };
    }

    if (emergencyLevel === 'medium') {
      return { category: 'emergency', confidence: 0.7 };
    }

    // トレンドスコアが高い場合はトレンドカテゴリ
    if (trendingScore >= 4) {
      return { category: 'trending', confidence: 0.8 };
    }

    if (trendingScore >= 3) {
      return { category: 'trending', confidence: 0.6 };
    }

    // 中程度のトレンドまたは低緊急度はパーソナライズ対象
    if (trendingScore >= 2 || emergencyLevel === 'low') {
      return { category: 'personalized', confidence: 0.5 };
    }

    // その他は最新カテゴリ
    return { category: 'latest', confidence: 0.4 };
  }

  /**
   * 記事を分類
   */
  public classifyArticle(article: Article): ClassifiedArticle {
    const title = article.title || '';
    const summary = article.summary || '';

    // 緊急度判定
    const emergency = this.calculateEmergencyLevel(title, summary);

    // トレンドスコア計算
    const trending = this.calculateTrendingScore(title, summary);

    // カテゴリ決定
    const categoryResult = this.determineCategory(emergency.level, trending.score);

    // 全キーワードをマージ
    const allKeywords = [...emergency.keywords, ...trending.keywords];

    const classification: ArticleClassification = {
      emergencyLevel: emergency.level,
      emergencyScore: emergency.score,
      trendingScore: trending.score,
      trendingConfidence: trending.confidence,
      category: categoryResult.category,
      categoryConfidence: categoryResult.confidence,
      keywords: Array.from(new Set(allKeywords))
    };

    return {
      ...article,
      classification
    };
  }

  /**
   * 記事配列を分類
   */
  public classifyArticles(articles: Article[]): ClassifiedArticle[] {
    return articles.map(article => this.classifyArticle(article));
  }

  /**
   * カテゴリ別に記事をフィルタリング
   */
  public filterByCategory(
    articles: ClassifiedArticle[],
    category: ArticleCategory
  ): ClassifiedArticle[] {
    return articles.filter(article =>
      article.classification?.category === category
    );
  }

  /**
   * 緊急度別に記事をフィルタリング
   */
  public filterByEmergencyLevel(
    articles: ClassifiedArticle[],
    minLevel: EmergencyLevel
  ): ClassifiedArticle[] {
    const levelOrder: EmergencyLevel[] = ['none', 'low', 'medium', 'high', 'critical'];
    const minIndex = levelOrder.indexOf(minLevel);

    return articles.filter(article => {
      const articleLevel = article.classification?.emergencyLevel || 'none';
      return levelOrder.indexOf(articleLevel) >= minIndex;
    });
  }

  /**
   * トレンドスコア別にソート
   */
  public sortByTrendingScore(articles: ClassifiedArticle[]): ClassifiedArticle[] {
    return [...articles].sort((a, b) => {
      const scoreA = a.classification?.trendingScore || 0;
      const scoreB = b.classification?.trendingScore || 0;
      return scoreB - scoreA; // 降順
    });
  }

  /**
   * 緊急度別にソート
   */
  public sortByEmergencyScore(articles: ClassifiedArticle[]): ClassifiedArticle[] {
    return [...articles].sort((a, b) => {
      const scoreA = a.classification?.emergencyScore || 0;
      const scoreB = b.classification?.emergencyScore || 0;
      return scoreB - scoreA; // 降順
    });
  }
}

export default new ArticleCategorizationService();