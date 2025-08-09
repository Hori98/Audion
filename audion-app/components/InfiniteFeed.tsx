import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import LoadingButton from './LoadingButton';
import PersonalizationService from '../services/PersonalizationService';
import axios from 'axios';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AudioCard {
  id: string;
  title: string;
  summary: string;
  duration: number;
  audio_url?: string;
  articles: any[];
  created_at: string;
  isGenerating?: boolean;
}

interface InfiniteFeedProps {
  onCreateAudio: (articles: any[]) => Promise<string>;
  onRefresh: () => void;
}

export default function InfiniteFeed({ onCreateAudio, onRefresh }: InfiniteFeedProps) {
  const { theme } = useTheme();
  const { playAudio, currentAudio, isPlaying, pauseAudio, resumeAudio } = useAudio();
  const { token } = useAuth();
  const router = useRouter();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioCards, setAudioCards] = useState<AudioCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingContent, setCreatingContent] = useState(false);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    loadInitialContent();
  }, []);

  const loadInitialContent = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // First, try to load existing audio from library
      const libraryResponse = await axios.get(`${API}/audio/library`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10 }
      });

      if (libraryResponse.data && libraryResponse.data.length > 0) {
        // Convert library items to AudioCard format
        const audioCards: AudioCard[] = libraryResponse.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          summary: item.summary || 'AI生成音声コンテンツ',
          duration: item.duration,
          audio_url: item.audio_url,
          articles: item.articles || [],
          created_at: item.created_at,
        }));
        
        setAudioCards(audioCards);
      } else {
        // If no existing audio, show placeholder cards that encourage content creation
        const placeholderCards: AudioCard[] = [
          {
            id: 'placeholder-1',
            title: '新しい音声を作成しましょう',
            summary: 'RSSソースから最新記事を取得して、AIが音声コンテンツを生成します。',
            duration: 0,
            articles: [],
            created_at: new Date().toISOString(),
            isGenerating: false,
          }
        ];
        setAudioCards(placeholderCards);
      }
    } catch (error) {
      console.error('Error loading initial content:', error);
      // Fallback to placeholder
      const placeholderCards: AudioCard[] = [
        {
          id: 'placeholder-1',
          title: '音声を作成してみましょう',
          summary: 'RSSフィードから記事を選択して音声コンテンツを生成できます。',
          duration: 0,
          articles: [],
          created_at: new Date().toISOString(),
          isGenerating: false,
        }
      ];
      setAudioCards(placeholderCards);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < audioCards.length - 1) {
      // Record skip interaction
      const currentCard = audioCards[currentIndex];
      if (currentCard) {
        await PersonalizationService.recordInteraction({
          action: 'skip',
          contentId: currentCard.id,
          contentType: 'audio',
          category: getCategoryFromTitle(currentCard.title),
          timestamp: Date.now(),
        });
      }
      
      setCurrentIndex(currentIndex + 1);
      
      // Load more content when near the end
      if (currentIndex >= audioCards.length - 2) {
        loadMoreContent();
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const loadMoreContent = async () => {
    try {
      const newCard: AudioCard = {
        id: `generated_${Date.now()}`,
        title: 'AIが新しいコンテンツを生成中...',
        summary: 'あなたの興味に基づいて新しい音声コンテンツを作成しています。',
        duration: 0,
        articles: [],
        created_at: new Date().toISOString(),
        isGenerating: true,
      };
      
      setAudioCards(prev => [...prev, newCard]);
      
      // Simulate AI content generation
      setTimeout(async () => {
        const generatedCard: AudioCard = {
          id: `generated_${Date.now()}`,
          title: 'パーソナライズされたニュース',
          summary: 'あなたの興味パターンを学習して作成された、パーソナライズされたニュース音声です。',
          duration: 210,
          articles: [],
          created_at: new Date().toISOString(),
        };
        
        setAudioCards(prev => [...prev.slice(0, -1), generatedCard]);
      }, 3000);
      
    } catch (error) {
      console.error('Error loading more content:', error);
    }
  };

  const getCategoryFromTitle = (title: string): string => {
    if (title.includes('AI') || title.includes('技術')) return 'Technology';
    if (title.includes('経済') || title.includes('市場')) return 'Finance';
    if (title.includes('国際') || title.includes('政治')) return 'Politics';
    return 'General';
  };

  const handlePlay = async (card: AudioCard) => {
    if (card.isGenerating) return;
    
    // If this is a placeholder card, trigger content creation instead
    if (card.id.startsWith('placeholder')) {
      await handleCreateNewContent();
      return;
    }
    
    // Check if audio URL exists
    if (!card.audio_url) {
      Alert.alert('エラー', '音声ファイルが見つかりません');
      return;
    }
    
    // Record play interaction
    await PersonalizationService.recordInteraction({
      action: 'play',
      contentId: card.id,
      contentType: 'audio',
      category: getCategoryFromTitle(card.title),
      timestamp: Date.now(),
    });
    
    if (currentAudio?.id === card.id && isPlaying) {
      pauseAudio();
    } else if (currentAudio?.id === card.id && !isPlaying) {
      resumeAudio();
    } else {
      try {
        await playAudio({
          id: card.id,
          title: card.title,
          url: card.audio_url,
          duration: card.duration
        });
      } catch (error) {
        console.error('Audio playback error:', error);
        Alert.alert('エラー', '音声の再生に失敗しました');
      }
    }
  };

  const handleCreateNewContent = async () => {
    setCreatingContent(true);
    
    try {
      // First, get RSS sources to check if user has any configured
      const sourcesResponse = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!sourcesResponse.data || sourcesResponse.data.length === 0) {
        Alert.alert(
          'RSSソースが必要です',
          '音声コンテンツを作成するには、まずRSSソースを追加してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'ソース管理', onPress: () => {
              router.push('/sources');
            }}
          ]
        );
        return;
      }

      // Get articles from RSS sources
      console.log('Fetching articles from RSS sources...');
      const articlesResponse = await axios.get(`${API}/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 5 }
      });

      console.log('Articles response:', articlesResponse.data);

      if (!articlesResponse.data || articlesResponse.data.length === 0) {
        Alert.alert(
          '記事が見つかりません', 
          'RSSソースから記事を取得できませんでした。ソースを確認するか、記事の更新をお待ちください。',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'ソース確認', onPress: () => router.push('/sources') }
          ]
        );
        return;
      }

      // Show loading feedback
      Alert.alert('音声作成中', '記事から音声を生成しています...しばらくお待ちください');

      // Create audio from recent articles
      const articles = articlesResponse.data.slice(0, 3); // Use first 3 articles
      console.log('Creating audio from articles:', articles.map(a => a.title));
      
      const audioId = await onCreateAudio(articles);
      console.log('Created audio with ID:', audioId);
      
      // Refresh the feed to show new content
      await loadInitialContent();
      
      Alert.alert(
        '作成完了！', 
        '新しい音声コンテンツが作成されました。Recentタブでも確認できます。',
        [
          { text: 'OK', style: 'default' },
          { text: 'Recentへ', onPress: () => {
            // This would ideally switch to the Recent tab
            console.log('Navigate to Recent tab');
          }}
        ]
      );
      
    } catch (error: any) {
      console.error('Error creating new content:', error);
      
      let errorMessage = '新しいコンテンツの作成に失敗しました';
      if (error.response?.status === 429) {
        errorMessage = '音声生成の上限に達しました。しばらくお待ちください。';
      } else if (error.response?.status === 402) {
        errorMessage = 'この機能を使用するにはアップグレードが必要です。';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('エラー', errorMessage);
    } finally {
      setCreatingContent(false);
    }
  };

  const handleShare = (card: AudioCard) => {
    Alert.alert('シェア', `「${card.title}」をシェアしますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'シェア', onPress: () => {
        Alert.alert('シェア完了', 'コンテンツをシェアしました');
      }}
    ]);
  };

  const handleLike = async (card: AudioCard) => {
    try {
      await PersonalizationService.recordInteraction({
        action: 'like',
        contentId: card.id,
        contentType: 'audio',
        category: getCategoryFromTitle(card.title),
        timestamp: Date.now(),
      });
      
      Alert.alert('👍', 'この種類のコンテンツをもっと表示します');
    } catch (error) {
      console.error('Error recording like interaction:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentCard = audioCards[currentIndex];
  const styles = createStyles(theme);

  if (loading && audioCards.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingButton loading={true} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          AIがあなた専用のコンテンツを準備中...
        </Text>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="refresh-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          新しいコンテンツを読み込み中...
        </Text>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.primary }]}
          onPress={onRefresh}
        >
          <Text style={styles.refreshButtonText}>更新</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Indicators */}
      <View style={styles.indicators}>
        {currentIndex > 0 && (
          <TouchableOpacity style={styles.upIndicator} onPress={handlePrevious}>
            <Ionicons name="chevron-up" size={24} color={theme.textMuted} />
            <Text style={[styles.indicatorText, { color: theme.textMuted }]}>前へ</Text>
          </TouchableOpacity>
        )}
        {currentIndex < audioCards.length - 1 && (
          <TouchableOpacity style={styles.downIndicator} onPress={handleNext}>
            <Text style={[styles.indicatorText, { color: theme.textMuted }]}>次へ</Text>
            <Ionicons name="chevron-down" size={24} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.cardContainer}>
        <View style={[styles.audioCard, { backgroundColor: theme.card }]}>
          {/* Content */}
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={3}>
              {currentCard.title}
            </Text>
            
            <Text style={[styles.cardSummary, { color: theme.textSecondary }]} numberOfLines={6}>
              {currentCard.summary}
            </Text>
            
            {!currentCard.isGenerating && (
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={theme.primary} />
                  <Text style={[styles.metaText, { color: theme.primary }]}>
                    {formatDuration(currentCard.duration)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                    今日
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {currentCard.isGenerating || creatingContent ? (
              <View style={styles.generatingAction}>
                <LoadingButton loading={true} size="large" />
                <Text style={[styles.generatingText, { color: theme.textSecondary }]}>
                  {creatingContent ? '音声作成中...' : '生成中...'}
                </Text>
              </View>
            ) : currentCard.id.startsWith('placeholder') ? (
              <>
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: theme.primary }]}
                  onPress={() => handlePlay(currentCard)}
                  disabled={creatingContent}
                >
                  <Ionicons
                    name="add-circle"
                    size={32}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
                
                <View style={styles.sideActions}>
                  <TouchableOpacity
                    style={styles.sideAction}
                    onPress={() => router.push('/sources')}
                  >
                    <Ionicons name="settings-outline" size={24} color={theme.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.sideAction}
                    onPress={onRefresh}
                  >
                    <Ionicons name="refresh-outline" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.playButton, { backgroundColor: theme.primary }]}
                  onPress={() => handlePlay(currentCard)}
                >
                  <Ionicons
                    name={currentAudio?.id === currentCard.id && isPlaying ? "pause" : "play"}
                    size={32}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
                
                <View style={styles.sideActions}>
                  <TouchableOpacity
                    style={styles.sideAction}
                    onPress={() => handleLike(currentCard)}
                  >
                    <Ionicons name="heart-outline" size={24} color={theme.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.sideAction}
                    onPress={() => handleShare(currentCard)}
                  >
                    <Ionicons name="share-outline" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: theme.primary,
                width: `${((currentIndex + 1) / audioCards.length) * 100}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textMuted }]}>
          {currentIndex + 1} / {audioCards.length}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  refreshButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  indicators: {
    position: 'absolute',
    right: 20,
    top: '50%',
    zIndex: 10,
    gap: 40,
    alignItems: 'center',
  },
  upIndicator: {
    alignItems: 'center',
    padding: 8,
  },
  downIndicator: {
    alignItems: 'center',
    padding: 8,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  audioCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: SCREEN_HEIGHT * 0.6,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 32,
  },
  cardSummary: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideActions: {
    gap: 16,
  },
  sideAction: {
    padding: 12,
  },
  generatingAction: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  generatingText: {
    fontSize: 14,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: theme.accent,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
});