# Server.py 分析結果 - 技術負債の現状

## 概要
- **ファイルサイズ**: 5,653行（巨大すぎる単一ファイル）
- **APIエンドポイント**: 約70個
- **Pydanticモデル**: 35個（重複定義も存在）
- **状況**: 複雑化による技術負債が深刻、バグが頻発し修正困難

## 機能分類（APIエンドポイント別）

### 1. 認証・ユーザー管理 (5エンドポイント)
- `/api/auth/register`, `/api/auth/login`
- `/api/auth/change-password`, `/api/auth/change-email`
- `/api/user/settings`

### 2. RSS管理 (6エンドポイント)
- `/api/rss-sources` (GET/POST/PATCH/DELETE)
- `/api/rss-sources/bootstrap`

### 3. 記事管理 (4エンドポイント)
- `/api/articles` (GET/POST)
- `/api/articles/curated`

### 4. オーディオ生成・管理 (13エンドポイント)
- `/api/audio/create`, `/api/audio/direct-tts`, `/api/audio/instant-multi`
- `/api/audio/library`
- `/api/audio/{id}/rename`, `/api/audio/{id}` (DELETE)
- `/api/audio/deleted`, `/api/audio/{id}/restore`, `/api/audio/{id}/permanent`
- `/api/audio/deleted/clear-all`

### 5. AI機能・オートピック (8エンドポイント)
- `/api/auto-pick`, `/api/auto-pick/create-audio`
- `/api/user-profile`, `/api/user-interaction`
- `/api/audio-interaction`, `/api/user-insights`
- `/api/test-classification`

### 6. プレイリスト・アルバム (14エンドポイント)
- `/api/playlists` 系 (7エンドポイント)
- `/api/albums` 系 (7エンドポイント)

### 7. ブックマーク・アーカイブ (12エンドポイント)
- `/api/bookmarks` 系 (5エンドポイント)
- `/api/archive` 系 (7エンドポイント)

### 8. ダウンロード管理 (3エンドポイント)
- `/api/downloads` 系

### 9. サブスクリプション (6エンドポイント)
- `/api/user/subscription` 系
- `/api/user/audio-limits` 系

### 10. オンボーディング・プリセット (7エンドポイント)
- `/api/onboard` 系
- `/api/preset-sources` 系

### 11. ユーザープロフィール (5エンドポイント)
- `/api/user/profile` 系
- `/api/user/profile-image` 系

### 12. デバッグ・テスト (4エンドポイント)
- `/api/debug` 系

### 13. その他・ヘルス (5エンドポイント)
- ヘルスチェック、フィードバック系

## 主要な問題点

### 1. 単一責任原則の違反
- 70個のAPIエンドポイントが1つのファイルに詰め込まれている
- 認証、RSS管理、音声生成、プレイリスト管理など全く異なる責務が混在

### 2. コードの重複
- UserSubscriptionクラスが2回定義されている（4247行と4915行）
- 類似の機能が複数箇所で実装されている

### 3. 保守性の欠如
- バグ修正時に5,653行から該当箇所を探す必要がある
- 1つの機能修正が他の機能に予期しない影響を与えるリスク

### 4. テスタビリティの低さ
- 単一ファイルのため、機能別の単体テストが困難
- 依存関係が複雑で、モック化が困難

### 5. スケーラビリティの問題
- 新機能追加時に既存コードとの競合リスク
- 複数開発者による同時開発が困難

## 解決策：マイクロサービス的な分離構造

現状の70個のAPIを13の機能グループに分離し、それぞれを独立したモジュールとして再構築する必要がある。