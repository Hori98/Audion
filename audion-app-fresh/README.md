# Audion App - AI-Powered Audio News Platform

**最終更新**: 2025年10月6日  
**バージョン**: v2.0 (ManualPick機能実装完了版)

## 概要

AudionはRSS記事とWebコンテンツを高品質な音声コンテンツに変換するAI搭載オーディオニュースプラットフォームです。React NativeモバイルアプリとFastAPIバックエンドを通じて、いつでもどこでも情報を「聴く」ことができます。

## 🎵 最新機能 (2025年10月実装)

### ManualPick機能
- **Feed タブ専用**: 既読記事に対してオレンジ色の音楽ノートアイコンを表示
- **個別音声生成**: 既読記事を個別に音声化可能
- **ユーザビリティ**: 確認ダイアログ付きで誤操作を防止
- **統合実装**: ArticleContextとの完全統合

### RSS統一アーキテクチャ
- **単一データフロー**: useUserFeed中心の統一管理
- **軽量化Context**: RSSFeedContextの簡素化
- **コードクリーンアップ**: 1,589行の不要コード削除完了

## 🏗️ アーキテクチャ

### フロントエンド構成
```
audion-app-fresh/
├── app/(tabs)/
│   ├── index.tsx          # Homeタブ (AutoPickメイン)
│   ├── articles.tsx       # Feedタブ (ManualPick対応)
│   ├── library.tsx        # 音声ライブラリ
│   └── settings.tsx       # 設定・RSS管理
├── components/
│   ├── ArticleCard.tsx    # 統一記事カード (ManualPick対応)
│   ├── CleanFeedUI.tsx    # Feedタブ表示UI
│   └── common/
│       └── UnifiedArticleList.tsx # 統一記事リスト
├── context/
│   ├── ArticleContext.tsx # 記事状態管理
│   ├── RSSFeedContext.tsx # RSS統一Context
│   └── AuthContext.tsx    # 認証管理
└── services/
    ├── ArticleService.ts  # 記事API
    ├── AudioService.ts    # 音声生成
    └── UserFeedService.ts # RSS管理
```

### データフロー設計
```
Settings → RSSChangeNotifier → useUserFeed → Feed自動更新
    ↓
CleanFeedUI → UnifiedArticleList → ArticleCard (ManualPick対応)
    ↓
ArticleContext → AudioService → 音声生成
```

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- Expo CLI
- iOS Simulator または Android Emulator
- バックエンドサーバー稼働中 (192.168.11.30:8003)

### インストール
```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npx expo start

# iOS で起動
npx expo start --ios

# Android で起動  
npx expo start --android
```

### 環境変数
```bash
# .env または app.json
EXPO_PUBLIC_API_BASE_URL=http://192.168.11.30:8003
```

## 📱 主要機能

### コア機能
- **ユーザー認証**: JWT ベースログイン/登録システム
- **RSS統合**: 6ソース、65+記事の正常取得
- **AI音声生成**: AutoPick + ManualPick対応
- **音声ライブラリ**: リアルAPI統合とプレイブックコントロール
- **検索・発見**: 高度なファジー検索と関連性スコアリング

### 高度な機能
- **統一音声システム**: TTSサービスとXML処理パイプライン統合
- **進捗モニタリング**: Server-Sent Events (SSE) でリアルタイム進捗
- **タスクマネージャー**: バックグラウンド音声生成と進捗追跡
- **複数生成モード**: AutoPick、Manual選択、Instant Multi

## 🔧 技術スタック

### フロントエンド
- **React Native**: Expo SDK 50, React Native 0.73.6
- **ナビゲーション**: Expo Router (ファイルベースルーティング)
- **UI**: React Native Paper, カスタムテーマコンポーネント
- **状態管理**: React Context (Auth, RSS, Settings)
- **主要依存関係**:
  - expo-audio, expo-av (音声再生)
  - react-native-sse (サーバーサイドイベント)
  - axios (HTTP クライアント)

### バックエンド
- **FastAPI**: uvicorn (非同期Webフレームワーク)
- **データベース**: MongoDB with Motor async driver
- **認証**: JWT トークンとBearer認証
- **AI統合**: OpenAI GPT (スクリプト生成) + OpenAI TTS (音声)
- **ストレージ**: AWS S3 + ローカルストレージフォールバック

## 📋 開発ガイドライン

### コンポーネント設計
- **統一性**: ArticleCard.tsx で HomeタブとFeedタブ共通化
- **条件表示**: `isFeedTab && isRead && showManualPickIcon` でタブ別機能
- **プロップドリリング**: 機能統合のための明示的なprops伝播
- **TypeScript**: 完全な型安全性と IntelliSense サポート

### RSS管理原則
- **useUserFeed中心**: 全てのRSSデータ管理をuseUserFeedに統一
- **Context軽量化**: RSSFeedContextはuseUserFeedのエイリアス提供のみ
- **自動更新**: RSSChangeNotifier による変更通知システム

### ManualPick実装原則
- **タブ固有**: Feed タブでのみ機能有効
- **既読条件**: 既読記事に対してのみアイコン表示
- **UI一貫性**: 既読アイコンの左隣に配置
- **確認システム**: 誤操作防止のための確認ダイアログ

## 🧪 テスト

### 機能テスト
```bash
# TypeScript コンパイルチェック
npx tsc --noEmit

# ESLint
npm run lint

# 手動テスト推奨項目
# - ManualPick アイコン表示 (Feed タブ既読記事)
# - 音声生成確認ダイアログ
# - RSS自動更新 (Settings変更時)
# - 既存機能の完全互換性
```

## 📊 パフォーマンス基準

- **初期表示時間**: < 1秒
- **API応答時間**: 95%ile < 2秒  
- **メモリ使用量**: 既存比110%以内
- **クラッシュ率**: < 0.1%

## 🔒 セキュリティ

- **JWT認証**: 完全なトークンベース認証
- **API保護**: Bearer token による全エンドポイント保護
- **データ暗号化**: 既存暗号化機能の完全保持
- **入力検証**: 全ユーザー入力の検証と無害化

## 📝 最近の更新 (2025年10月6日)

### 実装完了
- ✅ ManualPick機能完全実装 (Feed タブ専用)
- ✅ RSS統一アーキテクチャ確立
- ✅ 不要ファイル削除 (1,589行のコードクリーンアップ)
- ✅ ArticleCard統一化 (Home/Feed タブ共通)
- ✅ プロジェクト文書最新化

### 技術的成果
- 条件付きUI表示システム確立
- プロップドリリング最適化
- データフロー統一完了
- 混同原因ファイル完全除去

## 🤝 開発チーム向け情報

### ブランチ戦略
- `main`: 本番リリース用
- `feature/home-ui-enhancement`: 最新開発ブランチ

### 緊急時対応
```bash
# 機能無効化 (必要に応じて)
# app/(tabs)/index.tsx で FEATURE_FLAGS を false に設定

# ロールバック
git checkout main
git revert HEAD~n
```

## 🔗 関連ドキュメント

- `HOME_UI_ENHANCEMENT_REQUIREMENTS.md` - 技術仕様書
- `HOME_UI_IMPLEMENTATION_PLAN.md` - 実装計画書  
- `API_VALIDATION_PROCEDURES.md` - API検証手順書
- `UI_INTEGRATION_GUIDE.md` - UI統合ガイド
- `FINAL_APPROVAL_SUMMARY.md` - 実装完了レポート

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

---

**Audion - Emergent.AI Demo Project**  
**Made with ❤️ using React Native & FastAPI**
<!--
DocMeta:
  SSOT: true
  Owner: Frontend Team
  Updated: 2025-10-14
  Scope: Frontend structure / Routing / Setup
-->
