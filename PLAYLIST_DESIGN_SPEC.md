# 🎵 Playlist機能設計仕様書 (2025年1月17日)

## 📋 **基本設計方針**

### 🎯 **目標**
- RecentタブをPlaylistタブに再設計
- 音声カードに3点リーダーメニューを追加
- プレイリスト管理・シェア・ソース表示機能の実装
- ニュースジャンプ機能の統合

### 🔄 **名称変更**
- **変更前**: Recent (最近の音声)
- **変更後**: Playlist (プレイリスト管理)

---

## 🎛️ **3点リーダーメニュー機能仕様**

### **メニュー項目一覧**

#### 1. 🔗 **共有 (Share)**
- **機能**: SNS・メッセージアプリへの音声シェア
- **実装**: React Nativeのシェア機能活用
- **シェア内容**: 音声タイトル・再生リンク・要約
- **対応プラットフォーム**: WhatsApp・Twitter・LINE・Gmail等

#### 2. ➕ **プレイリストに追加 (Add to Playlist)**
- **機能**: 音声を他のプレイリストに追加
- **実装**: 新しいPlaylistServiceで管理
- **UI**: モーダルでプレイリスト選択・新規作成オプション
- **データ**: プレイリスト名・説明・作成日・音声リスト

#### 3. ➖ **このプレイリストから削除 (Remove from Playlist)**
- **機能**: 現在のプレイリストから音声を削除
- **実装**: 確認ダイアログ→削除処理
- **注意**: デフォルトプレイリスト(Recent)では非表示

#### 4. ⏭️ **次に再生に追加 (Add to Queue)**
- **機能**: 再生キューに音声を追加
- **実装**: AudioContextの再生キュー機能拡張
- **UI**: トースト通知で追加確認
- **動作**: 現在再生中の音声の次に配置

#### 5. 👤 **作成ユーザーに移動 (Go to Creator)**
- **機能**: 音声作成者のプロフィール表示
- **実装**: ユーザープロフィール画面への遷移
- **将来対応**: ソーシャル機能・フォロー機能との連携
- **現状**: 作成者情報表示・統計表示

#### 6. 📰 **ソース一覧 (Show Sources)** ⭐️ **ニュースジャンプ機能**
- **機能**: 音声に使用されたニュース記事一覧表示
- **実装**: 統合ニュース表示システムとの連携
- **UI**: モーダルで記事リスト→タップでarticle-detail画面
- **統合箇所**: 
  - FullScreenPlayerの既存ソース一覧機能拡張
  - Home/Feedタブとの統一されたニュース表示

#### 7. 🚨 **Report (報告)**
- **機能**: 不適切コンテンツの報告
- **実装**: 報告理由選択→バックエンドAPI送信
- **カテゴリ**: スパム・不適切コンテンツ・誤読・その他
- **処理**: 管理者通知・自動フィルタリング

---

## 🛠️ **技術実装設計**

### **PlaylistService.ts 新規作成**

```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  audio_ids: string[];
  user_id: string;
  is_public: boolean;
  cover_image?: string;
}

interface PlaylistMenuAction {
  share: (audioItem: RecentAudioItem) => Promise<void>;
  addToPlaylist: (audioItem: RecentAudioItem) => Promise<void>;
  removeFromPlaylist: (audioItem: RecentAudioItem, playlistId: string) => Promise<void>;
  addToQueue: (audioItem: RecentAudioItem) => Promise<void>;
  goToCreator: (audioItem: RecentAudioItem) => Promise<void>;
  showSources: (audioItem: RecentAudioItem) => Promise<void>;
  report: (audioItem: RecentAudioItem) => Promise<void>;
}

class PlaylistService {
  // プレイリスト管理機能
  async createPlaylist(playlist: Omit<Playlist, 'id' | 'created_at' | 'updated_at'>): Promise<Playlist>;
  async getPlaylists(userId: string): Promise<Playlist[]>;
  async addToPlaylist(playlistId: string, audioId: string): Promise<void>;
  async removeFromPlaylist(playlistId: string, audioId: string): Promise<void>;
  
  // 3点リーダーメニュー機能
  async shareAudio(audioItem: RecentAudioItem): Promise<void>;
  async addToQueue(audioItem: RecentAudioItem): Promise<void>;
  async reportContent(audioItem: RecentAudioItem, reason: string): Promise<void>;
}
```

### **AudioContext拡張 (再生キュー機能)**

```typescript
interface AudioQueue {
  current: RecentAudioItem | null;
  queue: RecentAudioItem[];
  history: RecentAudioItem[];
}

// AudioContextに追加
const addToQueue = (audioItem: RecentAudioItem) => {
  setAudioQueue(prev => ({
    ...prev,
    queue: [...prev.queue, audioItem]
  }));
};

const playNext = () => {
  if (audioQueue.queue.length > 0) {
    const nextAudio = audioQueue.queue[0];
    setAudioQueue(prev => ({
      current: nextAudio,
      queue: prev.queue.slice(1),
      history: prev.current ? [...prev.history, prev.current] : prev.history
    }));
    playAudio(nextAudio);
  }
};
```

### **BottomSheetMenuComponent.tsx 新規作成**

```typescript
interface BottomSheetMenuProps {
  audioItem: RecentAudioItem;
  visible: boolean;
  onClose: () => void;
  playlistId?: string; // 現在のプレイリストID
}

const BottomSheetMenu = ({ audioItem, visible, onClose, playlistId }: BottomSheetMenuProps) => {
  const menuItems = [
    { icon: 'share-outline', title: '共有', action: () => PlaylistService.shareAudio(audioItem) },
    { icon: 'add', title: 'プレイリストに追加', action: () => showPlaylistSelector(audioItem) },
    // playlistIdがdefaultでない場合のみ表示
    ...(playlistId !== 'default' ? [{ 
      icon: 'remove', 
      title: 'プレイリストから削除', 
      action: () => PlaylistService.removeFromPlaylist(playlistId, audioItem.id) 
    }] : []),
    { icon: 'add-circle-outline', title: '次に再生', action: () => PlaylistService.addToQueue(audioItem) },
    { icon: 'person-outline', title: '作成者', action: () => navigateToCreator(audioItem) },
    { icon: 'newspaper-outline', title: 'ソース一覧', action: () => showSources(audioItem) },
    { icon: 'flag-outline', title: 'Report', action: () => showReportModal(audioItem) },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen">
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <View style={styles.bottomSheet}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action}>
              <Ionicons name={item.icon} size={24} color={theme.text} />
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
```

---

## 🔗 **統合ニュース表示システム連携**

### **ソース一覧機能の統合**

#### **既存実装箇所**
- ✅ `FullScreenPlayer.tsx`: 音声再生中のソース一覧表示 (596-618行)
- 🔲 `Playlistタブ`: 3点リーダー→ソース一覧 (新規実装)

#### **統合設計**
```typescript
// 統一されたニュースジャンプインターface
interface NewsJumpService {
  openArticle: (
    article: Article, 
    source: 'home' | 'feed' | 'player' | 'playlist'
  ) => void;
}

// PlaylistServiceでの実装
async showSources(audioItem: RecentAudioItem): Promise<void> {
  const articles = audioItem.articles || [];
  
  // 記事一覧モーダル表示
  const articleListModal = new ArticleListModal({
    articles,
    onArticlePress: (article) => NewsJumpService.openArticle(article, 'playlist')
  });
  
  articleListModal.show();
}
```

---

## 📱 **UI/UX設計**

### **Playlistタブレイアウト**

```
┌─────────────────────────────────┐
│ 🎵 Playlist                    │
│ [検索バー                     ] │
├─────────────────────────────────┤
│ 📁 My Playlists                │
│ ├ 📂 Recent (5 audios)         │
│ ├ 📂 Favorites (3 audios)      │
│ └ 📂 Tech News (2 audios)      │
├─────────────────────────────────┤
│ 🎵 [Audio Title 1]        ⋮  │
│    [Source: BBC, CNN]          │
│    [Duration: 15:30]           │
├─────────────────────────────────┤
│ 🎵 [Audio Title 2]        ⋮  │
│    [Source: TechCrunch]        │
│    [Duration: 08:45]           │
└─────────────────────────────────┘
```

### **3点リーダーメニューUI**

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🔗 共有                    │ │
│ │ ➕ プレイリストに追加        │ │
│ │ ➖ プレイリストから削除      │ │
│ │ ⏭️ 次に再生に追加           │ │
│ │ 👤 作成ユーザーに移動        │ │
│ │ 📰 ソース一覧              │ │
│ │ 🚨 Report                  │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

## 🗄️ **データベース設計**

### **Playlists テーブル**

```sql
CREATE TABLE playlists (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id VARCHAR(36) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  cover_image VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### **Playlist_Audio_Items テーブル**

```sql
CREATE TABLE playlist_audio_items (
  id VARCHAR(36) PRIMARY KEY,
  playlist_id VARCHAR(36) NOT NULL,
  audio_id VARCHAR(36) NOT NULL,
  order_index INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (audio_id) REFERENCES audio_files(id) ON DELETE CASCADE,
  UNIQUE KEY unique_playlist_audio (playlist_id, audio_id)
);
```

### **Reports テーブル**

```sql
CREATE TABLE reports (
  id VARCHAR(36) PRIMARY KEY,
  audio_id VARCHAR(36) NOT NULL,
  reporter_user_id VARCHAR(36) NOT NULL,
  reason ENUM('spam', 'inappropriate', 'misreading', 'other') NOT NULL,
  description TEXT,
  status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audio_id) REFERENCES audio_files(id),
  FOREIGN KEY (reporter_user_id) REFERENCES users(id)
);
```

---

## 🚀 **実装フェーズ計画**

### **Phase 1: 基盤実装 (今週)**
1. ✅ PlaylistService.ts 作成
2. ✅ BottomSheetMenuComponent.tsx 作成  
3. ✅ Library.tsx → Playlist.tsx リネーム・拡張
4. ✅ 基本的な3点リーダーメニュー実装

### **Phase 2: 高度機能 (来週)**
1. 🔲 AudioContext再生キュー機能拡張
2. 🔲 プレイリスト管理画面実装
3. 🔲 ソース一覧・ニュースジャンプ統合
4. 🔲 シェア・Report機能実装

### **Phase 3: 最適化 (2週間後)**
1. 🔲 パフォーマンス最適化
2. 🔲 UI/UXブラッシュアップ
3. 🔲 アクセシビリティ対応
4. 🔲 エラーハンドリング強化

---

## 📊 **成功指標**

### **1ヶ月後の目標**
- **プレイリスト作成率**: 新規ユーザーの40%以上
- **3点リーダー利用率**: 全ユーザーの60%以上
- **ソース一覧からの記事閲覧**: 音声視聴者の30%以上
- **シェア機能利用**: 週間アクティブユーザーの20%以上

### **ユーザビリティ指標**
- **プレイリスト管理の直感性**: ユーザーテストで90%以上の理解度
- **3点リーダーメニューの発見性**: 初回利用時の80%以上がメニューを発見
- **ニュースジャンプ利用**: 音声視聴からの記事閲覧率向上

---

**🎯 最終目標**: Audionを単なる音声アプリから「ニュース×音声×プレイリスト」の統合プラットフォームに進化させる

*作成日: 2025年1月17日*  
*設計者: Claude Code*  
*更新予定: 2025年1月24日*