import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, SafeAreaView, Modal } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useUnifiedAudio } from '../../context/UnifiedAudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import LoadingIndicator from '../../components/LoadingIndicator';
import SearchBar from '../../components/SearchBar';
import GlobalEventService from '../../services/GlobalEventService';

interface CommunityAudioItem {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  created_at: string;
  summary?: string;
  articles?: any[];
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
  category: 'community' | 'official' | 'trending';
  download_count: number;
  play_count: number;
}

export default function DiscoverScreen() {
  const { token } = useAuth();
  const { state, playTrack } = useUnifiedAudio();
  const { theme } = useTheme();
  
  const [communityAudio, setCommunityAudio] = useState<CommunityAudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'community' | 'official' | 'trending'>('all');
  const [showSearchModal, setShowSearchModal] = useState(false);

  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

  // Global event listener for search modal
  useEffect(() => {
    const eventService = GlobalEventService.getInstance();
    const unsubscribe = eventService.onDiscoverSearchTrigger(() => {
      setShowSearchModal(true);
    });

    return unsubscribe;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchCommunityAudio();
    }, [selectedCategory])
  );

  const fetchCommunityAudio = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Mock data for now - will be replaced with actual API
      const mockData: CommunityAudioItem[] = [
        {
          id: 'comm_1',
          title: '今日のニュースまとめ - AI・テック情報',
          audio_url: 'https://example.com/audio1.mp3',
          duration: 420,
          created_at: new Date().toISOString(),
          summary: '本日のAI・テクノロジー関連のニュースをまとめました。ChatGPT、Google Gemini、Appleの最新動向など。',
          category: 'official',
          creator: {
            id: 'audion_official',
            name: 'Audion運営',
            avatar: undefined
          },
          download_count: 1250,
          play_count: 3400
        },
        {
          id: 'comm_2', 
          title: 'Breaking: 新しいiPhone発表イベント速報',
          audio_url: 'https://example.com/audio2.mp3',
          duration: 180,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          summary: 'Apple Special Eventの速報をお届けします。新しいiPhoneの機能、価格、発売日など。',
          category: 'official',
          creator: {
            id: 'audion_news',
            name: 'Audionニュース',
            avatar: undefined
          },
          download_count: 890,
          play_count: 2100
        },
        {
          id: 'comm_3',
          title: '週末読みたい技術記事5選',
          audio_url: 'https://example.com/audio3.mp3',
          duration: 600,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          summary: 'エンジニア向けの注目記事をピックアップ。React、Python、機械学習の最新トレンド。',
          category: 'community',
          creator: {
            id: 'tech_user_123',
            name: 'テックマニア田中',
            avatar: undefined
          },
          download_count: 567,
          play_count: 1200
        }
      ];
      
      const filteredData = selectedCategory === 'all' 
        ? mockData 
        : mockData.filter(item => item.category === selectedCategory);
      
      setCommunityAudio(filteredData);
    } catch (error) {
      console.error('Error fetching community audio:', error);
      Alert.alert('エラー', 'コミュニティ音声の取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCommunityAudio();
  };

  const handlePlayAudio = async (audio: CommunityAudioItem) => {
    try {
      await playTrack({
        id: audio.id,
        title: audio.title,
        audio_url: audio.audio_url,
        duration: audio.duration,
        created_at: audio.created_at
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('エラー', '音声の再生に失敗しました');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'official': return 'shield-checkmark';
      case 'trending': return 'trending-up';
      case 'community': return 'people';
      default: return 'radio';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'official': return theme.success;
      case 'trending': return theme.warning;
      case 'community': return theme.info;
      default: return theme.primary;
    }
  };

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingIndicator />;
  }

  // Filter audio based on search query
  const filteredAudio = communityAudio.filter(audio => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      audio.title?.toLowerCase().includes(query) ||
      audio.summary?.toLowerCase().includes(query) ||
      audio.creator?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Removed header - moved to main navigation header */}
      
      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        {[
          { key: 'all', label: 'すべて', icon: 'apps' },
          { key: 'official', label: '運営', icon: 'shield-checkmark' },
          { key: 'trending', label: 'トレンド', icon: 'trending-up' },
          { key: 'community', label: 'コミュニティ', icon: 'people' }
        ].map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.key as any)}
          >
            <Ionicons
              name={category.icon as any}
              size={16}
              color={selectedCategory === category.key ? theme.background : theme.text}
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.key && styles.categoryButtonTextActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="compass-outline" size={20} color={theme.primary} />
          <Text style={styles.sectionTitle}>コミュニティと運営の音声コンテンツ</Text>
        </View>

        {filteredAudio.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>
              コンテンツが見つかりません{'\n'}
              別のカテゴリや検索ワードをお試しください
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
                  <View style={styles.titleRow}>
                    <Text style={styles.audioTitle} numberOfLines={2}>
                      {audio.title}
                    </Text>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(audio.category) }]}>
                      <Ionicons
                        name={getCategoryIcon(audio.category) as any}
                        size={12}
                        color={theme.background}
                      />
                    </View>
                  </View>
                  
                  {audio.summary && (
                    <Text style={[styles.audioSummary, { color: theme.textSecondary }]} numberOfLines={2}>
                      {audio.summary}
                    </Text>
                  )}
                  
                  <View style={styles.creatorInfo}>
                    <Ionicons name="person-circle-outline" size={16} color={theme.textSecondary} />
                    <Text style={styles.creatorName}>{audio.creator?.name || 'Unknown'}</Text>
                  </View>
                  
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
                    <View style={styles.metaRow}>
                      <Ionicons name="download-outline" size={12} color={theme.textSecondary} />
                      <Text style={styles.statsText}>{audio.download_count}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="play-outline" size={12} color={theme.textSecondary} />
                      <Text style={styles.statsText}>{audio.play_count}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
          <Text style={styles.infoText}>
            発見タブ：コミュニティ作成コンテンツ・運営による今日のニュース・緊急速報音声を提供します。{'\n'}
            他ユーザーの音声を共有・ダウンロード・再生できます。
          </Text>
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <SafeAreaView style={[styles.searchModal, { backgroundColor: theme.background }]}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity
              onPress={() => setShowSearchModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.searchModalTitle, { color: theme.text }]}>
              音声を検索
            </Text>
            <View style={styles.placeholder} />
          </View>
          
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="音声コンテンツを検索..."
            autoFocus={true}
          />
          
          <ScrollView style={styles.searchResults}>
            {filteredAudio.length === 0 ? (
              <View style={styles.noResults}>
                <Ionicons name="search" size={48} color={theme.textMuted} />
                <Text style={[styles.noResultsText, { color: theme.textMuted }]}>
                  {searchQuery.trim() ? '検索結果がありません' : '検索キーワードを入力してください'}
                </Text>
              </View>
            ) : (
              filteredAudio.slice(0, 10).map((audio) => (
                <TouchableOpacity
                  key={audio.id}
                  style={[styles.searchResultItem, { backgroundColor: theme.surface }]}
                  onPress={() => {
                    setShowSearchModal(false);
                    handlePlayAudio(audio);
                  }}
                >
                  <Text style={[styles.searchResultTitle, { color: theme.text }]} numberOfLines={2}>
                    {audio.title}
                  </Text>
                  <Text style={[styles.searchResultCreator, { color: theme.textSecondary }]}>
                    {audio.creator?.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  // Removed old header styles - now handled by main header
  searchModal: {
    flex: 1,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  searchResultItem: {
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  searchResultCreator: {
    fontSize: 12,
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 68, // Fixed height matching GenreSlideNavigation
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
    height: 44, // Fixed height for consistency with GenreSlideNavigation
    minWidth: 80, // Minimum width for better touch targets
  },
  categoryButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: theme.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
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
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  currentlyPlaying: {
    borderWidth: 2,
    borderColor: theme.primary,
    backgroundColor: theme.accent,
  },
  audioInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  creatorName: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '500',
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
  statsText: {
    fontSize: 12,
    color: theme.textSecondary,
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