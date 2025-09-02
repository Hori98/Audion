# Current TODO & Roadmap

## 直近完了したタスク ✅
1. 記事一覧・選択UI の復活 - COMPLETED
2. 記事選択チェックボックスの実装 - COMPLETED  
3. 選択状態管理と保存 - COMPLETED
4. FAB（フローティングボタン）で音声作成 - COMPLETED
5. 選択モードと通常モードの切り替え - COMPLETED
6. TypeScript エラーの修正 - COMPLETED
7. ナビゲーション機能の追加 - COMPLETED

## 次の優先タスク 📋

### Phase 1: 記事選択機能の拡張
1. **フィルタリング機能追加**
   - ジャンルフィルター (Technology, Finance, Politics等)
   - ソースフィルター (RSS source別)
   - 日付範囲フィルター

2. **Auto-Pick機能実装**
   - AIによる記事自動選択
   - ユーザー学習履歴ベース
   - PersonalizationService連携

3. **記事詳細表示**
   - 記事コンテンツのプレビュー
   - 元記事リンクへのナビゲーション
   - 記事メタデータ表示

### Phase 2: UX改善
1. **選択操作の最適化**
   - スワイプジェスチャーでの選択
   - 複数選択のキーボードショートカット
   - 選択状態のローカルストレージ保存

2. **視覚フィードバック強化**
   - 選択アニメーション
   - プログレスインジケーター
   - ハプティックフィードバック

### Phase 3: 高度機能
1. **バッチ処理機能**
   - 複数記事からのプレイリスト作成
   - カスタムタイトル設定
   - 再生順序のカスタマイズ

2. **共有・エクスポート機能**
   - 選択した記事リストの共有
   - OPML形式でのエクスポート
   - 他のRSSリーダーとの連携

## 技術的改善タスク 🔧

### コード品質
- [ ] 記事選択ロジックのユニットテスト作成
- [ ] Integration test for article selection flow
- [ ] Performance optimization for large article lists
- [ ] Error boundary implementation

### アクセシビリティ
- [ ] Screen reader対応の改善
- [ ] Keyboard navigation support
- [ ] High contrast mode support
- [ ] Voice Control対応

## 注意事項・制約 ⚠️

### 既存機能への影響
- InfiniteFeed.tsx は現在の実装を維持
- AudioContext.tsx の音声再生機能は変更しない
- AuthContext.tsx の認証フローは触らない

### パフォーマンス考慮
- 大量記事の選択時のメモリ使用量
- スクロール時のレンダリング最適化
- API呼び出し回数の制限

### ユーザビリティ原則
- "脳死で直感できる" UI維持
- RSS reader的な安心感の提供
- Modern consumption experienceとのバランス

## 開発環境情報 🛠️

### 主要ファイル
- `audion-app/app/(tabs)/feed.tsx` - メイン実装
- `audion-app/components/InfiniteFeed.tsx` - TikTok style feed
- `audion-app/context/AuthContext.tsx` - 認証管理
- `audion-app/app/sources.tsx` - RSS source management

### 開発コマンド
```bash
npx expo start                    # 開発サーバー起動
npx eslint app/\(tabs\)/feed.tsx  # ESLint check
npx tsc --noEmit                  # TypeScript check
```

### API エンドポイント
- `GET /api/articles` - 記事一覧 (limit: 20)
- `POST /api/audio/create` - 音声生成
- `GET /api/rss-sources` - RSSソース一覧