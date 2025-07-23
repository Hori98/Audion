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