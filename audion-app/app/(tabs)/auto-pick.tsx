import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Modal,
  RefreshControl,
  
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSiriShortcuts } from '../../hooks/useSiriShortcuts';
import AudioCreationSuccessModal from '../../components/AudioCreationSuccessModal';
import LoadingIndicator from '../../components/LoadingIndicator';
import LoadingButton from '../../components/LoadingButton';
import CacheService from '../../services/CacheService';
import { ErrorHandlingService } from '../../services/ErrorHandlingService';
import AudioLimitService from '../../services/AudioLimitService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

import { Article } from '../../types';

interface UserProfile {
  id: string;
  user_id: string;
  genre_preferences: Record<string, number>;
  interaction_history: any[];
  created_at: string;
  updated_at: string;
}

interface UserInsights {
  top_genres: {
    genre: string;
    preference_score: number;
    rank: number;
  }[];
  recent_activity: { [key: string]: number };
  total_interactions: number;
  time_context: string;
  profile_created: string;
  last_updated: string;
}

export default function AutoPickScreen() {
  const { token } = useAuth();
  const { showMiniPlayer } = useAudio();
  const { theme } = useTheme();
  // const router = useRouter(); // Unused
  const { donateShortcut } = useSiriShortcuts();
  const [loading, setLoading] = useState(false);
  const [autoPickedArticles, setAutoPickedArticles] = useState<Article[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // const [userInsights, setUserInsights] = useState<UserInsights | null>(null); // Unused
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  // const [insightsModalVisible, setInsightsModalVisible] = useState(false); // Unused
  const [creatingAudio, setCreatingAudio] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAudio, setCreatedAudio] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [excludedArticles, setExcludedArticles] = useState<Set<string>>(new Set());
  const [shuffling, setShuffling] = useState(false);
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());
  const [dislikedArticles, setDislikedArticles] = useState<Set<string>>(new Set());
  const [maxAudioArticles, setMaxAudioArticles] = useState<number>(3);

  const genres = [
    'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchUserProfile();
        // fetchUserInsights(); // Commented out as unused
        // Use smart caching that validates against current active sources
        fetchAutoPickedArticles();
        loadUserSubscriptionInfo();
      }
    }, [token])
  );

  const loadUserSubscriptionInfo = async () => {
    if (!token) return;
    
    try {
      const maxArticles = await AudioLimitService.getMaxArticlesForUser(token);
      setMaxAudioArticles(maxArticles);
    } catch (error) {
      console.error('Failed to load subscription info:', error);
      setMaxAudioArticles(3); // Default fallback
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/user-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(response.data);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      ErrorHandlingService.showError(error, { 
        action: 'fetch_user_profile',
        source: 'Auto-pick Screen' 
      });
    }
  };

  const fetchUserInsights = async () => {
    try {
      const response = await axios.get(`${API}/user-insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // setUserInsights(response.data); // Unused
    } catch (error: any) {
      console.error('Error fetching user insights:', error);
      ErrorHandlingService.showError(error, { 
        action: 'fetch_user_insights',
        source: 'Auto-pick Screen' 
      });
    }
  };

  const fetchAutoPickedArticles = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Skip cache if force refresh or if we need fresh data reflecting source changes
      if (!forceRefresh) {
        // Check if cached articles are still valid by comparing against current active sources
        const cachedArticles = await CacheService.getAutoPickedArticles();
        if (cachedArticles && await areArticlesStillValid(cachedArticles)) {
          setAutoPickedArticles(Array.isArray(cachedArticles) ? cachedArticles : cachedArticles.articles);
          setLoading(false);
          return;
        }
      }

      // Get current active sources to ensure we only get articles from active sources
      const activeSourcesResponse = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const activeSources = activeSourcesResponse.data
        .filter((source: any) => source.is_active !== false)
        .map((source: any) => source.id);

      // Request auto-pick with explicit active sources
      const response = await axios.post(
        `${API}/auto-pick`,
        { 
          max_articles: 10,
          active_source_ids: activeSources // Pass active sources explicitly
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Cache the results with timestamp for validation
      const articlesWithTimestamp = {
        articles: response.data,
        timestamp: Date.now(),
        active_sources: activeSources
      };
      await CacheService.setAutoPickedArticles(articlesWithTimestamp);
      
      setAutoPickedArticles(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching auto-picked articles:', error);
      ErrorHandlingService.showError(error, { 
        action: 'fetch_articles',
        source: 'Auto-pick Screen' 
      });
      setLoading(false);
    }
  };

  // Check if cached articles are still valid (from currently active sources)
  const areArticlesStillValid = async (cachedData: any) => {
    try {
      if (!cachedData || !cachedData.articles || !cachedData.active_sources) {
        return false;
      }

      // Check if cache is older than 5 minutes
      const cacheAge = Date.now() - (cachedData.timestamp || 0);
      if (cacheAge > 5 * 60 * 1000) {
        return false;
      }

      // Get current active sources
      const activeSourcesResponse = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const currentActiveSources = activeSourcesResponse.data
        .filter((source: any) => source.is_active !== false)
        .map((source: any) => source.id)
        .sort();

      const cachedActiveSources = cachedData.active_sources.sort();

      // Check if active sources have changed
      return JSON.stringify(currentActiveSources) === JSON.stringify(cachedActiveSources);
    } catch (error) {
      console.error('Error validating cached articles:', error);
      return false;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear cache to force fresh data on refresh
      await CacheService.remove('auto_picked_articles');
      await Promise.all([
        fetchUserProfile(), 
        fetchUserInsights(), 
        fetchAutoPickedArticles(true) // Force refresh
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleArticlePress = async (url: string) => {
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  };

  const handleLikeArticle = async (article: Article) => {
    try {
      const isCurrentlyLiked = likedArticles.has(article.id);
      
      if (isCurrentlyLiked) {
        // Cancel like - remove from liked articles
        setLikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
        
        // Send cancel interaction to backend
        await axios.post(
          `${API}/user-interaction`,
          {
            article_id: article.id,
            interaction_type: 'cancelled_like',
            genre: article.genre
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Add like
        setLikedArticles(prev => new Set([...prev, article.id]));
        setDislikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
        
        await axios.post(
          `${API}/user-interaction`,
          {
            article_id: article.id,
            interaction_type: 'liked',
            genre: article.genre
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      await fetchUserProfile(); // Refresh profile to show updated preferences
    } catch (error: any) {
      console.error('Error recording interaction:', error);
      // Revert optimistic update on error
      if (likedArticles.has(article.id)) {
        setLikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
      } else {
        setLikedArticles(prev => new Set([...prev, article.id]));
      }
    }
  };

  const handleDislikeArticle = async (article: Article) => {
    try {
      const isCurrentlyDisliked = dislikedArticles.has(article.id);
      
      if (isCurrentlyDisliked) {
        // Cancel dislike - remove from disliked articles
        setDislikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
        
        // Send cancel interaction to backend
        await axios.post(
          `${API}/user-interaction`,
          {
            article_id: article.id,
            interaction_type: 'cancelled_dislike',
            genre: article.genre
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Add dislike
        setDislikedArticles(prev => new Set([...prev, article.id]));
        setLikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
        
        await axios.post(
          `${API}/user-interaction`,
          {
            article_id: article.id,
            interaction_type: 'disliked',
            genre: article.genre
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        await fetchAutoPickedArticles(); // Refresh articles with updated preferences
      }
      
      await fetchUserProfile(); // Refresh profile
    } catch (error: any) {
      console.error('Error recording interaction:', error);
      // Revert optimistic update on error
      if (dislikedArticles.has(article.id)) {
        setDislikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
      } else {
        setDislikedArticles(prev => new Set([...prev, article.id]));
      }
    }
  };

  const handleShuffle = async () => {
    setShuffling(true);
    try {
      // Clear cache to force fresh data
      await CacheService.remove('auto_picked_articles');
      
      // Force refresh with current active sources
      await fetchAutoPickedArticles(true);
      setExcludedArticles(new Set());
      setShuffling(false);
    } catch (error: any) {
      console.error('Error shuffling articles:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to shuffle articles.');
      setShuffling(false);
    }
  };

  const handleExcludeArticle = (articleId: string) => {
    setExcludedArticles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const handleCreateAudio = async () => {
    setCreatingAudio(true);
    try {
      // Filter out excluded articles for audio creation
      const availableArticles = autoPickedArticles.filter(article => !excludedArticles.has(article.id));
      
      if (availableArticles.length === 0) {
        Alert.alert('No Articles', 'Please ensure at least one article is not excluded.');
        setCreatingAudio(false);
        return;
      }

      // Determine how many articles to use (up to user's limit)
      const articlesToUse = Math.min(availableArticles.length, maxAudioArticles);
      
      // Validate against user limits before proceeding
      const validation = await AudioLimitService.validateAudioCreation(token!, articlesToUse);
      
      if (!validation.isValid) {
        Alert.alert('Audio Creation Limit', validation.errorMessage || 'Unable to create audio due to plan limits.');
        setCreatingAudio(false);
        return;
      }
      
      const articleIds = availableArticles.slice(0, articlesToUse).map(article => article.id);
      const articleTitles = availableArticles.slice(0, articlesToUse).map(article => article.title);
      const articleUrls = availableArticles.slice(0, articlesToUse).map(article => article.link);

      const response = await axios.post(
        `${API}/audio/create`,
        { 
          article_ids: articleIds,
          article_titles: articleTitles,
          article_urls: articleUrls
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Record user interactions for personalization (async to avoid blocking)
      const recordInteractions = async () => {
        for (const article of availableArticles.slice(0, maxArticles)) {
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
          }
        }
      };
      
      // Show success modal instead of alert (exactly like Feed auto-pick)
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      // Background tasks immediately (exactly like Feed auto-pick) - SKIP fetchUserProfile to prevent modal interference
      recordInteractions();
      donateShortcut('auto-pick');
    } catch (error: any) {
      console.error('Error creating auto-picked audio:', error);
      
      // Handle limit exceeded errors
      if (error.response?.status === 403 && error.response?.data?.type === 'limit_exceeded') {
        const errorData = error.response.data;
        Alert.alert(
          'Limit Reached', 
          errorData.message,
          [
            { text: 'OK', style: 'default' },
            { text: 'View Usage', onPress: () => {
              // TODO: Navigate to subscription/usage page
              console.log('Usage info:', errorData.usage_info);
            }}
          ]
        );
      } else {
        ErrorHandlingService.showError(error, { 
          action: 'create_audio',
          source: 'Auto-pick Screen',
          details: { excludedCount: excludedArticles.size, availableCount: autoPickedArticles.length }
        });
      }
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
      <LoadingIndicator 
        variant="fullscreen"
        text="Finding articles you'll love..."
        testID="auto-pick-loading"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Action Buttons - Hide when mini player is active */}
      {!showMiniPlayer && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.shuffleButton, { backgroundColor: theme.surface, borderColor: theme.primary }]}
            onPress={handleShuffle}
            disabled={shuffling || loading}
            accessibilityRole="button"
            accessibilityLabel="Shuffle articles"
            accessibilityHint="Tap to get a new set of personalized articles"
            accessibilityState={{ disabled: shuffling || loading, busy: shuffling }}
          >
            {shuffling ? (
              <LoadingIndicator size="small" variant="button" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="shuffle" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.shuffleButtonText, { color: theme.primary }]}>Shuffle</Text>
              </>
            )}
          </TouchableOpacity>
          
          <LoadingButton
            title="Audio it!"
            onPress={handleCreateAudio}
            loading={creatingAudio}
            variant="primary"
            icon="musical-notes"
            style={styles.createAudioButton}
            testID="auto-pick-create-audio"
            accessibilityLabel="Create audio from articles"
            accessibilityHint="Tap to convert selected articles into an audio podcast"
          />
        </View>
      )}

      {/* Articles List */}
      <ScrollView 
        style={styles.articlesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        accessibilityLabel="Auto-picked articles list"
        accessibilityRole="list"
      >
        {autoPickedArticles.length === 0 && !loading ? (
          <Text style={[styles.noArticlesText, { color: theme.textSecondary }]}>
            No articles available. Try adding some RSS sources first!
          </Text>
        ) : (
          autoPickedArticles.map((article) => {
            const isExcluded = excludedArticles.has(article.id);
            const isLiked = likedArticles.has(article.id);
            const isDisliked = dislikedArticles.has(article.id);
            return (
              <View 
                key={article.id} 
                style={[
                  styles.articleCard, 
                  { backgroundColor: theme.surface },
                  isExcluded && styles.excludedCard
                ]}
              >
                {isExcluded && (
                  <View style={styles.excludedBadge}>
                    <Text style={styles.excludedBadgeText}>Excluded</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  onPress={() => handleArticlePress(article.link)}
                  style={[styles.articleContent, isExcluded && styles.excludedContent]}
                  disabled={isExcluded}
                  accessibilityRole="button"
                  accessibilityLabel={`Article: ${article.title} from ${article.source_name}`}
                  accessibilityHint={isExcluded ? "This article is excluded from audio creation" : "Tap to read the full article in browser"}
                  accessibilityState={{ disabled: isExcluded }}
                >
                  <View style={styles.articleHeader}>
                    <Text style={[styles.articleSource, { color: isExcluded ? theme.textMuted : theme.textMuted }]}>{article.source_name}</Text>
                    <View style={[styles.genreTag, { backgroundColor: isExcluded ? theme.border : theme.secondary }]}>
                      <Text style={[styles.genreText, { color: isExcluded ? theme.textMuted : theme.primary }]}>{article.genre}</Text>
                    </View>
                  </View>
                  <Text style={[styles.articleTitle, { color: isExcluded ? theme.textMuted : theme.text }]}>{article.title}</Text>
                  <Text style={[styles.articleSummary, { color: isExcluded ? theme.textMuted : theme.textSecondary }]} numberOfLines={3}>
                    {article.summary}
                  </Text>
                  <Text style={[styles.articlePublished, { color: theme.textMuted }]}>
                    {article.published ? format(new Date(article.published), 'MMM dd, yyyy') : 'Unknown Date'}
                  </Text>
                </TouchableOpacity>
                
                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    onPress={() => handleLikeArticle(article)}
                    style={[
                      styles.likeButton, 
                      { backgroundColor: isLiked ? theme.success : theme.accent },
                      isLiked && styles.activeButton
                    ]}
                    disabled={isExcluded}
                    accessibilityRole="button"
                    accessibilityLabel={isLiked ? `Unlike article: ${article.title}` : `Like article: ${article.title}`}
                    accessibilityHint={isLiked ? "Tap to remove like from this article" : "Tap to mark this article as liked to improve recommendations"}
                    accessibilityState={{ disabled: isExcluded, selected: isLiked }}
                  >
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={20} 
                      color={isExcluded ? theme.textMuted : (isLiked ? "#fff" : theme.success)} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDislikeArticle(article)}
                    style={[
                      styles.dislikeButton, 
                      { backgroundColor: isDisliked ? theme.error : theme.accent },
                      isDisliked && styles.activeButton
                    ]}
                    disabled={isExcluded}
                    accessibilityRole="button"
                    accessibilityLabel={isDisliked ? `Remove dislike from article: ${article.title}` : `Dislike article: ${article.title}`}
                    accessibilityHint={isDisliked ? "Tap to remove dislike from this article" : "Tap to mark this article as disliked to improve recommendations"}
                    accessibilityState={{ disabled: isExcluded, selected: isDisliked }}
                  >
                    <Ionicons 
                      name={isDisliked ? "close-circle" : "close-circle-outline"} 
                      size={20} 
                      color={isExcluded ? theme.textMuted : (isDisliked ? "#fff" : theme.error)} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleExcludeArticle(article.id)}
                    style={[
                      styles.excludeButton, 
                      { backgroundColor: isExcluded ? theme.primary : theme.accent }
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={isExcluded ? `Include article: ${article.title}` : `Exclude article: ${article.title}`}
                    accessibilityHint={isExcluded ? "Tap to include this article in audio creation" : "Tap to exclude this article from audio creation"}
                    accessibilityState={{ selected: isExcluded }}
                  >
                    <Ionicons 
                      name={isExcluded ? "eye" : "eye-off"} 
                      size={20} 
                      color={isExcluded ? "#fff" : theme.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* User Profile Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Your Preferences</Text>
            <TouchableOpacity 
              onPress={() => setProfileModalVisible(false)}
              style={styles.modalCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close preferences modal"
              accessibilityHint="Tap to close the preferences screen"
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Genre Preferences</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Based on your interactions, here&apos;s what we&apos;ve learned about your interests:
            </Text>
            
            {userProfile && (
              <View style={styles.preferencesGrid}>
                {genres.map((genre) => {
                  const preference = userProfile.genre_preferences[genre] || 1.0;
                  return (
                    <View key={genre} style={[styles.preferenceItem, { borderBottomColor: theme.divider }]}>
                      <Text style={[styles.genreName, { color: theme.text }]}>{genre}</Text>
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
            
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
            <Text style={[styles.activityCount, { color: theme.primary }]}>
              {userProfile?.interaction_history?.length || 0} interactions recorded
            </Text>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Floating Action Button - Show when mini player is active */}
      {showMiniPlayer && (
        <TouchableOpacity
          style={[styles.floatingActionButton, { backgroundColor: theme.primary }]}
          onPress={handleCreateAudio}
          disabled={creatingAudio}
          accessibilityRole="button"
          accessibilityLabel="Create audio from articles"
          accessibilityHint="Tap to convert selected articles into an audio podcast"
          accessibilityState={{ disabled: creatingAudio, busy: creatingAudio }}
        >
          {creatingAudio ? (
            <LoadingIndicator size="medium" variant="button" color="#fff" />
          ) : (
            <Ionicons name="add" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      )}

      {/* Success Modal */}
      <AudioCreationSuccessModal
        visible={showSuccessModal}
        audioTitle={createdAudio?.title || ''}
        audioItem={createdAudio}
        onClose={() => {
          setShowSuccessModal(false);
          setCreatedAudio(null);
          // Update user profile after modal closes to prevent interference
          setTimeout(() => fetchUserProfile().catch(console.error), 100);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 12,
  },
  shuffleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createAudioButton: {
    flex: 2,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 80, // Above mini player
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
  excludeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeButton: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  excludedCard: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  excludedContent: {
    opacity: 0.7,
  },
  excludedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    zIndex: 1,
  },
  excludedBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
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