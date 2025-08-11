import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Platform, Animated, Easing, TextInput, SafeAreaView } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
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
  const { t } = useTranslation();
  const { donateShortcut } = useSiriShortcuts();
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
  const [tempPromptStyle, setTempPromptStyle] = useState<string>('standard'); // Temporary prompt override
  const [showPromptModal, setShowPromptModal] = useState(false); // Prompt selection modal
  const [customPromptModalVisible, setCustomPromptModalVisible] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [fabRotation] = useState(new Animated.Value(0)); // FAB animation
  const [feedLikedArticles, setFeedLikedArticles] = useState<Set<string>>(new Set());
  const [feedDislikedArticles, setFeedDislikedArticles] = useState<Set<string>>(new Set());
  const [readingHistory, setReadingHistory] = useState<Map<string, Date>>(new Map()); // Track reading history by article ID

  const genres = [
    'All', 'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  const readingFilters = [
    'All Articles', 'Unread', 'Read', 'This Week\'s Reads'
  ];

  const [customPrompts, setCustomPrompts] = useState<any[]>([]);

  // Built-in prompt options
  const builtInPrompts = [
    { id: 'standard', name: 'Standard', description: 'Balanced approach with comprehensive coverage', icon: 'checkmark-circle-outline', color: theme.primary },
    { id: 'strict', name: 'Strict', description: 'Precise, fact-focused reporting', icon: 'shield-checkmark-outline', color: '#EF4444' },
    { id: 'gentle', name: 'Gentle', description: 'Accessible, conversational tone', icon: 'happy-outline', color: '#10B981' },
    { id: 'insightful', name: 'Insightful', description: 'Deep analysis with context and implications', icon: 'bulb-outline', color: '#F59E0B' }
  ];

  // Get all available prompts (built-in + custom)
  const getAllPrompts = () => {
    return [...builtInPrompts, ...customPrompts.map(prompt => ({
      id: prompt.id,
      name: prompt.name,
      description: 'Custom prompt',
      icon: 'create-outline',
      color: theme.accent,
      isCustom: true
    }))];
  };

  const promptStyles = getAllPrompts();

  // Load custom prompts from storage
  const loadCustomPrompts = async () => {
    try {
      const stored = await AsyncStorage.getItem('custom_prompts');
      if (stored) {
        setCustomPrompts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading custom prompts:', error);
    }
  };

  // Save custom prompts to storage
  const saveCustomPrompts = async (prompts: any[]) => {
    try {
      await AsyncStorage.setItem('custom_prompts', JSON.stringify(prompts));
      setCustomPrompts(prompts);
    } catch (error) {
      console.error('Error saving custom prompts:', error);
    }
  };


  // Add new custom prompt
  const addCustomPrompt = async () => {
    if (!customPromptText.trim()) {
      Alert.alert('Error', 'Please enter prompt text');
      return;
    }

    const newPrompt = {
      id: `custom_${Date.now()}`,
      name: `Custom ${customPrompts.length + 1}`,
      text: customPromptText.trim(),
      created_at: new Date().toISOString()
    };

    const updatedPrompts = [...customPrompts, newPrompt];
    await saveCustomPrompts(updatedPrompts);
    
    setCustomPromptText('');
    setCustomPromptModalVisible(false);
    Alert.alert('Success', 'Custom prompt created successfully!');
  };

  // Edit existing custom prompt
  const editCustomPrompt = async () => {
    if (!customPromptText.trim() || !editingPromptId) {
      Alert.alert('Error', 'Please enter prompt text');
      return;
    }

    const updatedPrompts = customPrompts.map(prompt =>
      prompt.id === editingPromptId
        ? { ...prompt, text: customPromptText.trim(), updated_at: new Date().toISOString() }
        : prompt
    );

    await saveCustomPrompts(updatedPrompts);
    
    setCustomPromptText('');
    setEditingPromptId(null);
    setCustomPromptModalVisible(false);
    Alert.alert('Success', 'Custom prompt updated successfully!');
  };

  // Delete custom prompt
  const deleteCustomPrompt = async (promptId: string) => {
    Alert.alert(
      'Delete Custom Prompt',
      'Are you sure you want to delete this custom prompt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedPrompts = customPrompts.filter(prompt => prompt.id !== promptId);
            await saveCustomPrompts(updatedPrompts);
            Alert.alert('Success', 'Custom prompt deleted successfully!');
          }
        }
      ]
    );
  };

  // Open custom prompt modal for creation or editing
  const openCustomPromptModal = (prompt?: any) => {
    if (prompt) {
      setEditingPromptId(prompt.id);
      setCustomPromptText(prompt.text);
    } else {
      setEditingPromptId(null);
      setCustomPromptText('');
    }
    setCustomPromptModalVisible(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      const initializeData = async () => {
        if (token && token !== '') {
          await loadCustomPrompts();
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

  // Effect to force UI update when selection or filters change
  useEffect(() => {
    // Force component re-render when selection or filters change
  }, [selectedArticleIds, articles, uiUpdateTrigger, selectedReadingFilter]);

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

  // Filter articles based on reading status
  const getFilteredArticles = (): Article[] => {
    let filteredArticles = articles;

    // Apply reading filter
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

    return filteredArticles;
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

  const handleArticlePress = async (url: string, article?: Article) => {
    if (url) {
      try {
        // Record reading history before opening article
        if (article) {
          await recordArticleReading(article);
        }
        
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
  const toggleSelectionMode = async () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    
    // Load current prompt setting when entering selection mode
    if (newMode) {
      const currentPromptStyle = await AsyncStorage.getItem('unified_prompt_style') || 'standard';
      setTempPromptStyle(currentPromptStyle);
    }
    
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
      // Load prompt settings - use temporary style if in manual mode, otherwise use saved settings
      const savedPromptStyle = selectionMode ? tempPromptStyle : (await AsyncStorage.getItem('unified_prompt_style') || 'standard');
      const savedCustomPrompt = await AsyncStorage.getItem('unified_custom_prompt') || '';
      
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
          article_urls: articleUrls,
          prompt_style: savedPromptStyle,
          custom_prompt: savedCustomPrompt
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
  };;

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


      // Load prompt settings from unified prompt system
      const savedPromptStyle = await AsyncStorage.getItem('unified_prompt_style') || 'standard';
      const savedCustomPrompt = await AsyncStorage.getItem('unified_custom_prompt') || '';

      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: articleIds,
          article_titles: articleTitles,
          article_urls: articleUrls,
          prompt_style: savedPromptStyle,
          custom_prompt: savedCustomPrompt
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

  // Create audio from a single read article
  const handleCreateSingleAudio = async (article: Article) => {
    if (creatingAudio) {
      return; // Prevent double-clicking
    }

    setCreatingAudio(true);
    try {
      // Load prompt settings
      const savedPromptStyle = await AsyncStorage.getItem('unified_prompt_style') || 'standard';
      const savedCustomPrompt = await AsyncStorage.getItem('unified_custom_prompt') || '';

      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: [article.id],
          article_titles: [article.title],
          article_urls: [article.link],
          prompt_style: savedPromptStyle,
          custom_prompt: savedCustomPrompt
        },
        { headers: { Authorization: `Bearer ${token}` } }
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

      // Show success modal
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      // Donate shortcut for single audio creation
      donateShortcut('create-single-audio');
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
              console.log('Usage info:', errorData.usage_info);
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
      // Load prompt settings
      const savedPromptStyle = await AsyncStorage.getItem('unified_prompt_style') || 'standard';
      const savedCustomPrompt = await AsyncStorage.getItem('unified_custom_prompt') || '';

      const articleIds = weeklyArticles.map(article => article.id);
      const articleTitles = weeklyArticles.map(article => article.title);
      const articleUrls = weeklyArticles.map(article => article.link);

      const response = await axios.post(
        `${API}/audio/create`,
        {
          article_ids: articleIds,
          article_titles: articleTitles,
          article_urls: articleUrls,
          prompt_style: savedPromptStyle,
          custom_prompt: savedCustomPrompt
        },
        { headers: { Authorization: `Bearer ${token}` } }
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

      // Show success modal
      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      donateShortcut('create-weekly-audio');
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
              console.log('Usage info:', errorData.usage_info);
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
        
        {/* Prompt Style Button - Show in selection mode */}
        {selectionMode && (
          <TouchableOpacity
            style={[
              styles.promptStyleButton,
              { backgroundColor: theme.accent, borderColor: theme.primary }
            ]}
            onPress={() => setShowPromptModal(true)}
            disabled={creatingAudio}
            accessibilityRole="button"
            accessibilityLabel="Change prompt style for this session"
            accessibilityHint="Tap to temporarily change the AI prompt style for audio creation"
          >
            <Ionicons 
              name={promptStyles.find(style => style.id === tempPromptStyle)?.icon || 'checkmark-circle-outline'} 
              size={16} 
              color={promptStyles.find(style => style.id === tempPromptStyle)?.color || theme.primary}
              style={{ marginRight: 6 }} 
            />
            <Text style={[
              styles.promptStyleButtonText, 
              { color: theme.primary }
            ]}>
              {promptStyles.find(style => style.id === tempPromptStyle)?.name || 'Standard'}
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

      {/* Auto Pick - Main FAB - Always visible when not in selection mode */}
      {!selectionMode && (
        <>
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
        </>
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
      
      {/* Prompt Style Selection Modal */}
      <Modal
        visible={showPromptModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPromptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.promptModal, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                プロンプトスタイル選択
              </Text>
              <TouchableOpacity
                onPress={() => setShowPromptModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              この音声作成セッションでのみ適用されます
            </Text>
            
            <View style={styles.promptStylesContainer}>
              {promptStyles.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.promptStyleOption,
                    {
                      backgroundColor: tempPromptStyle === style.id ? style.color + '20' : theme.accent,
                      borderColor: tempPromptStyle === style.id ? style.color : 'transparent',
                      borderWidth: tempPromptStyle === style.id ? 2 : 0,
                    }
                  ]}
                  onPress={() => {
                    setTempPromptStyle(style.id);
                    setShowPromptModal(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${style.name} prompt style`}
                  accessibilityState={{ selected: tempPromptStyle === style.id }}
                >
                  <View style={styles.promptStyleOptionContent}>
                    <Ionicons
                      name={style.icon}
                      size={24}
                      color={style.color}
                      style={styles.promptStyleIcon}
                    />
                    <View style={styles.promptStyleTextContainer}>
                      <Text style={[styles.promptStyleName, { color: theme.text }]}>
                        {style.name}
                      </Text>
                      <Text style={[styles.promptStyleDescription, { color: theme.textSecondary }]}>
                        {style.description}
                      </Text>
                    </View>
                    <View style={styles.promptStyleRightSection}>
                      {style.isCustom && (
                        <View style={styles.promptActions}>
                          <TouchableOpacity
                            style={styles.promptActionButton}
                            onPress={() => {
                              setShowPromptModal(false);
                              openCustomPromptModal(customPrompts.find(p => p.id === style.id));
                            }}
                          >
                            <Ionicons name="create-outline" size={16} color={theme.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.promptActionButton}
                            onPress={() => {
                              setShowPromptModal(false);
                              deleteCustomPrompt(style.id);
                            }}
                          >
                            <Ionicons name="trash-outline" size={16} color={theme.error} />
                          </TouchableOpacity>
                        </View>
                      )}
                      {tempPromptStyle === style.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={style.color}
                          style={styles.promptStyleCheckmark}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* Create Custom Prompt Button */}
              <TouchableOpacity
                style={[styles.addCustomPromptButton, { borderColor: theme.primary }]}
                onPress={() => {
                  setShowPromptModal(false);
                  openCustomPromptModal();
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={[styles.addCustomPromptText, { color: theme.primary }]}>
                  Create Custom Prompt
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Prompt Modal */}
      <Modal
        visible={customPromptModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCustomPromptModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setCustomPromptModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingPromptId ? 'Edit Custom Prompt' : 'Create Custom Prompt'}
            </Text>
            <TouchableOpacity
              onPress={editingPromptId ? editCustomPrompt : addCustomPrompt}
              style={styles.saveButton}
            >
              <Text style={[styles.saveButtonText, { color: theme.primary }]}>
                {editingPromptId ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.customPromptSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Prompt Instructions</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Write your custom instructions for how the AI should generate and present the news content.
              </Text>
              
              <View style={[styles.textInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.customPromptInput, { color: theme.text, borderColor: theme.border }]}
                  value={customPromptText}
                  onChangeText={setCustomPromptText}
                  placeholder="Enter your custom prompt instructions..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  autoCorrect={true}
                />
              </View>
              
              <View style={styles.promptExamples}>
                <Text style={[styles.examplesTitle, { color: theme.text }]}>Example Prompts:</Text>
                <Text style={[styles.exampleText, { color: theme.textSecondary }]}>
                  • &ldquo;Focus on technology and innovation news with detailed technical explanations&rdquo;{'\n'}
                  • &ldquo;Present news in a casual, conversational tone suitable for commuting&rdquo;{'\n'}
                  • &ldquo;Emphasize business implications and market analysis in all stories&rdquo;{'\n'}
                  • &ldquo;Include historical context and background for better understanding&rdquo;
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  feedDislikeButton: {
    padding: 4,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Prompt style button styles
  promptStyleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  promptStyleButtonText: {
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
  
  // Prompt modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  promptModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  promptStylesContainer: {
    gap: 12,
  },
  promptStyleOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  promptStyleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptStyleIcon: {
    marginRight: 12,
  },
  promptStyleTextContainer: {
    flex: 1,
  },
  promptStyleName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  promptStyleDescription: {
    fontSize: 14,
  },
  promptStyleCheckmark: {
    marginLeft: 12,
  },
  addCustomPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addCustomPromptText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  promptStyleRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  promptActionButton: {
    padding: 4,
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
});