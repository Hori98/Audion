import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import LoadingButton from './LoadingButton';
import PersonalizationService from '../services/PersonalizationService';

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
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioCards, setAudioCards] = useState<AudioCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialContent();
  }, []);

  const loadInitialContent = async () => {
    setLoading(true);
    try {
      const mockCards: AudioCard[] = [
        {
          id: '1',
          title: 'AI技術の最新動向',
          summary: '今日のAI関連ニュースをAIがまとめました。機械学習の新しい発見、企業の投資動向、技術革新について3分で解説します。',
          duration: 180,
          articles: [],
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: '経済市場アップデート',
          summary: '株式市場の動向、為替の変化、主要企業の業績について今日の重要ポイントをお伝えします。',
          duration: 165,
          articles: [],
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          title: '国際情勢ハイライト',
          summary: '世界各地の政治・社会情勢の重要な動きを分かりやすく解説。今日知っておくべき国際ニュースです。',
          duration: 195,
          articles: [],
          created_at: new Date().toISOString(),
        }
      ];
      
      setAudioCards(mockCards);
    } catch (error) {
      console.error('Error loading initial content:', error);
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
          url: card.audio_url || `mock://audio/${card.id}`,
          duration: card.duration
        });
      } catch (error) {
        Alert.alert('エラー', '音声の再生に失敗しました');
      }
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
            {currentCard.isGenerating ? (
              <View style={styles.generatingAction}>
                <LoadingButton loading={true} size="large" />
                <Text style={[styles.generatingText, { color: theme.textSecondary }]}>
                  生成中...
                </Text>
              </View>
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