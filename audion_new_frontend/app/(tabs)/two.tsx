import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  View,
  Text
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import HorizontalTabs from '../../components/HorizontalTabs';
import UnifiedHeader from '../../components/UnifiedHeader';

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
  const { user } = useAuth();
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

  const fetchAudioLibrary = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await AudioService.getAudioLibrary();
      // setAudioContent(data.audio_contents);
      
      // Mock audio data
      setAudioContent([
        {
          id: '1',
          title: 'Audio: Understanding React Native Navigation',
          script: 'HOST1: Today we\'re discussing React Native navigation...',
          audio_url: '/path/to/audio1.mp3',
          duration: 480,
          language: 'ja',
          voice_type: 'alloy',
          status: 'completed',
          play_count: 3,
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          title: 'Audio: FastAPI Production Best Practices',
          script: 'HOST1: FastAPI has become increasingly popular...',
          audio_url: undefined,
          duration: 0,
          language: 'ja',
          voice_type: 'alloy',
          status: 'processing',
          play_count: 0,
          created_at: '2024-01-14T14:20:00Z',
          updated_at: '2024-01-14T14:20:00Z'
        }
      ]);

      // Mock playlist data
      setPlaylists([
        {
          id: 'default',
          name: 'お気に入り',
          description: 'お気に入りのオーディオコンテンツ',
          audioCount: 5,
          duration: 3240, // 54 minutes
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z',
          isDefault: true
        },
        {
          id: '1',
          name: 'テクノロジーニュース',
          description: 'IT・テクノロジー関連のニュース音声',
          audioCount: 8,
          duration: 2160, // 36 minutes
          createdAt: '2024-01-12T00:00:00Z',
          updatedAt: '2024-01-14T18:30:00Z'
        },
        {
          id: '2',
          name: '経済・ビジネス',
          description: '経済ニュースとビジネス情報',
          audioCount: 3,
          duration: 1440, // 24 minutes
          createdAt: '2024-01-13T00:00:00Z',
          updatedAt: '2024-01-13T20:15:00Z'
        }
      ]);
    } catch (error) {
      console.error('Error fetching audio library:', error);
      Alert.alert('Error', 'Failed to load audio library');
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchAudioLibrary();
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
      <UnifiedHeader />

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
                      <TouchableOpacity style={styles.playButton}>
                        <Text style={styles.playButtonText}>▶️</Text>
                      </TouchableOpacity>
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
});
