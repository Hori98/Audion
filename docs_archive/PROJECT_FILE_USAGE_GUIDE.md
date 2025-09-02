# 📁 PROJECT FILE USAGE GUIDE - AI読み込み最適化戦略

## 🎯 目的：過去データ混合回避 & 効率的ファイル活用

## 📋 ファイル分類システム

### **🔴 CRITICAL - 必ず読み込むファイル**
```
/COMPLETE_PROJECT_STATUS.md          # 100%正確な現状
/AI_DEVELOPMENT_FRAMEWORK.md         # 開発継承システム  
/PROJECT_FILE_USAGE_GUIDE.md         # このファイル
/CLAUDE.md                          # 開発哲学・ルール
```

### **🟡 ACTIVE - アクティブ開発ファイル**
```
# 今回修正完了（audion_new_frontend）
/audion_new_frontend/app/(tabs)/index.tsx
/audion_new_frontend/hooks/useRSSFeed.ts
/audion_new_frontend/services/ArticleService.ts
/audion_new_frontend/services/SearchService.ts    # NEW FILE
/audion_new_frontend/components/HeroCarousel.tsx
/audion_new_frontend/components/SearchModal.tsx

# バックエンド（安定稼働中）
/backend/server.py
/backend/start-dev-fixed.sh
```

### **🟢 REFERENCE - 参照用ファイル**
```
# メインプロジェクト（25+ TODOs）
/audion-app/                        # 複雑な実装、必要時のみ参照

# 設定・依存関係
/audion_new_frontend/package.json
/backend/requirements.txt

# ログファイル（デバッグ時のみ）
/backend/*.log
```

### **🔵 ARCHIVE - アーカイブ（読み込み非推奨）**
```
# 過去のメモリファイル（混乱の原因）
/.serena/memories/session_handoff_jan_23_2025.md  # 古い情報
/.serena/memories/project_overview.md             # 古い情報  
/.serena/memories/*                               # 過去セッション情報

# 開発中間ファイル
/RESUME_SESSION.md                    # 初期版（更新済み）
/CURRENT_SESSION_HANDOFF.md          # 古いバージョン
```

## 🚫 過去データ混合回避戦略

### **混合リスク箇所：**
1. **古いメモリファイル** - 異なる実装状況の記録
2. **複数バージョンの状況報告** - 矛盾する情報
3. **TODO vs 完了タスクの混同** - 作業重複
4. **2つのフロントエンドプロジェクトの混同** - 実装箇所誤認

### **回避方法：**
```markdown
## AI読み込み優先順位

### Step 1: Core Truth Files (必須)
1. `COMPLETE_PROJECT_STATUS.md` - 最新の100%正確な状況
2. `AI_DEVELOPMENT_FRAMEWORK.md` - 判断フレームワーク
3. `CLAUDE.md` - 開発ルール

### Step 2: Technical Context (環境確認後)
1. Backend health check実行
2. アクティブフロントエンド特定
3. 該当ファイルのみ読み込み

### Step 3: Selective Reference (必要時のみ)
- ユーザー要求に応じて追加ファイル参照
- 常に最新状況ファイルとの整合性確認
```

## 📊 効率的ファイル読み込み戦略

### **段階的読み込みアプローチ：**

#### **Phase 1: Situational Awareness**
```bash
# 必須ファイル（小→大の順）
1. COMPLETE_PROJECT_STATUS.md     # 現状把握
2. AI_DEVELOPMENT_FRAMEWORK.md    # 判断基準  
3. CLAUDE.md (relevant sections)  # 開発ルール
```

#### **Phase 2: Technical Deep Dive**  
```bash
# 環境確認後、必要な技術ファイルのみ
IF backend_running AND frontend_active:
  READ active_frontend_files
  SKIP inactive_frontend_files
  
IF specific_error_occurs:
  READ relevant_log_files
  SKIP general_logs
```

#### **Phase 3: On-Demand Reference**
```bash
# ユーザー要求に応じて
IF user_asks_about_complex_features:
  READ /audion-app/ files
ELSE:
  FOCUS on /audion_new_frontend/
```

## 🔍 ファイル読み込み判断チェックリスト

### **読み込み前確認項目：**
- [ ] このファイルは最新の実装状況を反映しているか？
- [ ] このファイルは現在アクティブなプロジェクト範囲か？
- [ ] このファイルは過去の矛盾する情報を含んでいないか？
- [ ] このファイルは現在の開発方向性に関連するか？

### **読み込み後検証項目：**
- [ ] 取得した情報は COMPLETE_PROJECT_STATUS.md と整合するか？
- [ ] 矛盾する情報がある場合、どちらが正確か特定したか？
- [ ] ユーザーの要求に直接関連する情報か？

## 🎯 AIに与える最適化指示

### **新しいAIセッション開始時の指示例：**
```markdown
あなたは Audion プロジェクトの開発継承AIです。

## 必須実行シーケンス：
1. まず COMPLETE_PROJECT_STATUS.md を読み、現在の100%正確な状況を把握
2. AI_DEVELOPMENT_FRAMEWORK.md で判断基準を理解  
3. 環境ヘルスチェックを実行し、実際の動作状況を確認
4. アクティブなフロントエンド（audion_new_frontend vs audion-app）を特定
5. 該当する実装ファイルのみを読み込み
6. ユーザーに現状報告と方向性確認

## 回避すべき行動：
- 古いメモリファイルの参照
- 非アクティブなプロジェクトファイルの読み込み
- 過去の矛盾する情報に基づく判断
- 完了済みタスクの重複実行

## 品質基準：
- 保守性重視の実装
- 影響範囲の必須確認
- ユーザーはUI/UXテスター、AIは技術実装者
- CLAUDE.md の開発哲学準拠
```

このガイドにより、新しいAIは効率的かつ正確にプロジェクトを継承できます。