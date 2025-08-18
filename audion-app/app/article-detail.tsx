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

  useEffect(() => {
    console.log('Article detail useEffect triggered');
    console.log('Params:', params);
    
    try {
      if (params.articleData) {
        try {
          const articleData = JSON.parse(params.articleData as string);
          console.log('Parsed article data successfully:', articleData.title);
          setArticle(articleData);
          setHasError(false);
        } catch (parseError) {
          console.error('Failed to parse article data:', parseError);
          console.log('Raw articleData:', params.articleData);
          setHasError(true);
        }
      } else {
        console.error('No articleData in params');
        setHasError(true);
      }
    } catch (error) {
      console.error('Unexpected error in useEffect:', error);
      setHasError(true);
    }
    
    setLoading(false);
  }, [params.articleData]);

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
    if (article?.link) {
      try {
        await Linking.openURL(article.link);
      } catch (error) {
        console.error('Error opening browser:', error);
      }
    }
  };

  const shareArticle = () => {
    // TODO: Implement sharing functionality
  };

  const handleBack = () => {
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

  if (hasError || (!article && !loading)) {
    console.log('Rendering error screen. hasError:', hasError, 'article:', !!article, 'loading:', loading);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerActions} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            記事が見つかりません
          </Text>
          <Text style={[styles.errorSubText, { color: theme.textSecondary }]}>
            {hasError ? 'データの解析に失敗しました' : '記事データがありません'}
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If we somehow got here without an article, don't render anything
  if (!article) {
    return null;
  }

  // Simplified content rendering for debugging
  const renderContent = () => {
    // Always render summary mode for now to debug the issue
    return (
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          <Text style={[styles.articleTitle, { color: theme.text }]}>
            {article.title}
          </Text>
          
          <View style={styles.metaInfo}>
            <Text style={[styles.sourceText, { color: theme.primary }]}>
              {article.source_name}
            </Text>
            <View style={styles.metaSeparator} />
            <Text style={[styles.dateText, { color: theme.textMuted }]}>
              {formatDate(article.published || article.published_at)}
            </Text>
            {article.genre && (
              <>
                <View style={styles.metaSeparator} />
                <View style={[styles.genreTag, { backgroundColor: theme.secondary }]}>
                  <Text style={[styles.genreText, { color: theme.primary }]}>
                    {article.genre}
                  </Text>
                </View>
              </>
            )}
          </View>
          
          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
            {article.summary}
          </Text>
          
          <TouchableOpacity
            style={[styles.readFullButton, { backgroundColor: theme.primary }]}
            onPress={openInBrowser}
            activeOpacity={0.8}
          >
            <Ionicons name="globe-outline" size={20} color="#fff" />
            <Text style={styles.readFullButtonText}>ブラウザで読む</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={shareArticle}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={openInBrowser}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Simplified header for debugging */}
      <View style={[styles.debugHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.debugText, { color: theme.text }]}>
          記事詳細 (デバッグモード)
        </Text>
      </View>
      
      {/* Content */}
      {renderContent()}
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  articleImage: {
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  sourceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 12,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 10,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  readFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  readFullButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noContentContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noContentText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  webViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  webViewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  webViewLoadingText: {
    marginTop: 16,
    fontSize: 16,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
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
  debugHeader: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  debugText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

