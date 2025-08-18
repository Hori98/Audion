import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
// Removed expo-web-browser - using native reader mode instead
import axios from 'axios';
import { Article } from '../../types';
import CacheService from '../../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../../services/NotificationService';
import ArchiveService from '../../services/ArchiveService';
import SearchBar from '../../components/SearchBar';
import { Modal } from 'react-native';
import PersonalizationService from '../../services/PersonalizationService';
import SearchUtils from '../../utils/searchUtils';
import BookmarkService from '../../services/BookmarkService';
import ArticleReader from '../../components/ArticleReader';

// Constants
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;
const GENRES = ['All', 'Breaking News', 'Technology', 'Business', 'Politics', 'World', 'Sports', 'Entertainment'];
const CACHE_TIMEOUT = 30000; // Increase timeout to 30 seconds

// Utility functions - moved to SearchUtils

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Unknown Date';
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

// Normalize articles to prevent duplicates (copied from Feed)
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

// Reading history utility
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

export default function MainScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  // State management
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [creatingAudio, setCreatingAudio] = useState(false);
  const [readingHistory, setReadingHistory] = useState<Map<string, Date>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [allArticlesMap, setAllArticlesMap] = useState<Map<string, Article>>(new Map()); // Track all articles across filters
  const [normalizedArticlesMap, setNormalizedArticlesMap] = useState<Map<string, Article>>(new Map()); // Track articles by normalized ID
  const [uiUpdateTrigger, setUiUpdateTrigger] = useState(0); // Force UI updates
  const [readLaterStatus, setReadLaterStatus] = useState<Map<string, boolean>>(new Map());
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleReader, setShowArticleReader] = useState(false);
  
  // Progressive loading states
  const [allAvailableArticles, setAllAvailableArticles] = useState<Article[]>([]);
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);
  const [progressiveLoading, setProgressiveLoading] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);

  // 検索クエリ変更時の処理（履歴保存含む）
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    // 検索実行時に履歴を保存（空でない場合）
    if (query.trim() && query.length > 2) {
      await SearchUtils.saveSearchHistory(query, 'home_search_history');
    }
  };

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
          loadReadLaterStatus() // Load Read Later status
        ]);

        setReadingHistory(history);
        
        // Fetch articles after other initialization is complete
        await fetchArticles();
      };

      initializeData();
    }, [token])
  );

  const fetchArticles = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const filters = {
        // Genre filtering is now handled client-side for better performance
      };

      // Try cache first (exactly like Feed)
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
      const params: { genre?: string } = {};
      if (selectedGenre !== 'All') {
        params.genre = selectedGenre;
      }
      const response = await axios.get(`${API}/articles`, { headers, params });
      
      // Normalize articles to prevent duplicates
      const normalizedArticles = normalizeArticles(response.data);
      
      
      // Cache the results
      await CacheService.setArticles(normalizedArticles, filters);
      
      // Progressive Loading Implementation
      setAllAvailableArticles(normalizedArticles);
      
      // Step 1: Show first 30 articles immediately
      const initialArticles = normalizedArticles.slice(0, 30);
      setArticles(initialArticles);
      setDisplayedArticles(initialArticles);
      
      
      // Step 2: Auto-load next 20 articles after 200ms
      if (normalizedArticles.length > 30) {
        setProgressiveLoading(true);
        setTimeout(() => {
          const extendedArticles = normalizedArticles.slice(0, 50);
          setArticles(extendedArticles);
          setDisplayedArticles(extendedArticles);
          setProgressiveLoading(false);
          
          // Step 3: Show "More" button if more articles available
          if (normalizedArticles.length > 50) {
            setShowMoreButton(true);
          }
          
        }, 200);
      }
      
      
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
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear cache for current filter settings
      const filters = {
        ...(selectedGenre !== 'All' && { genre: selectedGenre })
      };
      const cacheKey = CacheService.getArticlesCacheKey(filters);
      await CacheService.remove(cacheKey);
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
      
      // Record interaction
      await PersonalizationService.recordInteraction({
        action: isCurrentlyReadLater ? 'save' : 'unsave',
        contentId: article.id,
        contentType: 'article',
        category: article.genre || 'General',
        source: article.source_name,
        timestamp: Date.now(),
        engagementLevel: 'medium',
      });
      
    } catch (error) {
      console.error('Error toggling read later:', error);
      Alert.alert('エラー', '後で読む機能でエラーが発生しました');
    }
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


  // Convert Map to Array and apply filters with proper error handling
  const articlesArray = Array.isArray(articles) ? articles : [];
  const filteredArticles = SearchUtils.filterArticles(articlesArray, {
    searchQuery,
    genre: selectedGenre,
  }) || [];
  

  // Load More Articles Handler
  const handleLoadMore = () => {
    const currentLength = displayedArticles.length;
    const nextBatch = allAvailableArticles.slice(0, currentLength + 50);
    
    setArticles(nextBatch);
    setDisplayedArticles(nextBatch);
    
    // Hide button if no more articles
    if (nextBatch.length >= allAvailableArticles.length) {
      setShowMoreButton(false);
    }
    
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Search Icon */}
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>
          📰 ニュース
        </Text>
        <TouchableOpacity
          style={[styles.searchIcon, { backgroundColor: theme.surface }]}
          onPress={() => setShowSearchModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Genre Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={[styles.genreContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        contentContainerStyle={styles.genreContent}
      >
        {GENRES.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreButton,
              selectedGenre === genre && { backgroundColor: theme.primary }
            ]}
            onPress={() => setSelectedGenre(genre)}
          >
            <Text style={[
              styles.genreText,
              { color: selectedGenre === genre ? '#fff' : theme.textMuted }
            ]}>
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Articles List */}
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
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={styles.loadingIndicator} />
        ) : !filteredArticles || filteredArticles.length === 0 ? (
          <Text style={[styles.noArticlesText, { color: theme.textSecondary }]}>
            No articles available. Try refreshing or check your RSS sources.
          </Text>
        ) : (
          filteredArticles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleCard, { backgroundColor: theme.surface }]}
              onPress={() => handleArticlePress(article)}
              activeOpacity={0.7}
            >
              <View style={styles.articleContent}>
                <View style={styles.articleHeader}>
                  <Text style={[styles.articleSource, { color: theme.textMuted }]}>
                    {article.source_name}
                  </Text>
                  {readingHistory.has(article.id) && (
                    <View style={[styles.readIndicator, { backgroundColor: theme.success }]}>
                      <Text style={styles.readIndicatorText}>✓</Text>
                    </View>
                  )}
                </View>
                
                <Text style={[styles.articleTitle, { color: theme.text }]} numberOfLines={2}>
                  {article.title}
                </Text>
                
                <Text style={[styles.articleSummary, { color: theme.textSecondary }]} numberOfLines={3}>
                  {article.summary}
                </Text>
                
                <View style={styles.articleFooter}>
                  <View style={styles.articleMeta}>
                    <Text style={[styles.articleDate, { color: theme.textMuted }]}>
                      {formatDate(article.published_at)}
                    </Text>
                    {article.genre && (
                      <View style={[styles.genreTag, { backgroundColor: theme.secondary }]}>
                        <Text style={[styles.genreTagText, { color: theme.primary }]}>
                          {article.genre}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Read Later Button */}
                  <TouchableOpacity
                    style={[styles.readLaterButton, { backgroundColor: readLaterStatus.get(article.id) ? theme.primary : theme.surface }]}
                    onPress={(event) => handleReadLaterToggle(article, event)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={readLaterStatus.get(article.id) ? "bookmark" : "bookmark-outline"}
                      size={16}
                      color={readLaterStatus.get(article.id) ? '#fff' : theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Progressive Loading Indicator */}
        {progressiveLoading && (
          <View style={styles.progressiveLoadingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.progressiveLoadingText, { color: theme.textSecondary }]}>
              さらに記事を読み込み中...
            </Text>
          </View>
        )}

        {/* Load More Button */}
        {showMoreButton && !loading && (
          <TouchableOpacity 
            style={[styles.loadMoreButton, { backgroundColor: theme.surface }]}
            onPress={handleLoadMore}
            activeOpacity={0.7}
          >
            <Text style={[styles.loadMoreText, { color: theme.primary }]}>
              もっと見る ({allAvailableArticles.length - displayedArticles.length}記事)
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>

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
            {filteredArticles.length === 0 ? (
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
            )}
          </ScrollView>
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
          <Ionicons name="radio-outline" size={24} color="#fff" />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
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
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  searchResultItem: {
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  searchResultSource: {
    fontSize: 12,
  },
  progressiveLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressiveLoadingText: {
    fontSize: 14,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  genreContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
  },
  genreContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  genreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  articlesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  articlesContent: {
    paddingBottom: 20,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  articleCard: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
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
    fontWeight: '500',
  },
  readIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  readLaterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  articleDate: {
    fontSize: 12,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noArticlesText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
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