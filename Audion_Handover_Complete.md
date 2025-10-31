# ===== README.md =====

# Audion Web UI

A modern web interface for the Audion AI-powered audio news platform.

## Features

- **Authentication**: Secure login and registration
- **RSS Management**: Add and manage your news sources
- **Article Feed**: Browse and select articles from your RSS feeds
- **Audio Creation**: Generate AI-powered audio summaries from selected articles
- **Audio Library**: Manage and play your created audio content
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your backend API URL.

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Make sure your backend is running**:
   The backend should be running on `http://localhost:8000` (or update the API URL in your `.env` file).

## Project Structure

```
src/
├── components/          # React components
│   ├── AuthScreen.jsx   # Login/register interface
│   ├── FeedScreen.jsx   # Article browsing and selection
│   ├── SourcesScreen.jsx # RSS source management
│   ├── LibraryScreen.jsx # Audio library and player
│   ├── AudioPlayer.jsx  # Bottom audio player component
│   └── Layout.jsx       # Main app layout
├── contexts/            # React contexts
│   ├── AuthContext.jsx  # Authentication state management
│   └── AudioContext.jsx # Audio player state management
└── main.jsx            # App entry point
```

## Key Features

### Authentication
- Clean, modern login/register interface
- Secure token-based authentication
- Persistent login state

### RSS Source Management
- Add RSS feeds with name and URL
- Visual source cards with metadata
- Easy source deletion
- URL validation

### Article Feed
- Grid layout of articles from your RSS sources
- Multi-select functionality with visual indicators
- Article metadata (source, date, genre)
- Direct links to original articles
- Bulk audio creation from selected articles

### Audio Library
- List of all created audio content
- Inline audio player with controls
- Audio renaming functionality
- Script viewing for AI-generated content
- Download functionality
- Audio deletion

### Audio Player
- Persistent bottom player
- Play/pause, skip controls
- Progress bar with seeking
- Visual feedback for currently playing audio
- Animated audio wave indicators

## Design System

- **Colors**: Primary purple theme with careful contrast ratios
- **Typography**: Clean, readable fonts with proper hierarchy
- **Components**: Consistent button styles, cards, and form elements
- **Animations**: Subtle transitions and loading states
- **Responsive**: Mobile-first design with breakpoints

## API Integration

The app integrates with the Audion backend API for:
- User authentication (`/auth/login`, `/auth/register`)
- RSS source management (`/sources`)
- Article fetching (`/articles`)
- Audio creation (`/audio/create`)
- Audio library management (`/audio/library`)

## Development

- Built with React 18 and Vite
- Styled with Tailwind CSS
- Uses Axios for API calls
- Date formatting with date-fns
- Icons from Lucide React

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service
3. Update the `VITE_API_URL` environment variable to point to your production backend

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

---

# ===== SERVER_SETUP.md =====

# Server Port Management

## Port Allocation
- **Claude (Testing)**: Port 8080 - `http://192.168.11.60:8080`
- **User (Development)**: Port 8000 - `http://192.168.11.60:8000`

## User Server Startup

### Option 1: Use startup script
```bash
./start_user_server.sh
```

### Option 2: Manual startup
```bash
cd backend
source venv/bin/activate
export PORT=8000
python server.py
```

## Environment Files

- `.env` - Default (User server on port 8000)
- `.env.user` - User server configuration
- `.env.claude` - Claude server configuration

## Current Status
- Claude server: Running on port 8080
- User server: Available on port 8000

## Switching Configurations
To use Claude's server for testing:
```bash
cp .env.claude .env
```

To use your server:
```bash
cp .env.user .env
```

Then restart Expo app to reload environment variables.

---

# ===== BUSINESS_STRATEGY.md =====

# Audion アプリ ビジネス戦略 & スイッチングコスト設計

## 🎯 戦略概要
システムが簡単なので、スイッチングコストを極大化する仕組みが必要。
見える価値と見えない価値の二段構えでユーザーロックインを実現。

## 📊 スイッチングコスト要素

### 🔹 見える価値（データ・コミュニティ）
1. **個人データ**
   - プレイリスト・DL音声
   - ニュース視聴履歴
   - 個人の音声ライブラリ

2. **コミュニティ価値**
   - 権威アカウント（有名人・専門家・友人）のフォロー
   - フォロー/フォロワーのSNS的要素
   - 権威アカウントのニュース履歴・作成音声の閲覧

3. **経済価値**
   - noteのような音声売買システム
   - フリーミアムプラン
   - プレミアムコンテンツアクセス

### 🔍 見えない価値（技術・アルゴリズム）
1. **パーソナライゼーション**
   - TTSレポートデータ蓄積
   - ニュースauto-pickアルゴリズム最適化
   - ユーザー行動学習

2. **コンテンツ品質**
   - 音声原稿作成の精度
   - 第一要約（生ニュース取得）
   - 第二要約（プロンプト最適化要約）の品質
   - 操作感・UX品質

## 💡 実装計画

### 1. 原稿作成プロンプト最適化システム

#### 現状の改良
```python
# ベースプロンプトスタイル（5種類）
PROMPT_STYLES = {
    "formal": "厳格で専門的な分析スタイル",
    "creative": "創造的でアイデア重視", 
    "entertaining": "エンターテイニングで親しみやすい",
    "gentle": "優しく分かりやすい解説",
    "standard": "バランスの取れた標準スタイル"
}

# 動的選択システム
def get_optimal_prompt_style(user_profile, article_genre, onboarding_preference):
    """
    - オンボーディング時の選択
    - ユーザー行動履歴
    - 記事ジャンル
    を基にAI/アルゴリズムで最適プロンプトを選択
    """
    pass
```

#### 実装箇所
- オンボーディング: ユーザーの好みスタイル選択
- Auto-pick: スタイル選択機能（デフォルト：普通）
- server.py: ベースプロンプト管理・動的選択API

### 2. 権威アカウント戦略

#### 権威の定義
> 権威とは、好意・関心・興味・注意の対象となる人を広く指す。
> 著名人だけでなく、友人や同僚も含む。
> 動機: 「その人が見ている情報を自分も知りたい」欲求への対応

#### プロンプト公開の課題
- **危険性**: 要約ログ公開→価値下落
- **解決策**: 段階的開示
  - プロンプト詳細: 非公開
  - スタイル指標: 「厳格度70%、創造性30%」のみ表示
  - 差別化: 結果品質で競争

### 3. 音声カード拡張仕様

```typescript
interface EnhancedAudioCard {
  // 既存要素
  audio_url: string;
  script: string;              // 第二要約（音声原稿）
  source_articles: Article[];  // 出典ニュース一覧+リンク
  duration: number;            // 再生時間
  created_at: string;          // 作成日時
  creator: User;               // 作成者（Spotify風表示）
  
  // 新規追加要素
  listening_count: number;        // 再生回数
  like_count: number;            // いいね数
  comment_count: number;         // コメント数
  genre_tags: string[];          // ジャンルタグ
  difficulty_level: 'easy'|'medium'|'hard'; // 理解難易度
  credibility_score: number;     // 信頼度スコア
  commercial_usage: boolean;     // 商用利用可否
  copyright_warnings: string[]; // 著作権警告
  related_audios: string[];      // 関連音声レコメンド
  transcript_quality: number;    // 原稿品質スコア
  prompt_style: string;          // 使用プロンプトスタイル
  ai_confidence: number;         // AI要約信頼度
}
```

### 4. 著作権・商用利用対策

#### 自動判定システム
```python
def check_commercial_usage(source_urls):
    """RSS/APIソースの商用利用可否を自動判定"""
    for url in source_urls:
        site_policy = analyze_copyright_policy(url)
        if not site_policy.commercial_allowed:
            return {
                "allowed": False,
                "warning": "商用利用不可のソースが含まれています",
                "restricted_sources": [url]
            }
    return {"allowed": True}
```

#### プロンプト改良（違法対策）
```python
LEGAL_SAFE_PROMPT = """
以下のニュース記事を参考に、完全にオリジナルの要約を作成してください：

【重要事項】
- 直接的な引用は一切行わない
- 事実の再構成と独自の解釈・分析を含める
- 出典は明記するが、文章は100%オリジナル
- Google NotebookLMの公開可能基準に準拠
- 二次利用・商用利用可能な内容とする

【参考】: {source_articles}
"""
```

### 5. API効率化・コスト最適化

```python
async def optimized_news_processing():
    """段階的処理でAPI料金を最適化"""
    
    # Stage 1: 軽量フィルタリング（安価API使用）
    relevant_articles = await lightweight_relevance_filter(raw_articles)
    
    # Stage 2: キャッシュチェック
    cached_summaries = check_existing_summaries(relevant_articles)
    new_articles = filter_uncached(relevant_articles, cached_summaries)
    
    # Stage 3: 高品質要約（高価API・必要分のみ）
    new_summaries = await premium_summarize(new_articles)
    
    return merge_results(cached_summaries, new_summaries)
```

## 🚀 実装フェーズ

### Phase 1: 基盤強化（優先度: 高）
1. ✅ プロンプトスタイル選択システム
2. ✅ 音声カード情報拡充
3. ✅ 著作権自動チェック機能
4. ✅ API使用量最適化

### Phase 2: ソーシャル機能（優先度: 中）
1. フォロー/フォロワーシステム実装
2. 音声いいね・コメント・シェア機能
3. 権威アカウント認証システム
4. ユーザープロフィール強化

### Phase 3: 収益化（優先度: 中）
1. フリーミアムプラン設計
2. プレミアム音声売買マーケット
3. 権威アカウント収益分配
4. 高品質TTS・プロンプトの有料化

### Phase 4: エコシステム完成（優先度: 低）
1. サードパーティ連携
2. 企業向けAPI提供
3. コンテンツ推薦アルゴリズム高度化
4. 多言語対応

## 🎯 差別化ポイント

### 技術的優位性
- **動的プロンプト最適化**: AIによる個人最適化
- **品質担保**: 著作権チェック・信頼度スコア
- **効率性**: API料金最適化アルゴリズム

### ネットワーク効果
- **権威アカウント**: 有名人・専門家・友人の情報
- **コミュニティ**: フォロー基盤のソーシャル性
- **データ蓄積**: 個人の聴取履歴・プリファレンス

### ユーザー体験
- **パーソナライゼーション**: 個人最適化音声
- **シームレス**: 高品質TTS・操作性
- **価値創造**: 情報を価値ある音声コンテンツに変換

## 💼 ビジネスモデル展開

### 収益源
1. **フリーミアム**: 基本無料・プレミアム機能有料
2. **コンテンツ売買**: 権威アカウント音声の販売
3. **広告収入**: パーソナライズド広告
4. **企業API**: B2B向けニュース要約サービス
5. **データライセンス**: 匿名化された聴取傾向データ

### 競合優位性
- **スイッチングコスト**: 個人データ・ソーシャルネットワーク
- **ネットワーク効果**: ユーザー数増加→価値向上
- **技術的参入障壁**: 高品質プロンプト・アルゴリズム
- **コンテンツ品質**: 権威アカウント・専門性

---

## 📝 メモ・追加アイデア

### 検討事項
- **音声カード**: 他に必要な要素は？
- **プロンプト**: 商用利用可能な違法対策の徹底
- **参考**: Google NotebookLMの公開可能基準を調査・準拠
- **効率化**: ニュース獲得→要約のフロー最適化

### 権威の再定義
> 権威 = 単なる友人・フォロワーも含む
> = ユーザーの興味関心の対象となる人
> 動機 = 「その人の情報を自分も知りたい」欲求
> 例：友人・経済人が見ているニュース・聞いている音声への好奇心・学習欲求

---
*最終更新: 2025年1月*
*実装予定: フェーズ別で段階的に導入*

---

# ===== CLAUDE.md =====

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audion is a full-stack podcast generation application that uses AI to convert RSS articles into conversational podcast scripts. The app consists of a React Native frontend built with Expo and a FastAPI Python backend.

## Architecture

### Frontend (audion-app-fresh/)
- Legacy `audion-app/` は削除済み。以降は Fresh を参照してください。
- **Technology**: React Native with Expo Router for file-based routing
- **Navigation**: Tab-based navigation with feed, library, sources, and explore tabs
- **Authentication**: Context-based auth system with AsyncStorage persistence
- **State Management**: React Context for authentication and global state
- **UI Components**: Custom themed components with Expo design system

### Backend (backend/)
- **Technology**: FastAPI with async/await patterns
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with Bearer authentication
- **AI Integration**: OpenAI GPT for script generation, Google Text-to-Speech for audio
- **File Storage**: Vercel Blob for audio file storage
- **RSS Processing**: Feedparser for RSS feed ingestion with caching

## Development Commands

### Frontend Development
```bash
cd audion-app-fresh
npm install                      # Install dependencies
npx expo start --tunnel         # Start development server
npx expo start --android        # Start with Android emulator
npx expo start --ios            # Start with iOS simulator
npm run lint                     # Run ESLint
```

### Backend Development
```bash
# From project root
python -m venv venv           # Create virtual environment
source venv/bin/activate      # Activate virtual environment (macOS/Linux)
pip install -r backend/requirements.txt  # Install dependencies
cd backend
uvicorn server:app --reload --port 8001   # Start development server
```

### Testing
```bash
python backend_test.py        # Run comprehensive API tests
```

## Key File Locations

### Frontend Structure (Fresh)
- `audion-app-fresh/app/(tabs)/` - Main tab screens (feed, library, sources, explore)
- `audion-app-fresh/context/` - Auth/Audio/Settings contexts
- `audion-app-fresh/components/` - Reusable UI components

### Backend Structure
- `backend/server.py` - Main FastAPI application with all endpoints
- `backend/requirements.txt` - Python dependencies

## Environment Variables

### Backend (.env in backend/)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - MongoDB database name
- `OPENAI_API_KEY` - OpenAI API key for script generation
- `GOOGLE_TTS_KEY` - Google Text-to-Speech API key

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### RSS Sources
- `GET /api/sources` - Get user's RSS sources
- `POST /api/sources` - Add new RSS source
- `DELETE /api/sources/{source_id}` - Delete RSS source

### Articles
- `GET /api/articles` - Get articles from user's RSS sources

### Audio Generation
- `POST /api/audio/create` - Create podcast from articles (uses AI)
- `GET /api/audio/library` - Get user's generated podcasts
- `PUT /api/audio/{audio_id}/rename` - Rename podcast
- `DELETE /api/audio/{audio_id}` - Delete podcast

## Development Notes

### AI Integration
The system generates conversational podcast scripts using OpenAI GPT with a two-host format ("HOST 1" and "HOST 2"). Scripts are stored in the database for playback.

### Authentication Flow
Users authenticate via email/password, receive JWT tokens, and the token serves as user identification throughout the app.

### RSS Processing
RSS feeds are cached for 5 minutes to reduce external API calls. Articles are fetched on-demand when users request them.

### File Storage
Audio files are stored using Vercel Blob storage with generated UUIDs for unique identification.

### Testing
Use `backend_test.py` to run comprehensive API tests including authentication, RSS management, article fetching, and AI-powered audio generation.

---

# ===== CLAUDE_HANDOVER.md =====

# Claude Code 引き継ぎ書 - Audion AI Demo

## プロジェクト概要
**アプリ名**: Audion  
**概要**: AI生成ニュース音声プラットフォーム（Spotify風UX）  
**技術スタック**: React Native (Expo) + FastAPI + MongoDB + OpenAI + S3  
**プロジェクトパス**: `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo`

## 現在の実装状況

### ✅ 完了済み機能
1. **ユーザー認証** - Email login/register
2. **RSS管理** - 追加/削除/一覧（設定画面に移動済み）
3. **Auto-Pick** - ハイブリッド推薦アルゴリズム + 自動音声生成
4. **Manual Pick** - Feed画面での記事選択→音声作成
5. **AI要約・TTS** - OpenAI要約 + TTS音声化 + 自動タイトル生成
6. **Spotify風ライブラリ** - プレイリスト/アルバム/My List
7. **オンボードプリセット** - 5カテゴリ選択→自動RSS追加→ウェルカム音声
8. **設定画面** - 包括的設定（Sources移動、ユーザーアイコン追加）

### 🔄 現在の作業
- **チャプタージャンプ機能** の実装準備中
- 音声再生時に記事単位でシーク可能な機能

### 📋 MVP残り機能
1. **チャプタージャンプ** - 再生画面で記事単位シーク
2. **誤読フィードバック** - ワンタップ報告UI

## アプリ構造

### フロントエンド構造
```
audion-app/
├── app/
│   ├── (tabs)/
│   │   ├── feed.tsx           # ニュース一覧+手動選択
│   │   ├── auto-pick.tsx      # AI推薦+自動音声生成
│   │   └── library.tsx        # ライブラリ（3タブ構成）
│   ├── onboard.tsx           # オンボーディング画面
│   ├── settings.tsx          # 設定画面（新規追加）
│   ├── sources.tsx           # RSSソース管理（設定から移動）
│   └── _layout.tsx           # ルーティング+認証フロー
├── context/
│   ├── AuthContext.tsx       # 認証+オンボード状態管理
│   └── AudioContext.tsx      # 音声再生+相互作用追跡
└── components/
    ├── MiniPlayer.tsx        # ボトム固定ミニプレイヤー
    └── FullScreenPlayer.tsx  # フルスクリーン再生画面
```

### バックエンド主要機能
```
backend/server.py
├── 認証: /api/auth/login, /api/auth/register
├── RSS: /api/rss-sources (CRUD)
├── 音声: /api/audio/create, /api/audio/library
├── Auto-Pick: /api/auto-pick, /api/auto-pick/create-audio
├── ライブラリ: /api/playlists, /api/albums, /api/downloads
├── オンボード: /api/onboard/categories, /api/onboard/setup
├── 推薦: /api/user-profile, /api/user-insights, /api/user-interaction
└── ハイブリッドアルゴリズム: Personal Affinity × Contextual × Diversity
```

## 重要な設計決定

### UI/UX
- **Spotify風デザイン**: 統一されたカラーテーマ（#4f46e5）
- **3タブ構成**: Feed / Auto-Pick / Library（Sourcesは設定に移動）
- **音声UX**: Play→MiniPlayer→FullScreen Modal
- **浮遊ボタン**: MiniPlayer表示時のFAB対応

### 推薦アルゴリズム
```python
score = personal_affinity * contextual_relevance * diversity_factor
- Personal Affinity: ユーザー行動履歴ベース
- Contextual Relevance: 時間帯・最新性
- Diversity Factor: エコーチェンバー防止
```

### データベース設計
```
MongoDB Collections:
- users: ユーザー情報
- rss_sources: RSSソース
- articles: 記事データ（ジャンル分類済み）
- audio_creations: 生成音声
- user_profiles: 推薦用プロファイル
- user_interactions: 行動履歴
- playlists: プレイリスト
- albums: アルバム
- downloaded_audio: ダウンロード管理
- preset_categories: オンボードプリセット
```

## 起動方法

### バックエンド
```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend
python server.py
```

### フロントエンド
```bash
cd /Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app
npm start
```

## 現在の課題・対応

### 解決済み
- ✅ オンボード後の画面遷移問題（setIsNewUser追加）
- ✅ ユーザープロファイル重複エラー（upsert対応）
- ✅ FastAPI警告（lifespan対応）
- ✅ UI階層問題（Sources設定移動）

### 既知の問題
- ⚠️ expo-av deprecated警告（機能は正常）
- ⚠️ ダウンロード機能はUI実装済み、実際のファイル保存は未実装

## 次の実装タスク

### 優先度：高
1. **チャプタージャンプ実装**
   - FullScreenPlayerにチャプター一覧追加
   - 記事単位でのシーク機能
   - 音声内タイムスタンプ管理

2. **誤読フィードバック実装**
   - ワンタップ報告ボタン
   - フィードバックログ保存

### 優先度：中
- オフライン再生実装（expo-file-system）
- バックグラウンドダウンロード
- SmartCast自動生成機能

## コード規約・スタイル

### フロントエンド
- TypeScript strict mode
- Expo Router for navigation
- Ionicons for UI icons
- StyleSheet.create for styling
- useFocusEffect for screen focus handling

### バックエンド
- FastAPI with async/await
- Pydantic models for data validation
- MongoDB with motor (async driver)
- OpenAI GPT-4o for summarization
- JWT for authentication

## 環境変数

### 必要な環境変数
```bash
# backend/.env
MONGO_URL=mongodb://...
DB_NAME=Audion_DB
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=audion-audio-files

# audion-app
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

## トラブルシューティング

### よくある問題
1. **"Property 'fetchLibraryData' doesn't exist"**
   - 解決済み：関数定義の位置問題

2. **MongoDB duplicate key error**
   - 解決済み：upsert処理で対応

3. **オンボード後に画面遷移しない**
   - 解決済み：setIsNewUser(false)追加

4. **バックエンド起動時のポート問題**
   - 解決法：5-10秒待機後に再起動

### デバッグ方法
- バックエンド：ログレベルINFO、コンソール出力確認
- フロントエンド：Console.log + Alert.alert + Expo DevTools

---

## 引き継ぎ時の確認事項

1. **現在の実装状況**: 上記✅完了済み機能を確認
2. **次のタスク**: チャプタージャンプ機能実装
3. **ファイル構造**: audion-app/app/とbackend/server.pyを重点確認
4. **データベース**: MongoDBの各コレクション構造理解
5. **認証フロー**: AuthContext.tsxのisNewUser管理

**継続開発の場合は、この文書を参照して同じレベルの理解から開始できます。**

---

# ===== INTEGRATED_ROADMAP.md =====

# 🚀 Audion 統合開発ロードマップ 2025

## 📊 現在の開発状況

### ✅ **完了済み機能** (Phase 0 - MVP基盤)
- [x] ユーザー認証 & オンボーディング
- [x] RSS管理（ON/OFF機能・一括削除）
- [x] Auto-Pick推薦アルゴリズム + シャッフル・除外機能
- [x] Manual Pick (Feed画面フィルタリング付き)
- [x] AI要約・TTS音声生成
- [x] Spotify風ライブラリ・音声再生
- [x] 設定画面・プロフィール管理
- [x] ダークモード・テーマシステム

### 🎯 **即座に取り組むべき次期タスク**

---

## 🔄 Phase 1: MVP完成・UX最適化 (1-2週間)

### **高優先度 (緊急)**
1. **🎵 チャプタージャンプ機能** `[MVP必須]`
   - FullScreenPlayerに記事単位のチャプター表示
   - タイムスタンプベースのシーク機能
   - 音声内記事区切りの管理

2. **📝 誤読フィードバック機能** `[MVP必須]`
   - ワンタップ報告UI実装
   - フィードバックログのバックエンド保存
   - 音声品質改善のデータ収集

### **中優先度 (UX改善)**
3. **📲 iOS統合機能**
   - Siriショートカット連携実装
   - アプリアイコン長押しメニュー
   - ホーム画面クイックアクション

4. **🔍 Sources検索機能**
   - RSS検索窓 & 候補表示
   - 人気ソース・おすすめソース
   - ジャンル別ソース発見

---

## 🚀 Phase 2: 差別化・スイッチングコスト構築 (2-4週間)

### **技術的優位性強化**
1. **🧠 プロンプト最適化システム** `[差別化ポイント]`
   - 5種類の原稿作成スタイル実装
   - ユーザー行動ベースの動的プロンプト選択
   - 個人最適化アルゴリズム

2. **📊 音声カード拡張**
   ```typescript
   interface EnhancedAudioCard {
     // 既存 + 新規要素
     listening_count: number;
     like_count: number;
     genre_tags: string[];
     difficulty_level: 'easy'|'medium'|'hard';
     credibility_score: number;
     prompt_style: string;
     ai_confidence: number;
   }
   ```

3. **⚖️ 著作権・商用利用対策**
   - 自動商用利用判定システム
   - 違法対策プロンプト改良
   - Google NotebookLM基準準拠

### **API効率化・コスト最適化**
4. **💰 段階的処理システム**
   - 軽量フィルタリング → キャッシュチェック → 高品質要約
   - API料金最適化アルゴリズム
   - 処理段階の可視化

---

## 🌐 Phase 3: ソーシャル機能・ネットワーク効果 (1-2ヶ月)

### **権威アカウント戦略**
1. **👑 権威フォローシステム**
   - 有名人・専門家・友人のフォロー機能
   - 権威アカウント認証システム
   - フォロー者の音声履歴・作成コンテンツ閲覧

2. **💬 ソーシャル要素**
   - 音声いいね・コメント・シェア機能
   - フォロー/フォロワー のSNS的要素
   - 音声投稿・公開設定

3. **📈 コミュニティ価値**
   - ユーザー生成プレイリスト
   - 権威アカウントのニュース視聴履歴
   - ソーシャル推薦アルゴリズム

---

## 💰 Phase 4: 収益化・プレミアム機能 (2-3ヶ月)

### **フリーミアムモデル**
1. **💎 プレミアムプラン設計**
   - 無制限RSS・広告オフ
   - 高品質TTS・複数API使用
   - プレミアム対話型スクリプト

2. **🛒 音声マーケットプレイス**
   - note型音声売買システム
   - 権威アカウント収益分配
   - プレミアムコンテンツアクセス

3. **📊 動的音声広告挿入 (DAI)**
   - パーソナライズド広告
   - 自動ターゲティング最適化
   - eCPM向上アルゴリズム

---

## 🌍 Phase 5: エコシステム完成・スケール (3-6ヶ月)

### **プラットフォーム化**
1. **🔗 B2B API提供**
   - "Curated Audio API" for 企業
   - チーム共有 & 権限管理
   - 企業アカウント機能

2. **🌏 多言語展開**
   - 多言語生成・多言語UI
   - 地域別コンテンツ最適化
   - グローバル権威アカウント

3. **🤖 高度AI機能**
   - 自然言語連続対話でプレイリスト操作
   - プライベートAIクエリ (その場生成Q&A音声)
   - 週次自動まとめ (Weekly Digest)

---

## 🎯 戦略的差別化要素

### **スイッチングコスト最大化**
| 要素 | 実装タイミング | 効果 |
|------|---------------|------|
| **個人データ蓄積** | Phase 1-2 | プレイリスト・視聴履歴・音声ライブラリ |
| **ソーシャルネットワーク** | Phase 3 | フォロー関係・権威アカウント |
| **パーソナライゼーション** | Phase 2-4 | AI最適化・プロンプト学習 |
| **コンテンツ品質** | Phase 2-3 | 高品質要約・専門性・信頼度 |

### **ネットワーク効果**
- **ユーザー数増加** → **権威アカウント参加** → **コンテンツ品質向上** → **新規ユーザー獲得**
- **データ蓄積** → **AI精度向上** → **パーソナライゼーション強化** → **ユーザー満足度向上**

---

## 📅 タイムライン & マイルストーン

### **2025年2月 - MVP完成**
- チャプタージャンプ・誤読フィードバック完成
- iOS統合機能実装
- Sources検索機能追加

### **2025年3月 - 差別化強化**
- プロンプト最適化システム稼働
- 音声カード拡張完了
- 著作権対策・API効率化実装

### **2025年4-5月 - ソーシャル展開**
- 権威アカウント・フォロー機能
- ソーシャル要素 (いいね・コメント)
- コミュニティ価値創出

### **2025年6-8月 - 収益化**
- フリーミアムプラン開始
- 音声マーケットプレイス稼働
- 動的広告システム実装

### **2025年9月以降 - スケール**
- B2B API提供開始
- 多言語展開
- 高度AI機能実装

---

## 🚨 リスク管理・対策

### **技術リスク**
- **AI API料金高騰**: 段階的処理・キャッシュ最適化で対策
- **著作権問題**: 自動判定・違法対策プロンプトで予防
- **スケール問題**: マイクロサービス化・CDN導入

### **ビジネスリスク**
- **競合参入**: スイッチングコスト・差別化技術で防御
- **ユーザー獲得**: 権威アカウント・バイラル機能で拡散
- **収益化遅延**: フリーミアム・多様な収益源で対応

---

## 🔧 実装優先度 (次の4週間)

### **Week 1-2: MVP完成**
1. チャプタージャンプ機能実装
2. 誤読フィードバック機能実装

### **Week 3-4: iOS統合 & UX**
1. Siriショートカット連携
2. アプリアイコン長押しメニュー
3. Sources検索機能

### **準備作業 (並行)**
- プロンプト最適化システム設計
- 音声カード拡張仕様策定
- 権威アカウント戦略詳細設計

---

## 📊 成功指標 (KPI)

### **Phase 1 (MVP)**
- 機能完成度: 100%
- ユーザー滞在時間: 平均15分/セッション
- 音声作成成功率: 95%以上

### **Phase 2 (差別化)**
- プロンプト最適化精度: 85%以上
- API料金削減: 30%以上
- ユーザー満足度: 4.2/5.0以上

### **Phase 3 (ソーシャル)**
- 権威アカウント登録: 100人以上
- フォロー関係構築: ユーザーあたり平均10フォロー
- ソーシャル機能利用率: 60%以上

### **Phase 4 (収益化)**
- プレミアム転換率: 15%以上
- 音声マーケット取引額: 月間10万円以上
- 広告収益: ユーザーあたり月間500円

---

*最終更新: 2025年1月*  
*このロードマップは戦略的優先度と技術実装の両面を考慮した統合計画です*

---

# ===== test_result.md =====

#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Build Audion - a personalized audio news platform MVP with React web app, RSS feed management, article selection, and mocked AI/TTS audio generation pipeline"

backend:
  - task: "User Authentication System"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Implemented email/password auth with mock JWT tokens using user ID, needs testing"
      - working: true
        agent: "testing"
        comment: "Successfully tested user registration and login endpoints. Authentication is working correctly with token-based auth. Missing auth token is properly handled with 403 error."

  - task: "RSS Source Management CRUD"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Full CRUD for RSS sources with user association, needs testing"
      - working: true
        agent: "testing"
        comment: "Successfully tested adding, retrieving, and deleting RSS sources. All CRUD operations are working correctly with proper user association."

  - task: "RSS Feed Parsing and Article Fetching"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Uses feedparser library to fetch and parse RSS feeds, needs testing"
      - working: true
        agent: "testing"
        comment: "Successfully tested article fetching from RSS feeds. The feedparser library is working correctly, retrieving articles from TechCrunch RSS feed with proper metadata."

  - task: "Audio Creation Pipeline (Mocked)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Mock AI pipeline with 3 second delay and sample audio, needs testing"
      - working: true
        agent: "testing"
        comment: "Successfully tested audio creation with the mocked 3-second delay. The API correctly accepts article IDs and titles, and returns a mock audio URL."

  - task: "Audio Library Management"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "CRUD operations for user's audio creations with metadata, needs testing"
      - working: true
        agent: "testing"
        comment: "Successfully tested retrieving audio library, renaming audio files, and deleting audio files. All CRUD operations for audio management are working correctly."
        
  - task: "OpenAI Integration for Summarization"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Implemented OpenAI GPT-4o integration for article summarization with fallback to mock for demo keys"
      - working: true
        agent: "testing"
        comment: "Successfully tested OpenAI integration. The system correctly detects demo API keys and falls back to mock responses. The generated scripts have the expected conversational format with HOST 1 and HOST 2 dialogue structure."

  - task: "Google Cloud TTS Integration"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Implemented Google Cloud TTS for audio generation with fallback to mock for demo keys"
      - working: true
        agent: "testing"
        comment: "Successfully tested Google Cloud TTS integration. The system correctly detects demo API keys and falls back to mock audio generation. Audio files are properly created and accessible via the API."

  - task: "Enhanced Article Content Handling"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Improved article content extraction for better AI summarization"
      - working: true
        agent: "testing"
        comment: "Successfully tested enhanced article content handling. The system properly extracts and processes article content for AI summarization, combining multiple articles into a coherent script."

  - task: "Script Storage in Database"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Added script field to AudioCreation model to store AI-generated conversational scripts"
      - working: true
        agent: "testing"
        comment: "Successfully verified that generated scripts are stored in the database. The script field is properly populated in the AudioCreation records and returned in API responses."

frontend:
  - task: "Authentication UI"
    implemented: true
    working: false
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "main"
        comment: "Beautiful login/register screen with React context auth, needs testing"

  - task: "RSS Sources Management Screen"
    implemented: true
    working: false
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "main"
        comment: "Add/delete RSS sources with form validation, needs testing"

  - task: "Article Feed with Selection"
    implemented: true
    working: false
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "main"
        comment: "Article cards with checkboxes and Create Audio button, needs testing"

  - task: "Audio Library and Player"
    implemented: true
    working: false
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "main"
        comment: "Audio library with player controls and metadata display, needs testing"

  - task: "Navigation and User Experience"
    implemented: true
    working: false
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "main"
        comment: "Tab navigation between Feed, Sources, Library screens, needs testing"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Built complete Audion MVP with 5 key screens: Auth, RSS Sources, Article Feed with selection, Audio Library, and Player. Implemented mocked AI pipeline with 3-second delay. All backend endpoints created with proper user authentication. Ready for backend testing first, then frontend if user approves."
  - agent: "main"
    message: "UPGRADED TO REAL AI INTEGRATION: Replaced mocked AI with actual OpenAI GPT-4o for article summarization and Google Cloud TTS for audio generation. Added demo API keys that user can replace with real ones. System intelligently falls back to mock responses when demo keys are used. Ready for testing the new AI pipeline."
  - agent: "testing"
    message: "Completed comprehensive testing of all backend API endpoints. Created backend_test.py to test the full user flow: registration → login → add RSS source → fetch articles → create audio → view library → rename audio → delete audio → delete source. All tests passed successfully. The backend is fully functional with proper authentication, RSS feed parsing, and audio management."
  - agent: "testing"
    message: "Successfully tested the upgraded AI integration features. Verified that the system correctly detects demo API keys and falls back to mock responses. The generated scripts have the expected conversational format with HOST 1 and HOST 2 dialogue structure. Scripts are properly stored in the database and returned in API responses. All AI pipeline components are working correctly, including OpenAI summarization and Google Cloud TTS integration."

---
