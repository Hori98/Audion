import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Platform, Animated, Easing, TextInput, SafeAreaView, Linking } from 'react-native';
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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
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
  const { currentVoiceLanguage } = useLanguage();
  const { t } = useTranslation();
  const { donateShortcut } = useSiriShortcuts();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
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
  // Removed: showSelectedModal state
  const [uiUpdateTrigger, setUiUpdateTrigger] = useState(0); // Force UI updates
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

  // 検索クエリ変更時の処理（履歴保存含む）
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    // 検索実行時に履歴を保存（空でない場合）
    if (query.trim() && query.length > 2) {
      await SearchUtils.saveSearchHistory(query, 'feed_search_history');
    }
  };

  const genres = [
    'All', 'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

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

  // Separate effect for source changes only - genre filtering is now client-side
  useEffect(() => {
    
    const handleSourceChange = async () => {
      if (token && token !== '') {
        // Only refetch when source changes, not genre
        // Ensure we have the latest selection state before fetching articles
        await loadGlobalSelection();
        // Also refresh sources to ensure latest source list is available
        await fetchSources(true);
        await fetchArticles();
      }
    };
    
    handleSourceChange();
  }, [selectedSource]); // Removed selectedGenre - now handled client-side

  // Effect to force UI update when selection or filters change
  useEffect(() => {
    // Force component re-render when selection or filters change
  }, [selectedArticleIds, articles, uiUpdateTrigger, selectedReadingFilter]);

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

    // Apply search, genre, and source filters using SearchUtils
    return SearchUtils.filterArticles(filteredArticles, {
      searchQuery: searchQuery.trim(),
      genre: selectedGenre,
      source: selectedSource,
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
      // Only filter by source, not genre (genre filtering is now client-side)
      const filters = {
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
    try {
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
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleArticlePress = async (url: string, article?: Article) => {
    if (article) {
      try {
        // Record reading history before opening article
        await recordArticleReading(article);
        
        // Open article in new modal reader
        setSelectedArticle(article);
        setShowArticleReader(true);
      } catch (error: any) {
        console.error('Failed to open article:', error);
        // Fallback to external browser if modal fails
        try {
          await Linking.openURL(url);
        } catch (linkError: any) {
          console.error('Failed to open article link:', linkError);
          ErrorHandlingService.showError(linkError, { 
            action: 'open_article',
            source: 'Feed Screen' 
          });
        }
      }
    } else if (url) {
      // Fallback for when no article object is provided
      try {
        await Linking.openURL(url);
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

  // Create audio from a single read article
  const handleCreateSingleAudio = async (article: Article) => {
    if (creatingAudio) {
      return; // Prevent double-clicking
    }

    setCreatingAudio(true);
    try {
      // Validate against user limits before proceeding  
      const validation = await AudioLimitService.validateAudioCreation(token!, 1);
      
      if (!validation.isValid) {
        Alert.alert('Audio Creation Limit', validation.errorMessage || 'Unable to create audio due to plan limits.');
        setCreatingAudio(false);
        return;
      }

      // Load prompt settings using unified system for manual mode
      const promptData = await getAPIPromptData('create-audio');

      // Add debug headers if bypass is enabled
      const headers: any = { Authorization: `Bearer ${token}` };
      if (require('../../services/DebugService').default.shouldBypassSubscriptionLimits()) {
        headers['X-Debug-Bypass-Limits'] = 'true';
        headers['X-Debug-Mode'] = 'true';
      }

      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: [article.id],
          article_titles: [article.title],
          article_urls: [article.link],
          ...promptData
        },
        { headers }
      );

      // Record interaction for personalization
      try {
        await axios.post(
          `${API}/user-interaction`,
          {
            article_id: article.id,
            interaction_type: 'created_single_audio',
            genre: article.genre || 'General'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (interactionError) {
        console.warn('Failed to record single audio interaction:', interactionError);
      }

      // Save prompt metadata for this audio
      await AudioMetadataService.saveAudioMetadata({
        audioId: response.data.id,
        promptMode: 'manual',
        promptStyle: promptData.prompt_style as any,
        customPrompt: promptData.custom_prompt,
        createdAt: new Date().toISOString(),
        creationMethod: 'single-article'
      });

      // Show success modal
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      // Send completion notification
      try {
        await NotificationService.getInstance().sendAudioReadyNotification(
          response.data.title || article.title,
          1,
          response.data.id
        );
      } catch (notifError) {
        console.error('❌ Failed to send audio ready notification:', notifError);
      }
      
      // Donate shortcut for single audio creation
      donateShortcut('create-audio');
    } catch (error: any) {
      console.error('Error creating single audio:', error);
      
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
          action: 'create_single_audio',
          source: 'Feed Screen - Read Article',
          details: { articleTitle: article.title }
        });
      }
    } finally {
      setCreatingAudio(false);
    }
  };

  // Create audio from this week's read articles
  const handleCreateAutoPickAudio = async () => {
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
              // AutoPick should respect current genre and source selection
              const autoPickRequest = {
                max_articles: 5,
                ...(selectedGenre !== 'All' && { preferred_genres: [selectedGenre] }),
                ...(selectedSource !== 'All' && { source_filter: selectedSource })
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Search articles..."
      />
      
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

      {/* Reading Status Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.readingButtonsContainer}
        contentContainerStyle={styles.readingButtonsContent}
        accessibilityLabel="Filter articles by reading status"
        accessibilityRole="tablist"
      >
        {readingFilters.map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setSelectedReadingFilter(filter)}
            style={[
              styles.readingFilterButton,
              { backgroundColor: selectedReadingFilter === filter ? theme.secondary : theme.surface },
            ]}
            accessibilityRole="tab"
            accessibilityLabel={`Filter by ${filter.toLowerCase()}`}
            accessibilityHint={`Tap to view ${filter.toLowerCase()}`}
            accessibilityState={{ selected: selectedReadingFilter === filter }}
          >
            <Text style={[
              styles.readingFilterButtonText,
              { color: selectedReadingFilter === filter ? theme.primary : theme.textSecondary },
            ]}>
              {filter}
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

        {/* Selected Articles List - Show when in selection mode and articles are selected */}
        {selectionMode && selectedArticleIds.length > 0 && (
          <View style={[styles.selectedArticlesList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.selectedArticlesTitle, { color: theme.text }]}>
              Selected Articles:
            </Text>
            <ScrollView 
              style={styles.selectedArticlesScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {getSelectedArticles().map((article) => (
                <View key={article.id} style={[styles.selectedArticleItem, { borderBottomColor: theme.border }]}>
                  <View style={styles.selectedArticleContent}>
                    <Text 
                      style={[styles.selectedArticleTitle, { color: theme.text }]} 
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {article.title}
                    </Text>
                    <Text style={[styles.selectedArticleSource, { color: theme.textSecondary }]}>
                      {article.source_name || article.source}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeArticleButton, { backgroundColor: theme.error + '20' }]}
                    onPress={() => toggleArticleSelection(article.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${article.title} from selection`}
                    accessibilityHint="Tap to remove this article from your selection"
                  >
                    <Ionicons name="remove" size={16} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
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
        
        
        {/* Auto-Pick Button - Show when not in selection mode */}
        {!selectionMode && (
          <TouchableOpacity
            style={[
              styles.autoPickButton,
              { backgroundColor: theme.accent, borderColor: theme.primary }
            ]}
            onPress={handleCreateAutoPickAudio}
            disabled={creatingAudio}
            accessibilityRole="button"
            accessibilityLabel="Auto-pick articles and create audio"
            accessibilityHint="Let AI automatically select best articles and create podcast"
          >
            <Ionicons 
              name="radio-outline" 
              size={16} 
              color={theme.primary}
              style={{ marginRight: 6 }} 
            />
            <Text style={[
              styles.autoPickButtonText, 
              { color: theme.primary }
            ]}>
              Auto-Pick
            </Text>
          </TouchableOpacity>
        )}

        {/* Weekly Audio Button - Show when This Week's Reads filter is active */}
        {selectedReadingFilter === 'This Week\'s Reads' && !selectionMode && (
          <TouchableOpacity
            style={[
              styles.weeklyAudioButton,
              { backgroundColor: theme.secondary, borderColor: theme.primary }
            ]}
            onPress={handleCreateWeeklyAudio}
            disabled={creatingAudio}
            accessibilityRole="button"
            accessibilityLabel="Create audio from this week's reads"
            accessibilityHint="Create audio from all articles read this week"
          >
            <Ionicons 
              name="calendar" 
              size={16} 
              color={theme.primary}
              style={{ marginRight: 6 }} 
            />
            <Text style={[
              styles.weeklyAudioButtonText, 
              { color: theme.primary }
            ]}>
              Weekly Audio
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
        {(() => {
          const filteredArticles = getFilteredArticles();
          return filteredArticles.length === 0 ? (
            <Text style={[styles.noArticlesText, { color: theme.textSecondary }]}>
              {selectedReadingFilter === 'This Week\'s Reads' ? 'No articles read this week.' :
               selectedReadingFilter === 'Read' ? 'No articles have been read yet.' :
               selectedReadingFilter === 'Unread' ? 'All articles have been read.' :
               'No articles found. Add some RSS sources first!'}
            </Text>
          ) : (
            filteredArticles.map((article) => {
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
                  onPress={() => handleArticlePress(article.link, article)}
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
                onPress={selectionMode ? () => toggleArticleSelection(article.id) : () => handleArticlePress(article.link, article)}
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
                    <View style={styles.sourceWithReadStatus}>
                      <Text style={[styles.articleSource, { color: theme.textMuted }]}>{article.source_name}</Text>
                      {readingHistory.has(article.id) && (
                        <View style={[styles.readIndicator, { backgroundColor: theme.success }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
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
              
              {/* Action Buttons - Show in normal mode */}
              {!selectionMode && (
                <View style={styles.feedActionButtons}>
                  {/* Audio Button - Show for read articles */}
                  {readingHistory.has(article.id) && (
                    <TouchableOpacity 
                      onPress={() => handleCreateSingleAudio(article)}
                      style={[
                        styles.feedAudioButton, 
                        { backgroundColor: theme.primary }
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Create audio for: ${article.title}`}
                      accessibilityHint="Create audio to better understand this article"
                    >
                      <Ionicons 
                        name="musical-notes" 
                        size={14} 
                        color="#fff"
                      />
                    </TouchableOpacity>
                  )}
                  
                  {/* Archive Button */}
                  <TouchableOpacity 
                    onPress={() => handleArchiveArticle(article)}
                    style={[
                      styles.feedArchiveButton, 
                      { backgroundColor: archivedArticles.has(article.id) ? theme.secondary : theme.accent },
                      archivedArticles.has(article.id) && styles.activeButton
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={archivedArticles.has(article.id) ? `Remove article from archive: ${article.title}` : `Save article to archive: ${article.title}`}
                    accessibilityHint={archivedArticles.has(article.id) ? "Tap to remove this article from your archive" : "Tap to save this article to your archive for later reading"}
                    accessibilityState={{ selected: archivedArticles.has(article.id) }}
                  >
                    <Ionicons 
                      name={archivedArticles.has(article.id) ? "bookmark" : "bookmark-outline"} 
                      size={14} 
                      color={archivedArticles.has(article.id) ? theme.primary : theme.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Read Later Button */}
                  <TouchableOpacity 
                    onPress={(event) => handleReadLaterToggle(article, event)}
                    style={[
                      styles.feedReadLaterButton, 
                      { backgroundColor: readLaterStatus.get(article.id) ? theme.primary : theme.accent },
                      readLaterStatus.get(article.id) && styles.activeButton
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={readLaterStatus.get(article.id) ? `Remove from Read Later: ${article.title}` : `Add to Read Later: ${article.title}`}
                    accessibilityHint={readLaterStatus.get(article.id) ? "Tap to remove this article from your Read Later list" : "Tap to save this article to your Read Later list"}
                    accessibilityState={{ selected: readLaterStatus.get(article.id) }}
                  >
                    <Ionicons 
                      name={readLaterStatus.get(article.id) ? "time" : "time-outline"} 
                      size={14} 
                      color={readLaterStatus.get(article.id) ? "#fff" : theme.textMuted}
                    />
                  </TouchableOpacity>
                  
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
            </View>
            );
          })
        );
        })()}
      </ScrollView>

      {/* Selection Count Info - Show in selection mode */}
      {selectionMode && selectedArticleIds.length > 0 && (
        <View style={[styles.selectionCountInfo, { backgroundColor: theme.accent }]}>
          <Text style={[styles.selectionCountText, { color: theme.primary }]}>
            {selectedArticleIds.length} article{selectedArticleIds.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
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

      {/* Article Reader Modal */}
      <ArticleReader
        article={selectedArticle}
        visible={showArticleReader}
        onClose={() => {
          setShowArticleReader(false);
          setSelectedArticle(null);
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
  readingButtonsContainer: {
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
    maxHeight: 50,
  },
  readingButtonsContent: {
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
  readingFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    marginRight: 6,
    marginBottom: 4,
  },
  readingFilterButtonText: {
    color: '#4a5568',
    fontWeight: '500',
    fontSize: 12,
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
  feedAudioButton: {
    padding: 4,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
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
  autoPickButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  autoPickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weeklyAudioButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  weeklyAudioButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  // Selected Articles List Styles
  selectedArticlesList: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    maxHeight: 200,
  },
  selectedArticlesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedArticlesScroll: {
    maxHeight: 150,
  },
  selectedArticleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  selectedArticleContent: {
    flex: 1,
    marginRight: 12,
  },
  selectedArticleTitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 4,
  },
  selectedArticleSource: {
    fontSize: 11,
    fontWeight: '400',
  },
  removeArticleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});