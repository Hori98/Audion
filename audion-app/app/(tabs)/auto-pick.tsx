import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Modal,
  RefreshControl 
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source_name: string;
  genre: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  genre_preferences: Record<string, number>;
  interaction_history: any[];
  created_at: string;
  updated_at: string;
}

interface UserInsights {
  top_genres: Array<{
    genre: string;
    preference_score: number;
    rank: number;
  }>;
  recent_activity: { [key: string]: number };
  total_interactions: number;
  time_context: string;
  profile_created: string;
  last_updated: string;
}

export default function AutoPickScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [autoPickedArticles, setAutoPickedArticles] = useState<Article[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userInsights, setUserInsights] = useState<UserInsights | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [insightsModalVisible, setInsightsModalVisible] = useState(false);
  const [creatingAudio, setCreatingAudio] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const genres = [
    'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchUserProfile();
        fetchUserInsights();
        fetchAutoPickedArticles();
      }
    }, [token])
  );

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/user-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(response.data);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserInsights = async () => {
    try {
      const response = await axios.get(`${API}/user-insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserInsights(response.data);
    } catch (error: any) {
      console.error('Error fetching user insights:', error);
    }
  };

  const fetchAutoPickedArticles = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/auto-pick`,
        { max_articles: 10 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAutoPickedArticles(response.data);
    } catch (error: any) {
      console.error('Error fetching auto-picked articles:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to fetch auto-picked articles.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchUserInsights(), fetchAutoPickedArticles()]);
    setRefreshing(false);
  };

  const handleArticlePress = async (url: string) => {
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  };

  const handleLikeArticle = async (article: Article) => {
    try {
      await axios.post(
        `${API}/user-interaction`,
        {
          article_id: article.id,
          interaction_type: 'liked',
          genre: article.genre
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Your preference has been recorded!');
      await fetchUserProfile(); // Refresh profile to show updated preferences
    } catch (error: any) {
      console.error('Error recording interaction:', error);
    }
  };

  const handleDislikeArticle = async (article: Article) => {
    try {
      await axios.post(
        `${API}/user-interaction`,
        {
          article_id: article.id,
          interaction_type: 'disliked',
          genre: article.genre
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Your preference has been recorded!');
      await fetchUserProfile(); // Refresh profile
      await fetchAutoPickedArticles(); // Refresh articles with updated preferences
    } catch (error: any) {
      console.error('Error recording interaction:', error);
    }
  };

  const handleCreateAudio = async () => {
    setCreatingAudio(true);
    try {
      const response = await axios.post(
        `${API}/auto-pick/create-audio`,
        { max_articles: 3 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', `Audio created: ${response.data.title}`);
      await fetchUserProfile(); // Refresh profile after creating audio
    } catch (error: any) {
      console.error('Error creating auto-picked audio:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create audio.');
    } finally {
      setCreatingAudio(false);
    }
  };

  const getPreferenceColor = (preference: number) => {
    if (preference >= 1.5) return '#10b981'; // Green for high preference
    if (preference >= 1.0) return '#6b7280'; // Gray for neutral
    return '#ef4444'; // Red for low preference
  };

  const getPreferenceText = (preference: number) => {
    if (preference >= 1.5) return 'High';
    if (preference >= 1.0) return 'Normal';
    return 'Low';
  };

  if (loading && autoPickedArticles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Finding articles you'll love...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Auto-Pick</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => setProfileModalVisible(true)}
            style={styles.profileButton}
          >
            <Ionicons name="person-circle" size={24} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={fetchAutoPickedArticles}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Audio Button */}
      <TouchableOpacity
        style={styles.createAudioButton}
        onPress={handleCreateAudio}
        disabled={creatingAudio}
      >
        {creatingAudio ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="musical-notes" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.createAudioButtonText}>Audio it!</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Articles List */}
      <ScrollView 
        style={styles.articlesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {autoPickedArticles.length === 0 && !loading ? (
          <Text style={styles.noArticlesText}>
            No articles available. Try adding some RSS sources first!
          </Text>
        ) : (
          autoPickedArticles.map((article) => (
            <View key={article.id} style={styles.articleCard}>
              <TouchableOpacity 
                onPress={() => handleArticlePress(article.link)}
                style={styles.articleContent}
              >
                <View style={styles.articleHeader}>
                  <Text style={styles.articleSource}>{article.source_name}</Text>
                  <View style={styles.genreTag}>
                    <Text style={styles.genreText}>{article.genre}</Text>
                  </View>
                </View>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSummary} numberOfLines={3}>
                  {article.summary}
                </Text>
                <Text style={styles.articlePublished}>
                  {article.published ? format(new Date(article.published), 'MMM dd, yyyy') : 'Unknown Date'}
                </Text>
              </TouchableOpacity>
              
              {/* Like/Dislike Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  onPress={() => handleLikeArticle(article)}
                  style={styles.likeButton}
                >
                  <Ionicons name="heart" size={20} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDislikeArticle(article)}
                  style={styles.dislikeButton}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* User Profile Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Your Preferences</Text>
            <TouchableOpacity 
              onPress={() => setProfileModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Genre Preferences</Text>
            <Text style={styles.sectionDescription}>
              Based on your interactions, here's what we've learned about your interests:
            </Text>
            
            {userProfile && (
              <View style={styles.preferencesGrid}>
                {genres.map((genre) => {
                  const preference = userProfile.genre_preferences[genre] || 1.0;
                  return (
                    <View key={genre} style={styles.preferenceItem}>
                      <Text style={styles.genreName}>{genre}</Text>
                      <View style={styles.preferenceIndicator}>
                        <View 
                          style={[
                            styles.preferenceBar,
                            { backgroundColor: getPreferenceColor(preference) }
                          ]}
                        />
                        <Text style={[
                          styles.preferenceValue,
                          { color: getPreferenceColor(preference) }
                        ]}>
                          {getPreferenceText(preference)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.activityCount}>
              {userProfile?.interaction_history?.length || 0} interactions recorded
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  profileButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  createAudioButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 15,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAudioButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  articlesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  noArticlesText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
  articleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleContent: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  genreTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 10,
    color: '#4f46e5',
    fontWeight: '600',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  articlePublished: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  likeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
  },
  dislikeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  preferencesGrid: {
    marginBottom: 30,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  genreName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  preferenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceBar: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  preferenceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityCount: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
});