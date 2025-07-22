import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons'; // Added import

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source_name: string;
  content?: string;
  genre?: string;
}

export default function FeedScreen() {
  const { token } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]); // Added state
  const [creatingAudio, setCreatingAudio] = useState(false); // Added state

  const genres = [
    'All', 'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  useFocusEffect(
    React.useCallback(() => {
      if (token && token !== '') {
        fetchArticles();
      }
    }, [token, selectedGenre])
  );

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params: { genre?: string } = {};
      if (selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      const response = await axios.get(`${API}/articles`, { headers, params });
      setArticles(response.data);
    } catch (error: any) {
      console.error('Error fetching articles:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to fetch articles.');
    } finally {
      setLoading(false);
    }
  };

  const handleArticlePress = async (url: string) => {
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    } else {
      Alert.alert('Error', 'Article link not available.');
    }
  };

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticleIds((prevSelected) =>
      prevSelected.includes(articleId)
        ? prevSelected.filter((id) => id !== articleId)
        : [...prevSelected, articleId]
    );
  };

  const handleCreateAudio = async () => {
    if (selectedArticleIds.length === 0) {
      Alert.alert('Error', 'Please select at least one article to create audio.');
      return;
    }

    setCreatingAudio(true);
    try {
      const selectedArticles = articles.filter((article) =>
        selectedArticleIds.includes(article.id)
      );
      const articleTitles = selectedArticles.map((article) => article.title);

      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: selectedArticleIds,
          article_titles: articleTitles,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Record user interactions for personalization
      for (const article of selectedArticles) {
        try {
          await axios.post(
            `${API}/user-interaction`,
            {
              article_id: article.id,
              interaction_type: 'created_audio',
              genre: article.genre
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (interactionError) {
          console.error('Error recording interaction:', interactionError);
          // Don't fail the whole operation if interaction recording fails
        }
      }

      Alert.alert('Success', `Audio created: ${response.data.title}`);
      setSelectedArticleIds([]); // Clear selection after creation
    } catch (error: any) {
      console.error('Error creating audio:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create audio.');
    } finally {
      setCreatingAudio(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.genreButtonsContainer}
        contentContainerStyle={styles.genreButtonsContent}
      >
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            onPress={() => setSelectedGenre(genre)}
            style={[
              styles.genreButton,
              selectedGenre === genre ? styles.genreButtonActive : null,
            ]}
          >
            <Text style={[
              styles.genreButtonText,
              selectedGenre === genre ? styles.genreButtonTextActive : null,
            ]}>
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.articlesContainer}
        contentContainerStyle={styles.articlesContent}
      >
        {articles.length === 0 ? (
          <Text style={styles.noArticlesText}>No articles found. Add some RSS sources first!</Text>
        ) : (
          articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => handleArticlePress(article.link)} // Open link on tap
            >
              <View style={styles.articleContent}>
                <Text style={styles.articleSource}>{article.source_name}</Text>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSummary}>{article.summary}</Text>
                <Text style={styles.articlePublished}>
                  {article.published ? format(new Date(article.published), 'MMM dd, yyyy') : 'Unknown Date'}
                </Text>
                {article.genre && (
                  <Text style={styles.articleGenre}>Genre: {article.genre}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.plusButton,
                  selectedArticleIds.includes(article.id) && styles.plusButtonSelected,
                ]}
                onPress={() => toggleArticleSelection(article.id)}
              >
                <Ionicons
                  name={selectedArticleIds.includes(article.id) ? 'checkmark-circle' : 'add-circle-outline'}
                  size={28}
                  color={selectedArticleIds.includes(article.id) ? '#4f46e5' : '#6b7280'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedArticleIds.length > 0 && (
        <TouchableOpacity
          style={styles.createAudioButton}
          onPress={handleCreateAudio}
          disabled={creatingAudio}
        >
          {creatingAudio ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createAudioButtonText}>Create Audio ({selectedArticleIds.length})</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    // paddingTop: 10, // Remove or adjust this if it's causing too much space
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  genreButtonsContainer: {
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 0,
    maxHeight: 50,
  },
  genreButtonsContent: {
    paddingVertical: 0,
    alignItems: 'center',
  },
  genreButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 4, // Set marginBottom to 4 as requested
  },
  genreButtonActive: {
    backgroundColor: '#4f46e5',
  },
  genreButtonText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  genreButtonTextActive: {
    color: '#ffffff',
  },
  articlesContainer: {
    flex: 1,
    paddingHorizontal: 10,
    marginTop: 0,
  },
  articlesContent: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  articleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 4,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  articleContent: {
    flex: 1, // Takes up remaining space
    marginRight: 10, // Space for the button
  },
  plusButton: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  plusButtonSelected: {
    backgroundColor: '#d1e7dd', // A lighter green for selected state
  },
  articleSource: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937',
  },
  articleSummary: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 10,
  },
  articlePublished: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  articleGenre: {
    fontSize: 12,
    color: '#4f46e5',
    marginTop: 5,
    fontWeight: 'bold',
  },
  articleCardSelected: {
    borderColor: '#4f46e5',
    borderWidth: 2,
  },
  createAudioButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 15,
    marginHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  createAudioButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noArticlesText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
});
