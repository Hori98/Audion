# UI Enhancement Roadmap - Phase 2

## 🔍 HorizontalTabs拡張性確認
**現在の実装は完全に拡張対応済み**：
- ✅ 項目数の増減：配列の追加/削除で自動対応
- ✅ 項目名の変更：name属性変更で自動リサイズ
- ✅ 動的幅計算：onLayoutで実際の文字幅を測定
- ✅ 自動スクロール：画面幅に関係なく中央配置
- ✅ アニメーション：任意の位置・幅に対応

## 📋 実装要求項目

### 🗑️ Phase 1: コンテンツクリーンアップ（低リスク）
1. **Feed**: ヘッダー文字削除（こんにちは、今日のニュース、ソース、ジャンル）
2. **全タブ**: タイトル削除（ホーム、ディスカバー、ライブラリ）
3. **Home**: AutoPickボタン削除（後でフローティング化）

### 🏗️ Phase 2: レイアウト構造変更（中リスク）
1. **統一ヘッダー実装**：
   - 左：ユーザーアイコン
   - 中央：Audionアプリロゴ
   - 右：検索アイコン
2. **Home構造変更**：
   - Hero Section（5記事のカルーセル）
   - 注目ニュース Section
   - おすすめ記事 Section

### 🎯 Phase 3: 高度なUI実装（高リスク）
1. **フローティングAutoPickボタン**
2. **Twitter風サイドメニュー**（Settings）
3. **検索機能実装**

## 🔧 技術実装方針

### Twitter風サイドメニュー
```tsx
// React Native標準のModal + Animated.View
// react-native-gesture-handlerは避けて安定性重視
import { Modal, Animated, PanResponder } from 'react-native';
```

### フローティングボタン
```tsx
// position: absolute + 右下固定
// Tabバー上に配置（zIndex調整）
style={{ position: 'absolute', bottom: 90, right: 20 }}
```

### 統一ヘッダー
```tsx
// _layout.tsxでTabsのheaderShown: falseに統一
// カスタムヘッダーコンポーネント作成
```

## ⚡ 実装順序（リスク順）
1. **🟢 低リスク**: テキスト削除 → 即座に実装可能
2. **🟡 中リスク**: ヘッダー実装 → レイアウト調整必要
3. **🔴 高リスク**: サイドメニュー → 複雑なアニメーション

## 💾 保持すべき要素
- 現在の黒基調デザインシステム
- HorizontalTabsコンポーネント
- Dynamic Island対応（paddingTop: 60）
- React Native標準コンポーネント使用方針