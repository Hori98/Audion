import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import { Article } from '../../types';
import CacheService from '../../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

export default function MainScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [creatingAudio, setCreatingAudio] = useState(false);
  const [readingHistory, setReadingHistory] = useState<Map<string, Date>>(new Map());

  const genres = ['All', 'Breaking News', 'Technology', 'Business', 'Politics', 'World', 'Sports', 'Entertainment'];

  // Feedベースの安定したuseFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      const initializeData = async () => {
        if (token && token !== '') {
          await loadReadingHistory();
          await fetchHomeArticles();
        }
      };
      initializeData();
    }, [token])
  );

  // ジャンルフィルター変更時の記事更新
  useEffect(() => {
    const handleFilterChange = async () => {
      if (token && token !== '') {
        await fetchHomeArticles();
      }
    };
    handleFilterChange();
  }, [selectedGenre]);

  // 読書履歴をAsyncStorageから読み込み（Feedと同じロジック）
  const loadReadingHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('reading_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        const historyMap = new Map();
        Object.entries(parsed).forEach(([articleId, dateStr]) => {
          historyMap.set(articleId, new Date(dateStr as string));
        });
        setReadingHistory(historyMap);
      }
    } catch (error) {
      console.error('Error loading reading history:', error);
    }
  };

  // Feedベースの記事取得（全ソース対象）
  const fetchHomeArticles = async () => {
    setLoading(true);
    try {
      const filters = {
        ...(selectedGenre !== 'All' && { genre: selectedGenre }),
        // Homeは全ソースを表示（sourceフィルターなし）
      };

      // キャッシュをチェック
      const cachedArticles = await CacheService.getArticles(filters);
      if (cachedArticles) {
        setArticles(cachedArticles);
        setLoading(false);
        return;
      }

      // API呼び出し（Feedと同じエンドポイント）
      const headers = { Authorization: `Bearer ${token}` };
      const params: { genre?: string } = {};
      if (selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      
      const response = await axios.get(`${API}/articles`, { headers, params });
      
      // キャッシュに保存
      await CacheService.setArticles(response.data, filters);
      setArticles(response.data);
      
    } catch (error: any) {
      console.error('Error fetching home articles:', error);
      Alert.alert('Error', 'Failed to load articles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeArticles().finally(() => setRefreshing(false));
  }, []);

  // 記事の読書履歴を記録（Feedと同じロジック）
  const recordArticleReading = async (article: Article) => {
    try {
      const newHistory = new Map(readingHistory);
      newHistory.set(article.id, new Date());
      setReadingHistory(newHistory);

      // AsyncStorageに保存
      const historyObject: { [key: string]: string } = {};
      newHistory.forEach((date, articleId) => {
        historyObject[articleId] = date.toISOString();
      });
      await AsyncStorage.setItem('reading_history', JSON.stringify(historyObject));
    } catch (error) {
      console.error('Error recording article reading:', error);
    }
  };

  // Feedと同じブラウザ表示機能
  const openArticleInBrowser = async (article: Article) => {
    if (article?.link) {
      try {
        // 読書履歴を記録
        await recordArticleReading(article);
        
        // 外部ブラウザで開く（安定）
        await WebBrowser.openBrowserAsync(article.link);
      } catch (error: any) {
        console.error('Error opening article:', error);
        Alert.alert('Error', 'Failed to open article.');
      }
    } else {
      Alert.alert('Error', 'Article link not available.');
    }
  };

  const handleAutoPick = async () => {
    if (creatingAudio) return;
    
    try {
      setCreatingAudio(true);
      
      // Use auto-pick to select best articles
      const response = await axios.post(
        `${API}/articles/auto-pick`,
        {
          max_articles: 5,
          preferred_genres: selectedGenre === 'All' ? [] : [selectedGenre]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.selected_articles) {
        const selectedArticles = response.data.selected_articles;
        
        // Create podcast with auto-picked articles
        const audioResponse = await axios.post(
          `${API}/audio/create`,
          {
            articles: selectedArticles,
            title: `Today's News - ${new Date().toLocaleDateString()}`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (audioResponse.data) {
          Alert.alert(
            'Podcast Created!',
            'Your daily news podcast has been created successfully.',
            [
              {
                text: 'View in Library',
                onPress: () => router.push('/(tabs)/library'),
              },
              { text: 'OK' },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('Error creating auto-pick podcast:', error);
      Alert.alert('Error', 'Failed to create podcast. Please try again.');
    } finally {
      setCreatingAudio(false);
    }
  };

  const filteredArticles = selectedGenre === 'All' 
    ? articles 
    : articles.filter(article => article.genre === selectedGenre);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Just now';
    }
  };

  const getReadingTime = (content: string = '') => {
    const wordsPerMinute = 200;
    const words = content.split(' ').length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* News Header */}
      <View style={[styles.newsHeader, { backgroundColor: theme.surface }]}>
        <Text style={[styles.newsTitle, { color: theme.text }]}>
          Today's Headlines
        </Text>
        <Text style={[styles.newsSubtitle, { color: theme.textSecondary }]}>
          Curated news from trusted sources
        </Text>
      </View>

      {/* Genre Filter - Horizontal scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.genreFilter}
        contentContainerStyle={styles.genreFilterContent}
      >
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreChip,
              { 
                backgroundColor: selectedGenre === genre ? theme.primary : theme.surface,
                borderColor: selectedGenre === genre ? theme.primary : theme.border
              }
            ]}
            onPress={() => setSelectedGenre(genre)}
          >
            <Text
              style={[
                styles.genreChipText,
                { color: selectedGenre === genre ? '#fff' : theme.text }
              ]}
            >
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Articles List */}
      <ScrollView
        style={styles.articlesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredArticles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No articles available
            </Text>
            <Text style={[styles.emptyStateDescription, { color: theme.textMuted }]}>
              Pull down to refresh and check for new content
            </Text>
          </View>
        ) : (
          filteredArticles.map((article, index) => (
            <TouchableOpacity
              key={article.id}
              style={[styles.newsCard, { backgroundColor: theme.surface }]}
              onPress={() => openArticleInBrowser(article)}
              activeOpacity={0.7}
            >
              <View style={styles.newsCardContent}>
                {/* Left side: Text content */}
                <View style={styles.newsTextContent}>
                  <View style={styles.newsCardHeader}>
                    <View style={styles.sourceInfo}>
                      <Text style={[styles.newsSource, { color: theme.primary }]}>
                        {article.source_name || 'Unknown Source'}
                      </Text>
                      <View style={[styles.sourceDot, { backgroundColor: theme.textMuted }]} />
                      <Text style={[styles.newsTime, { color: theme.textMuted }]}>
                        {formatDate(article.published || '')}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.newsTitle, { color: theme.text }]} numberOfLines={3}>
                    {article.title || 'Untitled'}
                  </Text>
                  
                  {article.summary && article.summary.trim() && (
                    <Text 
                      style={[styles.newsDescription, { color: theme.textSecondary }]}
                      numberOfLines={2}
                    >
                      {article.summary.trim()}
                    </Text>
                  )}
                  
                  <View style={styles.newsFooter}>
                    <Text style={[styles.readingTime, { color: theme.textMuted }]}>
                      {getReadingTime(article.content)}
                    </Text>
                    
                    <View style={styles.newsActions}>
                      <TouchableOpacity style={styles.newsActionButton}>
                        <Ionicons name="bookmark-outline" size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.newsActionButton}>
                        <Ionicons name="share-outline" size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Right side: Thumbnail image */}
                <View style={styles.newsThumbnailContainer}>
                  {article.image_url ? (
                    <Image
                      source={{ uri: article.image_url }}
                      style={styles.newsThumbnail}
                      resizeMode="cover"
                      onError={() => {
                        console.log('Failed to load image:', article.image_url);
                      }}
                    />
                  ) : (
                    <View style={[styles.placeholderThumbnail, { backgroundColor: theme.accent }]}>
                      <Ionicons name="newspaper-outline" size={24} color={theme.textMuted} />
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        {/* Bottom padding for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Auto-Pick Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: theme.primary }]}
        onPress={handleAutoPick}
        disabled={creatingAudio}
        activeOpacity={0.8}
      >
        {creatingAudio ? (
          <Ionicons name="hourglass-outline" size={24} color="#fff" />
        ) : (
          <Ionicons name="flash" size={24} color="#fff" />
        )}
        <Text style={[styles.floatingButtonText, { color: '#fff' }]}>
          {creatingAudio ? 'Creating...' : 'Auto Pick'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  newsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  newsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  newsSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  genreFilter: {
    backgroundColor: 'transparent',
    maxHeight: 50,
  },
  genreFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  genreChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  articlesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  newsCard: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newsCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  newsTextContent: {
    flex: 1,
    marginRight: 12,
  },
  newsCardHeader: {
    marginBottom: 8,
  },
  newsThumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  newsThumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sourceDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  newsTime: {
    fontSize: 12,
  },
  newsDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readingTime: {
    fontSize: 12,
  },
  newsActions: {
    flexDirection: 'row',
    gap: 12,
  },
  newsActionButton: {
    padding: 4,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});