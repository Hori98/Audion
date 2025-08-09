import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import InfiniteFeed from '../../components/InfiniteFeed';
import LoadingIndicator from '../../components/LoadingIndicator';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

export default function FeedScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'infinite' | 'list'>('infinite');

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadFeedData();
      }
    }, [token])
  );

  const loadFeedData = async () => {
    try {
      setLoading(true);
      
      // Load RSS sources for content generation
      const sourcesResponse = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSources(sourcesResponse.data || []);

      // Load articles for list view
      if (viewMode === 'list') {
        const articlesResponse = await axios.get(`${API}/articles`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 20 }
        });
        
        setArticles(articlesResponse.data || []);
      }
      
    } catch (error) {
      console.error('Error loading feed data:', error);
      // Don't show error to user, just log it
    } finally {
      setLoading(false);
    }
  };

  // Reload data when view mode changes
  useEffect(() => {
    if (token) {
      loadFeedData();
    }
  }, [viewMode]);

  const handleCreateAudio = async (articles: any[]): Promise<string> => {
    try {
      // Generate a more meaningful title based on articles
      const today = new Date();
      const timeStr = today.toLocaleString('ja-JP', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      let titlePrefix = '今日のニュース';
      if (articles.length > 0) {
        const categories = articles.map(a => a.category || 'General').filter(Boolean);
        const uniqueCategories = [...new Set(categories)];
        if (uniqueCategories.length === 1) {
          const categoryMap: {[key: string]: string} = {
            'Technology': 'テクノロジー',
            'Finance': '経済',
            'Politics': '政治',
            'Sports': 'スポーツ',
            'Health': '健康',
            'Entertainment': 'エンタメ'
          };
          titlePrefix = categoryMap[uniqueCategories[0]] || uniqueCategories[0];
        }
      }
      
      const response = await axios.post(
        `${API}/audio/create`,
        {
          articles: articles,
          prompt_style: 'standard',
          title: `${titlePrefix} (${timeStr})`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000, // 60 second timeout for AI generation
        }
      );

      return response.data.id;
    } catch (error: any) {
      console.error('Error creating audio:', error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('音声生成がタイムアウトしました。もう一度お試しください。');
      } else if (error.response?.status === 429) {
        throw new Error('生成回数の上限に達しました。しばらくお待ちください。');
      } else if (error.response?.status === 402) {
        throw new Error('この機能を使用するにはアップグレードが必要です。');
      } else {
        throw new Error('音声生成に失敗しました。');
      }
    }
  };

  const handleRefresh = () => {
    loadFeedData();
  };

  const renderArticleItem = (article: any) => (
    <View key={article.id} style={[styles.articleItem, { backgroundColor: theme.card }]}>
      <TouchableOpacity 
        style={styles.articleContent}
        onPress={() => {
          // Open article or add to selection
          console.log('Article tapped:', article.title);
        }}
      >
        <Text style={[styles.articleTitle, { color: theme.text }]} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={[styles.articleSummary, { color: theme.textSecondary }]} numberOfLines={2}>
          {article.summary || 'No summary available'}
        </Text>
        <View style={styles.articleMeta}>
          <Text style={[styles.articleSource, { color: theme.primary }]}>
            {article.source_name || 'Unknown Source'}
          </Text>
          <Text style={[styles.articleDate, { color: theme.textMuted }]}>
            {article.published ? new Date(article.published).toLocaleDateString() : 'Unknown Date'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      {/* View Mode Toggle */}
      <View style={[styles.modeToggle, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            viewMode === 'infinite' && { backgroundColor: theme.primary }
          ]}
          onPress={() => setViewMode('infinite')}
        >
          <Ionicons 
            name="play-circle-outline" 
            size={16} 
            color={viewMode === 'infinite' ? '#fff' : theme.text} 
          />
          <Text style={[
            styles.modeButtonText,
            { color: viewMode === 'infinite' ? '#fff' : theme.text }
          ]}>
            フィード
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modeButton,
            viewMode === 'list' && { backgroundColor: theme.primary }
          ]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons 
            name="list-outline" 
            size={16} 
            color={viewMode === 'list' ? '#fff' : theme.text} 
          />
          <Text style={[
            styles.modeButtonText,
            { color: viewMode === 'list' ? '#fff' : theme.text }
          ]}>
            記事一覧
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'infinite' ? (
        <InfiniteFeed
          onCreateAudio={handleCreateAudio}
          onRefresh={handleRefresh}
        />
      ) : (
        <ScrollView style={styles.articlesList}>
          <View style={styles.articlesHeader}>
            <Text style={[styles.articlesTitle, { color: theme.text }]}>
              最新記事
            </Text>
            <Text style={[styles.articlesSubtitle, { color: theme.textSecondary }]}>
              RSS情報から取得・記事を選択して音声作成
            </Text>
          </View>
          
          {articles.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                記事が見つかりません{'\n'}
                RSSソースを追加してください
              </Text>
              <TouchableOpacity
                style={[styles.sourcesButton, { backgroundColor: theme.primary }]}
                onPress={() => {/* Navigate to sources */}}
              >
                <Text style={styles.sourcesButtonText}>ソース管理</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.articlesContainer}>
              {articles.map(renderArticleItem)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  articlesList: {
    flex: 1,
  },
  articlesHeader: {
    padding: 16,
    alignItems: 'center',
  },
  articlesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  articlesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  articlesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  articleItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  articleContent: {
    padding: 16,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleSource: {
    fontSize: 12,
    fontWeight: '600',
  },
  articleDate: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  sourcesButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sourcesButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});