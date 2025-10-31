# ブランチ統一作業 - 重大な発見

## 問題の本質

feature/home-ui-enhancement と main には、単なる「修正の差分」ではなく、**全く異なるコードベース**が存在している。

### 主な差異

#### feature ブランチにのみある：
- `audion-app-fresh/` 内の完全実装（app/, components/, services/ など）
- AutoPick task-status endpoint の実装
- Query(None) 明示宣言
- 詳細な JWT ログ

#### main ブランチにのみある：
- `audion-app/` （レガシー、でも存在する）
- archived_docs/ （プロジェクト履歴）
- その他の documentation

### なぜこんなことが？

1. main は古い development branch の状態
2. feature/home-ui-enhancement は新しい実装方向

つまり：
- feature はゼロから再構築した新バージョン
- main は古いバージョン
- 2つを単に "マージ" することは不可能

## やるべきこと

feature を main に上書きするのではなく、以下を補完する：

**main に追加すべきもの（feature から）**
1. Backend の JWT 修正：Query(None) + 詳細ログ
2. Frontend の .env 設定：タイムアウト 60000 など
3. API timeout 修正

**main に保持すべきもの（すでにあるもの）**
1. audion-app/ （レガシーだが、失うと困る）
2. archived_docs/ （プロジェクト履歴）
3. その他の document

## 正しい手順

```
1. main を基本にする（保持する）
2. feature から「修正だけ」を選別して適用
3. audion-app-fresh は「参考」として使う（別フォルダとして保持）
```
