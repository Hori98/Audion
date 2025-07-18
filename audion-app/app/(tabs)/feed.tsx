import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native'; // Added import

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreButtonsContainer}>
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

      <ScrollView style={styles.articlesContainer}>
        {articles.length === 0 ? (
          <Text style={styles.noArticlesText}>No articles found. Add some RSS sources first!</Text>
        ) : (
          articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => { /* Handle article press, e.g., open in webview */ }}
            >
              <Text style={styles.articleSource}>{article.source_name}</Text>
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.articleSummary}>{article.summary}</Text>
              <Text style={styles.articlePublished}>
                {article.published ? format(new Date(article.published), 'MMM dd, yyyy') : 'Unknown Date'}
              </Text>
              {article.genre && (
                <Text style={styles.articleGenre}>Genre: {article.genre}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
    marginBottom: 0, // Set marginBottom to 0 as requested
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    paddingTop: 0, // Set paddingTop to 0 as requested
  },
  articleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  noArticlesText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
});
