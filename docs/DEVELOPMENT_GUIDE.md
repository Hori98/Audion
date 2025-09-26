# Development Guide（開発ガイド）

本ガイドは「スピードを落とさず壊れにくい」開発の実践要点を、AI（Claude Code / Codex 等）が“自走で回しやすい粒度”でまとめています。章末に AI 自走チェックの例を記載します。

## 0) 前提と構成（本プロジェクト固有）
- フロント: `audion-app-fresh/`（Expo）。`audion-app/` は使わない。
- バックエンド: FastAPI + MongoDB。`GET /api/health` で `database_connected:true` を要確認。
- RSS: Home＝固定RSS（公開API）、Feed＝ユーザー管理RSS（認証必須）。
- フィルタ: `source_name` 正規化（trim+lowercase）＋ 12ジャンル分類（`types/rss.ts`）。
- RSS操作後: `DELETE /api/rss-sources/cache/clear` → 再取得（フロントから自動呼出済み）。

---

## 1) 変更単位・ブランチ運用
- 小さく頻繁に（短命ブランチ→早期マージ：Trunk-Based Development）。
- 段階的公開は機能フラグで。長寿ブランチ/巨大PRは回避。
- コミット規約: Conventional Commits（feat|fix|refactor|chore|docs など）→CHANGELOG/ SemVer 自動化に有利。

AI自走チェック（例）
- PRのコミットメッセージを正規表現で走査（Conventional Commits準拠）。
- Breaking Change 有無→SemVer（major/minor/patch）を自動判定しPRにコメント。

---

## 2) API設計・仕様の“固さ”
- RESTの一貫性（リソース指向、HTTPメソッド/ステータス、ページネーション/フィルタ/エラー形式の統一）。
- OpenAPIを真実の源泉にし、Lint（Spectral）で命名/セキュリティ/エラー形式を統制。
- 契約テスト（Dredd / Schemathesis）で実装と仕様のドリフトをCIで検出。
- 互換性監視（oasdiff / pb33f）で破壊的変更をブロック。

AI自走チェック（例）
- `spectral lint openapi.yaml` の結果をPRに赤字要約。
- `dredd`/`schemathesis` をCIで実行→不一致を一覧化。
- `oasdiff old.yaml new.yaml --fail-on-breaking` をCIで実行。

---

## 3) セキュリティ基準（DevSecOpsの最低限）
- OWASP Top 10（特にBroken Access Control）と ASVS を参照。
- セキュアヘッダ、環境変数の型検証、Secrets露出検査を自動化。
- AI生成コードは脆弱性が混ざりやすい→人のレビュー＋追加ガード必須。

AI自走チェック（例）
- 依存脆弱性スキャン、Secrets検出、ヘッダ/設定点検を静的/動的に実施。
- PR要約に「Top10/ASVS観点の懸念点」を自動列挙。

---

## 4) テスト戦略（速度×堅牢性）
- ピラミッド: ユニット（多）→コンポーネント/契約→E2E（少）。
- 契約テストは“仕様崩れ”の早期検知に効く。
- プロパティベースで想定外入力を自動生成（Schemathesis等）。

AI自走チェック（例）
- 失敗テストから修正案パッチをAIが生成、差分と根拠を説明。
- 差分から影響ユースケース/不足テスト候補を列挙。

---

## 5) コードレビューの“可視化”と基礎品質
- 観点テンプレ（可読性/保守性、例外/ログ、設計/性能、I18N、ドキュメント）。
- PRテンプレ: 背景→要件→設計方針→テスト→リスク/ロールバック。
- 大変更は分割（小PR・明確スコープ）。短時間で集中レビュー。

AI自走チェック（例）
- PR本文の充足（背景/要件/テスト/リスク）をテンプレ準拠で採点。
- 未使用コード/依存を自動検出（knip/depcheck/unimported）。

---

## 6) “古いファイルが残り続ける”対策
- 未使用ファイル/Export/依存の定期パトロール（knip / depcheck / unimported）→CIレポート。
- TypeScriptの厳格化（`--noUnusedLocals`/`--noUnusedParameters`）。
- 削除は“削除PR”で影響可視化→1リリース跨いで本削除。

AI自走チェック（例）
- `npx knip --reporter markdown` の結果から“削除候補 Top10”をPRに自動コメント。

---

## 7) ロギング／エラー設計／運用
- ドメイン別構造化ログ、相関ID、レベル運用（debug/info/warn/error）を統一。
- エラー共通フォーマット（code/message/details）→OpenAPIにも反映。
- リリース前後の点検（ヘルスチェック、フラグ、ロールバック）を明文化。

AI自走チェック（例）
- 例外未処理パスや丸投げcatchを静的解析で警告。
- 変更エンドポイントの観測性ギャップ（メトリクス/ログ欠如）を列挙。

---

## 8) 設計判断の記録（ADR）
- 重要な技術判断は1トピック1ADRで簡潔に（テンプレ統一、代替案・影響を明記）。

AI自走チェック（例）
- 依存追加・スキーマ/アーキ変更を検出→ADR雛形を自動起票。

---

## 9) 環境・構成（12-Factor）
- 設定は環境変数、ビルドと実行の分離、ステートレス化、依存の明示管理。
- 環境差で挙動が変わらないよう設定と密結合にしない。

AI自走チェック（例）
- `.env.example` と実使用キーの差分を検出（未定義/未使用を警告）。

---

## 10) 人間レビュー × AIの役割分担
- AIは加速装置、品質/セキュリティは人間の最終判断で担保。
- 小さく生成→テスト駆動→頻繁コミット→意図のドキュメント化。
- レビュー観点のテンプレ化で“形式的LGTM”を防ぐ。

AI自走チェック（例）
- 「想定外ケース」「境界値」「脅威シナリオ」をAIが列挙→不足テスト雛形を起票。
-  PR本文に“設計方針/代替案/トレードオフ”が無ければ追記要求コメント。

---

## すぐ導入できる“自走テンプレ CI”（要旨）
1. API: `spectral lint openapi.yaml` → `schemathesis run -c openapi.yaml` → `oasdiff --fail-on-breaking`。
2. コード衛生: `npx knip && npx depcheck && npx unimported` をPRにレポート。
3. セキュリティ: Top10/ASVSの必須項を静的/動的で自動点検→PRに要約。
4. メタ情報: Conventional Commits検査、CHANGELOG生成、SemVer自動判定。
5. プロセス: “レビュー観点テンプレ”未充足ならFail（説明不足PRを弾く）。

---

## 付録：本プロジェクト向けデバッグTips
- `config/api.ts` で BASE_URL をログ。デバイスからは `localhost` 禁止。
- Feedのフィルタ不全は「ソース名の比較」「アクティブソース集合」「キャッシュクリア」で大体解消。
- RSS追加/削除/有効化直後はキャッシュクリア→再取得を徹底。

