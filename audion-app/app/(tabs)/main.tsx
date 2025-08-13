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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import axios from 'axios';

interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  published_date: string;
  source: string;
  genre?: string;
  reading_time?: number;
  content?: string;
}

export default function MainScreen() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [creatingAudio, setCreatingAudio] = useState(false);
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL 
    ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` 
    : 'http://localhost:8003/api';

  const genres = ['All', 'Breaking News', 'Technology', 'Business', 'Politics', 'World', 'Sports', 'Entertainment'];

  useEffect(() => {
    if (token) {
      fetchCuratedArticles();
    }
  }, [token]);

  const fetchCuratedArticles = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API}/articles/curated`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data && Array.isArray(response.data)) {
        setArticles(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching curated articles:', error);
      Alert.alert('Error', 'Failed to load articles. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchCuratedArticles();
  }, []);

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
              onPress={() => {
                // Navigate to article detail or web view
              }}
              activeOpacity={0.7}
            >
              <View style={styles.newsCardHeader}>
                <View style={styles.sourceInfo}>
                  <Text style={[styles.newsSource, { color: theme.primary }]}>
                    {article.source}
                  </Text>
                  <View style={[styles.sourceDot, { backgroundColor: theme.textMuted }]} />
                  <Text style={[styles.newsTime, { color: theme.textMuted }]}>
                    {formatDate(article.published_date)}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.newsTitle, { color: theme.text }]} numberOfLines={3}>
                {article.title}
              </Text>
              
              {article.description && (
                <Text 
                  style={[styles.newsDescription, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {article.description}
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
  newsCardHeader: {
    marginBottom: 8,
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