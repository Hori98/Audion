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
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useGlobalAudio } from '../../context/GlobalAudioContext';
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { extractScriptFromAudionXml } from '../../utils/textUtils';
import HorizontalTabs from '../../components/HorizontalTabs';
import UnifiedHeader from '../../components/UnifiedHeader';
import SearchModal from '../../components/SearchModal';
import SchedulePickManager from '../../components/SchedulePickManager';

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
  const { playSound, isCurrentTrack } = useGlobalAudio();
  const [activeTab, setActiveTab] = useState<'playlists' | 'mylist'>('playlists');
  
  const libraryTabs = [
    { id: 'playlists', name: 'プレイリスト' },
    { id: 'mylist', name: 'マイリスト' }
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

  // グローバル音声再生関数
  const handlePlayAudio = async (audioItem: AudioContent) => {
    try {
      if (!audioItem.audio_url) {
        Alert.alert('エラー', '音声ファイルのURLが見つかりません');
        return;
      }

      await playSound({
        id: audioItem.id,
        uri: audioItem.audio_url,
        title: audioItem.title
      });

    } catch (error) {
      console.error('Error playing audio:', error);
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
      const audioContents: AudioContent[] = audioArray.map((item: any) => ({
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
        chapters: item.chapters || []
      }));

      setAudioContent(audioContents);

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
      if (__DEV__) {
        // Using fallback mock data in development
        setAudioContent([
          {
            id: 'mock-1',
            title: 'Mock Audio: Development Test',
            script: 'This is mock data for development purposes',
            audio_url: undefined,
            duration: 300,
            language: 'ja',
            voice_type: 'alloy',
            status: 'completed',
            play_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
        setActiveTab(result.id === 'playlist' ? 'playlists' : 'mylist');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading library...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UnifiedHeader onSearchPress={() => setShowSearchModal(true)} />

      {/* SchedulePick Access Button - 設定で有効時のみ表示 */}
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

      {/* Tab Header */}
      <HorizontalTabs
        tabs={libraryTabs}
        selectedTab={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId as 'playlists' | 'mylist')}
        style={styles.tabHeader}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'playlists' ? (
          <View style={styles.section}>
            {playlists.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyStateTitle}>プレイリストがありません</Text>
                <Text style={styles.emptyStateDescription}>
                  プレイリストを作成してオーディオコンテンツを整理しましょう
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
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>マイオーディオ</Text>
            {audioContent.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎧</Text>
                <Text style={styles.emptyStateTitle}>オーディオコンテンツがありません</Text>
                <Text style={styles.emptyStateDescription}>
                  記事からオーディオを生成してライブラリを構築しましょう
                </Text>
              </View>
            ) : (
              audioContent.map((audio) => (
                <TouchableOpacity key={audio.id} style={styles.audioCard}>
                  <View style={styles.audioHeader}>
                    <View style={styles.audioTitleSection}>
                      <Text style={styles.audioTitle} numberOfLines={2}>
                        {audio.title}
                      </Text>
                      <View style={styles.audioMeta}>
                        <View 
                          style={[styles.statusDot, { backgroundColor: getStatusColor(audio.status) }]} 
                        />
                        <Text style={styles.statusText}>
                          {audio.status === 'processing' ? 'Generating...' : 
                           audio.status === 'completed' ? 'Ready' : 'Failed'}
                        </Text>
                        {audio.duration > 0 && (
                          <Text style={styles.duration}>
                            • {formatDuration(audio.duration)}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    {audio.status === 'completed' && (
                      <View style={styles.audioActions}>
                        <TouchableOpacity 
                          style={styles.playButton}
                          onPress={() => handlePlayAudio(audio)}
                        >
                          <Text style={styles.playButtonText}>
                            {isCurrentTrack(audio.id) ? '⏸️' : '▶️'}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.detailButton}
                          onPress={() => {
                            setSelectedAudio(audio);
                            setShowAudioDetailModal(true);
                          }}
                        >
                          <Text style={styles.detailButtonText}>⋯</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.audioFooter}>
                    <Text style={styles.audioVoice}>
                      Voice: {audio.voice_type} • {audio.language.toUpperCase()}
                    </Text>
                    <Text style={styles.playCount}>
                      {audio.play_count} plays
                    </Text>
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
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>タイトル</Text>
                <Text style={styles.detailText}>{selectedAudio.title}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>脚本</Text>
                <ScrollView style={styles.scriptContainer}>
                  <Text style={styles.scriptText}>
                    {selectedAudio.script ? extractScriptFromAudionXml(selectedAudio.script) : '脚本が利用できません'}
                  </Text>
                </ScrollView>
              </View>

              {/* 元記事リンク表示 */}
              {selectedAudio.chapters && selectedAudio.chapters.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>元記事リンク</Text>
                  {selectedAudio.chapters.map((chapter, index) => (
                    <TouchableOpacity
                      key={chapter.id || index}
                      style={styles.linkItem}
                      onPress={() => {
                        // URL取得の優先順位を調整
                        const url = chapter.originalUrl || chapter.original_url || chapter.url || chapter.link;
                        console.log('WebView URL:', { chapter, url }); // デバッグ用
                        if (url && url.length > 0) {
                          setSelectedUrl(url);
                          setShowWebView(true);
                        } else {
                          console.error('No URL found in chapter:', chapter);
                          Alert.alert('エラー', 'リンクが見つかりません');
                        }
                      }}
                    >
                      <View style={styles.linkContent}>
                        <Text style={styles.linkTitle} numberOfLines={2}>
                          {chapter.title || `記事 ${index + 1}`}
                        </Text>
                        <Text style={styles.linkUrl} numberOfLines={1}>
                          {(chapter.originalUrl || chapter.original_url || chapter.url || chapter.link || '').replace(/^https?:\/\//, '')}
                        </Text>
                      </View>
                      <Text style={styles.linkArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>音声情報</Text>
                <Text style={styles.detailText}>
                  時間: {formatDuration(selectedAudio.duration)}{'\n'}
                  音声: {selectedAudio.voice_type}{'\n'}
                  言語: {selectedAudio.language.toUpperCase()}{'\n'}
                  再生回数: {selectedAudio.play_count}回
                </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  // Audio Card Styles
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
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888888',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#dddddd',
    lineHeight: 24,
  },
  scriptContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    maxHeight: 300,
  },
  scriptText: {
    fontSize: 15,
    color: '#dddddd',
    lineHeight: 22,
  },
  linkButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Link Item Styles
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  linkContent: {
    flex: 1,
    marginRight: 12,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    color: '#888888',
  },
  linkArrow: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
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
});
