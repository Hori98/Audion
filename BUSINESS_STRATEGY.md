# Audion アプリ ビジネス戦略 & スイッチングコスト設計

## 🎯 戦略概要
システムが簡単なので、スイッチングコストを極大化する仕組みが必要。
見える価値と見えない価値の二段構えでユーザーロックインを実現。

## 📊 スイッチングコスト要素

### 🔹 見える価値（データ・コミュニティ）
1. **個人データ**
   - プレイリスト・DL音声
   - ニュース視聴履歴
   - 個人の音声ライブラリ

2. **コミュニティ価値**
   - 権威アカウント（有名人・専門家・友人）のフォロー
   - フォロー/フォロワーのSNS的要素
   - 権威アカウントのニュース履歴・作成音声の閲覧

3. **経済価値**
   - noteのような音声売買システム
   - フリーミアムプラン
   - プレミアムコンテンツアクセス

### 🔍 見えない価値（技術・アルゴリズム）
1. **パーソナライゼーション**
   - TTSレポートデータ蓄積
   - ニュースauto-pickアルゴリズム最適化
   - ユーザー行動学習

2. **コンテンツ品質**
   - 音声原稿作成の精度
   - 第一要約（生ニュース取得）
   - 第二要約（プロンプト最適化要約）の品質
   - 操作感・UX品質

## 💡 実装計画

### 1. 原稿作成プロンプト最適化システム

#### 現状の改良
```python
# ベースプロンプトスタイル（5種類）
PROMPT_STYLES = {
    "formal": "厳格で専門的な分析スタイル",
    "creative": "創造的でアイデア重視", 
    "entertaining": "エンターテイニングで親しみやすい",
    "gentle": "優しく分かりやすい解説",
    "standard": "バランスの取れた標準スタイル"
}

# 動的選択システム
def get_optimal_prompt_style(user_profile, article_genre, onboarding_preference):
    """
    - オンボーディング時の選択
    - ユーザー行動履歴
    - 記事ジャンル
    を基にAI/アルゴリズムで最適プロンプトを選択
    """
    pass
```

#### 実装箇所
- オンボーディング: ユーザーの好みスタイル選択
- Auto-pick: スタイル選択機能（デフォルト：普通）
- server.py: ベースプロンプト管理・動的選択API

### 2. 権威アカウント戦略

#### 権威の定義
> 権威とは、好意・関心・興味・注意の対象となる人を広く指す。
> 著名人だけでなく、友人や同僚も含む。
> 動機: 「その人が見ている情報を自分も知りたい」欲求への対応

#### プロンプト公開の課題
- **危険性**: 要約ログ公開→価値下落
- **解決策**: 段階的開示
  - プロンプト詳細: 非公開
  - スタイル指標: 「厳格度70%、創造性30%」のみ表示
  - 差別化: 結果品質で競争

### 3. 音声カード拡張仕様

```typescript
interface EnhancedAudioCard {
  // 既存要素
  audio_url: string;
  script: string;              // 第二要約（音声原稿）
  source_articles: Article[];  // 出典ニュース一覧+リンク
  duration: number;            // 再生時間
  created_at: string;          // 作成日時
  creator: User;               // 作成者（Spotify風表示）
  
  // 新規追加要素
  listening_count: number;        // 再生回数
  like_count: number;            // いいね数
  comment_count: number;         // コメント数
  genre_tags: string[];          // ジャンルタグ
  difficulty_level: 'easy'|'medium'|'hard'; // 理解難易度
  credibility_score: number;     // 信頼度スコア
  commercial_usage: boolean;     // 商用利用可否
  copyright_warnings: string[]; // 著作権警告
  related_audios: string[];      // 関連音声レコメンド
  transcript_quality: number;    // 原稿品質スコア
  prompt_style: string;          // 使用プロンプトスタイル
  ai_confidence: number;         // AI要約信頼度
}
```

### 4. 著作権・商用利用対策

#### 自動判定システム
```python
def check_commercial_usage(source_urls):
    """RSS/APIソースの商用利用可否を自動判定"""
    for url in source_urls:
        site_policy = analyze_copyright_policy(url)
        if not site_policy.commercial_allowed:
            return {
                "allowed": False,
                "warning": "商用利用不可のソースが含まれています",
                "restricted_sources": [url]
            }
    return {"allowed": True}
```

#### プロンプト改良（違法対策）
```python
LEGAL_SAFE_PROMPT = """
以下のニュース記事を参考に、完全にオリジナルの要約を作成してください：

【重要事項】
- 直接的な引用は一切行わない
- 事実の再構成と独自の解釈・分析を含める
- 出典は明記するが、文章は100%オリジナル
- Google NotebookLMの公開可能基準に準拠
- 二次利用・商用利用可能な内容とする

【参考】: {source_articles}
"""
```

### 5. API効率化・コスト最適化

```python
async def optimized_news_processing():
    """段階的処理でAPI料金を最適化"""
    
    # Stage 1: 軽量フィルタリング（安価API使用）
    relevant_articles = await lightweight_relevance_filter(raw_articles)
    
    # Stage 2: キャッシュチェック
    cached_summaries = check_existing_summaries(relevant_articles)
    new_articles = filter_uncached(relevant_articles, cached_summaries)
    
    # Stage 3: 高品質要約（高価API・必要分のみ）
    new_summaries = await premium_summarize(new_articles)
    
    return merge_results(cached_summaries, new_summaries)
```

## 🚀 実装フェーズ

### Phase 1: 基盤強化（優先度: 高）
1. ✅ プロンプトスタイル選択システム
2. ✅ 音声カード情報拡充
3. ✅ 著作権自動チェック機能
4. ✅ API使用量最適化

### Phase 2: ソーシャル機能（優先度: 中）
1. フォロー/フォロワーシステム実装
2. 音声いいね・コメント・シェア機能
3. 権威アカウント認証システム
4. ユーザープロフィール強化

### Phase 3: 収益化（優先度: 中）
1. フリーミアムプラン設計
2. プレミアム音声売買マーケット
3. 権威アカウント収益分配
4. 高品質TTS・プロンプトの有料化

### Phase 4: エコシステム完成（優先度: 低）
1. サードパーティ連携
2. 企業向けAPI提供
3. コンテンツ推薦アルゴリズム高度化
4. 多言語対応

## 🎯 差別化ポイント

### 技術的優位性
- **動的プロンプト最適化**: AIによる個人最適化
- **品質担保**: 著作権チェック・信頼度スコア
- **効率性**: API料金最適化アルゴリズム

### ネットワーク効果
- **権威アカウント**: 有名人・専門家・友人の情報
- **コミュニティ**: フォロー基盤のソーシャル性
- **データ蓄積**: 個人の聴取履歴・プリファレンス

### ユーザー体験
- **パーソナライゼーション**: 個人最適化音声
- **シームレス**: 高品質TTS・操作性
- **価値創造**: 情報を価値ある音声コンテンツに変換

## 💼 ビジネスモデル展開

### 収益源
1. **フリーミアム**: 基本無料・プレミアム機能有料
2. **コンテンツ売買**: 権威アカウント音声の販売
3. **広告収入**: パーソナライズド広告
4. **企業API**: B2B向けニュース要約サービス
5. **データライセンス**: 匿名化された聴取傾向データ

### 競合優位性
- **スイッチングコスト**: 個人データ・ソーシャルネットワーク
- **ネットワーク効果**: ユーザー数増加→価値向上
- **技術的参入障壁**: 高品質プロンプト・アルゴリズム
- **コンテンツ品質**: 権威アカウント・専門性

---

## 📝 メモ・追加アイデア

### 検討事項
- **音声カード**: 他に必要な要素は？
- **プロンプト**: 商用利用可能な違法対策の徹底
- **参考**: Google NotebookLMの公開可能基準を調査・準拠
- **効率化**: ニュース獲得→要約のフロー最適化

### 権威の再定義
> 権威 = 単なる友人・フォロワーも含む
> = ユーザーの興味関心の対象となる人
> 動機 = 「その人の情報を自分も知りたい」欲求
> 例：友人・経済人が見ているニュース・聞いている音声への好奇心・学習欲求

---
*最終更新: 2025年1月*
*実装予定: フェーズ別で段階的に導入*