# 🎯 フリーミアムプラン変数定義 - 完全版

## 📊 **現在の設定状況**

### 🔍 **発見した設定**

#### `SUBSCRIPTION_PLANS`（行 4656-4697）
```python
SUBSCRIPTION_PLANS = {
    'free': {
        'max_daily_audio_count': 3,
        'max_audio_articles': 3,
        'description': 'Free plan - 3 articles per audio, 3 audios per day'
    },
    'premium': {
        'max_daily_audio_count': 10,
        'max_audio_articles': 15,
        'description': 'Premium plan - 15 articles per audio, 10 audios per day'
    },
    # テストプラン多数...
}
```

#### `base_limits`（行 4185-4195）
```python
base_limits = {
    "free": 1500,
    "basic": 2500, 
    "premium": 4000,
    # テストプラン多数...
}
```

#### `plan_multipliers`（行 4241-4251）
```python
plan_multipliers = {
    "free": 0.8,
    "basic": 1.0, 
    "premium": 1.3,
    # テストプラン多数...
}
```

### ❌ **発見した問題**

1. **BASICプランの不整合**
   - `SUBSCRIPTION_PLANS`に**basicプランが存在しない**
   - しかし`base_limits`と`plan_multipliers`には存在
   - これによりbasicプランユーザーがエラーになる可能性

2. **3つの設定場所での不一致**
   - 記事数制限: `SUBSCRIPTION_PLANS`
   - 音声長制限: `base_limits` 
   - 品質係数: `plan_multipliers`
   - これらが完全に同期していない

---

## 🎯 **推奨フリーミアムプラン定義**

### 📋 **統一されたプラン構成**

```python
UNIFIED_SUBSCRIPTION_PLANS = {
    'free': {
        # 🎵 音声作成制限
        'max_daily_audio_count': 3,        # 1日最大3個の音声
        'max_audio_articles': 3,           # 1音声あたり最大3記事
        
        # 📏 音声品質・長さ制限
        'base_content_limit': 1500,        # 基本文字数制限
        'script_quality_multiplier': 0.8,  # 音声品質係数（free）
        
        # 🚀 機能制限
        'autopick_enabled': True,          # AutoPick利用可能
        'manual_pick_enabled': True,       # ManualPick利用可能
        'schedule_pick_enabled': False,    # スケジュール配信不可
        'voice_options': ['alloy'],        # 音声オプション制限
        'export_formats': ['mp3'],         # エクスポート形式制限
        
        # 📊 その他制限
        'max_sources': 10,                 # RSS源最大10個
        'archive_storage_days': 30,        # アーカイブ保存30日
        'description': 'Free plan - Basic podcast creation with limited features'
    },
    
    'basic': {
        # 🎵 音声作成制限
        'max_daily_audio_count': 5,        # 1日最大5個の音声
        'max_audio_articles': 5,           # 1音声あたり最大5記事
        
        # 📏 音声品質・長さ制限
        'base_content_limit': 2500,        # 基本文字数制限
        'script_quality_multiplier': 1.0,  # 音声品質係数（標準）
        
        # 🚀 機能制限
        'autopick_enabled': True,          # AutoPick利用可能
        'manual_pick_enabled': True,       # ManualPick利用可能
        'schedule_pick_enabled': True,     # スケジュール配信可能
        'voice_options': ['alloy', 'nova'], # 音声オプション増加
        'export_formats': ['mp3', 'm4a'],  # エクスポート形式増加
        
        # 📊 その他制限
        'max_sources': 25,                 # RSS源最大25個
        'archive_storage_days': 90,        # アーカイブ保存90日
        'description': 'Basic plan - Enhanced features with moderate limits'
    },
    
    'premium': {
        # 🎵 音声作成制限
        'max_daily_audio_count': 15,       # 1日最大15個の音声
        'max_audio_articles': 15,          # 1音声あたり最大15記事
        
        # 📏 音声品質・長さ制限
        'base_content_limit': 4000,        # 基本文字数制限
        'script_quality_multiplier': 1.3,  # 音声品質係数（高品質）
        
        # 🚀 機能制限
        'autopick_enabled': True,          # AutoPick利用可能
        'manual_pick_enabled': True,       # ManualPick利用可能
        'schedule_pick_enabled': True,     # スケジュール配信可能
        'voice_options': ['alloy', 'nova', 'shimmer'], # 全音声オプション
        'export_formats': ['mp3', 'm4a', 'wav'], # 全エクスポート形式
        
        # 📊 その他制限
        'max_sources': -1,                 # RSS源無制限
        'archive_storage_days': -1,        # アーカイブ保存無制限
        'description': 'Premium plan - Full features with maximum limits'
    }
}
```

---

## 🔧 **必要な修正箇所**

### 1. **SUBSCRIPTION_PLANSにbasicプラン追加**
```python
# 行 4656-4697の間に追加
'basic': {
    'max_daily_audio_count': 5,
    'max_audio_articles': 5,
    'description': 'Basic plan - 5 articles per audio, 5 audios per day'
},
```

### 2. **全生成方式への統一適用確認**

#### 現在適用されている場所：
- ✅ **AutoPick**: auto-pick エンドポイントで制限チェック
- ✅ **ManualPick**: 通常の /api/audio/create で制限チェック  
- ✅ **InstantMulti**: 新しく統合済み
- ❓ **SchedulePick**: 確認が必要

#### 確認が必要な場所：
- [ ] スケジュール配信機能での制限適用
- [ ] ManualPick UIでの制限表示
- [ ] フロントエンドでの制限表示

---

## 📋 **確認・修正チェックリスト**

### ✅ **必須修正項目**

1. **🔧 BASICプラン追加**
   - `SUBSCRIPTION_PLANS`にbasicプランを追加
   - フロントエンドのプラン選択UIでbasic表示

2. **🔄 設定の一元化**
   - 3つの設定場所の統合検討
   - 設定変更時の一貫性確保

3. **📱 フロントエンド対応**
   - プラン制限の表示
   - 制限到達時のUX改善
   - アップグレード導線

### 🔍 **詳細確認項目**

#### 音声生成方式別の制限適用
- [ ] **AutoPick**: ✅ 適用済み
- [ ] **ManualPick**: ✅ 適用済み  
- [ ] **InstantMulti**: ✅ 適用済み
- [ ] **SchedulePick**: ❓ 要確認

#### フロントエンド制限表示
- [ ] **Home タブ**: プラン制限表示
- [ ] **Feed タブ**: プラン制限表示
- [ ] **Settings**: プラン情報表示
- [ ] **Debug Menu**: プラン変更機能

#### API エンドポイント
- [ ] **制限チェック**: `/api/user/audio-limits/check`
- [ ] **プラン変更**: `/api/user/subscription/update-plan`
- [ ] **利用状況**: `/api/user/subscription`

---

## 🎯 **推奨実装優先順位**

### 🚨 **Priority 1: 緊急修正**
1. BASICプランをSUBSCRIPTION_PLANSに追加
2. BasicプランのDebugMenu対応

### 📊 **Priority 2: 一貫性確保**
1. 3つの設定場所の統合
2. 全生成方式での制限適用確認

### 🎨 **Priority 3: UX改善**
1. フロントエンドでの制限表示
2. アップグレード導線の整備

---

## 💡 **長期的な改善提案**

### 🏗️ **アーキテクチャ改善**
1. **設定の一元管理**: 単一の設定オブジェクトに統合
2. **動的制限**: 時間帯やイベントに応じた制限調整
3. **段階的制限**: 使用量に応じた段階的制限解除

### 📈 **ビジネス機能**
1. **使用量分析**: プラン別の利用パターン分析
2. **自動アップグレード提案**: 制限到達時の自動提案
3. **トライアル機能**: 期間限定での上位プラン体験

この設定により、フリーミアムモデルの一貫性と拡張性が大幅に向上します。