# Home/Feed Tab Final Requirements

## Home Tab (Main Tab - Default)
- **Target Audience**: ライト層（大手ニュースメディアの一般的、網羅的なニュースを見る人たち）
- **UI Style**: 一般的なニュースアプリのUIと機能
- **Content**: キュレート系のニュース（大手メディアの網羅的ニュース）
- **Functionality**: 
  - Autopick ONLY（自動選択）
  - フローティングボタンでautopick実行
  - 一般的なニュースアプリライクなUI
  - 網羅的なニュース表示

## Feed Tab (Sub Tab)
- **Target Audience**: 自分の気になる情報源を個別チェックしたいユーザー
- **UI Style**: 従来のRSSリーダーUI
- **Content**: ユーザーが登録したRSSソース
- **Functionality**: 
  - Manual pick ONLY（手動選択）
  - 従来のfeed機能を継続
  - 個別のRSSソース管理
  - 詳細な記事選択機能

## User Flow
1. **Home**: 大手ニュースメディアの網羅的ニュースを閲覧
2. **Feed**: 自分の関心ある情報源を個別にチェック
3. 両方のタブでそれぞれ異なるアプローチでコンテンツ消費が可能

## Implementation Details
- Home tab: Autopickのフローティングボタン設置
- Feed tab: Manual pick機能の維持
- 明確な機能分離でユーザー体験を向上