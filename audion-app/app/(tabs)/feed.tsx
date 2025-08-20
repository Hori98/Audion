import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Platform, Animated, Easing, TextInput, SafeAreaView, Linking, PanResponder, Dimensions } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
// Removed expo-web-browser - using native reader mode instead
import { Ionicons } from '@expo/vector-icons'; // Added import
import { useSiriShortcuts } from '../../hooks/useSiriShortcuts';
import AudioCreationSuccessModal from '../../components/AudioCreationSuccessModal';
import LoadingIndicator from '../../components/LoadingIndicator';
import LoadingButton from '../../components/LoadingButton';
import PlanUpgradeModal from '../../components/PlanUpgradeModal';
import CacheService from '../../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorHandlingService } from '../../services/ErrorHandlingService';
import AudioLimitService from '../../services/AudioLimitService';
import AudioMetadataService from '../../services/AudioMetadataService';
import NotificationService from '../../services/NotificationService';
import ArchiveService from '../../services/ArchiveService';
import PersonalizationService from '../../services/PersonalizationService';
import { Article } from '../../types';
import { getAPIPromptData, getPromptSettingsForMode } from '../../utils/promptUtils';
import SearchBar from '../../components/SearchBar';
import SearchUtils from '../../utils/searchUtils';
import BookmarkService from '../../services/BookmarkService';
import ArticleReader from '../../components/ArticleReader';
import HeaderSearchIcon from '../../components/HeaderSearchIcon';
import OptimizedArticleList from '../../components/OptimizedArticleList';
import DualFilterUI from '../../components/DualFilterUI';
import FeedFilterMenu from '../../components/FeedFilterMenu';
import GlobalEventService from '../../services/GlobalEventService';
import FeedActionBar from '../../components/FeedActionBar';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;
const { width: screenWidth } = Dimensions.get('window');

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
  const { currentVoiceLanguage } = useLanguage();
  const { t } = useTranslation();
  const { donateShortcut } = useSiriShortcuts();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedSource, setSelectedSource] = useState<string>('All Sources'); // Added back for Feed tab dual filtering
  const [selectedReadingFilter, setSelectedReadingFilter] = useState('All Articles');
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]); // Global selection state
  const [allArticlesMap, setAllArticlesMap] = useState<Map<string, Article>>(new Map()); // Track all articles across filters
  const [normalizedArticlesMap, setNormalizedArticlesMap] = useState<Map<string, Article>>(new Map()); // Track articles by normalized ID
  const [creatingAudio, setCreatingAudio] = useState(false); // Added state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAudio, setCreatedAudio] = useState<any>(null);
  const [showPlanUpgradeModal, setShowPlanUpgradeModal] = useState(false);
  const [planUpgradeInfo, setPlanUpgradeInfo] = useState<{errorMessage?: string; usageInfo?: any}>({});
  const [refreshing, setRefreshing] = useState(false);
  // Removed: showSelectedModal state and uiUpdateTrigger to prevent animation interruption
  const [selectionMode, setSelectionMode] = useState(false); // Pattern B selection mode

  const [fabRotation] = useState(new Animated.Value(0)); // FAB animation
  const [feedLikedArticles, setFeedLikedArticles] = useState<Set<string>>(new Set());
  const [feedDislikedArticles, setFeedDislikedArticles] = useState<Set<string>>(new Set());
  const [archivedArticles, setArchivedArticles] = useState<Set<string>>(new Set()); // Track archived articles
  const [readingHistory, setReadingHistory] = useState<Map<string, Date>>(new Map()); // Track reading history by article ID
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality
  const [readLaterStatus, setReadLaterStatus] = useState<Map<string, boolean>>(new Map());
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleReader, setShowArticleReader] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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
      
      console.log(`Feed edge swipe: pageX=${pageX}, dx=${dx}, vx=${vx}, screenWidth=${screenWidth}`);
      
      // Left edge swipe right - go to previous tab (home)
      if (pageX < edgeThreshold && (dx > swipeThreshold || vx > velocityThreshold)) {
        console.log('Navigating to home tab');
        router.push('/(tabs)/');
      }
      // Right edge swipe left - go to next tab (playlist)
      else if (pageX > screenWidth - edgeThreshold && (dx < -swipeThreshold || vx < -velocityThreshold)) {
        console.log('Navigating to playlist tab');
        router.push('/(tabs)/playlist');
      }
    },
  });

  // Global event listeners for header actions
  useEffect(() => {
    const eventService = GlobalEventService.getInstance();
    
    const unsubscribeSearch = eventService.onFeedSearchTrigger(() => {
      setShowSearchModal(true);
    });
    
    const unsubscribeFilter = eventService.onFeedFilterTrigger(() => {
      setShowFilterMenu(true);
    });

    const unsubscribeAutoPick = eventService.on('feed:autopick', () => {
      handleCreateAutoPickAudio();
    });

    const unsubscribeManualPick = eventService.on('feed:manualpick', () => {
      toggleSelectionMode();
    });

    return () => {
      unsubscribeSearch();
      unsubscribeFilter();
      unsubscribeAutoPick();
      unsubscribeManualPick();
    };
  }, [handleCreateAutoPickAudio, toggleSelectionMode]);

  // 検索クエリ変更時の処理（履歴保存含む）
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    // 検索実行時に履歴を保存（空でない場合）
    if (query.trim() && query.length > 2) {
      await SearchUtils.saveSearchHistory(query, 'feed_search_history');
    }
  };

  // Import from constants like Home tab
  const GENRES = ['All', 'Breaking News', 'Technology', 'Business', 'Politics', 'World', 'Sports', 'Entertainment'];

  const readingFilters = [
    'All Articles', 'Unread', 'Read', 'This Week\'s Reads'
  ];

  // Built-in prompt options
  const builtInPrompts = [
    { id: 'standard', name: 'Standard', description: 'Balanced approach with comprehensive coverage', icon: 'checkmark-circle-outline', color: theme.primary },
    { id: 'strict', name: 'Strict', description: 'Precise, fact-focused reporting', icon: 'shield-checkmark-outline', color: '#EF4444' },
    { id: 'gentle', name: 'Gentle', description: 'Accessible, conversational tone', icon: 'happy-outline', color: '#10B981' },
    { id: 'insightful', name: 'Insightful', description: 'Deep analysis with context and implications', icon: 'bulb-outline', color: '#F59E0B' }
  ];

  useFocusEffect(
    React.useCallback(() => {
      const initializeData = async () => {
        if (token && token !== '') {
          await loadGlobalSelection();
          await loadArchivedArticles();
          await loadReadingHistory();
          await loadReadLaterStatus();
          // Force refresh sources to get latest changes from sources screen
          await fetchSources(true);
          await fetchArticles();
        }
      };
      initializeData();
    }, [token])
  );

  // Genre filtering is client-side only - NO API calls on genre change (like Home tab)
  // useEffect removed to prevent animation interruption

  // Removed unnecessary UI update effect to prevent animation interruption

  // Initialize NotificationService on component mount
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await NotificationService.getInstance().initialize();
      } catch (error) {
        console.error('❌ Feed: Failed to initialize NotificationService:', error);
      }
    };
    
    initNotifications();
  }, []);

  // Load global selection state from AsyncStorage
  const loadGlobalSelection = async () => {
    try {
        const savedSelection = await AsyncStorage.getItem('feed_selected_articles');
      if (savedSelection) {
        const parsed = JSON.parse(savedSelection);
        setSelectedArticleIds(parsed);
        // Force UI update after loading selection
        return parsed;
      } else {
        setSelectedArticleIds([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading global selection:', error);
      return [];
    }
  };

  // Load archived articles from backend
  const loadArchivedArticles = async () => {
    try {
      if (!token) return;
      
      await ArchiveService.getInstance().initialize(token);
      const archivedIds = new Set(ArchiveService.getInstance().getArchivedArticleIds());
      setArchivedArticles(archivedIds);
    } catch (error) {
      console.warn('Error loading archived articles:', error);
      // Don't block app if archive loading fails
    }
  };

  // Load reading history from AsyncStorage
  const loadReadingHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('reading_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convert string dates back to Date objects
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

  // Save reading history to AsyncStorage
  const saveReadingHistory = async (historyMap: Map<string, Date>) => {
    try {
      const historyObj = Object.fromEntries(
        Array.from(historyMap.entries()).map(([key, value]) => [key, value.toISOString()])
      );
      await AsyncStorage.setItem('reading_history', JSON.stringify(historyObj));
    } catch (error) {
      console.error('Error saving reading history:', error);
    }
  };

  // Load Read Later status for all articles
  const loadReadLaterStatus = async () => {
    if (!token) return;
    
    try {
      const bookmarks = await BookmarkService.getInstance().getBookmarks(token);
      const statusMap = new Map<string, boolean>();
      
      // Update status map based on bookmarks with read_later flag
      bookmarks.forEach(bookmark => {
        if (bookmark.read_later) {
          statusMap.set(bookmark.article_id, true);
        }
      });
      
      setReadLaterStatus(statusMap);
    } catch (error) {
      console.warn('Error loading read later status:', error);
    }
  };

  // Handle Read Later toggle
  const handleReadLaterToggle = async (article: Article, event: any) => {
    event.stopPropagation(); // Prevent article press
    
    if (!token) return;
    
    try {
      const isCurrentlyReadLater = await BookmarkService.getInstance().toggleReadLater(token, article);
      
      // Update local state
      setReadLaterStatus(prev => {
        const newMap = new Map(prev);
        if (isCurrentlyReadLater) {
          newMap.set(article.id, true);
        } else {
          newMap.delete(article.id);
        }
        return newMap;
      });
      
    } catch (error) {
      console.error('Error toggling read later:', error);
      Alert.alert('エラー', '後で読む機能でエラーが発生しました');
    }
  };

  // Record article reading
  const recordArticleReading = async (article: Article) => {
    try {
      const readAt = new Date();
      const newHistory = new Map(readingHistory);
      newHistory.set(article.id, readAt);
      setReadingHistory(newHistory);
      await saveReadingHistory(newHistory);

      // Also send to backend for persistence and analytics
      axios.post(
        `${API}/reading-history`,
        {
          article_id: article.id,
          article_normalized_id: article.normalizedId,
          article_title: article.title,
          article_url: article.link,
          source_name: article.source_name || article.source || 'Unknown',
          genre: article.genre || 'General',
          read_at: readAt.toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(error => {
        // Don't block UI if backend fails
        console.warn('Failed to sync reading history to backend:', error);
      });
    } catch (error) {
      console.error('Error recording article reading:', error);
    }
  };

  // Generate normalized ID for article deduplication
  const generateNormalizedId = (article: Article): string => {
    // Use title + source + published date to create a unique identifier
    const key = `${article.title?.trim() || ''}_${(article.source_name || article.source || 'unknown').trim()}_${article.published || article.published_at || ''}`;
    // Simple hash function to create shorter ID
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `norm_${Math.abs(hash).toString(36)}`;
  };

  // Check if article was read this week
  const isReadThisWeek = (articleId: string): boolean => {
    const readDate = readingHistory.get(articleId);
    if (!readDate) return false;
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    return readDate >= weekStart;
  };

  // Filter articles based on reading status and search query (using SearchUtils)
  const getFilteredArticles = (): Article[] => {
    let filteredArticles = articles;

    // Apply reading filter first
    switch (selectedReadingFilter) {
      case 'Unread':
        filteredArticles = articles.filter(article => !readingHistory.has(article.id));
        break;
      case 'Read':
        filteredArticles = articles.filter(article => readingHistory.has(article.id));
        break;
      case 'This Week\'s Reads':
        filteredArticles = articles.filter(article => isReadThisWeek(article.id));
        break;
      case 'All Articles':
      default:
        filteredArticles = articles;
        break;
    }

    // Apply search and genre filters using SearchUtils (same as Home tab)
    return SearchUtils.filterArticles(filteredArticles, {
      searchQuery: searchQuery.trim(),
      genre: selectedGenre,
    });
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
      // No source filtering, genre filtering is client-side (same as Home tab)
      const filters = {};

      // Try cache first
      const cachedArticles = await CacheService.getArticles(filters);
      if (cachedArticles) {
        // Normalize articles to prevent duplicates
        const normalizedCachedArticles = normalizeArticles(cachedArticles);
        setArticles(normalizedCachedArticles);
        
        // Force UI update after cached articles are set
        setTimeout(() => {
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
              }, 100);
          
          return newMap;
        });
        
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const params: { genre?: string } = {};
      if (selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      const response = await axios.get(`${API}/articles`, { headers, params });
      
      // Normalize articles to prevent duplicates
      const normalizedArticles = normalizeArticles(response.data);
      
      // Cache the results
      await CacheService.setArticles(normalizedArticles, filters);
      setArticles(normalizedArticles);
      
      // Force UI update after articles are set
      setTimeout(() => {
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
          }, 100);
        
        return newMap;
      });
    } catch (error: any) {
      console.error('Error fetching articles:', error);
      ErrorHandlingService.showError(error, { 
        action: 'fetch_articles',
        source: 'Feed Screen',
        details: { genre: selectedGenre }
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear relevant caches to force fresh data (simplified like Home tab)
      await CacheService.remove('rss_sources');
      const filters = {
        ...(selectedGenre !== 'All' && { genre: selectedGenre })
      };
      const cacheKey = CacheService.getArticlesCacheKey(filters);
      await CacheService.remove(cacheKey);
      
      // Simplified refresh like Home tab
      await fetchArticles();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
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
      } else {
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
      }, 200);
    } else {
      // For native: Immediate clearing
      setSelectedArticleIds([]);
      saveGlobalSelection([]);
      setTimeout(() => {
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
    } else {
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
    } else {
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
  const toggleSelectionMode = async () => {
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
      // Load prompt settings using unified system
      let promptData;
      if (selectionMode) {
        // Use temporary override in selection mode with fallback to unified custom prompt
        const { customPrompt } = await getPromptSettingsForMode('manual');
        promptData = {
          prompt_style: 'standard',
          custom_prompt: customPrompt
        };
      } else {
        // Use unified prompt settings for manual mode
        promptData = await getAPIPromptData('manual');
      }
      
      // Get selected articles using normalized IDs
      const selectedArticles = getSelectedArticles();
      
      // Validate against user limits before proceeding
      const validation = await AudioLimitService.validateAudioCreation(token!, selectedArticles.length);
      
      if (!validation.isValid) {
        Alert.alert('Audio Creation Limit', validation.errorMessage || 'Unable to create audio due to plan limits.');
        setCreatingAudio(false);
        return;
      }
      
      const articleIds = selectedArticles.map((article) => article.id);
      const articleTitles = selectedArticles.map((article) => article.title);
      const articleUrls = selectedArticles.map((article) => article.link);

      // Debug voice language setting
      
      // Add debug headers if bypass is enabled
      const headers: any = { Authorization: `Bearer ${token}` };
      if (require('../../services/DebugService').default.shouldBypassSubscriptionLimits()) {
        headers['X-Debug-Bypass-Limits'] = 'true';
        headers['X-Debug-Mode'] = 'true';
      }

      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: articleIds,
          article_titles: articleTitles,
          article_urls: articleUrls,
          ...promptData,
          voice_language: currentVoiceLanguage,
          voice_name: "alloy" // Default voice, can be made configurable later
        },
        { headers }
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

      // Save prompt metadata for this audio
      await AudioMetadataService.saveAudioMetadata({
        audioId: response.data.id,
        promptMode: 'manual',
        promptStyle: promptData.prompt_style as any,
        customPrompt: promptData.custom_prompt,
        createdAt: new Date().toISOString(),
        creationMethod: 'selection'
      });

      // Show success modal instead of alert (exactly like Feed auto-pick)
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      // Send completion notification
      try {
        await NotificationService.getInstance().sendAudioReadyNotification(
          response.data.title || 'Manual Selection Audio',
          selectedArticles.length,
          response.data.id
        );
      } catch (notifError) {
        console.error('❌ Failed to send audio ready notification:', notifError);
      }
      
      // Background tasks immediately (like Feed auto-pick) - SKIP clearAllSelections to prevent modal interference
      recordInteractions();
      donateShortcut('create-audio');
    } catch (error: any) {
      console.error('Error creating audio:', error);
      
      // Handle 429 rate limit error with plan upgrade modal
      if (error.response?.status === 429) {
        const errorData = error.response.data;
        setPlanUpgradeInfo({
          errorMessage: errorData.message || '音声作成の制限に達しました',
          usageInfo: errorData.usage_info
        });
        setShowPlanUpgradeModal(true);
        return;
      }
      
      // Handle other limit exceeded errors
      if (error.response?.status === 403 && error.response?.data?.type === 'limit_exceeded') {
        const errorData = error.response.data;
        Alert.alert(
          'Limit Reached', 
          errorData.message,
          [
            { text: 'OK', style: 'default' },
            { text: 'View Usage', onPress: () => {
              // TODO: Navigate to subscription/usage page
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


  // Create audio from this week's read articles
  const handleCreateAutoPickAudio = async () => {
    if (filteredArticles.length === 0) {
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
              // AutoPick should respect BOTH source and genre filters (dual filtering)
              const autoPickRequest = {
                max_articles: 5,
                ...(selectedGenre !== 'All' && { preferred_genres: [selectedGenre] }),
                ...(selectedSource !== 'All Sources' && { preferred_sources: [selectedSource] })
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
              console.error('Feed AutoPick Error:', error);
              console.error('Error Details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
              });
              Alert.alert('Error', error.response?.data?.detail || error.message || 'Failed to auto-pick articles');
            } finally {
              setCreatingAudio(false);
            }
          }
        }
      ]
    );
  };

  const handleCreateWeeklyAudio = async () => {
    if (creatingAudio) {
      return; // Prevent double-clicking
    }

    const weeklyArticles = articles.filter(article => isReadThisWeek(article.id));
    
    if (weeklyArticles.length === 0) {
      Alert.alert('No Weekly Reads', 'No articles have been read this week.');
      return;
    }

    setCreatingAudio(true);
    try {
      // Validate against user limits before proceeding
      const validation = await AudioLimitService.validateAudioCreation(token!, weeklyArticles.length);
      
      if (!validation.isValid) {
        Alert.alert('Audio Creation Limit', validation.errorMessage || 'Unable to create audio due to plan limits.');
        setCreatingAudio(false);
        return;
      }

      // Load prompt settings using unified system for manual mode
      const promptData = await getAPIPromptData('create-audio');

      const articleIds = weeklyArticles.map(article => article.id);
      const articleTitles = weeklyArticles.map(article => article.title);
      const articleUrls = weeklyArticles.map(article => article.link);

      // Add debug headers if bypass is enabled
      const headers: any = { Authorization: `Bearer ${token}` };
      if (require('../../services/DebugService').default.shouldBypassSubscriptionLimits()) {
        headers['X-Debug-Bypass-Limits'] = 'true';
        headers['X-Debug-Mode'] = 'true';
      }

      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: articleIds,
          article_titles: articleTitles,
          article_urls: articleUrls,
          ...promptData,
          voice_language: currentVoiceLanguage,
          voice_name: "alloy"
        },
        { headers }
      );

      // Record interactions for all articles
      for (const article of weeklyArticles) {
        try {
          await axios.post(
            `${API}/user-interaction`,
            {
              article_id: article.id,
              interaction_type: 'created_weekly_audio',
              genre: article.genre || 'General'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (interactionError) {
          console.warn('Failed to record weekly audio interaction:', interactionError);
        }
      }

      // Save prompt metadata for this audio
      await AudioMetadataService.saveAudioMetadata({
        audioId: response.data.id,
        promptMode: 'manual',
        promptStyle: promptData.prompt_style as any,
        customPrompt: promptData.custom_prompt,
        createdAt: new Date().toISOString(),
        creationMethod: 'weekly'
      });

      // Show success modal
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      // Send completion notification
      try {
        const articleCount = response.data.article_count || 10; // Default for weekly
        await NotificationService.getInstance().sendAudioReadyNotification(
          response.data.title || 'Weekly Audio Digest',
          articleCount,
          response.data.id
        );
      } catch (notifError) {
        console.error('❌ Failed to send audio ready notification:', notifError);
      }
      
      donateShortcut('create-audio');
    } catch (error: any) {
      console.error('Error creating weekly audio:', error);
      
      // Handle limit exceeded errors
      if (error.response?.status === 403 && error.response?.data?.type === 'limit_exceeded') {
        const errorData = error.response.data;
        Alert.alert(
          'Limit Reached', 
          errorData.message,
          [
            { text: 'OK', style: 'default' },
            { text: 'View Usage', onPress: () => {
            }}
          ]
        );
      } else {
        ErrorHandlingService.showError(error, { 
          action: 'create_weekly_audio',
          source: 'Feed Screen - Weekly Reads',
          details: { articleCount: weeklyArticles.length }
        });
      }
    } finally {
      setCreatingAudio(false);
    }
  };

  // Archive/unarchive article
  const handleArchiveArticle = async (article: Article) => {
    try {
      const isCurrentlyArchived = archivedArticles.has(article.id);
      
      if (isCurrentlyArchived) {
        // Unarchive - remove from archive
        await axios.delete(
          `${API}/archive/article/${article.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setArchivedArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(article.id);
          return newSet;
        });
        
        // Show feedback
        Alert.alert('Success', 'Article removed from archive');
      } else {
        // Archive article
        await axios.post(
          `${API}/archive/article`,
          {
            article_id: article.id,
            article_title: article.title,
            article_link: article.link,
            article_summary: article.summary || '',
            article_published: article.published || article.published_at || new Date().toISOString(),
            source_name: article.source_name || article.source || 'Unknown',
            article_genre: article.genre || 'General'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setArchivedArticles(prev => new Set([...prev, article.id]));
        
        // Show feedback
        Alert.alert('Success', 'Article saved to archive');
      }
    } catch (error: any) {
      console.error('Error archiving article:', error);
      
      // Revert optimistic update on error
      setArchivedArticles(prev => {
        const newSet = new Set(prev);
        if (archivedArticles.has(article.id)) {
          newSet.add(article.id);
        } else {
          newSet.delete(article.id);
        }
        return newSet;
      });
      
      ErrorHandlingService.showError(error, {
        action: 'archive_article',
        source: 'Feed Screen',
        details: { articleTitle: article.title }
      });
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

  // Apply DUAL filters (Source + Genre) for Feed tab
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
  
  // Apply SOURCE filter (first level)
  if (selectedSource !== 'All Sources') {
    filteredArticles = filteredArticles.filter(article => 
      article.source_name === selectedSource
    );
  }
  
  // Apply GENRE filter (second level)
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
      {/* Dual Filter - Source and Genre */}
      <DualFilterUI
        sources={sources}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        genres={GENRES}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
      />

      {/* Feed Action Bar - Unified controls */}
      <FeedActionBar
        articlesCount={filteredArticles.length}
        selectedCount={selectedArticleIds.length}
        selectionMode={selectionMode}
        isCreating={creatingAudio}
        onAutoPick={handleCreateAutoPickAudio}
        onToggleSelection={toggleSelectionMode}
        onReadStatusFilter={() => setShowFilterMenu(true)}
      />

      {/* Articles List - Using OptimizedArticleList (EXACTLY LIKE HOME TAB) */}
      <OptimizedArticleList
        articles={filteredArticles}
        onArticlePress={handleArticlePress}
        refreshing={refreshing}
        onRefresh={onRefresh}
        loading={loading}
      />


      {/* Selection Count moved to floating section above */}


      {/* Selection Count Info - Show in selection mode */}
      {selectionMode && selectedArticleIds.length > 0 && (
        <View style={[
          styles.selectionCountInfo, 
          { 
            backgroundColor: theme.accent,
            // Simple positioning above buttons (adjusted for native)
            bottom: showMiniPlayer ? 160 : 120, // Adjusted for reduced button position
          }
        ]}>
          <Text style={[styles.selectionCountText, { color: theme.primary }]}>
            {selectedArticleIds.length} article{selectedArticleIds.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}

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

      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal
        visible={showPlanUpgradeModal}
        onClose={() => setShowPlanUpgradeModal(false)}
        errorMessage={planUpgradeInfo.errorMessage}
        usageInfo={planUpgradeInfo.usageInfo}
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
          
          <ScrollView style={styles.searchResults}>
            {(() => {
              const filteredArticles = getFilteredArticles().filter(article =>
                article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.summary?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              return filteredArticles.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="search" size={48} color={theme.textMuted} />
                  <Text style={[styles.noResultsText, { color: theme.textMuted }]}>
                    {searchQuery.trim() ? '検索結果がありません' : '検索キーワードを入力してください'}
                  </Text>
                </View>
              ) : (
                filteredArticles.slice(0, 20).map((article) => (
                  <TouchableOpacity
                    key={article.id}
                    style={[styles.searchResultItem, { backgroundColor: theme.surface }]}
                    onPress={() => {
                      setShowSearchModal(false);
                      handleArticlePress(article);
                    }}
                  >
                    <Text style={[styles.searchResultTitle, { color: theme.text }]} numberOfLines={2}>
                      {article.title}
                    </Text>
                    <Text style={[styles.searchResultSource, { color: theme.textSecondary }]}>
                      {article.source_name}
                    </Text>
                  </TouchableOpacity>
                ))
              );
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Article Reader Modal */}
      <ArticleReader
        article={selectedArticle}
        visible={showArticleReader}
        onClose={() => {
          setShowArticleReader(false);
          setSelectedArticle(null);
        }}
      />

      {/* Feed Filter Menu */}
      <FeedFilterMenu
        visible={showFilterMenu}
        onClose={() => setShowFilterMenu(false)}
        selectedReadingFilter={selectedReadingFilter}
        onReadingFilterChange={setSelectedReadingFilter}
        readingFilters={readingFilters}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  searchResultItem: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultSource: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  // Simplified to match Home tab - removed source filter styles
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
  // Note: mainFAB and floatingButton styles removed - now using UnifiedFloatingButtons
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
  // Removed old manualPickContainer styles - now using floating buttons
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
  // Removed pickCounter styles - simplified UI
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
  sourceWithReadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  readIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
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
  feedArchiveButton: {
    padding: 4,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedReadLaterButton: {
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
  // Removed auto/weekly button styles - now using floating buttons
  modalContainer: {
    flex: 1,
  },
  modalBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  customPromptSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  textInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  customPromptInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 120,
    maxHeight: 200,
  },
  promptExamples: {
    marginTop: 24,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  activeButton: {
    // Styles for active state
  },
  // Removed selectedArticlesList styles - simplified selection UI
});