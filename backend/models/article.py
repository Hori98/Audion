"""
Article-related Pydantic models for article processing and genre classification.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Article(BaseModel):
    """Article model from RSS feeds."""
    id: str
    title: str
    summary: str
    link: str
    published: str
    source_name: str
    source_id: Optional[str] = None  # Added missing source_id field
    content: Optional[str] = None
    genre: Optional[str] = None
    thumbnail_url: Optional[str] = None

class AutoPickRequest(BaseModel):
    """Request model for auto-picking articles based on user preferences."""
    max_articles: Optional[int] = 5
    preferred_genres: Optional[List[str]] = None
    active_source_ids: Optional[List[str]] = None  # Explicitly specify which sources to use

class MisreadingFeedback(BaseModel):
    """Model for reporting audio misreading issues."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    audio_id: str
    timestamp: int  # Position in milliseconds where misreading occurred
    reported_text: Optional[str] = None  # What the user heard
    expected_text: Optional[str] = None  # What should have been said
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Genre classification constants - Updated for Japanese content with frontend consistency
GENRE_KEYWORDS = {
    "テクノロジー": {
        "high": [
            # 日本語キーワード
            "ai", "人工知能", "機械学習", "ブロックチェーン", "暗号通貨", "仮想通貨", "ビットコイン", "イーサリアム",
            "nft", "メタバース", "vr", "バーチャルリアリティ", "仮想現実", "ar", "拡張現実", "クラウド", "サイバーセキュリティ",
            "データプライバシー", "アルゴリズム", "ニューラルネットワーク", "量子コンピュータ", "5g", "iot", "ロボット", "自動化",
            # 英語キーワード
            "artificial intelligence", "machine learning", "blockchain", "cryptocurrency", "bitcoin", "ethereum",
            "metaverse", "virtual reality", "augmented reality", "cloud computing", "cybersecurity", "data privacy",
            "algorithm", "neural network", "quantum computing", "internet of things", "robotics", "automation"
        ],
        "medium": [
            # 日本語キーワード
            "テクノロジー", "技術", "テック", "ソフトウェア", "アプリ", "プラットフォーム", "デジタル", "オンライン",
            "インターネット", "ウェブ", "モバイル", "スマートフォン", "スマホ", "アイフォン", "アンドロイド",
            "グーグル", "アップル", "マイクロソフト", "アマゾン", "フェイスブック", "メタ", "ツイッター", "テスラ",
            # 英語キーワード
            "tech", "technology", "software", "app", "platform", "digital", "online", "internet", "web", "mobile",
            "smartphone", "iphone", "android", "google", "apple", "microsoft", "amazon", "facebook", "meta", "twitter",
            "tesla", "spacex", "openai", "chatgpt"
        ],
        "low": [
            "スタートアップ", "イノベーション", "ベンチャー", "ipo", "フィンテック", "エドテック", "メドテック",
            "startup", "innovation", "disruption", "silicon valley", "venture capital", "vc", "ipo", "saas", "fintech", "edtech", "medtech"
        ]
    },
    "経済・ビジネス": {
        "high": [
            # 日本語キーワード
            "株式市場", "日経", "東証", "ナスダック", "ダウ", "日銀", "金利", "インフレ", "景気後退", "gdp", "失業率",
            "経済成長", "金融政策", "財政政策", "中央銀行", "決算", "売上", "利益", "買収", "合併", "m&a",
            # 英語キーワード
            "stock market", "nasdaq", "dow jones", "s&p 500", "federal reserve", "fed", "interest rate", "inflation",
            "recession", "gdp", "unemployment", "economic growth", "monetary policy", "fiscal policy", "central bank",
            "earnings", "revenue", "profit", "merger", "acquisition"
        ],
        "medium": [
            # 日本語キーワード
            "ビジネス", "経営", "企業", "会社", "金融", "経済", "市場", "株式", "株", "投資", "投資家", "取引",
            "銀行", "クレジット", "ローン", "保険", "年金", "退職", "法人", "コーポレート",
            # 英語キーワード
            "business", "finance", "financial", "economy", "economic", "market", "stock", "share", "investment",
            "investor", "trading", "bank", "banking", "credit", "loan", "mortgage", "insurance", "pension",
            "retirement", "corporate", "company", "enterprise"
        ],
        "low": [
            "配当", "ポートフォリオ", "資産", "商業", "産業", "業界", "管理", "経営陣", "ceo", "cfo",
            "dividend", "portfolio", "asset", "commerce", "industry", "sector", "management", "executive", "ceo", "cfo"
        ]
    },
    "国際・社会": {
        "high": [
            # 日本語キーワード
            "政治", "選挙", "投票", "総裁選", "首相", "大統領", "国会", "議会", "国際", "世界", "外交", "大使館",
            "国連", "nato", "eu", "サミット", "条約", "制裁", "和平", "紛争", "戦争", "平和", "民主主義",
            # 英語キーワード
            "politics", "political", "election", "president", "prime minister", "congress", "parliament", "international",
            "global", "worldwide", "foreign", "diplomatic", "embassy", "united nations", "un", "nato", "eu", "summit",
            "treaty", "sanctions", "peace talks", "conflict", "war", "democracy"
        ],
        "medium": [
            # 日本語キーワード
            "政府", "政策", "大臣", "議員", "市長", "知事", "法律", "社会", "国家", "国民", "国境", "移民",
            "難民", "貿易", "輸出", "輸入", "同盟", "協力", "二国間", "多国間",
            # 英語キーワード
            "government", "policy", "minister", "senator", "congressman", "mayor", "governor", "world", "country",
            "nation", "national", "border", "immigration", "refugee", "asylum", "trade war", "tariff", "export",
            "import", "alliance", "cooperation", "bilateral", "multilateral"
        ],
        "low": [
            "行政", "内閣", "官僚", "規制", "統治", "公共", "公務員", "法", "投票", "世論調査", "有権者",
            "administration", "cabinet", "bureaucracy", "regulation", "governance", "public sector", "civil service",
            "law", "ballot", "polling", "voter"
        ]
    },
    "ライフスタイル": {
        "high": [
            # 日本語キーワード
            "健康", "医療", "病院", "医師", "治療", "薬", "ワクチン", "コロナ", "新型コロナ", "パンデミック",
            "旅行", "観光", "ホテル", "リゾート", "フライト", "空港", "教育", "学校", "大学", "学生", "先生",
            # 英語キーワード
            "health", "medical", "hospital", "doctor", "treatment", "medicine", "vaccine", "covid", "coronavirus",
            "pandemic", "travel", "tourism", "hotel", "resort", "flight", "airport", "education", "school",
            "university", "student", "teacher"
        ],
        "medium": [
            # 日本語キーワード
            "ライフスタイル", "生活", "健康的", "フィットネス", "栄養", "ダイエット", "メンタルヘルス", "ストレス",
            "休暇", "バケーション", "旅", "探検", "冒険", "観光地", "ランドマーク", "文化", "学習", "勉強",
            # 英語キーワード
            "lifestyle", "healthy", "wellness", "fitness", "nutrition", "diet", "mental health", "stress", "vacation",
            "holiday", "trip", "journey", "destination", "visit", "explore", "adventure", "culture", "learning"
        ],
        "low": [
            "運動", "ワークアウト", "ウェルビーイング", "予防", "ケア", "経験", "発見", "レジャー", "娯楽", "知識", "スキル",
            "exercise", "workout", "wellbeing", "prevention", "care", "experience", "discovery", "leisure", "recreation",
            "knowledge", "skill"
        ]
    },
    "エンタメ・スポーツ": {
        "high": [
            # 日本語キーワード
            "映画", "映画館", "ハリウッド", "オスカー", "音楽", "アルバム", "曲", "コンサート", "芸能人", "俳優",
            "女優", "歌手", "ミュージシャン", "監督", "プロデューサー", "オリンピック", "ワールドカップ", "チャンピオンズリーグ",
            # 英語キーワード
            "movie", "film", "cinema", "hollywood", "oscar", "emmy", "grammy", "music", "album", "song", "concert",
            "celebrity", "actor", "actress", "singer", "musician", "director", "producer", "olympic", "olympics",
            "world cup", "champions league"
        ],
        "medium": [
            # 日本語キーワード
            "エンターテイメント", "娯楽", "ショー", "シリーズ", "テレビ", "ストリーミング", "netflix", "アート", "芸術",
            "美術館", "博物館", "スポーツ", "試合", "ゲーム", "チャンピオンシップ", "トーナメント", "リーグ", "チーム",
            "選手", "アスリート", "コーチ", "勝利", "敗北", "ゴール", "スコア",
            # 英語キーワード
            "entertainment", "show", "series", "tv", "television", "streaming", "netflix", "disney", "art", "artist",
            "gallery", "museum", "sport", "sports", "game", "match", "championship", "tournament", "league", "team",
            "player", "athlete", "coach", "victory", "defeat", "goal", "score"
        ],
        "low": [
            "劇場", "パフォーマンス", "コメディ", "ドラマ", "ドキュメンタリー", "アニメーション", "ゲーム", "ビデオゲーム",
            "サッカー", "野球", "バスケットボール", "テニス", "ゴルフ", "ホッケー", "ボクシング",
            "theater", "theatre", "performance", "comedy", "drama", "documentary", "animation", "gaming", "video game",
            "football", "soccer", "basketball", "baseball", "tennis", "golf", "hockey", "boxing", "mma", "racing"
        ]
    },
    "その他": {
        "high": [
            # 日本語キーワード
            "研究", "科学", "実験", "実験室", "大学研究", "気候変動", "地球温暖化", "環境", "エネルギー", "電気自動車",
            # 英語キーワード
            "research", "study", "scientific", "scientist", "discovery", "breakthrough", "experiment", "laboratory",
            "climate change", "global warming", "environment", "energy", "electric vehicle"
        ],
        "medium": [
            # 日本語キーワード
            "科学的", "物理学", "化学", "生物学", "天文学", "宇宙", "火星", "ロケット", "衛星", "望遠鏡", "環境的",
            "気候", "天気", "温度", "汚染", "生態系", "野生動物", "森林", "海洋", "自然", "緑",
            # 英語キーワード
            "science", "physics", "chemistry", "biology", "astronomy", "space", "nasa", "mars", "rocket", "satellite",
            "telescope", "environmental", "climate", "weather", "temperature", "pollution", "ecosystem", "wildlife",
            "forest", "ocean", "nature", "natural", "green"
        ],
        "low": [
            "イノベーション", "開発", "分析", "データ", "証拠", "理論", "仮説", "エコ", "リサイクル", "廃棄物", "資源",
            "innovation", "development", "analysis", "data", "evidence", "theory", "hypothesis", "eco", "recycling",
            "waste", "resource"
        ]
    }
}