# 🎧 新・Audion アプリケーション要件定義書

## 📝 プロジェクト概要

### アプリケーション名
**Audion** - AI-Powered Audio News & Content Platform

### コンセプト
「忙しい現代人のための、インテリジェントな音声コンテンツ体験」
RSS記事やWebコンテンツを高品質な音声コンテンツに変換し、いつでもどこでも「聴く」ことで情報収集を可能にするプラットフォーム。

### 設計思想
1. **シンプルさ優先**: 複雑さを排除し、直感的な操作性を実現
2. **品質重視**: AI生成コンテンツの高品質化と安定性確保
3. **パフォーマンス**: 高速レスポンスと軽量設計
4. **スケーラビリティ**: 将来の機能拡張に対応できる柔軟な設計

---

## 🎯 ベータ版要件（Phase 1: MVP）

### 対象ユーザー
- 早期採用者、技術リテラシーのあるユーザー
- 音声コンテンツに関心のあるユーザー
- 新しいサービスを試すことに積極的なユーザー

### 成功指標
- **技術指標**: クラッシュ率 < 1%、起動時間 < 3秒、API応答 < 2秒
- **ユーザー指標**: 週次アクティブ > 100人、継続率 > 60%
- **コンテンツ指標**: 1日平均5記事以上の音声化、再生完了率 > 70%

### 機能要件

#### 1. ユーザー認証システム
**基本機能**:
- メール・パスワードによるユーザー登録
- ログイン・ログアウト機能
- パスワードリセット機能

**技術仕様**:
- JWT Token認証
- セッション永続化（30日間）
- セキュアなパスワードハッシュ化

**UI要件**:
- クリーンで分かりやすい認証画面
- エラーメッセージの適切な表示
- ローディング状態の明示

#### 2. オンボーディング
**基本機能**:
- 初回利用時の関心カテゴリ選択（3-5個）
- アプリの基本的な使い方ガイド
- プッシュ通知許可の取得

**カテゴリ選択肢**:
- Technology, Business, Politics, Sports, Health
- Entertainment, Science, Education, General

**UI要件**:
- 魅力的なカテゴリ選択インターフェース
- プログレスインジケーター
- スキップ可能な設計

#### 3. ホーム画面（記事一覧）
**基本機能**:
- おすすめ記事の表示（カテゴリベース）
- 記事の検索・フィルタリング機能
- 記事の詳細表示（モーダル）

**データ表示**:
- 記事タイトル、概要、ソース、公開日時
- 記事のカテゴリタグ
- 推定読み上げ時間

**UI要件**:
- カード型レイアウトでの記事表示
- プルリフレッシュによる記事更新
- 無限スクロール対応

#### 4. 音声生成・再生機能
**基本機能**:
- 記事の音声化（AI要約 + TTS）
- 音声の即座再生
- 基本的な再生コントロール（再生・停止・シーク）

**音声品質**:
- 自然な読み上げ音声（Google TTS）
- 会話形式の要約（HOST1 & HOST2形式）
- 複数言語対応（日本語・英語）

**UI要件**:
- ミニプレイヤー（画面下部固定）
- フルスクリーンプレイヤー
- 進行状況バーとタイムスタンプ

#### 5. 「後で聴く」プレイリスト
**基本機能**:
- 記事を「後で聴く」に追加
- 追加した記事の順次再生
- プレイリストからの削除

**UI要件**:
- シンプルなリスト表示
- ドラッグ&ドロップによる順序変更
- 一括削除機能

#### 6. 基本設定
**アカウント設定**:
- ユーザー情報の編集
- パスワード変更
- ログアウト機能

**音声設定**:
- 音声言語の選択（日本語・英語）
- 再生速度の設定（0.5x - 2.0x）
- 音質の選択（標準・高音質）

**UI要件**:
- 分かりやすい設定項目の分類
- 即座に反映される設定変更
- 設定のリセット機能

### 非機能要件

#### パフォーマンス
- アプリ起動時間: 3秒以内
- 記事一覧の読み込み: 2秒以内
- 音声生成時間: 30-60秒（記事長さによる）
- 音声再生の開始: 1秒以内

#### 可用性
- アプリクラッシュ率: 1%未満
- API正常応答率: 99%以上
- 音声生成成功率: 95%以上

#### セキュリティ
- HTTPS通信の強制
- JWT Tokenの適切な管理
- ユーザーデータの暗号化

#### ユーザビリティ
- 直感的な操作性
- 一貫したデザイン
- アクセシビリティ対応

---

## 🚀 ローンチ版要件（Phase 2: Full Release）

### 対象ユーザー拡大
- 一般消費者
- 非技術ユーザー
- 幅広い年齢層のユーザー

### 成功指標
- **ビジネス指標**: DAU > 10,000、月間収益 > ¥1M、App Store評価 > 4.5
- **成長指標**: 月次ユーザー成長率 > 20%、コンテンツ作成数成長 > 50%

### 追加機能要件

#### 1. RSS ソース管理
**基本機能**:
- カスタムRSSフィードの追加・編集・削除
- 人気RSSソースの推薦
- カテゴリ別RSSソースの管理

**高度機能**:
- RSSフィードの自動検出
- 更新頻度の設定
- 重複記事の自動除外

#### 2. 高度なプレイリスト機能
**基本機能**:
- 複数の名前付きプレイリスト作成
- プレイリスト間での記事移動
- プレイリストの共有機能

**スマート機能**:
- 「通勤用」「勉強用」等のテーマ別プレイリスト
- AI による自動プレイリスト生成
- スケジュール再生機能

#### 3. オフライン機能
**基本機能**:
- 音声コンテンツのダウンロード
- オフライン環境での再生
- ダウンロード済みコンテンツの管理

**管理機能**:
- ストレージ使用量の表示
- 自動削除の設定
- WiFi限定ダウンロード

#### 4. プッシュ通知・スケジュール機能
**通知機能**:
- 新着記事の通知
- おすすめコンテンツの通知
- 再生リマインダー

**スケジュール機能**:
- 定期的なコンテンツ配信
- 時間帯別の自動プレイリスト生成
- ユーザー習慣の学習

#### 5. Freemiumモデル
**無料ユーザー制限**:
- 月間音声生成: 20回まで
- プレイリスト数: 3個まで
- オフラインダウンロード: 5件まで

**有料ユーザー特典**:
- 無制限の音声生成
- 無制限のプレイリスト
- 無制限のオフラインダウンロード
- 高音質音声オプション
- 優先的な音声生成

#### 6. ソーシャル・コミュニティ機能
**基本機能**:
- プレイリストの公開・共有
- お気に入りユーザーのフォロー
- コンテンツへの「いいね」

**コミュニティ機能**:
- 人気コンテンツのトレンド表示
- ユーザーレビュー・コメント
- コンテンツの推薦システム

#### 7. 高度な検索・発見機能
**検索機能**:
- 全文検索エンジン
- カテゴリ別検索
- 日付範囲検索

**発見機能**:
- AIベースのレコメンデーション
- トレンド記事の表示
- 関連記事の自動提案

---

## 🏗️ 技術要件

### フロントエンド技術スタック

#### オプション1: React Native (Expo)
**採用理由**: 
- クロスプラットフォーム対応（iOS/Android/Web）
- 高速開発と豊富なライブラリ
- 既存プロジェクトとの知見共有

**主要技術**:
- React Native + Expo SDK 50+
- TypeScript（strict mode）
- Expo Router（file-based routing）
- React Query（データ管理）
- react-hook-form（フォーム管理）

#### オプション2: Flutter（提案）
**採用理由**:
- 高性能で美しいUI
- 単一コードベースでマルチプラットフォーム
- 豊富なアニメーション機能

**主要技術**:
- Flutter 3.19+
- Dart 3.3+
- Material Design 3
- Bloc Pattern（状態管理）
- Get_it（依存性注入）

### バックエンド技術スタック

#### 推奨構成: FastAPI + PostgreSQL
**API フレームワーク**:
- FastAPI 0.104+ （既存維持）
- Python 3.11+
- Pydantic 2.0（データ検証）
- asyncio（非同期処理）

**データベース**:
- PostgreSQL 15+（MongoDBから移行）
- SQLAlchemy 2.0（ORM）
- Alembic（マイグレーション）

**外部サービス連携**:
- OpenAI GPT-4 Turbo（要約生成）
- Google Cloud TTS（音声生成）
- AWS S3（ストレージ）
- Redis（キャッシュ）

### アーキテクチャ設計

#### バックエンドアーキテクチャ
```
backend/
├── app/
│   ├── api/v1/              # API エンドポイント
│   │   ├── auth.py          # 認証関連
│   │   ├── articles.py      # 記事管理
│   │   ├── audio.py         # 音声生成
│   │   └── playlists.py     # プレイリスト
│   ├── core/                # コア機能
│   │   ├── config.py        # 設定管理
│   │   ├── security.py      # セキュリティ
│   │   └── database.py      # DB接続
│   ├── services/            # ビジネスロジック
│   │   ├── article_service.py
│   │   ├── audio_service.py
│   │   └── ai_service.py
│   ├── models/              # データモデル
│   │   ├── user.py
│   │   ├── article.py
│   │   └── audio.py
│   └── main.py              # アプリケーション起点
```

#### フロントエンドアーキテクチャ
```
app/
├── screens/                 # 画面コンポーネント
│   ├── auth/                # 認証画面
│   ├── home/                # ホーム画面
│   ├── player/              # プレイヤー画面
│   └── settings/            # 設定画面
├── components/              # 共通コンポーネント
│   ├── ui/                  # UIコンポーネント
│   └── layout/              # レイアウト
├── services/                # API連携
│   ├── api.ts               # API クライアント
│   └── auth.ts              # 認証サービス
├── stores/                  # 状態管理
│   ├── auth.ts              # 認証状態
│   └── audio.ts             # 音声状態
└── utils/                   # ユーティリティ
```

---

## 🎨 UI/UX 設計指針

### デザインシステム
**視覚デザイン**:
- Material Design 3 準拠
- ダイナミックカラー対応
- ダークモード完全対応
- アクセシビリティ（WCAG 2.1 AA）準拠

**フォント**:
- システムフォント使用
- 読みやすさを重視した文字サイズ
- 多言語対応

### カラーパレット
**プライマリ色**:
- Primary: Deep Blue (#1565C0)
- Secondary: Teal (#00695C)
- Accent: Orange (#FF6F00)

**機能的色**:
- Success: Green (#2E7D32)
- Warning: Amber (#F57F17)
- Error: Red (#C62828)
- Info: Blue (#1976D2)

### コンポーネント設計原則
1. **一貫性**: 統一されたコンポーネント体系
2. **再利用性**: 汎用的なコンポーネント設計
3. **アクセシビリティ**: 障害者対応を標準装備
4. **レスポンシブ**: 様々な画面サイズへの対応

---

## 📊 データモデル設計

### User（ユーザー）
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // メールアドレス（ユニーク）
  password_hash: string;         // ハッシュ化パスワード
  display_name: string;          // 表示名
  avatar_url?: string;           // プロフィール画像URL
  created_at: string;            // 作成日時（ISO）
  updated_at: string;            // 更新日時（ISO）
  subscription_tier: 'free' | 'premium';  // サブスクリプション
  preferences: UserPreferences;  // ユーザー設定
}

interface UserPreferences {
  categories: string[];          // 興味カテゴリ
  audio_language: 'ja' | 'en';   // 音声言語
  playback_speed: number;        // 再生速度
  auto_download: boolean;        // 自動ダウンロード
  notification_enabled: boolean; // 通知許可
}
```

### Article（記事）
```typescript
interface Article {
  id: string;                    // UUID
  title: string;                 // 記事タイトル
  summary: string;               // 概要・抜粋
  content?: string;              // 全文（取得できた場合）
  url: string;                   // 元記事URL
  published_at: string;          // 公開日時（ISO）
  source_id: string;             // RSS源ID
  source_name: string;           // RSS源名
  category: string;              // AI分類されたカテゴリ
  thumbnail_url?: string;        // サムネイル画像URL
  reading_time: number;          // 推定読み時間（分）
  audio_available: boolean;      // 音声化済みフラグ
  created_at: string;            // DB登録日時
}
```

### AudioContent（音声コンテンツ）
```typescript
interface AudioContent {
  id: string;                    // UUID
  user_id: string;               // 作成ユーザーID
  article_id: string;            // 元記事ID
  title: string;                 // 音声タイトル
  script: string;                // AI生成台本
  audio_url: string;             // 音声ファイルURL
  duration: number;              // 再生時間（秒）
  language: 'ja' | 'en';         // 音声言語
  voice_type: string;            // 音声タイプ
  status: 'processing' | 'completed' | 'failed';  // 生成状況
  created_at: string;            // 生成日時
  play_count: number;            // 再生回数
}
```

### Playlist（プレイリスト）
```typescript
interface Playlist {
  id: string;                    // UUID
  user_id: string;               // 作成ユーザーID
  name: string;                  // プレイリスト名
  description?: string;          // 説明
  is_public: boolean;            // 公開設定
  audio_items: PlaylistItem[];   // 音声アイテム
  thumbnail_url?: string;        // サムネイル画像
  created_at: string;            // 作成日時
  updated_at: string;            // 更新日時
}

interface PlaylistItem {
  audio_id: string;              // 音声コンテンツID
  position: number;              // 順序
  added_at: string;              // 追加日時
}
```

---

## 🔗 API仕様設計

### 認証API
```
POST   /api/v1/auth/register     # ユーザー登録
POST   /api/v1/auth/login        # ログイン
POST   /api/v1/auth/logout       # ログアウト
POST   /api/v1/auth/refresh      # トークンリフレッシュ
POST   /api/v1/auth/reset-password  # パスワードリセット
```

### 記事API
```
GET    /api/v1/articles          # 記事一覧取得
GET    /api/v1/articles/{id}     # 記事詳細取得
GET    /api/v1/articles/search   # 記事検索
POST   /api/v1/articles/bookmark # ブックマーク追加
DELETE /api/v1/articles/bookmark/{id}  # ブックマーク削除
```

### 音声API
```
POST   /api/v1/audio/generate    # 音声生成依頼
GET    /api/v1/audio/{id}        # 音声情報取得
GET    /api/v1/audio/library     # 音声ライブラリ取得
DELETE /api/v1/audio/{id}        # 音声削除
POST   /api/v1/audio/{id}/download  # オフライン用ダウンロード
```

### プレイリストAPI
```
GET    /api/v1/playlists         # プレイリスト一覧
POST   /api/v1/playlists         # プレイリスト作成
PUT    /api/v1/playlists/{id}    # プレイリスト更新
DELETE /api/v1/playlists/{id}    # プレイリスト削除
POST   /api/v1/playlists/{id}/items  # アイテム追加
```

---

## 🚀 開発ロードマップ

### Phase 1: ベータ版（3ヶ月）
**Week 1-4: 基盤構築**
- プロジェクト初期化・環境構築
- 認証システム実装
- 基本UI フレームワーク構築

**Week 5-8: コア機能開発**
- 記事取得・表示機能
- 音声生成・再生機能
- 基本プレイリスト機能

**Week 9-12: 品質向上・ベータリリース**
- テスト・デバッグ
- パフォーマンス最適化
- ベータ版リリース・フィードバック収集

### Phase 2: ローンチ版（6ヶ月）
**Month 1-2: 高度機能**
- RSS管理機能
- 高度なプレイリスト機能
- オフライン機能

**Month 3-4: ビジネス機能**
- Freemiumモデル実装
- 決済システム統合
- 通知・スケジュール機能

**Month 5-6: 拡張機能・リリース**
- ソーシャル機能
- 検索・発見機能
- 正式版リリース

---

## 📏 成功評価指標

### ベータ版KPI
**技術指標**:
- アプリクラッシュ率 < 1%
- API応答時間 < 2秒
- 音声生成成功率 > 95%

**ユーザー指標**:
- 週次アクティブユーザー > 100人
- ユーザー継続率（7日） > 60%
- 音声再生完了率 > 70%

### ローンチ版KPI
**ビジネス指標**:
- 日次アクティブユーザー > 10,000人
- 月間経常収益 > ¥1,000,000
- App Store評価 > 4.5

**成長指標**:
- 月次ユーザー成長率 > 20%
- 有料プラン転換率 > 5%
- ユーザー継続率（30日） > 40%

---

この要件定義書に基づき、技術負債のない新しいAudionアプリケーションを段階的に構築していきます。各フェーズでの詳細な設計・実装計画について、ご確認・承認をいただければ実装を開始いたします。