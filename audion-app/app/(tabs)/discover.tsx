import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
} from 'react-native';
// import axios from 'axios'; // Not used in current implementation
import { useAuth } from '../../context/AuthContext';
// import { useAudio } from '../../context/AudioContext'; // Not used in current implementation
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import LoadingIndicator from '../../components/LoadingIndicator';
import LoadingButton from '../../components/LoadingButton';

// const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
// const API = `${BACKEND_URL}/api`; // Not used in current implementation

interface TrendingTopic {
  id: string;
  title: string;
  category: string;
  relevance_score: number;
  article_count: number;
  articles: any[];
}

interface DailyRecommendation {
  id: string;
  title: string;
  description: string;
  articles: any[];
  created_at: string;
}

export default function DiscoverScreen() {
  const { token } = useAuth();
  // const { playAudio } = useAudio(); // Not used in current implementation
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingAudio, setCreatingAudio] = useState<string | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [dailyRecommendations, setDailyRecommendations] = useState<DailyRecommendation[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadDiscoverContent();
    }, []) // loadDiscoverContent is defined inline and stable
  );

  const loadDiscoverContent = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Simulate trending topics and recommendations
      // In real implementation, these would come from backend AI analysis
      const mockTrending: TrendingTopic[] = [
        {
          id: '1',
          title: 'AI技術の最新動向',
          category: 'Technology',
          relevance_score: 0.95,
          article_count: 5,
          articles: []
        },
        {
          id: '2',
          title: '国際情勢アップデート',
          category: 'Politics',
          relevance_score: 0.89,
          article_count: 7,
          articles: []
        },
        {
          id: '3',
          title: '経済市場の動き',
          category: 'Finance',
          relevance_score: 0.84,
          article_count: 4,
          articles: []
        }
      ];

      const mockRecommendations: DailyRecommendation[] = [
        {
          id: '1',
          title: '今日のハイライト',
          description: 'AIが選んだ今日の重要ニュース3選',
          articles: [],
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'テクノロジー特集',
          description: '最新テクノロジートレンドをまとめて',
          articles: [],
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          title: '世界のニュース',
          description: 'グローバルな視点で今日を振り返る',
          articles: [],
          created_at: new Date().toISOString()
        }
      ];

      setTrendingTopics(mockTrending);
      setDailyRecommendations(mockRecommendations);
      
    } catch (error) {
      console.error('Error loading discover content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateFromTrending = async (topic: TrendingTopic) => {
    setCreatingAudio(topic.id);
    
    try {
      // In real implementation, this would fetch articles for the topic
      // and create audio content
      Alert.alert(
        '音声作成',
        `「${topic.title}」の音声を作成中...`,
        [{ text: 'OK', onPress: () => {} }]
      );
      
      // Simulate audio creation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert('完了', '音声が作成されました！');
      
    } catch (error) {
      console.error('Error creating audio from trending:', error);
      Alert.alert('エラー', '音声作成に失敗しました');
    } finally {
      setCreatingAudio(null);
    }
  };

  const handleCreateFromRecommendation = async (recommendation: DailyRecommendation) => {
    setCreatingAudio(recommendation.id);
    
    try {
      Alert.alert(
        '音声作成',
        `「${recommendation.title}」の音声を作成中...`,
        [{ text: 'OK', onPress: () => {} }]
      );
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert('完了', '音声が作成されました！');
      
    } catch (error) {
      console.error('Error creating audio from recommendation:', error);
      Alert.alert('エラー', '音声作成に失敗しました');
    } finally {
      setCreatingAudio(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDiscoverContent();
  };

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="compass-outline" size={28} color={theme.primary} />
          <Text style={styles.headerTitle}>発見</Text>
          <Text style={styles.headerSubtitle}>
            AIが厳選したトレンドと推奨コンテンツ
          </Text>
        </View>

        {/* Option A Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="flash-outline" size={20} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            探索機能で新しい興味を発見。AIが学習してパーソナライズされたコンテンツを提案します。
          </Text>
        </View>

        {/* Trending Topics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>トレンドトピック</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            今話題になっているテーマから音声を作成
          </Text>
          
          <View style={styles.trendingContainer}>
            {trendingTopics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[styles.trendingCard, { backgroundColor: theme.card }]}
                onPress={() => handleCreateFromTrending(topic)}
                disabled={creatingAudio === topic.id}
              >
                <View style={styles.trendingContent}>
                  <View style={styles.trendingHeader}>
                    <Text style={[styles.trendingTitle, { color: theme.text }]} numberOfLines={2}>
                      {topic.title}
                    </Text>
                    <View style={[styles.categoryBadge, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.categoryText, { color: theme.primary }]}>
                        {topic.category}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.trendingMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="newspaper-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        {topic.article_count}記事
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flame-outline" size={14} color={theme.primary} />
                      <Text style={[styles.metaText, { color: theme.primary }]}>
                        {Math.round(topic.relevance_score * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>
                
                {creatingAudio === topic.id ? (
                  <LoadingButton loading={true} size="small" />
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>今日のおすすめ</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            あなたの興味に合わせてAIが厳選
          </Text>
          
          <View style={styles.recommendationsContainer}>
            {dailyRecommendations.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={[styles.recommendationCard, { backgroundColor: theme.card }]}
                onPress={() => handleCreateFromRecommendation(rec)}
                disabled={creatingAudio === rec.id}
              >
                <View style={styles.recommendationContent}>
                  <Text style={[styles.recommendationTitle, { color: theme.text }]}>
                    {rec.title}
                  </Text>
                  <Text style={[styles.recommendationDescription, { color: theme.textSecondary }]}>
                    {rec.description}
                  </Text>
                  
                  <View style={styles.recommendationMeta}>
                    <Text style={[styles.recommendationDate, { color: theme.textMuted }]}>
                      {format(new Date(rec.created_at), 'MM/dd')}
                    </Text>
                  </View>
                </View>
                
                {creatingAudio === rec.id ? (
                  <LoadingButton loading={true} size="small" />
                ) : (
                  <View style={styles.playIcon}>
                    <Ionicons name="play-circle-outline" size={32} color={theme.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Future Features Preview */}
        <View style={[styles.futureCard, { backgroundColor: theme.accent }]}>
          <Ionicons name="sparkles-outline" size={24} color={theme.primary} />
          <View style={styles.futureContent}>
            <Text style={[styles.futureTitle, { color: theme.text }]}>
              Coming Soon
            </Text>
            <Text style={[styles.futureText, { color: theme.textSecondary }]}>
              • パーソナライズされた発見フィード{'\n'}
              • リアルタイム速報通知{'\n'}
              • コンテンツ語り口の選択{'\n'}
              • ユーザー投票によるトピック選択
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 8,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
  },
  trendingContainer: {
    gap: 12,
  },
  trendingCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  trendingContent: {
    flex: 1,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trendingMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  playIcon: {
    marginLeft: 12,
  },
  futureCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    gap: 12,
    alignItems: 'flex-start',
  },
  futureContent: {
    flex: 1,
  },
  futureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  futureText: {
    fontSize: 13,
    lineHeight: 18,
  },
});