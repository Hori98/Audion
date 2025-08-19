import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { format, isValid, parseISO } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
// Removed expo-web-browser - using native reader mode instead
import { Ionicons } from '@expo/vector-icons';
import { ErrorHandlingService } from '../../services/ErrorHandlingService';
import LoadingIndicator from '../../components/LoadingIndicator';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

// Safe date formatting helper
const formatSafeDate = (dateString: string, formatString: string): string => {
  if (!dateString) return 'Unknown date';
  
  try {
    // Try parsing ISO string first
    let date = parseISO(dateString);
    
    // If that fails, try new Date()
    if (!isValid(date)) {
      date = new Date(dateString);
    }
    
    // If still invalid, return fallback
    if (!isValid(date)) {
      console.warn('Invalid date encountered:', dateString);
      return 'Invalid date';
    }
    
    return format(date, formatString);
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
};

interface ArchivedArticle {
  id: string;
  original_article_id: string;
  title: string;
  url: string;
  summary?: string;
  source_name: string;
  published_at: string;
  genre: string;
  tags: string[];
  folder: string;
  is_favorite: boolean;
  is_read: boolean;
  archived_at: string;
  notes?: string;
}

export default function ArchiveScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const [articles, setArticles] = useState<ArchivedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, favorites: 0, unread: 0 });

  useFocusEffect(
    React.useCallback(() => {
      if (token && token !== '') {
        loadArchiveData();
      }
    }, [token])
  );

  const loadArchiveData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchArchivedArticles(),
        fetchArchiveFolders(),
        fetchArchiveStats()
      ]);
    } catch (error) {
      console.error('Error loading archive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedArticles = async (page = 1, search = searchQuery) => {
    try {
      const params: any = {
        page,
        limit: 50,
        ...(search && { search }),
        ...(selectedFolder !== 'All' && { folder: selectedFolder }),
        ...(selectedGenre !== 'All' && { genre: selectedGenre }),
        ...(showFavoritesOnly && { favorites_only: true })
      };

      const response = await axios.get(`${API}/archive/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      // Handle response data safely
      const responseData = response.data || {};
      const articlesData = responseData.articles || [];

      if (page === 1) {
        setArticles(articlesData);
      } else {
        setArticles(prev => [...prev, ...articlesData]);
      }

      // Update genres from fetched articles
      if (articlesData && articlesData.length > 0) {
        const uniqueGenres = [...new Set(articlesData.map((article: ArchivedArticle) => article.genre))].filter(Boolean);
        setGenres(prev => [...new Set([...prev, ...uniqueGenres])]);
      }

    } catch (error: any) {
      console.error('Error fetching archived articles:', error);
      setArticles([]); // Set empty array on error
      ErrorHandlingService.showError(error, {
        action: 'fetch_archive',
        source: 'Archive Screen'
      });
    }
  };

  const fetchArchiveFolders = async () => {
    try {
      const response = await axios.get(`${API}/archive/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Backend returns array directly, not wrapped in folders property
      const foldersData = Array.isArray(response.data) ? response.data : (response.data.folders || []);
      setFolders(foldersData);
    } catch (error: any) {
      console.warn('Error fetching archive folders:', error);
      setFolders([]); // Set empty array on error
    }
  };

  const fetchArchiveStats = async () => {
    try {
      const response = await axios.get(`${API}/archive/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle response data safely with defaults
      const statsData = response.data || {};
      setStats({
        total: statsData.total || 0,
        favorites: statsData.favorites || 0,
        unread: statsData.unread || 0
      });
    } catch (error: any) {
      console.warn('Error fetching archive stats:', error);
      setStats({ total: 0, favorites: 0, unread: 0 }); // Set defaults on error
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArchiveData();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length === 0 || query.length >= 3) {
      await fetchArchivedArticles(1, query);
    }
  };

  const handleFilterChange = async () => {
    try {
      await fetchArchivedArticles();
    } catch (error) {
      console.warn('Filter change error:', error);
    }
  };

  const handleArticlePress = async (url: string, article: ArchivedArticle) => {
    try {
      // Mark as read if not already read
      if (!article.is_read) {
        await markAsRead(article.id);
      }
      // Navigate to native reader mode instead of external browser
      const articleForReader = {
        id: article.id,
        title: article.title,
        summary: article.summary || '',
        link: article.article_link,
        published: article.created_at,
        source_name: article.source || 'Archive',
        content: article.content || article.summary,
        genre: 'Archive'
      };
      
      router.push({
        pathname: '/article-detail',
        params: { articleData: JSON.stringify(articleForReader) }
      });
    } catch (error: any) {
      console.error('Error opening article:', error);
      ErrorHandlingService.showError(error, {
        action: 'open_archived_article',
        source: 'Archive Screen'
      });
    }
  };

  const markAsRead = async (articleId: string) => {
    try {
      await axios.put(
        `${API}/archive/article/${articleId}`,
        { is_read: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setArticles(prev =>
        prev.map(article =>
          article.id === articleId ? { ...article, is_read: true } : article
        )
      );
    } catch (error: any) {
      console.warn('Error marking article as read:', error);
    }
  };

  const toggleFavorite = async (article: ArchivedArticle) => {
    try {
      const newFavoriteStatus = !article.is_favorite;
      
      await axios.put(
        `${API}/archive/article/${article.id}`,
        { is_favorite: newFavoriteStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setArticles(prev =>
        prev.map(a =>
          a.id === article.id ? { ...a, is_favorite: newFavoriteStatus } : a
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        favorites: prev.favorites + (newFavoriteStatus ? 1 : -1)
      }));
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      ErrorHandlingService.showError(error, {
        action: 'toggle_favorite',
        source: 'Archive Screen'
      });
    }
  };

  const removeFromArchive = async (article: ArchivedArticle) => {
    Alert.alert(
      'Remove from Archive',
      `Remove "${article.title}" from your archive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(
                `${API}/archive/article/${article.original_article_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              // Remove from local state
              setArticles(prev => prev.filter(a => a.id !== article.id));
              
              // Update stats
              setStats(prev => ({
                total: prev.total - 1,
                favorites: prev.favorites - (article.is_favorite ? 1 : 0),
                unread: prev.unread - (!article.is_read ? 1 : 0)
              }));
              
              Alert.alert('Success', 'Article removed from archive');
            } catch (error: any) {
              console.error('Error removing from archive:', error);
              ErrorHandlingService.showError(error, {
                action: 'remove_from_archive',
                source: 'Archive Screen'
              });
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <LoadingIndicator
        variant="fullscreen"
        text="Loading archived articles..."
        testID="archive-loading"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Stats Header */}
      <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.secondary }]}>{stats.favorites}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Favorites</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.accent }]}>{stats.unread}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Unread</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search-outline" size={20} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search archived articles..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        {/* Folder Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedFolder('All');
              handleFilterChange();
            }}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedFolder === 'All' ? theme.primary : theme.surface,
                borderColor: theme.border
              }
            ]}
          >
            <Text style={[
              styles.filterButtonText,
              { color: selectedFolder === 'All' ? '#fff' : theme.textSecondary }
            ]}>
              All Folders
            </Text>
          </TouchableOpacity>
          
          {(folders || []).map((folder) => (
            <TouchableOpacity
              key={folder}
              onPress={() => {
                setSelectedFolder(folder);
                handleFilterChange();
              }}
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedFolder === folder ? theme.primary : theme.surface,
                  borderColor: theme.border
                }
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                { color: selectedFolder === folder ? '#fff' : theme.textSecondary }
              ]}>
                {folder}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Genre Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedGenre('All');
              handleFilterChange();
            }}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedGenre === 'All' ? theme.secondary : theme.surface,
                borderColor: theme.border
              }
            ]}
          >
            <Text style={[
              styles.filterButtonText,
              { color: selectedGenre === 'All' ? theme.primary : theme.textSecondary }
            ]}>
              All Topics
            </Text>
          </TouchableOpacity>
          
          {(genres || []).map((genre) => (
            <TouchableOpacity
              key={genre}
              onPress={() => {
                setSelectedGenre(genre);
                handleFilterChange();
              }}
              style={[
                styles.filterButton,
                {
                  backgroundColor: selectedGenre === genre ? theme.secondary : theme.surface,
                  borderColor: theme.border
                }
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                { color: selectedGenre === genre ? theme.primary : theme.textSecondary }
              ]}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Favorites Toggle */}
        <TouchableOpacity
          onPress={() => {
            setShowFavoritesOnly(!showFavoritesOnly);
            handleFilterChange();
          }}
          style={[
            styles.favoritesToggle,
            {
              backgroundColor: showFavoritesOnly ? theme.secondary : theme.surface,
              borderColor: theme.border
            }
          ]}
        >
          <Ionicons
            name={showFavoritesOnly ? "heart" : "heart-outline"}
            size={16}
            color={showFavoritesOnly ? theme.primary : theme.textMuted}
          />
          <Text style={[
            styles.favoritesToggleText,
            { color: showFavoritesOnly ? theme.primary : theme.textSecondary }
          ]}>
            Favorites Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Articles List */}
      <ScrollView
        style={styles.articlesContainer}
        contentContainerStyle={styles.articlesContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {!articles || articles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
              No Archived Articles
            </Text>
            <Text style={[styles.emptyStateDescription, { color: theme.textSecondary }]}>
              {searchQuery
                ? 'No articles match your search criteria'
                : 'Save articles from the Feed to access them here'}
            </Text>
          </View>
        ) : (
          (articles || []).map((article) => (
            <View
              key={article.id}
              style={[styles.articleCard, { backgroundColor: theme.surface }]}
            >
              <TouchableOpacity
                style={styles.articleContent}
                onPress={() => handleArticlePress(article.url, article)}
                activeOpacity={0.7}
              >
                <View style={styles.articleHeader}>
                  <View style={styles.sourceWithStatus}>
                    <Text style={[styles.articleSource, { color: theme.textMuted }]}>
                      {article.source_name}
                    </Text>
                    {!article.is_read && (
                      <View style={[styles.unreadIndicator, { backgroundColor: theme.primary }]} />
                    )}
                  </View>
                  <View style={styles.articleMeta}>
                    {article.genre && (
                      <View style={[styles.genreTag, { backgroundColor: theme.accent }]}>
                        <Text style={[styles.genreTagText, { color: theme.primary }]}>
                          {article.genre}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.archivedDate, { color: theme.textMuted }]}>
                      {formatSafeDate(article.archived_at, 'MMM dd')}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.articleTitle, { color: theme.text }]} numberOfLines={2}>
                  {article.title}
                </Text>

                {article.summary && (
                  <Text style={[styles.articleSummary, { color: theme.textSecondary }]} numberOfLines={2}>
                    {article.summary}
                  </Text>
                )}

                <View style={styles.articleFooter}>
                  <Text style={[styles.publishedDate, { color: theme.textMuted }]}>
                    {formatSafeDate(article.published_at, 'MMM dd, yyyy')}
                  </Text>
                  {article.folder && article.folder !== 'default' && (
                    <View style={[styles.folderTag, { backgroundColor: theme.secondary }]}>
                      <Ionicons name="folder-outline" size={12} color={theme.primary} />
                      <Text style={[styles.folderTagText, { color: theme.primary }]}>
                        {article.folder}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => toggleFavorite(article)}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name={article.is_favorite ? "heart" : "heart-outline"}
                    size={20}
                    color={article.is_favorite ? theme.error : theme.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeFromArchive(article)}
                  style={styles.actionButton}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  filtersSection: {
    paddingVertical: 16,
  },
  filterScrollView: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterScrollContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  favoritesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  favoritesToggleText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  articlesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  articlesContent: {
    paddingBottom: 160,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  articleCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
  sourceWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  articleSource: {
    fontSize: 12,
    fontWeight: '500',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  genreTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  archivedDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  publishedDate: {
    fontSize: 12,
  },
  folderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  folderTagText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  actionButton: {
    padding: 8,
    marginVertical: 4,
  },
});