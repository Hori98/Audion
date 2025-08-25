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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUnifiedAudio } from '../../context/UnifiedAudioContext';
import { useLanguage } from '../../context/LanguageContext';
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
import HeroCarousel from '../../components/HeroCarousel';
import FeatureCard from '../../components/cards/FeatureCard';
import StandardCard from '../../components/cards/StandardCard';
import BriefCard from '../../components/cards/BriefCard';
import HomeActionBar from '../../components/HomeActionBar';
import AutoPickService from '../../services/AutoPickService';
import AudioCreationProgress from '../../components/AudioCreationProgress';
import SubscriptionService from '../../services/SubscriptionService';
// import MiniPlayer from '../../components/MiniPlayer'; // Removed - using global MiniPlayer from _layout.tsx

// Constants
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;
const GENRES = ['All', 'Breaking News', 'Technology', 'Business', 'Politics', 'World', 'Sports', 'Entertainment'];
const { width: screenWidth } = Dimensions.get('window');

export default function MainScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const { playInstantAudio } = useUnifiedAudio();
  const { currentVoiceLanguage } = useLanguage();
  
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
  // Progress tracking for audio creation
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressStage, setProgressStage] = useState<'articles' | 'script' | 'audio' | 'complete'>('articles');
  const [articlesCount, setArticlesCount] = useState<number>();

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

  const convertArticleToDirectTTS = async (article: Article) => {
    try {
      const directTTSResponse = await axios.post(
        `${API}/audio/direct-tts`,
        {
          article_id: article.id,
          title: article.title,
          content: article.summary || article.title,
          voice_language: currentVoiceLanguage,
          voice_name: "nova"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (directTTSResponse.data?.audio_url) {
        return {
          id: directTTSResponse.data.id,
          title: directTTSResponse.data.title || article.title,
          audio_url: directTTSResponse.data.audio_url,
          duration: directTTSResponse.data.duration || 180,
          created_at: directTTSResponse.data.created_at,
        };
      }
    } catch (error) {
      console.error('Error creating direct TTS:', error);
      throw error;
    }
    return null;
  };

  const convertArticleToAudioItem = async (article: Article) => {
    try {
      const audioResponse = await axios.post(
        `${API}/audio/create`,
        { articles: [article] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (audioResponse.data?.audio_url) {
        return {
          id: audioResponse.data.id,
          title: audioResponse.data.title || article.title,
          audio_url: audioResponse.data.audio_url,
          duration: audioResponse.data.duration || 180,
          created_at: new Date().toISOString(),
          script: audioResponse.data.script,
        };
      }
    } catch (error) {
      console.error('Error creating audio:', error);
      throw error;
    }
    return null;
  };

  const handlePlayPress = async (article: Article) => {
    try {
      setCreatingAudio(true);
      const audioItem = await convertArticleToDirectTTS(article);
      if (audioItem) {
        await playAudio(audioItem);
        
        // Record interaction
        await PersonalizationService.recordInteraction({
          action: 'play',
          contentId: article.id,
          contentType: 'article',
          category: article.genre || 'General',
          source: article.source_name,
          timestamp: Date.now(),
          engagementLevel: 'high',
        });
      }
    } catch (error) {
      Alert.alert('エラー', '音声の作成に失敗しました');
    } finally {
      setCreatingAudio(false);
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
      action: 'read',
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
            // Validate preconditions
            const validation = AutoPickService.getInstance().canExecuteAutoPick(filteredArticles.length);
            if (!validation.canExecute) {
              Alert.alert('No Articles', validation.reason);
              return;
            }

            setCreatingAudio(true);
            setShowProgress(true);
            setProgressValue(0);
            setProgressStage('articles');
            
            try {
              // Get user's max articles limit from subscription
              const maxArticles = await SubscriptionService.getInstance().getMaxArticlesLimit(token!);
              
              // 🆕 Use unified AutoPick service with progress tracking and new AudioPlayer
              await AutoPickService.getInstance().executeAutoPick({
                token: token!,
                selectedGenre,
                context: 'home',
                playInstantAudio: playInstantAudio,
                voiceLanguage: currentVoiceLanguage,
                maxArticles,
                onProgress: (progress, stage, count) => {
                  setProgressValue(progress);
                  setProgressStage(stage);
                  if (count) setArticlesCount(count);
                }
              });
              
              // Hide progress after completion
              setTimeout(() => {
                setShowProgress(false);
              }, 2000);
            } catch (error) {
              // Error handling is done in the service
              setShowProgress(false);
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

  // State for personalized article sections
  const [articleSections, setArticleSections] = useState<{
    heroArticles: Article[];
    forYouArticles: Article[];
    briefArticles: Article[];
  }>({ heroArticles: [], forYouArticles: [], briefArticles: [] });

  // State for learning progress
  const [learningProgress, setLearningProgress] = useState<{
    totalInteractions: number;
    learningStage: 'initial' | 'learning' | 'trained';
    accuracy: number;
    progressPercent: number;
    message: string;
  } | null>(null);

  // Apply personalization to article sections - FIXED to prevent infinite loops
  useEffect(() => {
    const applyPersonalization = async () => {
      // Early return if no articles to avoid unnecessary processing
      if (!articles || articles.length === 0) {
        setArticleSections({ heroArticles: [], forYouArticles: [], briefArticles: [] });
        return;
      }

      try {
        // Load user preferences from PersonalizationService
        const preferences = await PersonalizationService.loadPreferences();
        const context = PersonalizationService.getCurrentContext();
        
        // Create scored articles based on user preferences and recency
        const scoredArticles = filteredArticles.map(article => {
          // Validate article data to prevent NaN
          if (!article || !article.published_at) {
            return {
              article,
              score: 0,
              debug: { finalScore: 0, recencyScore: 0, genreScore: 0, sourceScore: 0 }
            };
          }

          // Base recency score with safety checks
          const publishedTime = new Date(article.published_at).getTime();
          const currentTime = Date.now();
          
          // Ensure valid timestamps
          if (isNaN(publishedTime) || publishedTime > currentTime) {
            return {
              article,
              score: 0,
              debug: { finalScore: 0, recencyScore: 0, genreScore: 0, sourceScore: 0 }
            };
          }

          const hoursOld = Math.max(0, (currentTime - publishedTime) / (1000 * 60 * 60));
          const recencyScore = Math.max(0, Math.min(100, 100 - hoursOld * 2)); // Clamp 0-100
          
          // Genre preference score with safety
          const genre = article.genre || 'General';
          const genrePreference = Math.max(0.1, preferences.favoriteCategories[genre] || 1.0);
          const genreScore = Math.max(0, Math.min(100, genrePreference * 20)); // Clamp 0-100
          
          // Source reliability score with safety
          const sourceReliability = Math.max(1, Math.min(10, preferences.contentPreferences.sourceReliability[article.source_name] || 5.0));
          const sourceScore = Math.max(0, Math.min(100, sourceReliability * 10)); // Clamp 0-100
          
          // Engagement-based weighting with safety
          const engagementMultiplier = Math.max(0.1, Math.min(2.0, preferences.playbackPatterns.engagementScore || 0.5));
          
          // Time-of-day preference boost with safety
          let timeBoost = 1.0;
          if (Array.isArray(preferences.playbackPatterns.preferredTimeOfDay) && 
              preferences.playbackPatterns.preferredTimeOfDay.includes(context.timeOfDay)) {
            timeBoost = 1.2;
          }
          
          // Calculate final score with multiple safety checks
          const baseScore = (recencyScore * 0.4 + genreScore * 0.4 + sourceScore * 0.2);
          const finalScore = baseScore * engagementMultiplier * timeBoost;
          
          // Ensure final score is a valid number
          const safeScore = isNaN(finalScore) || !isFinite(finalScore) ? 0 : Math.max(0, finalScore);
          
          return {
            article,
            score: safeScore,
            debug: {
              recencyScore: isNaN(recencyScore) ? 0 : recencyScore,
              genreScore: isNaN(genreScore) ? 0 : genreScore,
              sourceScore: isNaN(sourceScore) ? 0 : sourceScore,
              genrePreference,
              sourceReliability,
              finalScore: safeScore
            }
          };
        });

        // Sort by preference-weighted score (highest first)
        scoredArticles.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        // Minimal debug logging to prevent spam
        if (__DEV__ && scoredArticles.length > 0) {
          const topScore = scoredArticles[0]?.score || 0;
          if (topScore > 0) {
            console.log(`🎯 Personalization applied: ${scoredArticles.length} articles, top score: ${topScore.toFixed(1)}`);
          }
        }

        // Extract articles from scored results
        const sortedArticles = scoredArticles.map(item => item.article);
        
        // Set personalized sections
        setArticleSections({
          heroArticles: sortedArticles.slice(0, 3),      // Hero: Top 3 personalized articles
          forYouArticles: sortedArticles.slice(3, 13),   // For You: Next 8-10 articles
          briefArticles: sortedArticles.slice(13)        // Brief: Remaining articles
        });
        
      } catch (error) {
        console.error('Error applying personalization:', error);
        
        // Fallback to date-based sorting if personalization fails
        const sortedArticles = [...filteredArticles].sort((a, b) => {
          const aTime = new Date(a.published_at || 0).getTime();
          const bTime = new Date(b.published_at || 0).getTime();
          return bTime - aTime;
        });

        setArticleSections({
          heroArticles: sortedArticles.slice(0, 3),
          forYouArticles: sortedArticles.slice(3, 13),
          briefArticles: sortedArticles.slice(13)
        });
      }
    };

    applyPersonalization();
  }, [articles.length, selectedGenre]); // FIXED: Use articles.length instead of filteredArticles to prevent loops

  // Load learning progress
  useEffect(() => {
    const loadLearningProgress = async () => {
      try {
        const progress = await PersonalizationService.getLearningProgress();
        setLearningProgress(progress);
      } catch (error) {
        console.error('Error loading learning progress:', error);
      }
    };

    loadLearningProgress();
  }, []);

  const { heroArticles, forYouArticles, briefArticles } = articleSections;

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      {...edgeSwipeResponder.panHandlers}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        }
      >
        {/* Genre Filter Only - Dropdown Style */}
        <SingleGenreDropdown
          genres={GENRES}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
        />

        {/* Personalization Settings Button */}
        <View style={styles.personalizationSection}>
          <TouchableOpacity
            style={[styles.personalizationButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/genre-preferences')}
          >
            <Ionicons name="settings-outline" size={18} color={theme.primary} />
            <Text style={[styles.personalizationButtonText, { color: theme.primary }]}>
              興味を調整
            </Text>
            <Text style={[styles.personalizationSubtext, { color: theme.textSecondary }]}>
              あなたの好みに合わせてカスタマイズ
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Learning Progress Indicator */}
          {learningProgress && (
            <View style={[styles.learningProgress, { backgroundColor: theme.surface }]}>
              <View style={styles.learningProgressHeader}>
                <Ionicons 
                  name={
                    learningProgress.learningStage === 'trained' ? 'checkmark-circle' :
                    learningProgress.learningStage === 'learning' ? 'analytics' : 'bulb-outline'
                  } 
                  size={16} 
                  color={
                    learningProgress.learningStage === 'trained' ? '#10B981' :
                    learningProgress.learningStage === 'learning' ? theme.primary : theme.textSecondary
                  } 
                />
                <Text style={[styles.learningProgressText, { color: theme.text }]}>
                  {learningProgress.message}
                </Text>
                <Text style={[styles.learningProgressPercent, { color: theme.textSecondary }]}>
                  {learningProgress.progressPercent}%
                </Text>
              </View>
              <View style={[styles.learningProgressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.learningProgressFill, 
                    { 
                      width: `${learningProgress.progressPercent}%`,
                      backgroundColor: 
                        learningProgress.learningStage === 'trained' ? '#10B981' :
                        learningProgress.learningStage === 'learning' ? theme.primary : theme.textSecondary
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>

        {/* Home Action Bar - Context-aware AutoPick */}
        <HomeActionBar
          currentGenre={selectedGenre}
          onAutoPick={createAudioFromArticles}
          isCreating={creatingAudio}
          articlesCount={filteredArticles.length}
          autoPickProgress={creatingAudio && showProgress ? {
            isActive: true,
            progress: progressValue,
            stage: progressStage,
            articlesCount: articlesCount
          } : undefined}
        />

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              記事を読み込み中...
            </Text>
          </View>
        )}

        {/* Hero Carousel Section */}
        {!loading && heroArticles.length > 0 && (
          <HeroCarousel
            articles={heroArticles}
            onArticlePress={handleArticlePress}
            onPlayPress={handlePlayPress}
          />
        )}


        {/* For You Section */}
        {!loading && forYouArticles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                あなたにおすすめ
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                AIが選んだパーソナライズされた記事
              </Text>
            </View>
            
            {forYouArticles.map((article, index) => (
              <FeatureCard
                key={article.id}
                article={article}
                onPress={handleArticlePress}
                onPlayPress={handlePlayPress}
                isRead={readingHistory.has(article.id)}
              />
            ))}
          </View>
        )}

        {/* Brief Section */}
        {!loading && briefArticles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                最新ニュース
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                サッと読める短報
              </Text>
            </View>
            
            {briefArticles.map((article, index) => (
              <BriefCard
                key={article.id}
                article={article}
                onPress={handleArticlePress}
                onPlayPress={handlePlayPress}
                isRead={readingHistory.has(article.id)}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredArticles.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              記事が見つかりません
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              フィルターを変更するか、RSSソースを追加してください
            </Text>
          </View>
        )}

        {/* Bottom Padding for Audio Creation Button */}
        <View style={styles.bottomPadding} />
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


      {/* Article Reader Modal */}
      <ArticleReader
        article={selectedArticle}
        visible={showArticleReader}
        onClose={() => {
          setShowArticleReader(false);
          setSelectedArticle(null);
        }}
      />

      {/* Audio Creation Progress - Hidden when progress is shown in ActionBar */}
      {showProgress && !creatingAudio && (
        <AudioCreationProgress
          visible={true}
          progress={progressValue}
          stage={progressStage}
          articlesCount={articlesCount}
        />
      )}

      {/* Mini Player */}
      {/* MiniPlayer removed - handled globally in _layout.tsx */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  personalizationSection: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  personalizationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  personalizationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  personalizationSubtext: {
    fontSize: 12,
    marginRight: 8,
  },
  learningProgress: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  learningProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  learningProgressText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  learningProgressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  learningProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  learningProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 180, // Space for floating button + MiniPlayer + tab bar
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
});