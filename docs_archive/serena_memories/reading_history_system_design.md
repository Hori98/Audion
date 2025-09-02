# 閲覧履歴システム設計

## 目的
ニュースアプリ・RSSリーダーからの移行ユーザー向けに、「閲覧メイン」のワークフローを実現

## 核心機能要件
1. **閲覧済み記事から音声用に選択** - 理解できなかった・深めたい記事を音声化
2. **閲覧前でもジャンル・ソース別AutoPick** - 未読記事の網羅的音声消費
3. **週間閲覧記事一覧・音声化** - 作成した音声の再利用・ニュースの再確認

## データ構造設計

### ReadingHistory テーブル
```typescript
interface ReadingHistory {
  id: string;
  user_id: string;
  article_id: string;
  article_normalized_id: string;
  read_at: Date;
  read_duration?: number; // 閲覧時間（秒）
  source_name: string;
  genre: string;
  article_title: string;
  article_url: string;
  read_status: 'opened' | 'partially_read' | 'fully_read';
  interest_level?: 'low' | 'medium' | 'high'; // ユーザー評価
  created_at: Date;
  updated_at: Date;
}
```

## UI/UXワークフロー設計

### 1. 記事閲覧時の自動追跡
- 記事タップ時に `read_at` を記録
- WebBrowser開閉で読了状態を推測
- バックグラウンドでサイレント記録（UX阻害なし）

### 2. 閲覧済み記事のビジュアル表示
- 記事カードに「既読」インジケーター
- 閲覧日時の表示
- 再読可能な設計

### 3. 音声生成との連携
- **Manual Pick**: 閲覧済み記事に「🔊音声化」ボタン
- **Auto-Pick**: 「今週読んだ記事から」オプション
- **Weekly Summary**: 「この週の記事まとめ」機能

### 4. フィルター拡張
- 「閲覧済み」「未読」「今週読んだ」フィルター
- 閲覧頻度による優先度表示

## 実装優先度
1. **Phase 1**: 基本的な閲覧履歴記録
2. **Phase 2**: UI上での閲覧状態表示
3. **Phase 3**: 閲覧済み記事からの音声生成
4. **Phase 4**: 週間サマリー機能

## 技術実装
- Frontend: AsyncStorage + State管理
- Backend: MongoDB新コレクション
- API: `/api/reading-history` エンドポイント
- 最適化: バッチ処理でパフォーマンス確保