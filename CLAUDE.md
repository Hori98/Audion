# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

推論やMCPとの対応、その他動作において、英語を用いても良いが、ユーザーへの最終的な返答には、必ず日本語を用いること。

## 【MUST GLOBAL】Gemini活用（プロジェクトのCLAUDE.mdより優先）

### 三位一体の開発原則
人間の**意思決定**、Claude Codeの**分析と実行**、Gemini MCPの**検証と助言**を組み合わせ、開発の質と速度を最大化する：
- **人間 (ユーザー)**：プロジェクトの目的・要件・最終ゴールを定義し、最終的な意思決定を行う**意思決定者**
  - 反面、具体的なコーディングや詳細な計画を立てる力、タスク管理能力ははありません。
- **Claude Code**：高度なタスク分解・高品質な実装・リファクタリング・ファイル操作・タスク管理を担う**実行者**
  - 指示に対して忠実に、順序立てて実行する能力はありますが、意志がなく、思い込みは勘違いも多く、思考力は少し劣ります。
- **Gemini MCP**：API・ライブラリ・エラー解析など**コードレベル**の技術調査・Web検索 (Google検索) による最新情報へのアクセスを行う**コード専門家**
  - ミクロな視点でのコード品質・実装方法・デバッグに優れますが、アーキテクチャ全体の設計判断は専門外です。

### 壁打ち先の自動判定ルール
- **ユーザーの要求を受けたら即座に壁打ち**を必ず実施
- 壁打ち結果は鵜呑みにしすぎず、1意見として判断
- 結果を元に聞き方を変えて多角的な意見を抽出するのも効果的

### 主要な活用場面
1. **実現不可能な依頼**: Claude Code では実現できない要求への対処 (例: `最新のニュース記事を取得して`)
2. **前提確認**: 要求の理解や実装方針の妥当性を確認 (例: `この実装方針で要件を満たせるか確認して`)
3. **技術調査**: 最新情報・エラー解決・ドキュメント検索 (例: `Rails 7.2の新機能を調べて`)
4. **設計立案**: 新機能の設計・アーキテクチャ構築 (例: `認証システムの設計案を作成して`)
5. **問題解決**: エラーや不具合の原因究明と対処 (例: `このTypeScriptエラーの解決方法を教えて`)
6. **コードレビュー**: 品質・保守性・パフォーマンスの評価 (例: `このコードの改善点は？`)
7. **計画立案**: タスク分解・実装方針の策定 (例: `ユーザー認証機能を実装するための計画を立てて`)
8. **技術選定**: ライブラリ・フレームワークの比較検討 (例: `状態管理にReduxとZustandどちらが適切か？`)
9. **リスク評価**: 実装前の潜在的問題の洗い出し (例: `この実装のセキュリティリスクは？`)
10. **設計検証**: 既存設計の妥当性確認・改善提案 (例: `現在のAPI設計の問題点と改善案は？`)

## 🎯 拡張性考慮型開発指針

### 【重要】UX検証フォーカス実装アプローチ

**実装哲学**: 将来的拡張性を十分考慮しつつ、現段階ではユーザー体験確認を主目的とした最適化実装を行う

**適用シナリオ**: 
- 機能の概念検証(PoC)段階において
- 技術的実現可能性の確認が必要な場合
- ユーザーインターフェースの体感確認を優先する場合

**実装原則**:
1. **アーキテクチャ将来性**: コンポーネント設計・データ構造は本格実装時の拡張を想定
2. **技術スタック最適化**: プロジェクトの既存技術基盤に最も適合する手法を選択
3. **UX優先主義**: 見た目・操作感の検証を最優先、詳細ロジックは段階的実装
4. **保守性担保**: 後の本格実装時にリファクタリング可能な構造を維持
5. **パフォーマンス考慮**: 体感速度に影響する部分は妥協しない

**実装決定プロセス**:
- ユーザー要求の本質的目的を理解
- 最小実装で最大体験価値を提供する方法を検討
- 技術的負債とのバランスを取りながら実装範囲を決定
- 将来の機能拡張時の影響範囲を事前に設計

### 【CRITICAL】ユーザー指示解釈の適切な分離

**重要原則**: ユーザーの指示は **UX上の課題提起・改善要求** であり、技術的実装詳細ではない

**指示解釈方法**:
- **表面レイヤー**: ユーザーが述べる具体的UI変更・機能追加要求  
- **核心レイヤー**: その背後にある真の課題・ユーザー体験の改善目標
- **実装レイヤー**: プロジェクト構造に最適化された技術的解決方法

**Claude Code の判断領域**:
1. **アーキテクチャ決定**: バックエンド接続・API設計・データフロー設計
2. **既存機能との統合**: 競合回避・連携最適化・依存関係管理  
3. **技術スタック活用**: React Native/FastAPI/MongoDBの特性を活かした実装
4. **実装タイミング**: 段階的実装・リファクタリング・テスト戦略
5. **パフォーマンス最適化**: メモリ・レンダリング・ネットワーク効率化

**危険回避戦略**:
- ユーザーの局所的指示に盲従せず、**指示の核心のみを確認**
- 表面的要求を満たしつつ、**内部的には技術的最適解を採用**
- 複雑なシステム実装では、**Claude Codeが主導的に設計判断**を行う
- 問題複雑化・修正不可能化を防ぐため、**全体最適化を優先**

**実装アプローチ**:
```
ユーザー: "この機能を追加して" (表面的指示)
↓
Claude Code: 核心理解 + コードベース分析 + 最適解検討
↓  
実装: ユーザー要求を満たす + プロジェクト最適化 + 拡張性確保
```

## 🎯 開発方針：共通化ファースト・保守性重視

**重要**: 新機能実装・コード修正時は必ず以下を確認してください：

### 必須確認事項
1. **既存類似機能の検索**: `grep -r "関連キーワード" . --include="*.tsx" --include="*.py"`
2. **共通化可能性の判定**: 同じ入力/出力/ロジックの機能が存在するか
3. **実装方針決定**: 共通化 > 部分共通化 > 新規実装の優先順位

### 自動適用ルール
- 同じ動作が確認できる場合は**共通化を最優先**
- 重複実装は技術負債として即座に対処
- 保守性 > パフォーマンス（明確な必要性がない限り）

## 🚨 【CRITICAL】修正時の影響範囲確認プロトコル

**NEVER修正したらその箇所だけで完了と判断するな。以下を必ず実行せよ：**

### ✅ 必須チェックリスト（修正時100%実行）
1. **📊 データフロー追跡**: 修正した変数・関数が他のどこで使用されているか全検索
   ```bash
   grep -r "修正した変数名/関数名" . --include="*.tsx" --include="*.ts" --include="*.py"
   ```

2. **🔗 API連携確認**: フロントエンド修正時はバックエンドとの整合性、バックエンド修正時はフロントエンドへの影響
   - リクエスト/レスポンスの型定義一致
   - エラーハンドリングの一貫性
   - 認証・認可ロジックの整合性

3. **🎯 呼び出し元特定**: 修正した関数・メソッドを使用している全ての場所を洗い出し
   - 同一ファイル内の他の関数
   - 他ファイルからのimport/呼び出し
   - 設定ファイル・環境変数での参照

4. **🔄 共通機能の統合**: 類似ロジックが他に存在しないかチェック
   - 同じ計算・バリデーション・変換処理
   - 重複したAPI呼び出しパターン
   - 似た条件分岐・フィルタリング

5. **⚡ サイドエフェクト検証**: 修正による副作用を全て洗い出し
   - キャッシュ・状態管理への影響
   - 他機能のパフォーマンスへの影響
   - ユーザー体験の変化

6. **🧪 テストケース更新**: 修正に関連するテスト全ての確認・更新
   - ユニットテスト
   - 結合テスト
   - E2Eテスト

### 🎯 実装パターン別チェックポイント
- **設定系修正**: 設定読み込み・保存・デフォルト値の全箇所
- **API修正**: 対応するフロントエンド・バックエンド両方
- **ビジネスロジック修正**: 同じロジックの重複実装チェック
- **UI修正**: 関連コンポーネント・スタイル・レスポンシブ対応

**このチェックリストを怠った修正は不完全として扱い、必ず再検証すること**

## 🛡️ AI開発品質ガードレール（vibe coding事故防止）

### 📋 必須作業フロー：Plan → Apply → Test → Summary

**すべてのタスク開始時**に以下を出力してから作業開始：
```
PLAN:
- 目的: [1行で明確に]
- 影響範囲: [修正するファイル/関数を列挙]
- 契約変更: [API/型/DBスキーマの変更有無]
- テスト方針: [何をどうテストするか]
- 非ゴール: [今回やらないこと]
```

**すべてのタスク完了時**に以下を出力：
```
SUMMARY:
- 実施内容: [実際に変更した内容]
- 影響確認: [他への波及確認結果]
- テスト結果: [実行したテスト結果]
- 未解決事項: [残っている課題・次回対応要]
```

### 🚫 Audionプロジェクト境界設定

#### ✅ 変更可能範囲
- `audion-app/app/**/*` - React Native画面・コンポーネント
- `audion-app/components/**/*` - 共通UIコンポーネント  
- `audion-app/services/**/*` - フロントエンドサービス層
- `backend/routers/**/*` - API エンドポイント（新規のみ）
- `backend/services/**/*` - バックエンドサービス層
- `backend/models/**/*` - データモデル（追加のみ）

#### ❌ 修正禁止範囲
- **既存APIの破壊的変更**（エンドポイントURL、レスポンス構造の変更）
- **既存データベースの列削除**（マイグレーション未経由）
- **認証・セキュリティ関連**の変更（明示的許可なし）
- **環境設定・デプロイ関連**（docker, package.json依存関係等）
- **テスト削除**（リファクタリング時も既存テスト保持）

### 🔄 契約ファースト開発（API分離事故防止）

1. **API変更時の必須順序**：
   ```
   1. backend/models/*.py でデータ型定義
   2. backend/routers/*.py でAPI仕様確定  
   3. Postman/curl でAPI動作確認
   4. audion-app/services/*.ts でAPI呼び出し実装
   5. audion-app/components/*.tsx でUI実装
   ```

2. **型安全の強制**：
   - バックエンド：Pydantic models必須
   - フロントエンド：TypeScript strict mode、型定義ファイル更新
   - API境界：リクエスト/レスポンスの型チェック

3. **モックファースト**：
   - UIは最初にモックデータで完成させる
   - 実API接続は最後のステップ
   - エラーハンドリング・ローディング状態も先に実装

### ⚡ 自動品質チェック（必須実行）

**変更保存時に必ず実行**：
```bash
# フロントエンド
cd audion-app
npm run lint          # ESLint実行
npx tsc --noEmit      # TypeScript型チェック

# バックエンド  
cd backend
python -m pytest tests/  # 単体テスト実行
python -m mypy .          # 型チェック実行
```

**いずれか失敗時は変更を破棄・修正してから再実行**

### 🏗️ 段階的機能開発（フィーチャーフラグ）

1. **新機能は必ずフラグ裏に実装**：
   ```typescript
   // フロントエンド例
   const FEATURE_NEW_PLAYLIST = __DEV__ ? true : false;
   
   if (FEATURE_NEW_PLAYLIST) {
     // 新機能UI
   } else {
     // 既存UI保持
   }
   ```

2. **段階的リリース**：
   ```
   Step 1: モック・UIのみ（フラグOFF）
   Step 2: API統合・内部テスト（フラグON、開発環境のみ）
   Step 3: ステージング検証（フラグON、一部ユーザー）
   Step 4: 本番リリース（フラグON、全ユーザー）
   ```

### 🔧 Audion特有のベストプラクティス

1. **音声生成API**：
   - 必ず `backend/routers/audio_unified.py` の統合エンドポイント使用
   - 旧エンドポイント（`/api/audio/create`）は使用禁止

2. **設定システム**：
   - 新規設定は `audion-app/services/SettingsService.ts` に集約
   - AsyncStorage直接操作禁止

3. **認証・サブスクリプション**：
   - 必ず `audion-app/context/AuthContext.tsx` 経由
   - JWT Token直接操作禁止

4. **エラーハンドリング**：
   - ユーザー向けエラーは `audion-app/i18n/` の翻訳使用
   - 開発者向けログは `console.error()` で統一

### 🚨 緊急事故対応

**変更により既存機能が動かなくなった場合**：
1. 即座に変更を `git revert` で取り消し
2. 原因調査前に**まず復旧優先**
3. 影響範囲の再調査・テスト追加後に再実装

**この運用により、AI開発でも品質・安定性を保持しつつ開発速度を向上**

詳細は `DEVELOPMENT_BEST_PRACTICES.md` を参照してください。

## Project Overview

Audion is a full-stack podcast generation application that uses AI to convert RSS articles into conversational podcast scripts. The app consists of a React Native frontend built with Expo and a FastAPI Python backend.

## Architecture

### Frontend (audion-app/)
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
- **File Storage**: AWS S3 for audio file storage
- **RSS Processing**: Feedparser for RSS feed ingestion with caching

## Development Commands

### Frontend Development
```bash
cd audion-app
npm install                    # Install dependencies
npx expo start                # Start development server
npx expo start --android     # Start with Android emulator
npx expo start --ios         # Start with iOS simulator
npx expo start --web         # Start web version
npm run lint                  # Run ESLint
npm run reset-project        # Reset to blank project
```

### Backend Development

**🚨 IMPORTANT: Backend must run on all interfaces (0.0.0.0) for mobile app connectivity!**

#### Quick Start (Recommended)
```bash
# Use the unified startup script (automatically detects network IP)
./start-dev-fixed.sh
```

#### Manual Start
```bash
# From project root
python -m venv venv           # Create virtual environment (first time only)
source venv/bin/activate      # Activate virtual environment (macOS/Linux)
pip install -r backend/requirements.txt  # Install dependencies (first time only)
cd backend
uvicorn server:app --reload --port 8003 --host 0.0.0.0   # Start development server (accessible from network)
```

**Important**: The `--host 0.0.0.0` flag is essential for mobile app connectivity. Without it, Expo apps cannot connect to the backend server.

### Testing
```bash
python backend_test.py        # Run comprehensive API tests
```

## Key File Locations

### Frontend Structure
- `audion-app/app/(tabs)/` - Main tab screens (feed, library, sources, explore)
- `audion-app/context/AuthContext.tsx` - Authentication state management
- `audion-app/components/` - Reusable UI components
- `audion-app/constants/Colors.ts` - Theme colors

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
Audio files are stored using AWS S3 storage with generated UUIDs for unique identification.

### Testing
Use `backend_test.py` to run comprehensive API tests including authentication, RSS management, article fetching, and AI-powered audio generation.

## Current Development Status & Roadmap

### ✅ Phase 1: MVP Core Features (COMPLETED)
- **Authentication System**: Complete user registration/login with JWT tokens
- **RSS Management**: Full CRUD operations for RSS sources with auto-sync
- **AI Content Generation**: OpenAI integration for script generation with multiple prompt styles
- **Audio Pipeline**: Google TTS integration with AWS S3 storage
- **Basic UI**: Spotify-inspired interface with tab navigation

### ✅ Phase 2: Advanced Settings & UX (COMPLETED)
- **Comprehensive Settings System**: 50+ organized settings across 7 categories
- **Freemium Plan System**: Three-tier subscription model (Free/Basic/Premium)
- **Debug System**: Developer-grade debug menu with subscription tier testing
- **Advanced Content Management**:
  - Feed & Auto-Pick Settings with genre preferences
  - Schedule Content Settings with automated generation
  - Custom prompt system with user-created prompts
  - Smart content filtering and article count controls
- **UI/UX Improvements**:
  - Theme system (Light/Dark/System)
  - Scroll position preservation across all screens
  - Profile image management with upload/camera capture
  - Storage management with deleted items recovery

### ✅ Phase 3: Production Optimization & Bug Fixes (COMPLETED)
#### 3.1 Performance & Stability Optimization
- **✅ Cache Strategy Optimization**: Client-side genre filtering for instant response
- **✅ Genre Classification Enhancement**: Improved accuracy with conflict resolution
- **✅ Audio Playback Improvements**: PanResponder drag controls for seek bar
- **✅ Cross-Platform Compatibility**: Web & native environment support
- **✅ Error Handling**: Background audio service notifications and Web API compatibility

#### 3.2 Article Reader System Overhaul
- **✅ Complete Article Display Rewrite**: New modal-based article reader system
- **✅ Navigation Stability**: Eliminated router-based navigation issues
- **✅ Multi-View Support**: Summary, full-text, and web view modes
- **✅ Enhanced User Experience**: Smooth transitions and fallback mechanisms
- **✅ Cross-Platform Reader**: Works seamlessly on web and native environments

#### 3.3 Developer Experience & Debugging
- **✅ Log Optimization**: Removed excessive debug output for cleaner development
- **✅ Error Boundaries**: Comprehensive error handling and user feedback
- **✅ Testing Infrastructure**: Simulator and browser testing compatibility
- **✅ Code Quality**: Modernized component architecture and TypeScript consistency

### 🚀 Phase 4: Enhanced Content & User Experience
#### 4.1 Content Discovery & Personalization
- [ ] **Smart Article Recommendations**
  - Machine learning-based content suggestions
  - User behavior analysis and preference learning
  - Trending topics integration with real-time updates
- [ ] **Advanced Search & Filtering**
  - Full-text article search capabilities
  - Advanced filter combinations (source + genre + date)
  - Search history and saved searches
- [ ] **Content Quality Enhancement**
  - Article duplicate detection and merging
  - Source reliability scoring system
  - Content freshness indicators

#### 4.2 Audio Experience Enhancement
- [ ] **Advanced Playback Features**
  - Variable playback speed with pitch preservation
  - Audio quality selection (bandwidth optimization)
  - Offline download capabilities with storage management
- [ ] **Voice & Audio Customization**
  - Multiple AI voice options (male/female, accents)
  - Voice speed and tone customization
  - Background music and sound effects options
- [ ] **Smart Audio Features**
  - Auto-resume from last position across devices
  - Chapter markers for long-form content
  - Sleep timer and auto-pause functionality
- [ ] **Playlist Content Evolution**
  - UGC (User Generated Content) integration
  - Scheduled content delivery system
  - Weekly audio summaries and compilation features
  - Advanced script and source management for content creation
  - Content remix and reuse functionality for personalized experiences
- [ ] **Community Audio & Shared Content System** ⭐ **必須機能**
  - Other users' audio discovery and playback functionality
  - Community-created content sharing platform
  - Official/Operator-generated daily news summaries
  - Breaking news instant audio delivery system
  - Download filtering (offline-first experience)
  - Content creator attribution and following system
  - Playlist categorization (Self-created vs. Community vs. Official)
- [ ] **SNS & Social Features** ⭐ **必須機能**
  - User profile system with avatar, bio, and social stats
  - Follow/Following functionality for content creators
  - Like, comment, and share interactions on audio content
  - User-generated content feeds and discovery algorithms
  - Social proof indicators (trending creators, popular content)
  - Community moderation and content reporting systems
- [ ] **News Content Rights & Secondary Use Strategy** ⭐ **必須機能**
  - Comprehensive licensing framework for RSS source content
  - Fair use compliance for AI-generated audio summaries
  - Attribution system for original news sources
  - Content transformation logging for legal compliance
  - Partnership agreements with news publishers
  - Revenue sharing models for content creators and publishers

### 🔮 Phase 4: Advanced Features (Future)

#### 4.1 UGC共有システム・コミュニティ機能 ⭐ **戦略的最重要機能**

**コンセプト**: "作成したコンテンツがコミュニティの共有資産となり、優秀な作品は自動的に収益化される循環型エコシステム"

##### Phase 4.1A: 基盤構築（データベース・API設計）
- [ ] **MongoDB拡張データベース設計**
  - `users`コレクション拡張（プロフィール・統計・クリエイターランク）
  - `audios`コレクション（UGC音声メタデータ・品質スコア・公開設定）
  - `likes`, `comments`, `follows`コレクション（SNS機能基盤）
- [ ] **FastAPI統合設計**
  - UGC共有API（`POST /audios`, `PUT /audios/{id}`）
  - コミュニティ発見API（`GET /discover/feed`）
  - SNS機能API（`/like`, `/follow`, `/comments`）

##### Phase 4.1B: UGC共有システム実装
- [ ] **デフォルト共有設定**
  - 音声作成時に「コミュニティ共有」がデフォルトON
  - 共有ON時の自動discoverタブ配信システム
  - 共有設定変更時の即座反映（配信開始・停止）
- [ ] **音声品質評価システム**
  - 再生回数・いいね数・コメント数による品質スコア算出
  - バッチ処理による定期的スコア更新
  - 優秀音声の自動ランキング・プロモーション

##### Phase 4.1C: SNS・コミュニティ機能
- [ ] **ユーザープロフィール・フォロー機能**
  - クリエータープロフィール画面（bio、実績、フォロワー数）
  - フォロー・フォロワー管理
  - フォロー中クリエイターの新着通知
- [ ] **インタラクション機能**
  - いいねボタン（ハート/星アニメーション）
  - コメントシステム（返信・スレッド機能）
  - シェア機能（SNS連携・アプリ内共有）

##### Phase 4.1D: 収益化・インセンティブシステム
- [ ] **クリエイター収益化**
  - 再生回数・いいね数に基づく収益分配システム
  - Stripe Connect統合による自動支払い
  - クリエイターダッシュボード（収益・統計表示）
- [ ] **クリエイターランク制度**
  - Bronze/Silver/Gold/Platinum ティア制
  - ランクアップ条件（フォロワー数・品質スコア・総再生数）
  - ランク別特典（収益率・プロモーション優遇・バッジ表示）

##### Phase 4.1E: スイッチングコスト創出機能
- [ ] **蓄積型価値システム**
  - 投稿音声数・獲得いいね数・フォロワー数の可視化
  - 「実績バッジ」システム（初投稿・100いいね達成・人気クリエイターなど）
  - 過去投稿の再生統計・収益履歴の永続保存
- [ ] **コミュニティ依存性強化**
  - 他ユーザーからのフォロー・コメントによる「承認欲求」充足
  - 定期的な「人気音声ランキング」「新人クリエイター特集」
  - コミュニティイベント・コンテスト機能

**期待される効果**:
- ユーザーの能動的コンテンツ作成によるアプリ定着率向上
- 優秀コンテンツの循環によるアプリ体験品質向上  
- 収益化モデルによるビジネス持続性確保
- SNS要素によるユーザー間エンゲージメント最大化

#### 4.2 AI & Personalization
- [ ] **Advanced AI Features**
  - Voice cloning for personalized hosts
  - Dynamic content adaptation based on user behavior
  - Real-time news integration with breaking news alerts
- [ ] **Smart Automation**
  - Intelligent scheduling based on user habits
  - Auto-categorization of content
  - Predictive content generation

#### 4.3 Platform Expansion
- [ ] **Multi-Platform Support**
  - Web application deployment
  - Desktop applications (Electron)
  - Smart speaker integration (Alexa/Google Home)
- [ ] **Enterprise Features**
  - Team collaboration tools
  - Corporate content management
  - Advanced analytics dashboard

### 🛠️ Technical Debt & Infrastructure
- [ ] **Backend Scalability**
  - Database optimization and indexing
  - API rate limiting and caching
  - Microservices architecture migration
- [ ] **Security Enhancements**
  - OAuth2 integration
  - End-to-end encryption for user data
  - Advanced authentication methods (2FA, biometric)

### 📊 Current Architecture Status (Updated December 2024)
- **Frontend**: Expo React Native - ✅ Production ready with cross-platform article reader
- **Backend**: FastAPI Python - ✅ MVP complete and stable, ready for scaling  
- **Database**: MongoDB - ✅ Optimized with improved genre classification
- **AI Integration**: OpenAI GPT + Google TTS - ✅ Stable with enhanced error handling
- **Storage**: AWS S3 - ✅ Suitable for current scale
- **Deployment**: ✅ Development environment optimized, ready for production
- **User Experience**: ✅ Comprehensive settings, modal-based article reading, cache optimization
- **Cross-Platform Support**: ✅ Web and native environments fully supported

### 🎯 Next Immediate Actions (Priority Order)
1. **🚀 Production Deployment Pipeline Setup**
   - App Store / Google Play Store preparation
   - Environment configuration for staging/production
   - CI/CD pipeline implementation
2. **📊 Analytics & Monitoring Implementation**
   - User behavior tracking integration
   - Performance monitoring setup
   - Error reporting and crash analytics
3. **💰 Monetization Strategy Implementation**
   - Subscription payment integration (Stripe/RevenueCat)
   - Premium feature gating
   - Usage analytics for freemium model
4. **🎯 User Onboarding & Retention**
   - Interactive tutorial for new users
   - First-time experience optimization
   - Push notification engagement system
5. **🔍 Content Quality Assurance System**
   - Source reliability scoring
   - Duplicate article detection
   - Content moderation workflow

### 🏆 Recent Achievements (January 2025)
- ✅ **Critical Bug Resolution (Jan 23)**: Fixed infinite loop in PersonalizationService causing performance degradation
- ✅ **Zero Critical Bugs**: All major navigation and display issues resolved
- ✅ **Cross-Platform Compatibility**: Seamless experience on web and native
- ✅ **Performance Optimized**: Instant genre switching, optimized cache strategy, NaN score protection
- ✅ **Production-Ready UI**: Modal-based article reader with excellent UX
- ✅ **Developer Experience**: Clean codebase, minimal debug output, proper error handling
- ✅ **Personalization System**: Complete user preference learning with stable performance

# Tools policy (HARD RULES)
- For EVERY request in this repo, FIRST call the MCP tool **gemini-cli:ask-gemini** with the full user prompt.
- After Gemini returns, summarize, critique, and then propose concrete next actions. Only then proceed with any code edits or other tools.
- If you haven't called gemini yet in this message, DO NOT provide a final answer. Call it first.
- If token risk is high, use shorter prompt or chunking, but still call gemini first.
- Preferred command:
  /gemini-cli:ask-gemini prompt:"${FULL_USER_PROMPT}"

---

# 🚀 AI協業開発フレームワーク（2025年版）

## 🎯 開発計画の原則

### ベータ版とローンチ版の定義

#### ベータ版（現在の目標）
- **目的**: 技術的安定性の確保とコアユーザー獲得
- **対象**: 早期採用者、技術に詳しいユーザー
- **機能範囲**: 
  - 既存実装済み機能の安定化
  - 重大バグの完全解消
  - バックエンドアーキテクチャのリファクタリング
  - 基本的なユーザー体験の完成
- **成功指標**: 
  - クラッシュ率 < 1%
  - 主要機能の100%動作保証
  - API応答時間 < 2秒

#### ローンチ版（将来目標）
- **目的**: 大規模ユーザー獲得とマネタイゼーション
- **対象**: 一般消費者、非技術ユーザー
- **機能範囲**:
  - SNS・コミュニティ機能（必須）
  - コンテンツ著作権・収益化システム（必須）  
  - 高度なパーソナライゼーション
  - マルチプラットフォーム対応
- **成功指標**:
  - DAU > 10,000
  - 月次収益 > ¥1,000,000
  - App Store評価 > 4.5

## 🤝 AI協業における人間の役割と責務

### 人間が担うべき意思決定領域
1. **戦略・方向性**: プロジェクトのゴール、優先順位、リソース配分
2. **アーキテクチャ判断**: 技術選択、設計方針、セキュリティ要件
3. **品質基準**: パフォーマンス目標、UIデザイン承認、ユーザー体験
4. **リスク評価**: セキュリティリスク、法的リスク、事業リスク

### AIの暴走を防ぐ指示方法

#### ✅ 良い指示の例
```
「UserAuthServiceのパスワード変更機能で、以下の要件を満たすメソッドを実装してください：
1. 現在のパスワード検証
2. 新パスワードの強度チェック  
3. ハッシュ化して保存
4. セッション無効化
実装前に設計案を提示し、承認を得てから着手してください。」
```

#### ❌ 危険な指示の例
```
「認証周りのバグを全部直して」
「パフォーマンスを改善して」
「UIを綺麗にして」
```

#### 指示作成の原則
- **スコープ明確化**: 対象範囲を具体的に限定
- **成果物定義**: 何を作るかを明確に指定
- **承認プロセス**: 実装前の設計確認を必須化
- **影響範囲制限**: 変更による副作用を事前に制約

### バージョン管理の徹底ルール
1. **AI変更の事前承認**: すべてのコード変更を人間が事前レビュー
2. **意味のあるコミット**: 1つの機能・修正につき1コミット
3. **ブランチ戦略**: feature/fix/refactor ブランチでの開発
4. **バックアップ前提**: 重要な変更前は必ずバックアップ作成

## 📋 定期的レビューのためのMECEチェックリスト

### 毎週実施する健全性チェック

#### 1. 機能性（Functionality）
- [ ] 全主要機能が正常動作するか
- [ ] 新たなバグ・エラーが発生していないか
- [ ] API応答時間が基準内か（< 2秒）
- [ ] データ整合性に問題がないか

#### 2. コード品質（Code Quality）  
- [ ] 重複コードが増加していないか
- [ ] 新規追加コードがコーディング規約に準拠しているか
- [ ] 技術的負債が蓄積していないか
- [ ] ドキュメントが最新状態を反映しているか

#### 3. パフォーマンス（Performance）
- [ ] メモリリークが発生していないか
- [ ] データベースクエリが最適化されているか
- [ ] ファイルサイズ・バンドルサイズが適切か
- [ ] キャッシュ戦略が効果的に機能しているか

#### 4. セキュリティ（Security）
- [ ] 認証・認可ロジックに脆弱性がないか
- [ ] 機密情報が適切に保護されているか
- [ ] 外部API連携にセキュリティリスクがないか
- [ ] ユーザーデータの取り扱いが適切か

#### 5. テスト（Testing）
- [ ] 単体テストカバレッジが基準を満たしているか（> 80%）
- [ ] 結合テストが主要フローをカバーしているか
- [ ] 手動テストでエッジケースを確認できているか
- [ ] テストデータが本番環境を適切にシミュレートしているか

#### 6. 依存関係（Dependencies）
- [ ] 外部ライブラリが最新かつ安全なバージョンか
- [ ] 不要な依存関係が除去されているか
- [ ] API依存関係にSPOF（単一障害点）がないか
- [ ] ライセンス要件が適切に満たされているか

### 月次実施する戦略的レビュー
- **アーキテクチャ妥当性**: 現在の設計が将来要件に対応できるか
- **技術選択の再評価**: 採用技術が最適解を維持しているか  
- **開発効率性**: 開発プロセス・ツールチェーンの改善点
- **ユーザーフィードバック統合**: 実際の使用状況を基にした改善計画

## 🏗️ バックエンドリファクタリング戦略

### Phase 1: 分析・設計（1週間）
1. **現状分析完了**: server.py（5,653行）の機能分類
2. **新アーキテクチャ設計**: マイクロサービス的分離構造
3. **移行計画策定**: 段階的リファクタリング戦略

### Phase 2: 基盤構築（2週間）  
1. **新ディレクトリ構造作成**: backend_refactored/
2. **設定・DB接続分離**: config/, core/モジュール
3. **共通モデル抽出**: models/パッケージの構築
4. **ユーティリティ分離**: 再利用可能コンポーネント

### Phase 3: コア機能移行（3週間）
1. **認証システム移行**: auth.py（エンドポイント5個）
2. **RSS管理移行**: rss.py（エンドポイント6個）
3. **記事処理移行**: articles.py（エンドポイント4個）
4. **基本テスト実装**: 移行機能の動作保証

### Phase 4: 高度機能移行（4週間）
1. **音声生成移行**: audio.py（エンドポイント13個）
2. **AI機能移行**: ai_service.py（オートピック8個）
3. **プレイリスト移行**: playlists.py（14個）
4. **包括的テスト**: 全機能統合テスト

### Phase 5: 最適化・安定化（2週間）
1. **パフォーマンス最適化**: クエリ・キャッシュ戦略
2. **エラーハンドリング強化**: 例外処理・ロギング
3. **セキュリティ監査**: 脆弱性検査・対策
4. **本番環境移行**: 段階的デプロイメント

## ⚠️ 人間（初心者）向け重要注意事項

### AIに指示を出す前の必須確認
1. **現状把握**: 何が動いていて、何が壊れているかを明確に
2. **目的明確化**: 何のために、何を達成したいかを具体的に
3. **制約条件設定**: 変更してはいけない部分、影響範囲の制限
4. **成功基準定義**: 完成の判断基準、テスト方法の事前決定

### 定期的な進捗確認ルール（暴走防止）
- **15分ルール**: 15分作業したら必ず進捗報告を求める
- **機能単位承認**: 1つの機能完成毎に動作確認・承認
- **バックアップ頻度**: 重要な変更前は必ずgit commit
- **質問推奨**: 不明点は即座に質問、推測での作業を禁止

### 技術的判断での相談基準
以下の場合は必ずGemini MCPに相談：
- **新しい技術・ライブラリの導入**
- **パフォーマンスに影響する大きな変更**  
- **セキュリティに関わる実装**
- **データベーススキーマの変更**
- **API仕様の変更**

### プロジェクト健全性を保つ習慣
- **毎日**: 主要機能の動作確認、新たなエラーがないかチェック
- **毎週**: 上記MECEチェックリストの実行
- **毎月**: アーキテクチャ・技術選択の妥当性再評価
- **重要変更前**: 必ずバックアップとロールバック計画の策定

この協業フレームワークにより、AIの能力を最大限活用しながら、プロジェクトの方向性と品質を人間がしっかりとコントロールできる開発体制を実現します。
