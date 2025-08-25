import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useUnifiedAudio } from '../../context/UnifiedAudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import LoadingIndicator from '../../components/LoadingIndicator';
import DownloadButton from '../../components/DownloadButton';
import AudioMetadataService from '../../services/AudioMetadataService';
import SearchBar from '../../components/SearchBar';
import BottomSheetMenu from '../../components/BottomSheetMenu';
import PlaylistService from '../../services/PlaylistService';

interface RecentAudioItem {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  created_at: string;
  summary?: string;
  articles?: any[];
  promptMetadata?: {
    promptMode: string;
    promptStyle: string;
    creationMethod: string;
    customPrompt?: string;
  };
}

export default function PlaylistScreen() {
  const { token } = useAuth();
  const { state, playTrack, togglePlayPause } = useUnifiedAudio();
  const { theme } = useTheme();
  
  const [recentAudio, setRecentAudio] = useState<RecentAudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<RecentAudioItem | null>(null);

  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

  // Initialize PlaylistService with auth token
  React.useEffect(() => {
    if (token) {
      PlaylistService.getInstance().setAuthToken(token);
    }
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      fetchRecentAudio();
    }, [])
  );

  const fetchRecentAudio = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/audio/library`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10 } // Get more items for better experience
      });
      
      const audioItems = response.data || [];
      
      // Load metadata for each audio item
      const audioWithMetadata = await Promise.all(
        audioItems.map(async (audio: RecentAudioItem) => {
          const metadata = await AudioMetadataService.getAudioMetadata(audio.id);
          return {
            ...audio,
            promptMetadata: metadata ? {
              promptMode: metadata.promptMode,
              promptStyle: metadata.promptStyle,
              creationMethod: metadata.creationMethod,
              customPrompt: metadata.customPrompt
            } : undefined
          };
        })
      );
      
      setRecentAudio(audioWithMetadata);
      
      // Clean up metadata for audio items that no longer exist
      const activeAudioIds = audioItems.map((audio: RecentAudioItem) => audio.id);
      await AudioMetadataService.cleanupMetadata(activeAudioIds);
    } catch (error) {
      console.error('Error fetching recent audio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecentAudio();
  };

  const handlePlayAudio = async (audio: RecentAudioItem) => {
    try {
      await playTrack({
        id: audio.id,
        title: audio.title,
        url: audio.audio_url, // AudioTrack uses 'url' not 'audio_url'
        duration: audio.duration,
        created_at: audio.created_at,
        context: 'playlist' // Add context for UI differentiation
      });
      console.log('🎵 Playlist: Started playing:', audio.title);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('エラー', '音声の再生に失敗しました');
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    Alert.alert(
      '削除確認',
      'この音声を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/audio/${audioId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchRecentAudio();
            } catch (error) {
              console.error('Error deleting audio:', error);
              Alert.alert('エラー', '削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingIndicator />;
  }

  // Filter audio based on search query
  const filteredAudio = recentAudio.filter(audio => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      audio.title?.toLowerCase().includes(query) ||
      audio.summary?.toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search audio library..."
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Ionicons name="musical-notes" size={24} color={theme.primary} />
          <Text style={styles.headerTitle}>プレイリスト</Text>
          <Text style={styles.headerSubtitle}>最新10件表示・引き下げで更新</Text>
        </View>

        {filteredAudio.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>
              プレイリストが空です{'\n'}
              フィードから音声を作成してみましょう
            </Text>
          </View>
        ) : (
          <View style={styles.audioList}>
            {filteredAudio.map((audio) => (
              <TouchableOpacity
                key={audio.id}
                style={[
                  styles.audioItem,
                  state.currentTrack?.id === audio.id && styles.currentlyPlaying
                ]}
                onPress={() => handlePlayAudio(audio)}
                activeOpacity={0.7}
              >
                <View style={styles.audioInfo}>
                  <Text style={styles.audioTitle} numberOfLines={2}>
                    {audio.title}
                  </Text>
                  {audio.summary && (
                    <Text style={[styles.audioSummary, { color: theme.textSecondary }]} numberOfLines={2}>
                      {audio.summary}
                    </Text>
                  )}
                  <View style={styles.audioMeta}>
                    <View style={styles.metaRow}>
                      <Ionicons 
                        name={state.currentTrack?.id === audio.id && state.playbackState === 'PLAYING' ? "pause" : "play"} 
                        size={12} 
                        color={theme.primary} 
                      />
                      <Text style={styles.audioDuration}>
                        {formatDuration(audio.duration)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} />
                      <Text style={styles.audioDate}>
                        {format(new Date(audio.created_at), 'MM/dd HH:mm')}
                      </Text>
                    </View>
                    {audio.articles && audio.articles.length > 0 && (
                      <View style={styles.metaRow}>
                        <Ionicons name="newspaper-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.audioDate, { color: theme.textSecondary }]}>
                          {audio.articles.length}記事
                        </Text>
                      </View>
                    )}
                    {audio.promptMetadata && (
                      <View style={styles.metaRow}>
                        <Ionicons name="settings-outline" size={12} color={theme.accent} />
                        <Text style={[styles.promptInfo, { color: theme.accent }]}>
                          {AudioMetadataService.getPromptModeDisplayName(audio.promptMetadata.promptMode, audio.promptMetadata.creationMethod)} • {AudioMetadataService.getPromptStyleDisplayName(audio.promptMetadata.promptStyle)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.actionButtons}>
                  {/* Download Button */}
                  <DownloadButton
                    audioItem={{
                      id: audio.id,
                      title: audio.title,
                      audio_url: audio.audio_url,
                      duration: audio.duration,
                      created_at: audio.created_at
                    }}
                    size="small"
                    showText={false}
                  />
                  
                  {/* 3-Dot Menu Button */}
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent triggering audio play
                      setSelectedAudio(audio);
                      setShowBottomSheet(true);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
          <Text style={styles.infoText}>
            プレイリスト機能：3点リーダーメニューから音声をシェア・管理・ソース表示ができます。{'\n'}
            最新音声を中心とした即消費体験を提供します。
          </Text>
        </View>
      </ScrollView>
      
      {/* Bottom Sheet Menu */}
      {selectedAudio && (
        <BottomSheetMenu
          audioItem={selectedAudio}
          visible={showBottomSheet}
          onClose={() => {
            setShowBottomSheet(false);
            setSelectedAudio(null);
          }}
          playlistId="default"
          onSourcesPress={(audioItem) => {
            // Handle sources press - will show article list modal
            console.log('Show sources for:', audioItem.title);
          }}
          onDeletePress={(audioId) => {
            handleDeleteAudio(audioId);
          }}
        />
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  audioList: {
    gap: 12,
  },
  audioItem: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  currentlyPlaying: {
    borderWidth: 2,
    borderColor: theme.primary,
    backgroundColor: theme.accent,
  },
  audioInfo: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 6,
  },
  audioSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  audioMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audioDuration: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600',
  },
  audioDate: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  promptInfo: {
    fontSize: 11,
    fontWeight: '500',
  },
  menuButton: {
    padding: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.accent,
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },
});