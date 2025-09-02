# クリーンなバックエンドアーキテクチャ設計

## 新しいディレクトリ構造

```
backend_refactored/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPIアプリケーションエントリーポイント
│   ├── config/
│   │   ├── __init__.py
│   │   ├── database.py            # MongoDB接続設定
│   │   ├── settings.py            # 環境変数・設定管理
│   │   └── cors.py                # CORS設定
│   ├── models/                    # Pydanticモデル（データ構造定義）
│   │   ├── __init__.py
│   │   ├── auth.py                # User, UserCreate, UserLogin等
│   │   ├── rss.py                 # RSSSource, RSSSourceCreate等
│   │   ├── article.py             # Article, Bookmark等
│   │   ├── audio.py               # AudioCreation, AudioCreationRequest等
│   │   ├── playlist.py            # Playlist, Album関連
│   │   ├── subscription.py        # サブスクリプション関連
│   │   └── common.py              # 共通で使用される基底モデル
│   ├── services/                  # ビジネスロジック層
│   │   ├── __init__.py
│   │   ├── auth_service.py        # 認証・認可ロジック
│   │   ├── rss_service.py         # RSS取得・管理ロジック
│   │   ├── article_service.py     # 記事処理・分類ロジック
│   │   ├── audio_service.py       # 音声生成・TTS統合
│   │   ├── ai_service.py          # OpenAI統合・AI機能
│   │   ├── playlist_service.py    # プレイリスト・アルバム管理
│   │   ├── subscription_service.py # プラン・制限管理
│   │   ├── storage_service.py     # ファイル・画像ストレージ
│   │   └── notification_service.py # 通知・フィードバック
│   ├── api/                       # APIエンドポイント層
│   │   ├── __init__.py
│   │   ├── v1/                    # APIバージョン管理
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # 認証エンドポイント
│   │   │   ├── rss.py             # RSS管理エンドポイント
│   │   │   ├── articles.py        # 記事関連エンドポイント
│   │   │   ├── audio.py           # 音声生成・管理エンドポイント
│   │   │   ├── playlists.py       # プレイリスト・アルバムエンドポイント
│   │   │   ├── subscription.py    # サブスクリプションエンドポイント
│   │   │   ├── user.py            # ユーザープロフィール・設定
│   │   │   └── system.py          # ヘルスチェック・デバッグ
│   │   └── dependencies.py       # 共通依存関数（認証等）
│   ├── core/                     # コア機能・ユーティリティ
│   │   ├── __init__.py
│   │   ├── security.py           # JWT・パスワードハッシュ化
│   │   ├── database.py           # データベースヘルパー
│   │   ├── exceptions.py         # カスタム例外定義
│   │   ├── middleware.py         # ミドルウェア（ロギング等）
│   │   └── utils.py              # 汎用ユーティリティ関数
│   └── tests/                    # 機能別テスト
│       ├── __init__.py
│       ├── test_auth.py
│       ├── test_rss.py
│       ├── test_audio.py
│       └── ...
├── requirements.txt
├── pyproject.toml               # 依存関係管理（Poetry使用）
└── README.md                    # バックエンドAPI仕様
```

## アーキテクチャ原則

### 1. 単一責任原則
- 各モジュールは1つの責務のみを持つ
- `auth.py`は認証のみ、`audio.py`は音声関連のみ

### 2. 依存関係逆転
- APIレイヤーはサービスレイヤーに依存
- サービスレイヤーはモデルレイヤーに依存
- データベース詳細はサービスレイヤーで隠蔽

### 3. 関心の分離
- **Models**: データ構造定義のみ
- **Services**: ビジネスロジック実装
- **API**: HTTPリクエスト/レスポンス処理のみ

### 4. テスタビリティ
- 各サービスは独立してテスト可能
- 依存注入でモック化容易

## 移行戦略

### Phase 1: 基盤構築
1. 新しいディレクトリ構造作成
2. 設定・データベース接続の分離
3. 共通モデル・ユーティリティの分離

### Phase 2: コア機能移行
1. 認証機能の移行
2. RSS管理機能の移行  
3. 記事取得機能の移行

### Phase 3: 高度機能移行
1. 音声生成機能の移行
2. AI・オートピック機能の移行
3. プレイリスト機能の移行

### Phase 4: 検証・最適化
1. 全機能の動作検証
2. パフォーマンス最適化
3. エラーハンドリング強化

## 期待される改善効果

### 1. 保守性向上
- バグ修正時に対象ファイルが明確
- 影響範囲の特定が容易

### 2. 開発効率向上
- 機能追加時のコード重複削減
- 複数開発者による並行開発が可能

### 3. テスト品質向上
- 機能別単体テストが可能
- CI/CDパイプラインの構築が容易

### 4. スケーラビリティ向上
- 機能別にスケールアウトが可能
- マイクロサービス化への移行準備

この設計により、現在の技術負債を根本から解決し、将来の機能拡張に対応できるクリーンなアーキテクチャを実現する。