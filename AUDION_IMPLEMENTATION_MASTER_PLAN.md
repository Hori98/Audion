# Audion完全実装マスタープラン
**AI主導開発における技術負債防止・最適化実装ガイド**

---

## 🎯 プロジェクト概要

### 基本方針
- **audion-app-fresh**を最終ターゲットとし、**audion-app**から全機能を最適化移植
- UIはシンプル、動作は保証される実装
- レガシーコードの単純コピーではなく、現代的なベストプラクティスに基づく最適化実装
- 技術負債を発生させない段階的開発

### 🚨 調査原則（必須遵守）
- **推測ベース分析の完全禁止**: 事前学習情報に基づく推測での判断を行わない
- **実コードベース確認原則**: 全ての判断は実際のソースコード読み取り結果のみに基づく
- **テキストファイル読み取り重視**: README.mdやコメントではなく、実装されたTypeScript/JavaScript コードを参照
- **動作確認前提**: ファイル存在 ≠ 機能実装、実際の機能動作可能性をコードから判定
- **依存関係実証**: import文、Context Provider設定、Hook使用箇所の実在確認を必須とする

### 核心機能要件
1. **Home画面**: AutoPickのみ利用可能
2. **Feed画面**: AutoPick、ManualPick、SchedulePickを設定から選択可能
3. **ManualPick**: **既読記事にのみ適用**される原則（`read_filter: 'read'`）
4. **3大音声作成モード**の完全実装

---

## 📋 詳細実装タスクリスト

### Phase 0: 実装状況詳細調査（必須事前作業）

#### 0.1 Context実装状況確認
```bash
■ 調査対象ファイル
- audion-app-fresh/context/GlobalAudioContext.tsx
- audion-app-fresh/context/AutoPickContext.tsx
- audion-app-fresh/context/RSSFeedContext.tsx
- audion-app-fresh/context/SettingsContext.tsx
- audion-app-fresh/context/AuthContext.tsx
- audion-app-fresh/context/EnhancedAuthContext.tsx
- audion-app-fresh/context/AudioMetadataProvider.tsx

■ 確認ポイント
- 各Context内の型定義とState/Actions実装内容
- useContext Hook実装の有無
- Provider コンポーネントの実装状況
- app/_layout.tsx でのProvider設定状況
- import/export 文の整合性確認
```

#### 0.2 Services実装状況確認
```bash
■ 調査対象ファイル
- audion-app-fresh/services/UnifiedAudioGenerationService.ts
- audion-app-fresh/services/AudioService.ts
- audion-app-fresh/services/SchedulePickService.ts
- audion-app-fresh/services/ArticleService.ts
- audion-app-fresh/services/RSSService.ts
- audion-app-fresh/services/AuthService.ts
- audion-app-fresh/services/config.ts

■ 確認ポイント
- クラス実装とメソッド定義の完全性
- API エンドポイント接続実装
- TypeScript型定義の実装状況
- 他ファイルからのimport使用状況
```

#### 0.3 Hooks実装状況確認
```bash
■ 調査対象ファイル
- audion-app-fresh/hooks/useRSSFeed.ts
- audion-app-fresh/hooks/useSchedulePick.ts
- audion-app-fresh/hooks/useUserFeed.ts
- audion-app-fresh/hooks/useCuratedFeed.ts
- audion-app-fresh/hooks/useDownloader.ts

■ 確認ポイント
- Hook関数の実装内容
- State管理とEffect処理の実装
- 依存するContext・Serviceの実際の使用状況
- Component からの呼び出し状況
```

#### 0.4 UI Components実装状況確認
```bash
■ 優先調査対象（音声生成関連）
- audion-app-fresh/components/AudioGenerationMenu.tsx
- audion-app-fresh/components/ManualPickModal.tsx
- audion-app-fresh/components/UnifiedAudioPlayer.tsx
- audion-app-fresh/components/SchedulePickManager.tsx
- audion-app-fresh/components/AutoPickProgressBar.tsx

■ 確認ポイント
- Props型定義と実装内容
- 状態管理（useState/Context使用）の実装
- イベントハンドラの実装
- 子コンポーネントへのデータ渡し実装
```

#### 0.5 実装ギャップ特定と対策検討
```bash
■ マトリックス作成
- 機能別実装状況（完全実装/部分実装/未実装/モックのみ）
- 依存関係の整合性（正常/不整合/未接続）
- 動作可能性評価（動作可能/修正必要/要再実装）

■ 優先度設定
- クリティカル: 動作に必須の機能
- 重要: UX向上に必要な機能
- 通常: 付加価値機能
```

### Phase 1: 基盤統一・アーキテクチャ最適化

#### 1.1 依存関係・設定統一
```bash
■ 必須作業
- audion-app-fresh/package.json を正として完全統一
- Expo SDK 54、React 18.2.0、React Native 0.81.4への統合
- expo-audioプラグインの適用確認
- tsconfig.json、.eslintrc.js、.prettierrc.json統一
- app.json設定の最適化適用

■ 環境設定
- .env.development: API_BASE_URL=localhost:8003、MOCK_DATA_FALLBACK=false
- config/api.ts: 動的IPアドレス解決ロジック適用
```

#### 1.2 オフライン機能完全削除
```bash
■ 削除対象
- context/AudioMetadataProvider.tsx（ファイル削除）
- hooks/useDownloader.ts（ファイル削除）
- app/_layout.tsx から AudioMetadataProvider 呼び出し削除
- 関連UIコンポーネントからダウンロード機能削除

■ 確認ポイント
- オフライン再生関連のすべてのUIが除去されていること
- ストリーミング専用アーキテクチャへの完全移行
```

### Phase 2: 3大音声作成機能の完全実装

#### 2.1 AutoPick機能完成
```bash
■ Home画面（シンプル）
- AutoPick開始ボタンのみ
- 進捗表示・キャンセル機能
- 生成完了時の自動再生

■ Feed画面（高機能）
- ジャンル選択UI（`NEWS_CATEGORIES`ベース）
- 記事数選択（3,5,7,10記事）
- 音声品質選択（高品質、標準、低品質）
- リアルタイム進捗表示（SSE対応）
```

#### 2.2 ManualPick機能実装（既読記事限定）
```bash
■ 核心要件
- 既読記事フィルター必須: `read_filter: 'read'`
- 記事手動選択UI（最大10記事選択）
- プロンプトカスタマイズ機能
- 選択記事プレビュー表示

■ 実装詳細
- ManualPickModal.tsx の最適化移植
- 既読記事一覧の取得・表示
- 複数選択チェックボックスUI
- 音声パラメータ調整（声質、速度）

■ 技術仕様
- ArticleService.getReadArticles() 活用
- read_status: 'read' フィルタリング
- AsyncStorage '@audion_read_articles' 連携
```

#### 2.3 SchedulePick機能実装
```bash
■ スケジュール管理
- 定期実行設定UI（毎日、毎週、カスタム）
- APScheduler連携（backend/services/scheduler_service.py）
- スケジュール一覧・編集・削除機能
- 実行履歴・ログ表示

■ プレミアム制限
- Free: 日次2件、週次10件制限
- Basic/Premium: 制限緩和
- 制限チェック・アップグレード誘導UI
```

### Phase 3: 設定システム完全移植

#### 3.1 ContentPlaybackScreen最適化移植
```bash
■ 3大モード設定
- autopick/manualpick/schedulepick 切り替え
- 各モード別詳細設定UI
- アコーディオン式展開・折りたたみ

■ 音声設定
- 声質選択: alloy/echo/fable/nova
- 再生速度: 0.5x〜2.0x（スライダーUI）
- 音声品質: 高品質/標準/低品質

■ コンテンツ設定
- 最大記事数設定（Auto/Manualモード別）
- ジャンル優先度設定
- プロンプトプリセット選択・編集
```

#### 3.2 既読ステータス管理システム
```bash
■ 読み取り状態追跡
- ArticleService.markAsRead() 実装
- ArticleService.markAsSaved() 実装
- read_status: 'unread'|'read'|'saved' 管理

■ フィルタリング機能
- FeedUI: 全て/未読/既読/保存済み フィルター
- useUserFeed: selectedReadStatus 管理
- リアルタイムフィルタリング更新
```

### Phase 4: ナビゲーション・UI/UX完全実装

#### 4.1 基本ナビゲーション画面
```bash
■ Home画面
- キュレーション記事表示（完成済み）
- AutoPick簡易開始ボタン
- 最近生成した音声表示

■ Feed画面
- ユーザーRSS統合表示
- 3大モード切り替えUI
- 既読フィルター機能
- ManualPick自動開始（既読選択時）

■ Discover画面
- 記事推薦・発見機能
- ジャンル別トレンド表示
- 人気記事ランキング

■ Library画面
- 生成済み音声一覧
- 再生履歴管理
- お気に入り・削除機能
```

#### 4.2 ヘッダー機能実装
```bash
■ 統合ヘッダー
- ユーザーアイコン（設定スライド開閉）
- アプリロゴ
- 検索ボタン（音声検索対応）
- 通知アイコン・バッジ表示

■ 検索機能
- 記事全文検索
- 音声検索（音声→テキスト変換）
- 検索履歴・保存機能
```

### Phase 5: バックエンド統合・最適化

#### 5.1 サービス層axios統一
```bash
■ 全サービスaxios化
- services/ArticleService.ts
- services/AudioService.ts
- services/RSSSourceService.ts
- services/SchedulePickService.ts
- services/UnifiedAudioGenerationService.ts

■ interceptors適用
- 自動トークン付与
- 共通エラーハンドリング
- リトライ機能
- レスポンス統一フォーマット
```

#### 5.2 Hook層リファクタリング
```bash
■ データフェッチHook最適化
- hooks/useCuratedFeed.ts
- hooks/useRSSFeed.ts
- hooks/useUserFeed.ts
- hooks/useSchedulePick.ts

■ 最適化ポイント
- axios interceptors恩恵適用
- エラーハンドリング委譲
- デバッグコード削除
- TypeScript strict対応
```

#### 5.3 重要アルゴリズム統合
```bash
■ 動的原稿長計算
- backend/server.py: calculate_unified_script_length
- プラン別制限・最適化ロジック
- 記事数・内容量による適応調整

■ プロンプトプリセット自動選択
- backend/services/dynamic_prompt_service.py
- determine_optimal_preset実装
- ユーザープラン・記事特性による最適化

■ OpenAI TTS統合
- backend/services/tts_service.py
- 複数声質対応（alloy/echo/fable/nova）
- 音質最適化・エラーハンドリング
```

### Phase 6: 高度機能・パーソナライゼーション

#### 6.1 記事推薦システム
```bash
■ 推薦アルゴリズム
- ユーザー閲覧履歴分析
- ジャンル別スコアリング
- 協調フィルタリング実装
- コンテンツベース推薦

■ フィード生成最適化
- RSS優先度計算
- 重複記事除去・統合
- 記事品質評価スコア
- 時間帯別配信最適化
```

#### 6.2 プロンプト手動調整機能
```bash
■ 設定UI
- プロンプトテンプレート編集画面
- カスタムプリセット作成・保存
- プレビュー・テスト機能
- バックアップ・復元機能

■ バックエンドAPI
- PUT /api/user/prompt-preferences
- GET /api/user/custom-prompts
- POST /api/audio/test-prompt
- プロンプト有効性検証
```

### Phase 7: 品質保証・最適化

#### 7.1 静的解析・テスト
```bash
■ コード品質
- ESLint: 全警告解消
- TypeScript: strict mode、型エラー0
- Prettier: コードフォーマット統一
- 未使用コード・依存関係削除

■ 機能テスト
- 3大音声作成フローE2Eテスト
- 既読記事フィルター動作確認
- 設定変更・保存機能テスト
- エラーハンドリング・リカバリーテスト
```

#### 7.2 パフォーマンス最適化
```bash
■ レンダリング最適化
- React.memo適用
- useMemo/useCallback最適化
- 不要な再レンダリング防止
- FlatList仮想化設定

■ ネットワーク最適化
- axios interceptor活用
- リクエスト重複排除
- キャッシュ戦略最適化
- オフライン対応（必要に応じて）
```

---

## 🛡️ AI主導開発における技術負債防止ガイドライン

### 開発前の必須準備

#### 1. 要件定義・設計の明文化
```markdown
■ 必須ドキュメント
- 機能要件定義書（このファイル）
- API仕様書（backend/routers/参照）
- データベース設計書
- UI/UXワイヤーフレーム

■ 技術制約の明確化
- 使用技術スタック固定
- パフォーマンス要件
- セキュリティ要件
- ブラウザ・デバイス対応範囲
```

#### 2. AIへの指示ベストプラクティス
```markdown
■ 具体的・明確な指示
❌ 「ソート機能を実装して」
✅ 「記事一覧をpublished_at降順でソートするTypeScript関数を、
   Array.sort()を使用して実装してください」

■ コンテキスト共有
- プロジェクト設計書を必ず事前読み込み
- 既存コードパターンの参照指示
- 使用ライブラリ・フレームワークの明示

■ 段階的タスク分解
- 大機能を小機能に分割
- 各段階での動作確認必須
- テスト可能な単位での開発
```

### 開発中の品質管理

#### 3. コードレビュー・品質チェック
```markdown
■ AI生成コード必須チェック項目
- 変数・関数名の適切性
- 重複コード・ロジックの有無
- セキュリティ脆弱性（XSS、injection等）
- パフォーマンス問題（無限ループ、メモリリーク）
- エラーハンドリングの適切性

■ 既存コードとの一貫性確認
- コーディングスタイル統一
- アーキテクチャパターン準拠
- 命名規則統一
- import/export構造統一
```

#### 4. バージョン管理・リスク管理
```markdown
■ Git運用ルール
- 機能単位での小まめなコミット
- commit前のgit diff必須確認
- ブランチ切り替えによる実験的開発
- 重要変更前のタグ・バックアップ作成

■ AI暴走防止策
- 15分毎の進捗確認・承認
- 一度に変更するファイル数制限
- 重要ファイル変更前の明示的許可
- 意図しない変更の即座検知・修正
```

### 継続的改善・リファクタリング

#### 5. 技術負債管理
```markdown
■ 負債の見える化
- TODO/FIXMEコメントによる課題管理
- コードスメル検出・記録
- パフォーマンスボトルネック特定
- セキュリティ脆弱性監視

■ 計画的負債返済
- 重要度・影響度による優先度付け
- 定期リファクタリングサイクル
- 技術選択の定期見直し
- 外部ライブラリ更新計画
```

#### 6. テスト・デバッグ戦略
```markdown
■ 多層テスト実装
- 単体テスト: 重要ロジック関数
- 統合テスト: API連携・データフロー
- E2Eテスト: ユーザー操作シナリオ
- 手動テスト: UI/UX確認

■ デバッグ効率化
- ログ出力戦略（開発/本番分離）
- エラー監視・アラート設定
- パフォーマンス計測・分析
- ユーザー行動追跡（プライバシー配慮）
```

### セキュリティ・非機能要件

#### 7. セキュリティ対策
```markdown
■ 基本セキュリティ実装
- API認証・認可（JWT適切管理）
- 入力値検証・サニタイゼーション
- CORS設定・CSP実装
- 機密情報の環境変数化

■ データ保護
- 個人情報暗号化
- セッション管理強化
- ログ・監査証跡保持
- GDPR・プライバシー法対応
```

#### 8. パフォーマンス・スケーラビリティ
```markdown
■ 性能要件達成
- ページロード時間 < 3秒
- API応答時間 < 2秒
- メモリ使用量最適化
- バッテリー消費量配慮（モバイル）

■ 将来拡張対応
- コンポーネント再利用性設計
- データベース正規化・インデックス
- キャッシュ戦略実装
- CDN・ロードバランサー考慮
```

---

## 🎯 実装優先度・スケジュール

### Week 1: 基盤統一・アーキテクチャ最適化
- Phase 1完了
- オフライン機能削除
- 開発環境統一

### Week 2: 核心機能実装
- 3大音声作成機能（Auto/Manual/Schedule）
- 既読記事管理システム
- 基本ナビゲーション画面

### Week 3: 高度機能・設定システム
- ContentPlaybackScreen移植
- プロンプト調整機能
- 推薦システム基盤

### Week 4: 統合・最適化
- サービス層axios統一
- Hook層リファクタリング
- パフォーマンス最適化

### Week 5: 品質保証・デプロイ準備
- 包括的テスト実行
- セキュリティ監査
- 本番環境デプロイ準備

---

## 📝 実装時の重要原則

### 1. シンプルUI・確実動作
- UIは最小限に留め、操作は直感的に
- 複雑な機能は段階的展開で表示
- エラー時の適切なフィードバック
- ローディング状態の明確な表示

### 2. モダンな実装手法
- レガシーコードの盲目的コピー禁止
- TypeScript strict mode準拠
- React Hooks・関数コンポーネント優先
- ES6+モダンJS活用

### 3. 拡張性・保守性確保
- コンポーネント分割・再利用
- ビジネスロジックの分離
- 設定値の外部化・環境変数活用
- 将来機能追加を考慮した設計

### 4. エラーハンドリング・堅牢性
- 想定外入力への対応
- ネットワークエラー・タイムアウト対応
- グレースフルデグラデーション
- ユーザーフレンドリーなエラーメッセージ

---

このマスタープランに従い、技術負債を発生させることなく、シンプルで堅牢なAudionアプリケーションを構築します。各段階での品質確認と継続的改善により、持続可能で高品質なプロダクトを実現できます。