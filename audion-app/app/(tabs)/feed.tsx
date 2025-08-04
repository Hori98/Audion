import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, Platform } from 'react-native';
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
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [uiUpdateTrigger, setUiUpdateTrigger] = useState(0); // Force UI updates

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
    const key = `${article.title.trim()}_${article.source_name.trim()}_${article.published}`;
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
      ErrorHandlingService.showError(error, { 
        action: 'create_audio',
        source: 'Feed Screen',
        details: { selectedCount: selectedArticleIds.length }
      });
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
      // Get up to 3 articles from currently filtered results
      const availableArticles = articles.slice(0, 3);
      const articleIds = availableArticles.map(article => article.id);
      const articleTitles = availableArticles.map(article => article.title);
      const articleUrls = availableArticles.map(article => article.link);


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
      ErrorHandlingService.showError(error, { 
        action: 'create_audio',
        source: 'Feed Auto-pick',
        details: { genre: selectedGenre, source: selectedSource }
      });
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

      {/* Select All/Deselect All Button */}
      {articles.length > 0 && (
        <View style={styles.selectAllContainer}>
          <Text style={[styles.filterInfo, { color: theme.textSecondary }]}>
            {articles.length} article{articles.length !== 1 ? 's' : ''} in current filter
            {getSelectedInCurrentFilterCount() > 0 && (
              <Text style={{ color: theme.primary }}>
                {' '}({getSelectedInCurrentFilterCount()} selected)
              </Text>
            )}
          </Text>
          <TouchableOpacity
            onPress={areAllCurrentArticlesSelected() ? deselectAllInCurrentFilter : selectAllInCurrentFilter}
            style={[
              styles.selectAllButton,
              { 
                backgroundColor: areAllCurrentArticlesSelected() ? theme.surface : theme.primary,
                borderColor: theme.primary 
              }
            ]}
          >
            <Ionicons 
              name={areAllCurrentArticlesSelected() ? "remove-circle-outline" : "checkmark-circle-outline"} 
              size={16} 
              color={areAllCurrentArticlesSelected() ? theme.primary : "#fff"} 
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.selectAllButtonText,
              { color: areAllCurrentArticlesSelected() ? theme.primary : "#fff" }
            ]}>
              {areAllCurrentArticlesSelected() ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
        {/* Selection Summary */}
        {selectedArticleIds.length > 0 && (
          <View style={[styles.selectionSummary, { backgroundColor: theme.accent, borderColor: theme.primary }]}>
            <View style={styles.selectionInfo}>
              <Text style={[styles.selectionText, { color: theme.primary }]}>
                {selectedArticleIds.length} article{selectedArticleIds.length !== 1 ? 's' : ''} selected
              </Text>
              <Text style={[styles.selectionSubtext, { color: theme.textSecondary }]}>
                Selections persist across all filters
              </Text>
            </View>
            <View style={styles.selectionButtons}>
              <TouchableOpacity
                onPress={() => setShowSelectedModal(true)}
                style={[styles.viewSelectedButton, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="list" size={16} color="#fff" />
                <Text style={styles.viewSelectedButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearAllSelections}
                style={[styles.clearButton, { backgroundColor: theme.surface }]}
              >
                <Text style={[styles.clearButtonText, { color: theme.textSecondary }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        
        {articles.length === 0 ? (
          <Text style={[styles.noArticlesText, { color: theme.textSecondary }]}>No articles found. Add some RSS sources first!</Text>
        ) : (
          articles.map((article) => {
            const isSelected = article.normalizedId ? selectedArticleIds.includes(article.normalizedId) : false;
            
            return (
            <TouchableOpacity
              key={article.id}
              style={[
                styles.articleCard, 
                { backgroundColor: theme.surface },
                isSelected && { borderColor: theme.primary, borderWidth: 2 }
              ]}
              onPress={() => handleArticlePress(article.link)} // Open link on tap
              accessibilityRole="button"
              accessibilityLabel={`Article: ${article.title} from ${article.source_name}`}
              accessibilityHint="Tap to read the full article in browser"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.articleContent}>
                <Text style={[styles.articleSource, { color: theme.textMuted }]}>{article.source_name}</Text>
                <Text style={[styles.articleTitle, { color: theme.text }]}>{article.title}</Text>
                <Text style={[styles.articleSummary, { color: theme.textSecondary }]}>{article.summary}</Text>
                <Text style={[styles.articlePublished, { color: theme.textMuted }]}>
                  {article.published ? format(new Date(article.published), 'MMM dd, yyyy') : 'Unknown Date'}
                </Text>
                {article.genre && (
                  <Text style={[styles.articleGenre, { color: theme.textMuted }]}>Genre: {article.genre}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.plusButton,
                  isSelected && styles.plusButtonSelected,
                ]}
                onPress={() => toggleArticleSelection(article.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${article.title} to audio selection`}
                accessibilityHint={`${isSelected ? 'Tap to remove this article from your audio creation selection' : 'Tap to add this article to your audio creation selection'}`}
                accessibilityState={{ checked: isSelected }}
              >
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                  size={28}
                  color={isSelected ? theme.primary : theme.textMuted}
                />
              </TouchableOpacity>
            </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {selectedArticleIds.length > 0 && !showMiniPlayer && (
        <LoadingButton
          title={`Create Audio (${selectedArticleIds.length})`}
          onPress={handleCreateAudio}
          loading={creatingAudio}
          variant="primary"
          icon="musical-notes"
          style={styles.createAudioButton}
          testID="create-audio-button"
          accessibilityLabel={`Create audio from ${selectedArticleIds.length} selected articles`}
          accessibilityHint="Creates an audio podcast from your selected articles that you can listen to"
        />
      )}

      {/* Floating Action Button - Show when mini player is active and articles are selected */}
      {selectedArticleIds.length > 0 && showMiniPlayer && (
        <TouchableOpacity
          style={[styles.floatingActionButton, { backgroundColor: theme.primary }]}
          onPress={handleCreateAudio}
          disabled={creatingAudio}
          accessibilityRole="button"
          accessibilityLabel={`Create audio from ${selectedArticleIds.length} selected articles`}
          accessibilityHint="Creates an audio podcast from your selected articles that you can listen to"
          accessibilityState={{ disabled: creatingAudio }}
        >
          {creatingAudio ? (
            <ActivityIndicator color="#fff" size={20} />
          ) : (
            <Ionicons name="add" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      )}

      {/* Auto Pick Floating Button - Position based on mini player state */}
      <TouchableOpacity
        style={[
          styles.autoPickFloatingButton, 
          { 
            backgroundColor: theme.primary,
            bottom: showMiniPlayer ? 140 : 20 // Adjust position based on mini player
          }
        ]}
        onPress={handleAutoPickFromFeed}
        disabled={creatingAudio}
        activeOpacity={0.8}
      >
        {creatingAudio ? (
          <ActivityIndicator color="#fff" size={20} />
        ) : (
          <Ionicons name="sparkles" size={24} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Selected Articles Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showSelectedModal}
        onRequestClose={() => setShowSelectedModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Selected Articles ({selectedArticleIds.length})</Text>
            <TouchableOpacity 
              onPress={() => setShowSelectedModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {getSelectedArticles().length === 0 ? (
              <Text style={[styles.noSelectedText, { color: theme.textSecondary }]}>
                No articles selected
              </Text>
            ) : (
              getSelectedArticles().map((article) => (
                <View key={article.id} style={[styles.selectedArticleCard, { backgroundColor: theme.surface }]}>
                  <TouchableOpacity 
                    onPress={() => handleArticlePress(article.link)}
                    style={styles.selectedArticleContent}
                  >
                    <Text style={[styles.selectedArticleSource, { color: theme.textMuted }]}>
                      {article.source_name}
                    </Text>
                    <Text style={[styles.selectedArticleTitle, { color: theme.text }]} numberOfLines={2}>
                      {article.title}
                    </Text>
                    <Text style={[styles.selectedArticleSummary, { color: theme.textSecondary }]} numberOfLines={2}>
                      {article.summary}
                    </Text>
                    {article.genre && (
                      <Text style={[styles.selectedArticleGenre, { color: theme.primary }]}>Genre: {article.genre}</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => removeFromSelection(article.id)}
                    style={[styles.removeButton, { backgroundColor: theme.error }]}
                  >
                    <Ionicons name="remove" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

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
    // paddingTop: 10, // Remove or adjust this if it's causing too much space
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
  autoPickFloatingButton: {
    position: 'absolute',
    bottom: 20, // Lower position
    right: 20,
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
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewSelectedButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  noSelectedText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  selectedArticleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedArticleContent: {
    flex: 1,
    marginRight: 12,
  },
  selectedArticleSource: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedArticleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 18,
  },
  selectedArticleSummary: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  selectedArticleGenre: {
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  filterInfo: {
    fontSize: 14,
    flex: 1,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 12,
  },
  selectAllButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
