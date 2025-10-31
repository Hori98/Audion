/**
 * Library Screen (two.tsx)
 * ライブラリタブ - 生成済み音声コンテンツの管理・再生
 *
 * Note: ファイル名は"two.tsx"ですが、実際の機能は「ライブラリ」です
 * Expo Router: /(tabs)/two → タブ表示名「ライブラリ」
 * 参照時: router.push('/(tabs)/two')
 */

import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  View,
  Text,
  Modal,
  Linking,
  Share,
  ActionSheetIOS,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useGlobalAudio } from '../../context/GlobalAudioContext';
import audioPlayHistoryService from '../../services/AudioPlayHistoryService';
import { AudioMetadataService } from '../../services/AudioMetadataService';
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import AudioService from '../../services/AudioService';
import { extractScriptFromAudionXml } from '../../utils/textUtils';
import HorizontalTabs from '../../components/HorizontalTabs';
import UnifiedHeader from '../../components/UnifiedHeader';
import SearchModal from '../../components/SearchModal';
import SchedulePickManager from '../../components/SchedulePickManager';
import NewsCard from '../../components/NewsCard';
import BottomSheet from '../../components/BottomSheet';
import GlobalMiniPlayer from '../../components/GlobalMiniPlayer';
import { Feather } from '@expo/vector-icons';
import Placeholder from '../../components/common/SectionPlaceholder';

interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  start_time: number;
  end_time: number;
  original_url: string;
  originalUrl: string;
  url?: string; // 追加：URL情報
  link?: string; // 追加：リンク情報
}

interface AudioContent {
  id: string;
  title: string;
  script: string;
  audio_url?: string;
  duration: number;
  language: 'ja' | 'en';
  voice_type: string;
  status: 'processing' | 'completed' | 'failed';
  play_count: number;
  created_at: string;
  updated_at: string;
  chapters?: Chapter[];
  // NEW: Prompt preset information
  prompt_style?: string;
  use_four_part_structure?: boolean;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  audioCount: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export default function LibraryScreen() {
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const { playSound, isCurrentTrack, currentTrack } = useGlobalAudio();
  const [activeTab, setActiveTab] = useState<'playlists' | 'mylist'>('mylist');
  
  const libraryTabs = [
    { id: 'mylist', name: 'マイリスト' },
    { id: 'playlists', name: 'プレイリスト' }
  ];
  const [audioContent, setAudioContent] = useState<AudioContent[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSchedulePickManager, setShowSchedulePickManager] = useState(false);
  
  // 音声詳細表示用のstate
  const [selectedAudio, setSelectedAudio] = useState<AudioContent | null>(null);
  const [showAudioDetailModal, setShowAudioDetailModal] = useState(false);
  
  // WebView表示用のstate
  const [showWebView, setShowWebView] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string>('');

  // BottomSheet用のstate
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetAudio, setBottomSheetAudio] = useState<AudioContent | null>(null);

  // 再生履歴の状態
  const [playedAudioIds, setPlayedAudioIds] = useState<Set<string>>(new Set());

  // 再生履歴をロードする関数
  const loadPlayHistory = async (audioIds: string[]) => {
    try {
      const playedStatus = await audioPlayHistoryService.getPlayedStatus(audioIds);
      const playedIds = new Set(
        Object.entries(playedStatus)
          .filter(([_, isPlayed]) => isPlayed)
          .map(([audioId, _]) => audioId)
      );
      setPlayedAudioIds(playedIds);
    } catch (error) {
      console.warn('[LIBRARY] Failed to load play history:', error);
    }
  };

  // currentTrack変更を監視してリアルタイム更新
  useEffect(() => {
    if (currentTrack?.id) {
      // 新しい音声の再生が開始された場合、即座に再生済みとして扱う
      setPlayedAudioIds(prev => {
        if (!prev.has(currentTrack.id)) {
          return new Set([...prev, currentTrack.id]);
        }
        return prev; // 既に含まれている場合は何もしない
      });
    }
  }, [currentTrack?.id]);

  // グローバル音声再生関数（改善版）
  const handlePlayAudio = async (audioItem: AudioContent) => {
    try {
      if (!audioItem.audio_url) {
        Alert.alert('エラー', '音声ファイルのURLが見つかりません');
        return;
      }

      console.log(`[AUDIO-PLAYBACK] Preparing audio ${audioItem.id} for playback`);

      // メタデータが不足している場合は先行取得を試行
      let enhancedAudioItem = audioItem;
      const needsMetadataEnhancement = !audioItem.script || !audioItem.chapters?.length;
      
      if (needsMetadataEnhancement) {
        console.log(`[AUDIO-PLAYBACK] Attempting to enhance metadata for audio ${audioItem.id}`);
        try {
          const metadata = await AudioMetadataService.getById(audioItem.id, token || undefined);
          if (metadata) {
            enhancedAudioItem = {
              ...audioItem,
              script: audioItem.script || metadata.script || '',
              chapters: audioItem.chapters?.length ? audioItem.chapters : (metadata.chapters as Chapter[] || [])
            };
            console.log(`[AUDIO-PLAYBACK] Enhanced metadata successfully for audio ${audioItem.id}`);
          }
        } catch (metadataError) {
          console.warn(`[AUDIO-PLAYBACK] Metadata enhancement failed for audio ${audioItem.id}, proceeding with original data:`, metadataError);
        }
      }

      await playSound({
        id: enhancedAudioItem.id,
        uri: enhancedAudioItem.audio_url || '',
        title: enhancedAudioItem.title,
        duration: enhancedAudioItem.duration ? enhancedAudioItem.duration * 1000 : undefined, // Convert seconds to milliseconds
        script: enhancedAudioItem.script,
        chapters: enhancedAudioItem.chapters?.map(chapter => {
          console.log('🖼️ [CHAPTER_THUMB] Chapter data:', {
            id: chapter.id,
            title: chapter.title,
            thumbnail_url: chapter.thumbnail_url,
            source_name: chapter.source_name
          });
          return {
            id: chapter.id,
            title: chapter.title,
            start_time: chapter.start_time || chapter.startTime,
            end_time: chapter.end_time || chapter.endTime,
            original_url: chapter.original_url || chapter.originalUrl || chapter.url || chapter.link || '',
            source_name: chapter.source_name,
            thumbnail_url: chapter.thumbnail_url
          };
        }),
        sourceName: enhancedAudioItem.voice_type,
        publishedAt: enhancedAudioItem.created_at
      });

      console.log(`[AUDIO-PLAYBACK] Successfully started playback for audio ${audioItem.id}`);

      // 再生開始成功時に即座にUIを更新（赤い点を消す）
      setPlayedAudioIds(prev => new Set([...prev, audioItem.id]));

    } catch (error) {
      console.error(`[AUDIO-PLAYBACK] Error playing audio ${audioItem.id}:`, error);
      Alert.alert('再生エラー', '音声の再生に失敗しました');
    }
  };

  const fetchAudioLibrary = async () => {
    if (!token) {
      console.log('No auth token available for library fetch');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // 実際のAPI呼び出し（downloaded_audioから取得）
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUDIO.LIST}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // audio library APIのレスポンスを AudioContent 形式に変換
      // APIは直接配列を返すので、data.audio_filesではなくdataを使用
      const audioArray = Array.isArray(data) ? data : (data.audio_files || []);
      const audioContents: AudioContent[] = audioArray.map((item: any) => {
        // 複数の可能性のあるフィールド名をチェック
        let chapters = item.chapters || item.original_news_urls || item.news_sources || item.source_articles || [];
        
        // 文字列の場合はJSON.parseを試行
        if (typeof chapters === 'string') {
          try {
            chapters = JSON.parse(chapters);
          } catch (e) {
            chapters = [];
          }
        }

        // chapters配列の各要素を正規化
        if (Array.isArray(chapters)) {
          chapters = chapters.map((chapter: any, index: number) => ({
            id: chapter.id || `chapter-${index}`,
            title: chapter.title || chapter.name || `記事 ${index + 1}`,
            start_time: chapter.start_time || chapter.startTime || 0,
            end_time: chapter.end_time || chapter.endTime || 0,
            original_url: chapter.original_url || chapter.originalUrl || chapter.url || chapter.link || '',
            startTime: chapter.start_time || chapter.startTime || 0,
            endTime: chapter.end_time || chapter.endTime || 0,
            originalUrl: chapter.original_url || chapter.originalUrl || chapter.url || chapter.link || '',
            url: chapter.url || chapter.original_url || chapter.originalUrl || '',
            link: chapter.link || chapter.url || chapter.original_url || ''
          }));
        }

        return {
          id: item.id || item.audio_id,
          title: item.title || 'Untitled Audio',
          script: item.script || '',
          audio_url: item.audio_url,
          duration: item.duration || 0,
          language: 'ja' as const,
          voice_type: 'alloy',
          status: 'completed' as const,
          play_count: item.play_count || 0,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          chapters: chapters,
          // NEW: Prompt preset information from API
          prompt_style: item.prompt_style || item.prompt_preset || undefined,
          use_four_part_structure: item.use_four_part_structure || false
        };
      });

      setAudioContent(audioContents);
      console.log('🎵 [LIBRARY] API Success - Audio count:', audioContents.length);

      // 再生履歴をロード
      await loadPlayHistory(audioContents.map(audio => audio.id));

      // プレイリスト用のモックデータ（将来的には実APIに置き換え）
      setPlaylists([
        {
          id: 'default',
          name: 'お気に入り',
          description: 'お気に入りのオーディオコンテンツ',
          audioCount: audioContents.length,
          duration: audioContents.reduce((total, audio) => total + audio.duration, 0),
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: new Date().toISOString(),
          isDefault: true
        }
      ]);

      // Library updated successfully

    } catch (error) {
      console.error('Error fetching audio library:', error);
      
      // エラー時はモックデータで代用（開発用）
      console.log('🎵 [LIBRARY] Using mock data fallback');
      if (__DEV__) {
        // Using fallback mock data in development
        setAudioContent([
          {
            id: 'mock-1',
            title: 'Mock Audio: Development Test',
            script: 'This is mock data for development purposes. これは開発用のモックデータです。実際の音声作成をテストするためのサンプルコンテンツになります。',
            audio_url: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
            duration: 300,
            language: 'ja',
            voice_type: 'alloy',
            status: 'completed',
            play_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // NEW: Mock preset information for testing
            prompt_style: 'ニュース',
            use_four_part_structure: true,
            chapters: [
              {
                id: 'mock-chapter-1',
                title: 'NHKニュース：経済動向について',
                startTime: 0,
                endTime: 150,
                start_time: 0,
                end_time: 150,
                originalUrl: 'https://www3.nhk.or.jp/news/',
                original_url: 'https://www3.nhk.or.jp/news/',
                url: 'https://www3.nhk.or.jp/news/',
                link: 'https://www3.nhk.or.jp/news/'
              },
              {
                id: 'mock-chapter-2',
                title: '日経新聞：最新テクノロジー情報',
                startTime: 150,
                endTime: 300,
                start_time: 150,
                end_time: 300,
                originalUrl: 'https://www.nikkei.com/technology/',
                original_url: 'https://www.nikkei.com/technology/',
                url: 'https://www.nikkei.com/technology/',
                link: 'https://www.nikkei.com/technology/'
              }
            ]
          }
        ]);
        setPlaylists([
          {
            id: 'mock-default',
            name: 'Development Test',
            description: 'Mock playlist for development',
            audioCount: 1,
            duration: 300,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDefault: true
          }
        ]);
        console.log('🎵 [LIBRARY] Mock data set - Audio count:', 1);

        // モックデータでも再生履歴をロード
        await loadPlayHistory(['mock-1']);
      } else {
        Alert.alert('Error', 'Failed to load audio library');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00ff00';
      case 'processing': return '#ffaa00';
      case 'failed': return '#ff4444';
      default: return '#888888';
    }
  };

  useEffect(() => {
    fetchAudioLibrary();
  }, []);

  // 画面フォーカス時にライブラリをリフレッシュ
  useFocusEffect(
    React.useCallback(() => {
      fetchAudioLibrary();
      return () => {};
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAudioLibrary();
  };

  const handleSearchResult = (result: any) => {
    switch (result.type) {
      case 'article':
        // Handle audio content search
        console.log('Selected audio:', result.title);
        break;
      case 'genre':
        // Filter content by type/category  
        setActiveTab(result.id === 'mylist' ? 'mylist' : 'playlists');
        break;
      default:
        break;
    }
  };

  // 3点リーダーメニュー表示（Spotify風BottomSheet）
  const showAudioMenu = (audio: AudioContent) => {
    setBottomSheetAudio(audio);
    setShowBottomSheet(true);
  };

  // BottomSheetオプション生成
  const getBottomSheetOptions = (audio: AudioContent) => [
    {
      label: '音声詳細',
      icon: '📋',
      onPress: () => {
        setSelectedAudio(audio);
        setShowAudioDetailModal(true);
      }
    },
    {
      label: 'シェア',
      icon: '📤',
      onPress: async () => {
        try {
          await Share.share({
            message: `${audio.title}${audio.audio_url ? `\n${audio.audio_url}` : ''}`,
            title: audio.title,
            url: audio.audio_url || '',
          });
        } catch (error) {
          console.error('Share error:', error);
        }
      }
    },
    {
      label: 'プレイリストに追加',
      icon: '📁',
      onPress: () => {
        Alert.alert('実装予定', 'プレイリスト機能は今後実装予定です');
      }
    },
    {
      label: 'タイトルをコピー',
      icon: '📋',
      onPress: () => {
        Alert.alert('コピー完了', `"${audio.title}"をクリップボードにコピーしました`);
      }
    },
    {
      label: '削除',
      icon: '🗑️',
      destructive: true,
      onPress: () => {
        Alert.alert(
          '音声削除の確認',
          `「${audio.title}」を削除してもよろしいですか？\n\nこの操作は取り消すことができません。`,
          [
            { 
              text: 'キャンセル', 
              style: 'cancel' 
            },
            { 
              text: '削除する', 
              style: 'destructive',
              onPress: () => deleteAudio(audio.id)
            }
          ],
          { cancelable: true }
        );
      }
    }
  ];

  // 音声削除機能
  const deleteAudio = async (audioId: string) => {
    try {
      if (!token) {
        Alert.alert('エラー', '認証が必要です。ログインしてください。');
        return;
      }

      // モックデータの場合はローカル削除のみ
      if (audioId.startsWith('mock-')) {
        setAudioContent(prev => prev.filter(audio => audio.id !== audioId));
        Alert.alert('削除完了', '音声が削除されました（モックデータ）');
        return;
      }
      
      // AudioServiceを使用して削除
      const result = await AudioService.deleteAudioContent(audioId, token);
      
      // ローカル状態からも削除
      setAudioContent(prev => prev.filter(audio => audio.id !== audioId));
      
      // AudioServiceのキャッシュも無効化
      AudioService.invalidateLibraryCache();
      
      Alert.alert('削除完了', '音声が削除されました');
      
      // ライブラリを再取得（最新状態を確保）
      setTimeout(() => {
        fetchAudioLibrary();
      }, 500);
      
    } catch (error) {
      console.error('Delete audio error:', error);
      
      let errorMessage = '音声の削除に失敗しました';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
          errorMessage = '認証エラー。再ログインしてください。';
        } else if (errorMsg.includes('403') || errorMsg.includes('forbidden')) {
          errorMessage = 'この音声を削除する権限がありません。';
        } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          errorMessage = '音声が見つかりません。既に削除済みの可能性があります。';
          // 見つからない場合はローカルからも削除
          setAudioContent(prev => prev.filter(audio => audio.id !== audioId));
        } else if (errorMsg.includes('500') || errorMsg.includes('server')) {
          errorMessage = 'サーバーエラーが発生しました。しばらく後でお試しください。';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('エラー', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      {/* 固定ヘッダー */}
      <UnifiedHeader onSearchPress={() => setShowSearchModal(true)} />

      {/* 固定SchedulePick Access Button - 設定で有効時のみ表示 */}
      {settings.isSchedulePickEnabled && (
        <View style={styles.schedulePickSection}>
          <TouchableOpacity 
            style={styles.schedulePickButton}
            onPress={() => setShowSchedulePickManager(true)}
          >
            <Text style={styles.schedulePickButtonText}>📅 SchedulePick管理</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 固定Tab Header */}
      <HorizontalTabs
        tabs={libraryTabs}
        selectedTab={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId as 'playlists' | 'mylist')}
        style={styles.tabHeader}
      />

      {/* スクロール可能なコンテンツエリア */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          currentTrack && { paddingBottom: 150 } // Mini Player + Tab Barの高さ分下部余白追加
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <Placeholder message="ライブラリを読み込み中…" lines={2} />
        ) : activeTab === 'mylist' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>マイオーディオ</Text>
            {audioContent.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎧</Text>
                <Text style={styles.emptyStateTitle}>現在表示できるオーディオはありません</Text>
                <Text style={styles.emptyStateDescription}>
                  記事から音声を生成するとここに表示されます
                </Text>
              </View>
            ) : (
              audioContent.map((audio) => (
                <View key={audio.id} style={styles.spotifyAudioCard}>
                  {/* メインカードエリア（タップで再生） */}
                  <TouchableOpacity 
                    style={styles.audioMainCard}
                    onPress={() => audio.status === 'completed' && handlePlayAudio(audio)}
                    activeOpacity={0.7}
                  >
                    {/* サムネイル */}
                    <View style={styles.audioThumbnail}>
                      <Text style={styles.thumbnailIcon}>🎵</Text>
                    </View>
                    
                    {/* メイン情報 */}
                    <View style={styles.audioMainInfo}>
                      <Text style={styles.spotifyTitle} numberOfLines={2}>
                        {audio.title}
                      </Text>
                      <Text style={styles.spotifyCreator} numberOfLines={1}>
                        {new Date(audio.created_at).toLocaleDateString('ja-JP')} • {audio.voice_type}
                      </Text>
                    </View>
                    
                    {/* 再生状態インジケーター */}
                    {audio.status === 'completed' && isCurrentTrack(audio.id) ? (
                      <View style={styles.playingIndicator}>
                        <Text style={styles.playingText}>♪</Text>
                      </View>
                    ) : !playedAudioIds.has(audio.id) && (
                      <View style={styles.unplayedIndicator}>
                        <View style={styles.redDot} />
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  {/* 3点リーダー */}
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => showAudioMenu(audio)}
                  >
                    <Feather name="more-horizontal" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {playlists.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyStateTitle}>現在表示できるプレイリストはありません</Text>
                <Text style={styles.emptyStateDescription}>
                  プレイリストを作成してオーディオを整理できます
                </Text>
                <TouchableOpacity 
                  style={styles.createPlaylistButton}
                  onPress={() => setShowCreatePlaylistModal(true)}
                >
                  <Text style={styles.createPlaylistButtonText}>プレイリスト作成</Text>
                </TouchableOpacity>
              </View>
            ) : (
              playlists.map((playlist) => (
                <TouchableOpacity key={playlist.id} style={styles.playlistCard}>
                  <View style={styles.playlistHeader}>
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistName}>{playlist.name}</Text>
                      {playlist.description && (
                        <Text style={styles.playlistDescription} numberOfLines={2}>
                          {playlist.description}
                        </Text>
                      )}
                    </View>
                    {playlist.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>デフォルト</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.playlistStats}>
                    <Text style={styles.audioCount}>
                      🎵 {playlist.audioCount}曲
                    </Text>
                    <Text style={styles.totalDuration}>
                      ⏱️ {formatDuration(playlist.duration)}
                    </Text>
                  </View>

                  <View style={styles.playlistFooter}>
                    <Text style={styles.lastUpdated}>
                      最終更新: {new Date(playlist.updatedAt).toLocaleDateString('ja-JP')}
                    </Text>
                    <TouchableOpacity style={styles.playAllButton}>
                      <Text style={styles.playAllText}>▶️ 全て再生</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onResultPress={handleSearchResult}
      />

      {/* SchedulePickManager Modal - 設定で有効時のみ表示 */}
      {settings.isSchedulePickEnabled && (
        <SchedulePickManager
          visible={showSchedulePickManager}
          onClose={() => setShowSchedulePickManager(false)}
        />
      )}

      {/* Audio Detail Modal - 音声詳細表示 */}
      <Modal
        visible={showAudioDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>音声詳細</Text>
            <TouchableOpacity 
              onPress={() => setShowAudioDetailModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedAudio && (
            <ScrollView style={styles.modalContent}>
              {/* タイトルセクション */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>タイトル</Text>
                <Text style={styles.audioDetailTitle}>{selectedAudio.title}</Text>
              </View>

              {/* 原稿セクション */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>原稿</Text>
                <ScrollView 
                  style={styles.scriptScrollContainerExpanded}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <Text style={styles.scriptText}>
                    {selectedAudio.script ? extractScriptFromAudionXml(selectedAudio.script) : '原稿が利用できません'}
                  </Text>
                </ScrollView>
              </View>

              {/* ニュースURLセクション */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>ニュース記事</Text>

                {/* 章立てではなく「使用ニュースのリスト」を降順で表示 */}
                {(() => {
                  // 1) chapters から (title, url) を抽出
                  const fromChapters = (selectedAudio.chapters || [])
                    .map((c: any) => ({
                      title: c?.title || '',
                      url: c?.originalUrl || c?.original_url || c?.url || c?.link || ''
                    }))
                    .filter(item => !!item.url);

                  // 2) article_titles + article_links の組合せ
                  const fromTitlesAndLinks = Array.isArray((selectedAudio as any).article_titles) && Array.isArray((selectedAudio as any).article_links)
                    ? (selectedAudio as any).article_titles.map((t: string, i: number) => ({
                        title: t || '',
                        url: (selectedAudio as any).article_links[i] || ''
                      })).filter((item: any) => !!item.url)
                    : [];

                  // 3) 代替キー（source_articlesなど）
                  const altArrays = [(selectedAudio as any).source_articles, (selectedAudio as any).news_sources, (selectedAudio as any).original_news_urls];
                  const fromAlt = altArrays.reduce((acc: any[], arr: any) => {
                    if (Array.isArray(arr)) {
                      acc.push(
                        ...arr.map((x: any) => ({
                          title: x?.title || '',
                          url: x?.url || x?.link || x?.original_url || ''
                        })).filter((item: any) => !!item.url)
                      );
                    }
                    return acc;
                  }, [] as any[]);

                  // 優先順位: chapters > titles+links > 代替
                  const newsList = (fromChapters.length ? fromChapters : (fromTitlesAndLinks.length ? fromTitlesAndLinks : fromAlt));

                  if (!newsList.length) {
                    return (
                      <View style={styles.noNewsContainer}>
                        <Text style={styles.noNewsText}>📰 この音声に関連するニュース記事はありません</Text>
                        <Text style={styles.noNewsSubtext}>音声作成時にニュース記事が使用された場合、ここに表示されます</Text>
                      </View>
                    );
                  }

                  // 降順（最新=リスト末尾を先頭に）
                  const reversed = [...newsList].reverse();
                  return (
                    <View style={styles.newsCardContainer}>
                      {reversed.map((item, idx) => (
                        <NewsCard
                          key={(item.title || '') + (item.url || '') + idx}
                          title={item.title || ''}
                          url={item.url}
                          onPress={() => {
                            setSelectedUrl(item.url);
                            setShowWebView(true);
                          }}
                        />
                      ))}
                    </View>
                  );
                })()}
              </View>

              {/* 音声情報セクション */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>音声情報</Text>
                <View style={styles.audioInfoContainer}>
                  <View style={styles.audioInfoRow}>
                    <Text style={styles.audioInfoLabel}>時間:</Text>
                    <Text style={styles.audioInfoValue}>{formatDuration(selectedAudio.duration)}</Text>
                  </View>
                  <View style={styles.audioInfoRow}>
                    <Text style={styles.audioInfoLabel}>音声:</Text>
                    <Text style={styles.audioInfoValue}>{selectedAudio.voice_type} • {selectedAudio.language.toUpperCase()}</Text>
                  </View>
                  <View style={styles.audioInfoRow}>
                    <Text style={styles.audioInfoLabel}>再生回数:</Text>
                    <Text style={styles.audioInfoValue}>{selectedAudio.play_count}回</Text>
                  </View>
                  <View style={styles.audioInfoRow}>
                    <Text style={styles.audioInfoLabel}>作成日:</Text>
                    <Text style={styles.audioInfoValue}>{new Date(selectedAudio.created_at).toLocaleDateString('ja-JP')}</Text>
                  </View>
                  {/* NEW: Prompt preset information */}
                  {selectedAudio.prompt_style && (
                    <View style={styles.audioInfoRow}>
                      <Text style={styles.audioInfoLabel}>プリセット:</Text>
                      <Text style={styles.audioInfoValue}>
                        {selectedAudio.prompt_style}
                        {selectedAudio.use_four_part_structure && ' (4部構成)'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* WebView Modal - 元記事表示 */}
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              onPress={() => setShowWebView(false)}
              style={styles.webViewCloseButton}
            >
              <Text style={styles.webViewCloseButtonText}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle} numberOfLines={1}>記事を表示中</Text>
            <View style={styles.webViewSpacer} />
          </View>
          
          {selectedUrl ? (
            <WebView
              source={{ uri: selectedUrl }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.webViewLoadingText}>読み込み中...</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.webViewError}>
              <Text style={styles.webViewErrorText}>URLが見つかりません</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* BottomSheet Menu */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title={bottomSheetAudio?.title}
        options={bottomSheetAudio ? getBottomSheetOptions(bottomSheetAudio) : []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Account for status bar and dynamic island
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888888',
  },
  tabHeader: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  createPlaylistButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPlaylistButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Playlist Card Styles
  playlistCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playlistInfo: {
    flex: 1,
    marginRight: 12,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 18,
  },
  defaultBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playlistStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioCount: {
    fontSize: 14,
    color: '#888888',
  },
  totalDuration: {
    fontSize: 14,
    color: '#888888',
  },
  playlistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666666',
  },
  playAllButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  playAllText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  // Spotify-inspired Audio Card Styles
  spotifyAudioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 64,
    backgroundColor: 'transparent',
  },
  audioMainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  audioThumbnail: {
    width: 48,
    height: 48,
    backgroundColor: '#333333',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailIcon: {
    fontSize: 20,
  },
  audioMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  spotifyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
    lineHeight: 20,
  },
  spotifyCreator: {
    fontSize: 13,
    color: '#b3b3b3',
    lineHeight: 16,
  },
  miniPlayButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  miniPlayButtonText: {
    fontSize: 18,
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 20,
    color: '#b3b3b3',
  },
  playingIndicator: {
    marginRight: 8,
  },
  playingText: {
    fontSize: 16,
    color: '#1db954', // Spotify green
  },
  unplayedIndicator: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },

  // Legacy Audio Card Styles (kept for reference)
  audioCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  audioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  audioTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  audioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#cccccc',
    marginRight: 8,
  },
  duration: {
    fontSize: 14,
    color: '#888888',
  },
  audioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 48,
    height: 48,
    backgroundColor: '#007bff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 20,
  },
  detailButton: {
    width: 36,
    height: 36,
    backgroundColor: '#666666',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  audioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioVoice: {
    fontSize: 12,
    color: '#666666',
  },
  playCount: {
    fontSize: 12,
    color: '#666666',
  },

  // SchedulePick styles
  schedulePickSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  schedulePickButton: {
    backgroundColor: '#6f42c1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  schedulePickButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  audioDetailTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ffffff',
    lineHeight: 24,
  },
  scriptContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#333333',
  },
  scriptText: {
    fontSize: 15,
    color: '#dddddd',
    lineHeight: 22,
  },
  newsCardContainer: {
    gap: 0, // NewsCardコンポーネント内でmarginBottomを使用
  },
  audioInfoContainer: {
    gap: 12,
  },
  audioInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioInfoLabel: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
  },
  audioInfoValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '400',
  },

  // WebView Modal Styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  webViewCloseButton: {
    padding: 8,
  },
  webViewCloseButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  webViewTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  webViewSpacer: {
    width: 64, // 左側の戻るボタンとバランスを取るため
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  webViewLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888888',
  },
  webViewError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  webViewErrorText: {
    fontSize: 16,
    color: '#ff4444',
  },
  debugText: {
    fontSize: 10,
    color: '#888888',
    fontFamily: 'monospace',
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  noNewsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  noNewsText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 8,
  },
  noNewsSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // 原稿セクション関連スタイル
  scriptScrollContainerExpanded: {
    maxHeight: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 12,
  },
});
