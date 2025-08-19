import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  PanResponder,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Article } from '../../types';
import CacheService from '../../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../../services/NotificationService';
import ArchiveService from '../../services/ArchiveService';
import SearchBar from '../../components/SearchBar';
import PersonalizationService from '../../services/PersonalizationService';
import SearchUtils from '../../utils/searchUtils';
import ArticleReader from '../../components/ArticleReader';
import OptimizedArticleList from '../../components/OptimizedArticleList';
import SingleGenreDropdown from '../../components/SingleGenreDropdown';
import GlobalEventService from '../../services/GlobalEventService';

// Constants
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;
const GENRES = ['All', 'Breaking News', 'Technology', 'Business', 'Politics', 'World', 'Sports', 'Entertainment'];
const { width: screenWidth } = Dimensions.get('window');

export default function MainScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  // Simplified state management like the working version
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [creatingAudio, setCreatingAudio] = useState(false);
  const [readingHistory, setReadingHistory] = useState<Map<string, Date>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleReader, setShowArticleReader] = useState(false);

  // Edge swipe for tab navigation
  const edgeSwipeResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      const { pageX } = evt.nativeEvent;
      const edgeThreshold = 30;
      
      // Only respond to gestures that start near the screen edges
      return (pageX < edgeThreshold || pageX > screenWidth - edgeThreshold) &&
             Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      const { pageX } = evt.nativeEvent;
      const edgeThreshold = 30;
      
      return (pageX < edgeThreshold || pageX > screenWidth - edgeThreshold) &&
             Math.abs(gestureState.dx) > 10 &&
             Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, vx } = gestureState;
      const { pageX } = evt.nativeEvent;
      const edgeThreshold = 30;
      const swipeThreshold = 50;
      const velocityThreshold = 0.5;
      
      console.log(`Home edge swipe: pageX=${pageX}, dx=${dx}, vx=${vx}, screenWidth=${screenWidth}`);
      
      // Left edge swipe right - go to previous tab (sources)
      if (pageX < edgeThreshold && (dx > swipeThreshold || vx > velocityThreshold)) {
        console.log('Navigating to sources tab');
        router.push('/(tabs)/sources');
      }
      // Right edge swipe left - go to next tab (feed)
      else if (pageX > screenWidth - edgeThreshold && (dx < -swipeThreshold || vx < -velocityThreshold)) {
        console.log('Navigating to feed tab');
        router.push('/(tabs)/feed');
      }
    },
  });

  // Search query change handler with history save
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    // Save search history on execution (if not empty)
    if (query.trim() && query.length > 2) {
      await SearchUtils.saveSearchHistory(query, 'home_search_history');
    }
  };

  // Global event listener for search modal
  useEffect(() => {
    const eventService = GlobalEventService.getInstance();
    const unsubscribe = eventService.onHomeSearchTrigger(() => {
      setShowSearchModal(true);
    });

    return unsubscribe;
  }, []);

  // Initialize data on focus with parallel processing
  useFocusEffect(
    React.useCallback(() => {
      const initializeData = async () => {
        if (!token) return;

        // Initialize reading history and other services first
        const [history] = await Promise.all([
          loadReadingHistoryFromStorage(),
          NotificationService.getInstance().initialize(),
          ArchiveService.getInstance().initialize(token),
        ]);

        setReadingHistory(history);
        
        // Fetch articles after other initialization is complete
        await fetchArticles();
      };

      initializeData();
    }, [token])
  );

  // Genre filter change effect like the working version  
  useEffect(() => {
    if (token) {
      fetchArticles();
    }
  }, [selectedGenre]);

  const fetchArticles = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const filters = {
        ...(selectedGenre !== 'All' && { genre: selectedGenre }),
      };

      // Try cache first like the working version
      const cachedArticles = await CacheService.getArticles(filters);
      if (cachedArticles && cachedArticles.length > 0) {
        console.log(`Home: Loaded ${cachedArticles.length} articles from cache`);
        setArticles(cachedArticles);
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const params: { genre?: string } = {};
      if (selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      
      const response = await axios.get(`${API}/articles`, { headers, params });
      
      if (response.data && response.data.length > 0) {
        console.log(`Home: Loaded ${response.data.length} articles from API`);
        await CacheService.setArticles(response.data, filters);
        setArticles(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles().finally(() => setRefreshing(false));
  }, [selectedGenre]);

  // Load reading history from AsyncStorage
  const loadReadingHistoryFromStorage = async (): Promise<Map<string, Date>> => {
    try {
      const history = await AsyncStorage.getItem('reading_history');
      if (history) {
        const parsed = JSON.parse(history);
        const map = new Map();
        Object.entries(parsed).forEach(([key, value]) => {
          map.set(key, new Date(value as string));
        });
        return map;
      }
    } catch (error) {
      console.warn('Error loading reading history:', error);
    }
    return new Map();
  };

  const saveReadingHistoryToStorage = async (history: Map<string, Date>) => {
    try {
      const historyObj = Object.fromEntries(
        Array.from(history.entries()).map(([key, value]) => [key, value.toISOString()])
      );
      await AsyncStorage.setItem('reading_history', JSON.stringify(historyObj));
    } catch (error) {
      console.warn('Error saving reading history:', error);
    }
  };

  const handleArticlePress = async (article: Article) => {
    // Save reading history
    const newHistory = new Map(readingHistory);
    newHistory.set(article.id, new Date());
    setReadingHistory(newHistory);
    await saveReadingHistoryToStorage(newHistory);
    
    // Record interaction
    await PersonalizationService.recordInteraction({
      action: 'play',
      contentId: article.id,
      contentType: 'article',
      category: article.genre || 'General',
      source: article.source_name,
      timestamp: Date.now(),
      engagementLevel: 'medium',
    });
    
    // Open article in new modal reader
    setSelectedArticle(article);
    setShowArticleReader(true);
  };

  const createAudioFromArticles = async () => {
    if (articles.length === 0) {
      Alert.alert('No Articles', 'Please add some RSS sources and refresh to get articles.');
      return;
    }

    Alert.alert(
      'Auto-Pick & Create Podcast',
      'Let AI automatically select the best articles and create a personalized podcast for you?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Auto-Pick',
          onPress: async () => {
            setCreatingAudio(true);
            try {
              // AutoPick should respect current genre selection
              const autoPickRequest = {
                max_articles: 5,
                ...(selectedGenre !== 'All' && { preferred_genres: [selectedGenre] })
              };
              
              const autoPickResponse = await axios.post(
                `${API}/auto-pick`,
                autoPickRequest,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              if (autoPickResponse.data && autoPickResponse.data.length > 0) {
                const audioResponse = await axios.post(
                  `${API}/audio/create`,
                  { articles: autoPickResponse.data },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                
                if (audioResponse.data?.audio_url) {
                  Alert.alert(
                    'Success!', 
                    `AI selected ${autoPickResponse.data.length} articles and created your personalized podcast. Check your library!`
                  );
                  
                  await PersonalizationService.recordInteraction({
                    action: 'complete',
                    contentId: audioResponse.data.id,
                    contentType: 'audio',
                    category: 'Auto-Pick Podcast',
                    timestamp: Date.now(),
                    engagementLevel: 'high',
                  });
                  
                  await NotificationService.getInstance().sendAudioReadyNotification(
                    audioResponse.data.title || 'Your AI Podcast',
                    autoPickResponse.data.length,
                    audioResponse.data.id
                  );
                } else {
                  Alert.alert('Error', 'Failed to create audio from selected articles');
                }
              } else {
                Alert.alert('No Selection', 'AI could not find suitable articles for podcast creation. Try again later.');
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to auto-pick articles');
            } finally {
              setCreatingAudio(false);
            }
          }
        }
      ]
    );
  };

  // Apply filters manually for better control
  const articlesArray = Array.isArray(articles) ? articles : [];
  
  let filteredArticles = articlesArray;
  
  // Apply search query filter
  if (searchQuery.trim()) {
    filteredArticles = filteredArticles.filter(article => 
      article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.source_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Apply genre filter (only if not 'All')
  if (selectedGenre !== 'All') {
    filteredArticles = filteredArticles.filter(article => 
      article.genre === selectedGenre
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      {...edgeSwipeResponder.panHandlers}
    >
      {/* Genre Filter Only - Dropdown Style */}
      <SingleGenreDropdown
        genres={GENRES}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
      />

      {/* Articles List - Using OptimizedArticleList like before */}
      <OptimizedArticleList
        articles={filteredArticles}
        onArticlePress={handleArticlePress}
        refreshing={refreshing}
        onRefresh={onRefresh}
        loading={loading}
      />

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <SafeAreaView style={[styles.searchModal, { backgroundColor: theme.background }]}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity
              onPress={() => setShowSearchModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.searchModalTitle, { color: theme.text }]}>
              記事を検索
            </Text>
            <View style={styles.placeholder} />
          </View>
          
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="記事を検索..."
            autoFocus={true}
          />
          
          <OptimizedArticleList
            articles={filteredArticles.slice(0, 20)}
            onArticlePress={(article) => {
              setShowSearchModal(false);
              handleArticlePress(article);
            }}
            refreshing={false}
            loading={false}
          />
        </SafeAreaView>
      </Modal>

      {/* Auto-Pick Floating Button */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: theme.primary }]}
        onPress={createAudioFromArticles}
        disabled={creatingAudio || articles.length === 0}
        activeOpacity={0.8}
      >
        {creatingAudio ? (
          <ActivityIndicator size={24} color="#fff" />
        ) : (
          <Ionicons name="sparkles" size={24} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Article Reader Modal */}
      <ArticleReader
        article={selectedArticle}
        visible={showArticleReader}
        onClose={() => {
          setShowArticleReader(false);
          setSelectedArticle(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Removed old header styles - now handled by main header
  searchModal: {
    flex: 1,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  // Genre styles removed - now handled by SlideGenreNavigation component
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});