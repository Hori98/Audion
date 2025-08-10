# Implementation Notes & Context

## 開発コンテキスト 📝

### ユーザーフィードバックの経緯
1. **初期問題** (ユーザー報告):
   - "音声再生できない。ERROR Error playing audio: [Error: Cannot load an AV asset from a null playback source]"
   - "rssの管理もできないのか。簡易化しすぎじゃないかな"

2. **設計思想の転換** (ユーザーフィードバック):
   - "今のUIは確かに直感的でわかりやすい。しかし機能が減りすぎ"
   - "ユーザーは脳死でこれは何をするためのアプリかっていうのを直感できる必要がある"
   - "既存のニュースアプリやRSSリーダーという概念しか知らない人が、突然今のようなシンプルすぎるアプリUIを見ると、コンセプトも伝わりにくい"

3. **解決アプローチ**:
   - デュアルモード設計: Modern UI + Traditional functionality
   - Progressive disclosure: Simple for new users, powerful for power users
   - 記事選択機能による明確な目的の提示

### アーキテクチャ決定事項 🏗️

#### デュアルモード設計
```typescript
// feed.tsx でのモード切り替え
const [viewMode, setViewMode] = useState<'infinite' | 'list'>('infinite');

// 無限スクロール = Modern consumption experience
// リスト表示 = Traditional RSS reader experience
```

#### 状態管理パターン
```typescript
// 選択状態の管理
const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
const [selectionMode, setSelectionMode] = useState(false);

// パフォーマンス最適化
const loadFeedData = useCallback(async () => {
  // API calls with proper error handling
}, [viewMode, token]);
```

#### UI/UX原則
- **Discoverability**: 機能が見つけやすい
- **Predictability**: ユーザーの期待通りに動作
- **Accessibility**: 多様なユーザーに対応
- **Performance**: 大量データでもスムーズ

## 重要な実装詳細 ⚙️

### 記事選択フロー
1. **選択開始**: 記事タップまたは長押し
2. **視覚フィードバック**: 
   - チェックボックス表示
   - ボーダー強調 (`borderColor: theme.primary, borderWidth: 2`)
   - 選択数表示 (`{selectedArticles.length}件選択中`)
3. **アクション実行**: FABタップで音声生成
4. **完了処理**: Recent タブへ自動ナビゲーション

### エラーハンドリング戦略
```typescript
try {
  await handleCreateAudio(selectedArticleObjects);
  // 成功時の処理
} catch (error: any) {
  if (error.code === 'ECONNABORTED') {
    throw new Error('音声生成がタイムアウトしました。');
  } else if (error.response?.status === 429) {
    throw new Error('生成回数の上限に達しました。');
  }
  // 汎用エラー処理
}
```

### パフォーマンス最適化
- `useCallback` による関数メモ化
- `useFocusEffect` でタブ切り替え時のみデータ取得
- 条件付きレンダリングでDOM要素最小化

## CSS/スタイリング詳細 🎨

### 主要スタイル定義
```typescript
// FAB (Floating Action Button)
fab: {
  position: 'absolute',
  bottom: 20,
  left: 20,
  right: 20,
  borderRadius: 16,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
}

// 選択チェックボックス
checkbox: {
  width: 20,
  height: 20,
  borderRadius: 4,
  borderWidth: 2,
  alignItems: 'center',
  justifyContent: 'center',
}

// 記事選択状態
articleItem: {
  borderRadius: 12,
  overflow: 'hidden',
  // 選択時: borderColor: theme.primary, borderWidth: 2
}
```

### テーマシステム連携
- `theme.primary` - メインカラー
- `theme.card` - カード背景
- `theme.text` - 主文字色
- `theme.textSecondary` - 副文字色

## API連携詳細 🌐

### 使用エンドポイント
```typescript
// 記事取得
GET ${API}/articles
Headers: Authorization: Bearer ${token}
Params: { limit: 20 }

// 音声生成
POST ${API}/audio/create
Body: {
  articles: selectedArticleObjects,
  prompt_style: 'standard',
  title: `${titlePrefix} (${timeStr})`
}
```

### 環境設定
```typescript
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;
```

## テスト・品質管理 🧪

### 実行済みチェック
- ✅ ESLint: Warning全解決
- ✅ TypeScript: コンパイルエラー修正
- ✅ 機能テスト: 記事選択→音声生成フロー

### 今後のテスト計画
- [ ] ユニットテスト (記事選択ロジック)
- [ ] インテグレーションテスト (API連携)
- [ ] E2Eテスト (ユーザーフロー全体)
- [ ] パフォーマンステスト (大量記事選択時)

## 注意点・制約事項 ⚠️

### 既存機能への配慮
- InfiniteFeed.tsx の実装は変更しない
- AudioContext.tsx の音声再生機能は維持
- PersonalizationService.ts の学習機能は活用

### ユーザビリティ制約
- 選択数の上限設定が必要（メモリ・パフォーマンス）
- オフライン時の動作考慮
- 大画面・小画面対応

### 技術的制約
- React Native の制限事項
- Expo Router のナビゲーション制約
- iOS/Android プラットフォーム差異