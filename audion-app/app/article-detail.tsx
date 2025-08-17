import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Dimensions,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { WebView } from 'react-native-webview';
import RenderHtml from 'react-native-render-html';

const { height: screenHeight } = Dimensions.get('window');

interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source_name: string;
  content?: string;
  genre?: string;
  image_url?: string;
}

export default function ArticleDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'summary' | 'content' | 'web'>('summary');
  const { width } = useWindowDimensions();

  // Add error boundary for this screen
  const [hasError, setHasError] = useState(false);

  // Log lifecycle events
  console.log('📰 ArticleDetail - Component mounted/rendered');

  useEffect(() => {
    console.log('📰 ArticleDetail - useEffect triggered');
    console.log('📰 ArticleDetail - Params received:', params);
    
    try {
      if (params.articleData) {
        try {
          const articleData = JSON.parse(params.articleData as string);
          console.log('📰 ArticleDetail - Parsed article:', articleData);
          setArticle(articleData);
        } catch (error) {
          console.error('📰 ArticleDetail - Failed to parse article data:', error);
          console.log('📰 ArticleDetail - Raw params.articleData:', params.articleData);
          setHasError(true);
        }
      } else {
        console.log('📰 ArticleDetail - No articleData in params');
        setHasError(true);
      }
    } catch (error) {
      console.error('📰 ArticleDetail - Unexpected error in useEffect:', error);
      setHasError(true);
    }
    
    setLoading(false);
  }, [params.articleData]);

  // Add useEffect to detect when component is unmounting or re-rendering
  useEffect(() => {
    return () => {
      console.log('📰 ArticleDetail - Component unmounting or re-rendering');
    };
  }, []);

  // Log when article changes
  useEffect(() => {
    console.log('📰 ArticleDetail - Article state changed:', article?.title);
  }, [article]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const openInBrowser = async () => {
    console.log('📰 ArticleDetail - Opening in browser:', article?.link);
    if (article?.link) {
      try {
        await Linking.openURL(article.link);
      } catch (error) {
        console.error('📰 ArticleDetail - Error opening browser:', error);
      }
    }
  };

  const shareArticle = () => {
    console.log('📰 ArticleDetail - Share button pressed');
    // TODO: Implement sharing functionality
  };

  const handleBack = () => {
    console.log('📰 ArticleDetail - Back button pressed manually');
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading article...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!article && !loading) {
    console.log('📰 ArticleDetail - No article found, showing error screen');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            Article not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If we somehow got here without an article, don't render anything
  if (!article) {
    console.log('📰 ArticleDetail - No article but still loading, rendering nothing');
    return null;
  }

  console.log('📰 ArticleDetail - About to render main content');
  console.log('📰 ArticleDetail - Rendering with viewMode:', viewMode);
  console.log('📰 ArticleDetail - Article object:', article);

  // TEMPORARY: Force static display to debug auto-back issue
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Debug info */}
      <View style={{ position: 'absolute', top: 50, left: 10, zIndex: 1000, backgroundColor: 'red', padding: 5 }}>
        <Text style={{ color: 'white', fontSize: 10 }}>Article loaded: {article?.title?.substring(0, 20)}...</Text>
        <Text style={{ color: 'white', fontSize: 10 }}>ViewMode: {viewMode}</Text>
      </View>

      {/* STATIC TEST CONTENT */}
      <View style={{ flex: 1, padding: 20, backgroundColor: 'lightblue' }}>
        <TouchableOpacity 
          onPress={handleBack}
          style={{ backgroundColor: 'blue', padding: 10, marginBottom: 20 }}
        >
          <Text style={{ color: 'white' }}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          STATIC TEST MODE
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          Title: {article?.title}
        </Text>
        <Text style={{ fontSize: 14 }}>
          Source: {article?.source_name}
        </Text>
        <Text style={{ fontSize: 12, marginTop: 20 }}>
          If this screen stays visible, the auto-back issue is not in the render logic.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

