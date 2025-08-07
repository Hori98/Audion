import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Platform, Animated, Easing } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons'; // Added import
import { useRouter } from 'expo-router';
import { useSiriShortcuts } from '../../hooks/useSiriShortcuts';
import AudioCreationSuccessModal from '../../components/AudioCreationSuccessModal';
import LoadingIndicator from '../../components/LoadingIndicator';
import LoadingButton from '../../components/LoadingButton';
import CacheService from '../../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorHandlingService } from '../../services/ErrorHandlingService';
import AudioLimitService from '../../services/AudioLimitService';
import { Article } from '../../types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

interface RSSSource {
  id: string;
  name: string;
  url: string;
  is_active?: boolean;
  created_at: string;
}

export default function FeedScreen() {
  const { token } = useAuth();
  const { showMiniPlayer } = useAudio();
  const { theme } = useTheme();
  const router = useRouter();
  const { donateShortcut } = useSiriShortcuts();
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]); // Global selection state
  const [allArticlesMap, setAllArticlesMap] = useState<Map<string, Article>>(new Map()); // Track all articles across filters
  const [normalizedArticlesMap, setNormalizedArticlesMap] = useState<Map<string, Article>>(new Map()); // Track articles by normalized ID
  const [creatingAudio, setCreatingAudio] = useState(false); // Added state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAudio, setCreatedAudio] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Removed: showSelectedModal state
  const [uiUpdateTrigger, setUiUpdateTrigger] = useState(0); // Force UI updates
  const [selectionMode, setSelectionMode] = useState(false); // Pattern B selection mode
  const [fabRotation] = useState(new Animated.Value(0)); // FAB animation
  const [feedLikedArticles, setFeedLikedArticles] = useState<Set<string>>(new Set());
  const [feedDislikedArticles, setFeedDislikedArticles] = useState<Set<string>>(new Set());

  const genres = [
    'All', 'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  useFocusEffect(
    React.useCallback(() => {
      const initializeData = async () => {
        if (token && token !== '') {
          await loadGlobalSelection();
          // Force refresh sources to get latest changes from sources screen
          await fetchSources(true);
          await fetchArticles();
        }
      };
      initializeData();
    }, [token])
  );

  // Separate effect for filter changes - ensure selection state is loaded first
  useEffect(() => {
    
    const handleFilterChange = async () => {
      if (token && token !== '') {
        // Ensure we have the latest selection state before fetching articles
        await loadGlobalSelection();
        // Also refresh sources to ensure latest source list is available
        await fetchSources(true);
        await fetchArticles();
      }
    };
    
    handleFilterChange();
  }, [selectedGenre, selectedSource]);

  // Effect to force UI update when selection changes
  useEffect(() => {
    // Force component re-render when selection changes
  }, [selectedArticleIds, articles, uiUpdateTrigger]);

  // Load global selection state from AsyncStorage
  const loadGlobalSelection = async () => {
    try {
        const savedSelection = await AsyncStorage.getItem('feed_selected_articles');
      if (savedSelection) {
        const parsed = JSON.parse(savedSelection);
        setSelectedArticleIds(parsed);
        // Force UI update after loading selection
        setUiUpdateTrigger(prev => prev + 1);
        return parsed;
      } else {
        setSelectedArticleIds([]);
        setUiUpdateTrigger(prev => prev + 1);
        return [];
      }
    } catch (error) {
      console.error('Error loading global selection:', error);
      return [];
    }
  };

  // Generate normalized ID for article deduplication
  const generateNormalizedId = (article: Article): string => {
    // Use title + source + published date to create a unique identifier
    const key = `${article.title.trim()}_${(article.source_name || article.source || 'unknown').trim()}_${article.published || article.published_at}`;
    // Simple hash function to create shorter ID
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `norm_${Math.abs(hash).toString(36)}`;
  };

  // Normalize articles to prevent duplicates across filters
  const normalizeArticles = (articles: Article[]): Article[] => {
    const normalizedMap = new Map<string, Article>();
    
    articles.forEach(article => {
      const normalizedId = generateNormalizedId(article);
      const articleWithNormalizedId = { ...article, normalizedId };
      
      // If we already have this normalized article, keep the first one but update the map
      if (!normalizedMap.has(normalizedId)) {
        normalizedMap.set(normalizedId, articleWithNormalizedId);
      }
    });
    
    return Array.from(normalizedMap.values());
  };

  // Save global selection state to AsyncStorage
  const saveGlobalSelection = async (newSelection: string[]) => {
    try {
      await AsyncStorage.setItem('feed_selected_articles', JSON.stringify(newSelection));
    } catch (error) {
      console.error('Error saving global selection:', error);
    }
  };

  const fetchSources = async (forceRefresh = false) => {
    try {
      // Try cache first unless force refresh is requested
      if (!forceRefresh) {
        const cachedSources = await CacheService.getSources();
        if (cachedSources) {
          setSources(cachedSources);
          return;
        }
      }

      const response = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Set default is_active to true if not present, then filter
      const sourcesWithStatus = response.data.map((source: RSSSource) => ({
        ...source,
        is_active: source.is_active !== undefined ? source.is_active : true
      }));
      const activeSources = sourcesWithStatus.filter((source: RSSSource) => source.is_active);
      
      // Cache the results
      await CacheService.setSources(activeSources);
      setSources(activeSources);
    } catch (error: any) {
      console.error('Error fetching RSS sources:', error);
      ErrorHandlingService.showError(error, { 
        action: 'fetch_sources',
        source: 'Feed Screen' 
      });
      // Set empty array on error to show only "All Sources" option
      setSources([]);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const filters = {
        ...(selectedGenre !== 'All' && { genre: selectedGenre }),
        ...(selectedSource !== 'All' && { source: selectedSource })
      };

      // Try cache first
      const cachedArticles = await CacheService.getArticles(filters);
      if (cachedArticles) {
        
        // Normalize articles to prevent duplicates
        const normalizedCachedArticles = normalizeArticles(cachedArticles);
        setArticles(normalizedCachedArticles);
        
        // Force UI update after cached articles are set
        setTimeout(() => {
          setUiUpdateTrigger(prev => prev + 1);
        }, 100);
        
        // Update global articles maps
        setAllArticlesMap(prevMap => {
          const newMap = new Map(prevMap);
          normalizedCachedArticles.forEach((article: Article) => {
            newMap.set(article.id, article);
          });
          return newMap;
        });
        
        setNormalizedArticlesMap(prevMap => {
          const newMap = new Map(prevMap);
          normalizedCachedArticles.forEach((article: Article) => {
            if (article.normalizedId) {
              newMap.set(article.normalizedId, article);
            }
          });
          // Force UI update after articles are loaded
          setTimeout(() => {
            setUiUpdateTrigger(prev => prev + 1);
          }, 100);
          
          return newMap;
        });
        
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const params: { genre?: string; source?: string } = {};
      if (selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      if (selectedSource !== 'All') {
        params.source = selectedSource;
      }
      const response = await axios.get(`${API}/articles`, { headers, params });
      
      // Normalize articles to prevent duplicates
      const normalizedArticles = normalizeArticles(response.data);
      
      // Cache the results
      await CacheService.setArticles(normalizedArticles, filters);
      setArticles(normalizedArticles);
      
      // Force UI update after articles are set
      setTimeout(() => {
        setUiUpdateTrigger(prev => prev + 1);
      }, 100);
      
      // Update global articles maps
      setAllArticlesMap(prevMap => {
        const newMap = new Map(prevMap);
        normalizedArticles.forEach((article: Article) => {
          newMap.set(article.id, article);
        });
        return newMap;
      });
      
      setNormalizedArticlesMap(prevMap => {
        const newMap = new Map(prevMap);
        normalizedArticles.forEach((article: Article) => {
          if (article.normalizedId) {
            newMap.set(article.normalizedId, article);
          }
        });
        // Force UI update after articles are loaded
        setTimeout(() => {
          setUiUpdateTrigger(prev => prev + 1);
        }, 100);
        
        return newMap;
      });
    } catch (error: any) {
      console.error('Error fetching articles:', error);
      ErrorHandlingService.showError(error, { 
        action: 'fetch_articles',
        source: 'Feed Screen',
        details: { genre: selectedGenre, source: selectedSource }
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Clear relevant caches to force fresh data
    await CacheService.remove('rss_sources');
    const filters = {
      ...(selectedGenre !== 'All' && { genre: selectedGenre }),
      ...(selectedSource !== 'All' && { source: selectedSource })
    };
    const cacheKey = CacheService.getArticlesCacheKey(filters);
    await CacheService.remove(cacheKey);
    
    // Force refresh sources to get latest source changes
    await Promise.all([fetchSources(true), fetchArticles()]);
    setRefreshing(false);
  };

  const handleArticlePress = async (url: string) => {
    if (url) {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch (error: any) {
        console.error('Error opening article:', error);
        ErrorHandlingService.showError(error, { 
          action: 'open_article',
          source: 'Feed Screen' 
        });
      }
    } else {
      Alert.alert('Error', 'Article link not available.');
    }
  };

  const toggleArticleSelection = (articleId: string) => {
    // Find the article and get its normalized ID
    const article = articles.find(a => a.id === articleId);
    if (!article || !article.normalizedId) {
      console.error('Article not found or missing normalizedId:', articleId);
      return;
    }
    
    const normalizedId = article.normalizedId;
    
    setSelectedArticleIds((prevSelected) => {
      const newSelection = prevSelected.includes(normalizedId)
        ? prevSelected.filter((id) => id !== normalizedId)
        : [...prevSelected, normalizedId];
      
      // Save to AsyncStorage for persistence across filter changes
      saveGlobalSelection(newSelection);
      
      // Exit selection mode if no articles selected
      if (newSelection.length === 0) {
        setSelectionMode(false);
      }
      
      // Force UI update for Web environment
      if (Platform.OS === 'web') {
        setTimeout(() => setUiUpdateTrigger(prev => prev + 1), 100);
      } else {
        setUiUpdateTrigger(prev => prev + 1);
      }
      
      return newSelection;
    });
  };

  // Clear all selections (optimized for Web)
  const clearAllSelections = () => {
    if (Platform.OS === 'web') {
      // For Web: Clear selections gradually to prevent freeze
      setSelectedArticleIds([]);
      saveGlobalSelection([]);
      // Delay UI update to allow React to process the state changes
      setTimeout(() => {
        setUiUpdateTrigger(prev => prev + 1);
      }, 200);
    } else {
      // For native: Immediate clearing
      setSelectedArticleIds([]);
      saveGlobalSelection([]);
      setTimeout(() => {
        setUiUpdateTrigger(prev => prev + 1);
      }, 50);
    }
    // Exit selection mode when clearing all
    setSelectionMode(false);
  };

  // Remove specific article from selection (using normalized ID)
  const removeFromSelection = (articleId: string) => {
    // The articleId passed here is actually the article's original ID, but we store normalized IDs
    // Find the article and get its normalized ID
    const article = Array.from(normalizedArticlesMap.values()).find(a => a.id === articleId);
    if (article && article.normalizedId) {
      const newSelection = selectedArticleIds.filter(id => id !== article.normalizedId);
      setSelectedArticleIds(newSelection);
      saveGlobalSelection(newSelection);
    }
  };

  // Select all articles in current filter
  const selectAllInCurrentFilter = () => {
    const currentNormalizedIds = articles.map(article => article.normalizedId).filter(id => id !== undefined) as string[];
    
    const newSelection = [...new Set([...selectedArticleIds, ...currentNormalizedIds])];
    
    setSelectedArticleIds(newSelection);
    saveGlobalSelection(newSelection);
    
    // Force UI update for Web environment
    if (Platform.OS === 'web') {
      setTimeout(() => setUiUpdateTrigger(prev => prev + 1), 100);
    } else {
      setUiUpdateTrigger(prev => prev + 1);
    }
    
  };

  // Deselect all articles in current filter
  const deselectAllInCurrentFilter = () => {
    const currentNormalizedIds = new Set(articles.map(article => article.normalizedId).filter(id => id !== undefined));
    const newSelection = selectedArticleIds.filter(id => !currentNormalizedIds.has(id));
    setSelectedArticleIds(newSelection);
    saveGlobalSelection(newSelection);
    
    // Force UI update for Web environment
    if (Platform.OS === 'web') {
      setTimeout(() => setUiUpdateTrigger(prev => prev + 1), 100);
    } else {
      setUiUpdateTrigger(prev => prev + 1);
    }
  };

  // Check if all current articles are selected
  const areAllCurrentArticlesSelected = () => {
    if (articles.length === 0) return false;
    return articles.every(article => article.normalizedId && selectedArticleIds.includes(article.normalizedId));
  };

  // Get count of selected articles in current filter
  const getSelectedInCurrentFilterCount = () => {
    const currentNormalizedIds = new Set(articles.map(article => article.normalizedId).filter(id => id !== undefined));
    return selectedArticleIds.filter(id => currentNormalizedIds.has(id)).length;
  };

  // Get selected articles with full data
  const getSelectedArticles = () => {
    const selectedArticles = selectedArticleIds
      .map(normalizedId => {
        const article = normalizedArticlesMap.get(normalizedId);
        return article;
      })
      .filter((article): article is Article => article !== undefined);
    return selectedArticles;
  };

  // Toggle Selection Mode (Pattern B)
  const toggleSelectionMode = () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    
    // Animate FAB rotation
    Animated.timing(fabRotation, {
      toValue: newMode ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    
    // If exiting selection mode, clear selections
    if (!newMode) {
      clearAllSelections();
    }
  };

  const handleCreateAudio = async () => {
    if (selectedArticleIds.length === 0) {
      Alert.alert('Error', 'Please select at least one article to create audio.');
      return;
    }

    setCreatingAudio(true);
    try {
      // Get selected articles using normalized IDs
      const selectedArticles = getSelectedArticles();
      const articleIds = selectedArticles.map((article) => article.id);
      const articleTitles = selectedArticles.map((article) => article.title);
      const articleUrls = selectedArticles.map((article) => article.link);


      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: articleIds,
          article_titles: articleTitles,
          article_urls: articleUrls
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );


      // Record user interactions for personalization (async to avoid blocking UI)
      const recordInteractions = async () => {
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
      };


      // Show success modal instead of alert (exactly like Feed auto-pick)
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      // Background tasks immediately (like Feed auto-pick) - SKIP clearAllSelections to prevent modal interference
      recordInteractions();
      donateShortcut('create-audio');
    } catch (error: any) {
      console.error('Error creating audio:', error);
      
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
          source: 'Feed Screen',
          details: { selectedCount: selectedArticleIds.length }
        });
      }
    } finally {
      setCreatingAudio(false);
    }
  };

  const handleAutoPickFromFeed = async () => {
    if (articles.length === 0) {
      Alert.alert('No Articles', 'No articles available with current filter settings.');
      return;
    }


    setCreatingAudio(true);
    try {
      // Use backend Auto-Pick algorithm with current filter constraints
      const requestBody: any = {
        max_articles: 10, // Feed-auto limit
      };
      
      // Apply current filter constraints to Auto-Pick
      if (selectedSource !== 'All') {
        // Find the source ID for the selected source name
        const selectedSourceObj = sources.find(source => source.name === selectedSource);
        if (selectedSourceObj) {
          requestBody.active_source_ids = [selectedSourceObj.id];
        }
      }
      
      // Apply genre filter using backend support
      if (selectedGenre !== 'All') {
        requestBody.preferred_genres = [selectedGenre];
      }
      
      // Get personalized article selection from backend
      const autoPickResponse = await axios.post(
        `${API}/auto-pick`,
        requestBody,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const availableArticles = autoPickResponse.data;
      
      if (availableArticles.length === 0) {
        Alert.alert('No Articles', 'No suitable articles found with current filter settings.');
        return;
      }

      // Get user's maximum articles limit and validate
      const maxArticles = await AudioLimitService.getMaxArticlesForUser(token!);
      const articlesToUse = Math.min(availableArticles.length, maxArticles);

      // Validate against user limits before proceeding
      const validation = await AudioLimitService.validateAudioCreation(token!, articlesToUse);
      
      if (!validation.isValid) {
        Alert.alert('Audio Creation Limit', validation.errorMessage || 'Unable to create audio due to plan limits.');
        setCreatingAudio(false);
        return;
      }
      
      const selectedArticles = availableArticles.slice(0, articlesToUse);
      const articleIds = selectedArticles.map((article: Article) => article.id);
      const articleTitles = selectedArticles.map((article: Article) => article.title);
      const articleUrls = selectedArticles.map((article: Article) => article.link);


      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: articleIds,
          article_titles: articleTitles,
          article_urls: articleUrls
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Record user interactions for personalization
      for (const article of availableArticles) {
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

      const filterInfo = [];
      if (selectedSource !== 'All') filterInfo.push(`Source: ${selectedSource}`);
      if (selectedGenre !== 'All') filterInfo.push(`Genre: ${selectedGenre}`);
      const filterText = filterInfo.length > 0 ? ` (${filterInfo.join(', ')})` : '';

      // Show success modal instead of alert
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      // Donate shortcut to Siri for auto-pick functionality
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
          source: 'Feed Auto-pick',
          details: { genre: selectedGenre, source: selectedSource }
        });
      }
    } finally {
      setCreatingAudio(false);
    }
  };

  const handleFeedLikeArticle = async (article: Article) => {
    try {
      const isCurrentlyLiked = feedLikedArticles.has(article.id);
      
      if (isCurrentlyLiked) {
        // Cancel like - remove from liked articles
        setFeedLikedArticles(prev => {
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
        setFeedLikedArticles(prev => new Set([...prev, article.id]));
        setFeedDislikedArticles(prev => {
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
    } catch (error: any) {
      console.error('Error recording interaction:', error);
      // Revert optimistic update on error
      if (feedLikedArticles.has(article.id)) {
        setFeedLikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
      } else {
        setFeedLikedArticles(prev => new Set([...prev, article.id]));
      }
    }
  };

  const handleFeedDislikeArticle = async (article: Article) => {
    try {
      const isCurrentlyDisliked = feedDislikedArticles.has(article.id);
      
      if (isCurrentlyDisliked) {
        // Cancel dislike - remove from disliked articles
        setFeedDislikedArticles(prev => {
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
        setFeedDislikedArticles(prev => new Set([...prev, article.id]));
        setFeedLikedArticles(prev => {
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
      }
    } catch (error: any) {
      console.error('Error recording interaction:', error);
      // Revert optimistic update on error
      if (feedDislikedArticles.has(article.id)) {
        setFeedDislikedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
      } else {
        setFeedDislikedArticles(prev => new Set([...prev, article.id]));
      }
    }
  };

  if (loading) {
    return (
      <LoadingIndicator 
        variant="fullscreen"
        text="Loading articles and sources..."
        testID="feed-loading"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Source Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.sourceButtonsContainer}
        contentContainerStyle={styles.sourceButtonsContent}
        accessibilityLabel="Filter articles by news source"
        accessibilityRole="tablist"
      >
        <TouchableOpacity
          key="all-sources"
          onPress={() => setSelectedSource('All')}
          style={[
            styles.filterButton,
            { backgroundColor: selectedSource === 'All' ? theme.primary : theme.surface },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Show all sources"
          accessibilityHint="Tap to view articles from all news sources"
          accessibilityState={{ selected: selectedSource === 'All' }}
        >
          <Text style={[
            styles.filterButtonText,
            { color: selectedSource === 'All' ? '#ffffff' : theme.textSecondary },
          ]}>
            All Sources
          </Text>
        </TouchableOpacity>
        {sources.length > 0 ? (
          sources.map((source) => (
            <TouchableOpacity
              key={source.id}
              onPress={() => setSelectedSource(source.name)}
              style={[
                styles.filterButton,
                { backgroundColor: selectedSource === source.name ? theme.primary : theme.surface },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={`Filter by ${source.name}`}
              accessibilityHint={`Tap to view articles from ${source.name} only`}
              accessibilityState={{ selected: selectedSource === source.name }}
            >
              <Text style={[
                styles.filterButtonText,
                { color: selectedSource === source.name ? '#ffffff' : theme.textSecondary },
              ]}>
                {source.name}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <TouchableOpacity
            style={[styles.filterButton, { opacity: 0.5 }]}
            disabled={true}
          >
            <Text style={[styles.filterButtonText, { color: theme.textMuted }]}>
              No RSS Sources
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Genre Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.genreButtonsContainer}
        contentContainerStyle={styles.genreButtonsContent}
        accessibilityLabel="Filter articles by topic or genre"
        accessibilityRole="tablist"
      >
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            onPress={() => setSelectedGenre(genre)}
            style={[
              styles.genreButton,
              { backgroundColor: selectedGenre === genre ? theme.primary : theme.surface },
            ]}
            accessibilityRole="tab"
            accessibilityLabel={`Filter by ${genre} articles`}
            accessibilityHint={`Tap to view ${genre === 'All' ? 'all articles' : genre + ' articles only'}`}
            accessibilityState={{ selected: selectedGenre === genre }}
          >
            <Text style={[
              styles.genreButtonText,
              { color: selectedGenre === genre ? '#ffffff' : theme.textSecondary },
            ]}>
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Manual Pick Button - Always visible with pick count */}
      <View style={styles.manualPickContainer}>
        {/* Pick Counter - Show when in selection mode and articles are selected */}
        {selectionMode && selectedArticleIds.length > 0 && (
          <View style={styles.pickCounter}>
            <Text style={[styles.pickCounterText, { color: theme.textMuted }]}>
              {selectedArticleIds.length}/20
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.manualPickButton, 
            { 
              backgroundColor: selectionMode ? theme.primary : theme.surface, 
              borderColor: theme.primary 
            }
          ]}
          onPress={toggleSelectionMode}
          disabled={creatingAudio}
          accessibilityRole="button"
          accessibilityLabel={selectionMode ? "Exit manual selection mode" : "Start manual article selection"}
          accessibilityHint={selectionMode ? "Tap to exit manual selection mode" : "Tap to manually select articles for audio creation"}
          accessibilityState={{ selected: selectionMode }}
        >
          <Ionicons 
            name="list" 
            size={16} 
            color={selectionMode ? "#fff" : theme.primary} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[
            styles.manualPickButtonText, 
            { color: selectionMode ? "#fff" : theme.primary }
          ]}>
            Manual Pick
          </Text>
        </TouchableOpacity>
      </View>

      {/* Removed: Unnecessary article count info */}

      <ScrollView 
        style={styles.articlesContainer}
        contentContainerStyle={styles.articlesContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Pattern B: Clean - no redundant selection summary */}
        
        
        {articles.length === 0 ? (
          <Text style={[styles.noArticlesText, { color: theme.textSecondary }]}>No articles found. Add some RSS sources first!</Text>
        ) : (
          articles.map((article) => {
            const isSelected = article.normalizedId ? selectedArticleIds.includes(article.normalizedId) : false;
            
            return (
            <View
              key={article.id}
              style={[
                styles.articleCard, 
                { backgroundColor: theme.surface },
                selectionMode && [
                  styles.articleCardSelectionMode,
                  { backgroundColor: isSelected ? theme.accent : theme.surface }
                ],
                isSelected && { borderColor: theme.primary, borderWidth: 2 }
              ]}
            >
              {/* Jump to Article Button - Show in selection mode */}
              {selectionMode && (
                <TouchableOpacity
                  style={styles.jumpButton}
                  onPress={() => handleArticlePress(article.link)}
                  accessibilityRole="button"
                  accessibilityLabel={`Read full article: ${article.title}`}
                  accessibilityHint="Tap to open the full article in browser"
                >
                  <Ionicons name="open-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
              )}

              {/* Main touchable area for article selection/reading */}
              <TouchableOpacity
                style={styles.articleTouchableArea}
                onPress={selectionMode ? () => toggleArticleSelection(article.id) : () => handleArticlePress(article.link)}
                accessibilityRole="button"
                accessibilityLabel={`Article: ${article.title} from ${article.source_name}`}
                accessibilityHint={selectionMode ? 'Tap to select/deselect this article' : 'Tap to read the full article in browser'}
                accessibilityState={{ selected: isSelected }}
              >
                {/* Pattern B: Left-side checkbox in selection mode */}
                {selectionMode && (
                  <View style={styles.selectionCheckbox}>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isSelected ? theme.primary : theme.textMuted}
                    />
                  </View>
                )}
                
                <View style={[styles.articleContent, selectionMode && styles.articleContentWithCheckbox]}>
                  {/* Header row with source and genre */}
                  <View style={styles.articleHeader}>
                    <Text style={[styles.articleSource, { color: theme.textMuted }]}>{article.source_name}</Text>
                    {article.genre && (
                      <View style={[styles.genreTag, { backgroundColor: theme.secondary }]}>
                        <Text style={[styles.genreTagText, { color: theme.primary }]}>{article.genre}</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Title - limited to 2 lines */}
                  <Text style={[styles.articleTitle, { color: theme.text }]} numberOfLines={2}>{article.title}</Text>
                  
                  {/* Summary - limited to 2 lines */}
                  <Text style={[styles.articleSummary, { color: theme.textSecondary }]} numberOfLines={2}>{article.summary}</Text>
                  
                  {/* Date positioned at bottom left */}
                  <Text style={[styles.articlePublished, { color: theme.textMuted }]}>
                    {article.published ? format(new Date(article.published), 'MMM dd, yyyy') : 'Unknown Date'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Like/Dislike Buttons - Show in normal mode */}
              {!selectionMode && (
                <View style={styles.feedActionButtons}>
                  <TouchableOpacity 
                    onPress={() => handleFeedLikeArticle(article)}
                    style={[
                      styles.feedLikeButton, 
                      { backgroundColor: feedLikedArticles.has(article.id) ? theme.success : theme.accent },
                      feedLikedArticles.has(article.id) && styles.activeButton
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={feedLikedArticles.has(article.id) ? `Unlike article: ${article.title}` : `Like article: ${article.title}`}
                    accessibilityHint={feedLikedArticles.has(article.id) ? "Tap to remove like from this article" : "Tap to mark this article as liked to improve recommendations"}
                    accessibilityState={{ selected: feedLikedArticles.has(article.id) }}
                  >
                    <Ionicons 
                      name={feedLikedArticles.has(article.id) ? "heart" : "heart-outline"} 
                      size={14} 
                      color={feedLikedArticles.has(article.id) ? "#fff" : theme.success}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleFeedDislikeArticle(article)}
                    style={[
                      styles.feedDislikeButton, 
                      { backgroundColor: feedDislikedArticles.has(article.id) ? theme.error : theme.accent },
                      feedDislikedArticles.has(article.id) && styles.activeButton
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={feedDislikedArticles.has(article.id) ? `Remove dislike from article: ${article.title}` : `Dislike article: ${article.title}`}
                    accessibilityHint={feedDislikedArticles.has(article.id) ? "Tap to remove dislike from this article" : "Tap to mark this article as disliked to improve recommendations"}
                    accessibilityState={{ selected: feedDislikedArticles.has(article.id) }}
                  >
                    <Ionicons 
                      name={feedDislikedArticles.has(article.id) ? "close-circle" : "close-circle-outline"} 
                      size={14} 
                      color={feedDislikedArticles.has(article.id) ? "#fff" : theme.error}
                    />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Pattern B: No plus buttons - selection only in selection mode */}
            </View>
            );
          })
        )}
      </ScrollView>

      {/* Selection Count Info - Show in selection mode */}
      {selectionMode && selectedArticleIds.length > 0 && (
        <View style={[styles.selectionCountInfo, { backgroundColor: theme.accent }]}>
          <Text style={[styles.selectionCountText, { color: theme.primary }]}>
            {selectedArticleIds.length} article{selectedArticleIds.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}

      {/* Auto Pick - Main FAB - Always visible when not in selection mode */}
      {!selectionMode && (
        <TouchableOpacity
          style={[
            styles.mainFAB, 
            { 
              backgroundColor: theme.primary,
              bottom: showMiniPlayer ? 140 : 20,
              right: 20
            }
          ]}
          onPress={handleAutoPickFromFeed}
          disabled={creatingAudio}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Auto-pick articles and create audio"
          accessibilityHint="Automatically selects top articles from current filter and creates audio"
        >
          {creatingAudio ? (
            <ActivityIndicator color="#fff" size={20} />
          ) : (
            <Ionicons name="sparkles" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      )}

      {/* Create Audio FAB - Show in selection mode when articles are selected */}
      {selectionMode && selectedArticleIds.length > 0 && (
        <TouchableOpacity
          style={[
            styles.mainFAB,
            {
              backgroundColor: theme.success,
              bottom: showMiniPlayer ? 140 : 20,
              right: 20
            }
          ]}
          onPress={handleCreateAudio}
          disabled={creatingAudio}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Create audio from ${selectedArticleIds.length} selected articles`}
          accessibilityHint="Tap to create audio from selected articles"
        >
          {creatingAudio ? (
            <ActivityIndicator color="#fff" size={20} />
          ) : (
            <Ionicons 
              name="musical-notes" 
              size={24} 
              color="#fff" 
            />
          )}
        </TouchableOpacity>
      )}

      {/* Removed: Complex Selected Articles Modal */}

      {/* Success Modal */}
      <AudioCreationSuccessModal
        visible={showSuccessModal}
        audioTitle={createdAudio?.title || ''}
        audioItem={createdAudio}
        onClose={() => {
          setShowSuccessModal(false);
          setCreatedAudio(null);
          // Clear selections after modal closes to prevent interference
          setTimeout(() => clearAllSelections(), 100);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  sourceButtonsContainer: {
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    maxHeight: 50,
  },
  sourceButtonsContent: {
    paddingVertical: 0,
    alignItems: 'center',
  },
  genreButtonsContainer: {
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 0,
    maxHeight: 50,
  },
  genreButtonsContent: {
    paddingVertical: 0,
    alignItems: 'center',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 4,
  },
  filterButtonText: {
    color: '#4a5568',
    fontWeight: '600',
    fontSize: 14,
  },
  genreButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 4,
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
    marginBottom: 8,
    height: 140, // Fixed height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  // Pattern B: Selection mode styles
  articleCardSelectionMode: {
    paddingLeft: 8,
  },
  selectionCheckbox: {
    paddingHorizontal: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  articleContent: {
    flex: 1,
    height: '100%',
    paddingRight: 60, // Space for like/dislike buttons
    justifyContent: 'flex-start',
    position: 'relative',
  },
  articleContentWithCheckbox: {
    marginRight: 10,
    marginLeft: 0,
  },
  plusButton: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  plusButtonSelected: {
    backgroundColor: '#d1e7dd',
  },
  articleSource: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 4,
    color: '#1f2937',
    lineHeight: 20,
  },
  articleSummary: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 8,
    lineHeight: 18,
    flex: 1,
  },
  articlePublished: {
    fontSize: 11,
    color: '#9ca3af',
    position: 'absolute',
    bottom: 0,
    left: 0,
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
  // Pattern B: Clean FAB and Sticky Bar styles
  mainFAB: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
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
  fabTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  // Simple sticky bar
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stickyBarTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  stickyBarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Simple info container
  manualPickContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  manualPickButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualPickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  simpleInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  simpleInfoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  selectionCountInfo: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickCounter: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickCounterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  jumpButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  articleTouchableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  genreTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    maxWidth: 70,
  },
  genreTagText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedActionButtons: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 8,
    right: 8,
    gap: 6,
  },
  feedLikeButton: {
    padding: 4,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedDislikeButton: {
    padding: 4,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Removed: Complex selection UI styles
  // Removed: Modal and complex selection UI styles
  // Removed: selectAllContainer, filterInfo, selectAllButton, selectAllButtonText
});