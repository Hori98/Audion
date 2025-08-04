import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { useSiriShortcuts } from '../../hooks/useSiriShortcuts';
import LoadingIndicator from '../../components/LoadingIndicator';
import AudioCreationSuccessModal from '../../components/AudioCreationSuccessModal';
import GenreFilter from '../../components/Feed/GenreFilter';
import SourceFilter from '../../components/Feed/SourceFilter';
import SelectionManager from '../../components/Feed/SelectionManager';
import ActionButtons from '../../components/Feed/ActionButtons';
import ArticleCard from '../../components/Feed/ArticleCard';
import CacheService from '../../services/CacheService';
import { ArticleNormalizationService } from '../../services/ArticleNormalizationService';
import { useArticleSelection } from '../../hooks/useArticleSelection';
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
  const { donateShortcut } = useSiriShortcuts();
  
  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [creatingAudio, setCreatingAudio] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAudio, setCreatedAudio] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Article selection hook
  const {
    selectedArticleIds,
    loadGlobalSelection,
    toggleArticleSelection,
    clearAllSelections,
    selectAllInCurrentFilter,
    deselectAllInCurrentFilter,
    areAllCurrentArticlesSelected,
    getSelectedInCurrentFilterCount,
    getSelectedArticles,
    updateArticleMaps,
  } = useArticleSelection();

  const genres = [
    'All', 'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  useFocusEffect(
    React.useCallback(() => {
      const initializeData = async () => {
        if (token && token !== '') {
          await loadGlobalSelection();
          await fetchSources();
          await fetchArticles();
        }
      };
      initializeData();
    }, [token])
  );

  // Filter change effect
  useEffect(() => {
    const handleFilterChange = async () => {
      if (token && token !== '') {
        await loadGlobalSelection();
        await fetchArticles();
      }
    };
    handleFilterChange();
  }, [selectedGenre, selectedSource]);

  // Fetch RSS sources
  const fetchSources = async () => {
    try {
      // Try cache first
      const cachedSources = await CacheService.getSources();
      if (cachedSources) {
        setSources(cachedSources);
        return;
      }

      const response = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const sourcesWithStatus = response.data.map((source: RSSSource) => ({
        ...source,
        is_active: source.is_active !== undefined ? source.is_active : true
      }));
      const activeSources = sourcesWithStatus.filter((source: RSSSource) => source.is_active);
      
      await CacheService.setSources(activeSources);
      setSources(activeSources);
    } catch (error: any) {
      console.error('Error fetching RSS sources:', error);
      ErrorHandlingService.showError(error, { 
        action: 'fetch_sources',
        source: 'Feed Screen' 
      });
      setSources([]);
    }
  };

  // Fetch articles
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
        const normalizedCachedArticles = ArticleNormalizationService.normalizeArticles(cachedArticles);
        setArticles(normalizedCachedArticles);
        updateArticleMaps(normalizedCachedArticles);
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${API}/articles`,
        filters,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const normalizedArticles = ArticleNormalizationService.normalizeArticles(response.data);
      await CacheService.setArticles(normalizedArticles, filters);
      
      setArticles(normalizedArticles);
      updateArticleMaps(normalizedArticles);
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

  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await CacheService.remove('rss_sources');
    const filters = {
      ...(selectedGenre !== 'All' && { genre: selectedGenre }),
      ...(selectedSource !== 'All' && { source: selectedSource })
    };
    const cacheKey = CacheService.getArticlesCacheKey(filters);
    await CacheService.remove(cacheKey);
    
    await Promise.all([fetchSources(), fetchArticles()]);
    setRefreshing(false);
  };

  // Handle article press
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

  // Create audio from selected articles
  const handleCreateAudio = async () => {
    const selectedArticles = getSelectedArticles();
    if (selectedArticles.length === 0) {
      Alert.alert('No Articles Selected', 'Please select at least one article to create audio.');
      return;
    }

    setCreatingAudio(true);
    try {
      const articleIds = selectedArticles.map(article => article.id);
      const articleTitles = selectedArticles.map(article => article.title);
      const articleUrls = selectedArticles.map(article => article.link);

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
          }
        }
      };

      setCreatedAudio(response.data);
      setShowSuccessModal(true);
      
      recordInteractions();
      donateShortcut('create-audio');
    } catch (error: any) {
      console.error('Error creating audio:', error);
      ErrorHandlingService.showError(error, { 
        action: 'create_audio',
        source: 'Feed Screen',
        details: { selectedCount: selectedArticles.length }
      });
    } finally {
      setCreatingAudio(false);
    }
  };

  // Auto-pick articles from feed
  const handleAutoPickFromFeed = async () => {
    if (articles.length === 0) {
      Alert.alert('No Articles', 'No articles available with current filter settings.');
      return;
    }

    setCreatingAudio(true);
    try {
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

      setCreatedAudio(response.data);
      setShowSuccessModal(true);
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

  const selectedCount = getSelectedInCurrentFilterCount(articles);
  const areAllSelected = areAllCurrentArticlesSelected(articles);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Filters */}
      <SourceFilter
        sources={sources}
        selectedSource={selectedSource}
        onSourceSelect={setSelectedSource}
      />
      
      <GenreFilter
        genres={genres}
        selectedGenre={selectedGenre}
        onGenreSelect={setSelectedGenre}
      />

      {/* Selection Manager */}
      <SelectionManager
        articlesCount={articles.length}
        selectedCount={selectedCount}
        areAllSelected={areAllSelected}
        onSelectAll={() => selectAllInCurrentFilter(articles)}
        onDeselectAll={() => deselectAllInCurrentFilter(articles)}
      />

      {/* Action Buttons */}
      <ActionButtons
        selectedCount={selectedCount}
        showMiniPlayer={showMiniPlayer}
        onCreateAudio={handleCreateAudio}
        onAutoPickFromFeed={handleAutoPickFromFeed}
        creatingAudio={creatingAudio}
      />

      {/* Articles List */}
      <ScrollView 
        style={styles.articlesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            isSelected={selectedArticleIds.includes(article.normalizedId || '')}
            onPress={handleArticlePress}
            onToggleSelection={() => toggleArticleSelection(article.id, articles)}
          />
        ))}
      </ScrollView>

      {/* Success Modal */}
      <AudioCreationSuccessModal
        visible={showSuccessModal}
        audioTitle={createdAudio?.title || ''}
        audioItem={createdAudio}
        onClose={() => {
          setShowSuccessModal(false);
          setCreatedAudio(null);
          setTimeout(() => clearAllSelections(), 100);
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
  articlesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
});