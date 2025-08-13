import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
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
import PreloadService from '../../services/PreloadService';
import OptimizedArticleList from '../../components/OptimizedArticleList';

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

  // 高速初期化：キャッシュを優先し、バックグラウンドで更新
  useFocusEffect(
    React.useCallback(() => {
      const initializeDataFast = async () => {
        if (!token) return;

        // 1. 即座にキャッシュされた記事を表示
        const instantArticles = await PreloadService.getInstance().getInstantArticles();
        if (instantArticles && instantArticles.length > 0) {
          setArticles(instantArticles);
          setLoading(false);
        }

        // 2. 読書履歴をバックグラウンドで読み込み
        loadReadingHistory();

        // 3. 最新データを非同期で取得（UIをブロックしない）
        setTimeout(() => {
          fetchHomeArticles(false); // loading状態を変更せずに更新
        }, 100);

        // 4. プリロードサービスを初期化
        PreloadService.getInstance().initialize(token);
      };
      
      initializeDataFast();
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

  // 最適化された記事取得（loading状態の制御を改善）
  const fetchHomeArticles = async (shouldShowLoading = true) => {
    if (shouldShowLoading) setLoading(true);
    
    try {
      const filters = {
        ...(selectedGenre !== 'All' && { genre: selectedGenre }),
      };

      // キャッシュを最初にチェック（高速）
      const cachedArticles = await CacheService.getArticles(filters);
      if (cachedArticles && cachedArticles.length > 0) {
        const optimizedArticles = await PreloadService.getInstance().optimizeImageUrls(cachedArticles);
        setArticles(optimizedArticles);
        if (shouldShowLoading) setLoading(false);
        
        // キャッシュを使用した場合でも、バックグラウンドで最新データをチェック
        setTimeout(async () => {
          try {
            const headers = { Authorization: `Bearer ${token}` };
            const params: { genre?: string } = {};
            if (selectedGenre !== 'All') {
              params.genre = selectedGenre;
            }
            
            const response = await axios.get(`${API}/articles`, { headers, params, timeout: 8000 });
            
            if (response.data && response.data.length > 0) {
              const optimizedNew = await PreloadService.getInstance().optimizeImageUrls(response.data);
              await CacheService.setArticles(optimizedNew, filters);
              
              // データが更新された場合のみ再描画
              if (JSON.stringify(optimizedNew) !== JSON.stringify(cachedArticles)) {
                setArticles(optimizedNew);
              }
            }
          } catch (bgError) {
            // バックグラウンド更新の失敗は無視
          }
        }, 1000);
        
        return;
      }

      // キャッシュがない場合のみAPI呼び出し
      const headers = { Authorization: `Bearer ${token}` };
      const params: { genre?: string } = {};
      if (selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      
      const response = await axios.get(`${API}/articles`, { headers, params, timeout: 10000 });
      
      if (response.data && response.data.length > 0) {
        const optimizedArticles = await PreloadService.getInstance().optimizeImageUrls(response.data);
        await CacheService.setArticles(optimizedArticles, filters);
        setArticles(optimizedArticles);
      }
      
    } catch (error: any) {
      if (articles.length === 0) {
        Alert.alert('Error', 'Failed to load articles. Please check your connection.');
      }
    } finally {
      if (shouldShowLoading) setLoading(false);
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

      {/* Optimized Articles List */}
      <View style={{ flex: 1 }}>
        <OptimizedArticleList
          articles={filteredArticles}
          onArticlePress={openArticleInBrowser}
          refreshing={refreshing}
          onRefresh={onRefresh}
          loading={loading}
        />
      </View>

      {/* Floating Auto-Pick Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: theme.primary }]}
        onPress={handleAutoPick}
        disabled={creatingAudio}
        activeOpacity={0.8}
      >
        {creatingAudio ? (
          <ActivityIndicator size="small" color="#fff" />
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