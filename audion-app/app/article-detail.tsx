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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { WebView } from 'react-native-webview';

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
  const [viewMode, setViewMode] = useState<'content' | 'web'>('content');

  console.log('📰 ArticleDetail: Component mounted');

  useEffect(() => {
    console.log('📰 ArticleDetail: useEffect triggered', { hasArticleData: !!params.articleData });
    if (params.articleData) {
      try {
        const articleData = JSON.parse(params.articleData as string);
        console.log('📰 ArticleDetail: Article parsed successfully:', articleData.title);
        setArticle(articleData);
      } catch (error) {
        console.error('📰 ArticleDetail: Error parsing article data:', error);
      }
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
        console.error('Failed to open URL:', error);
      }
    }
  };

  const shareArticle = () => {
    // TODO: Implement sharing functionality
    console.log('Share article:', article?.title);
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

  if (!article) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            Article not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={shareArticle}
          >
            <Ionicons name="share-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openInBrowser}
          >
            <Ionicons name="open-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={[styles.viewModeContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'content' && { backgroundColor: theme.primary }
          ]}
          onPress={() => setViewMode('content')}
        >
          <Text style={[
            styles.viewModeText,
            { color: viewMode === 'content' ? '#fff' : theme.text }
          ]}>
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'web' && { backgroundColor: theme.primary }
          ]}
          onPress={() => setViewMode('web')}
        >
          <Text style={[
            styles.viewModeText,
            { color: viewMode === 'web' ? '#fff' : theme.text }
          ]}>
            Full Article
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'content' ? (
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Article Image */}
          {article.image_url && (
            <Image
              source={{ uri: article.image_url }}
              style={styles.articleImage}
              resizeMode="cover"
            />
          )}

          {/* Article Content */}
          <View style={styles.articleContent}>
            {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>
              {article.title}
            </Text>

            {/* Meta Info */}
            <View style={styles.metaContainer}>
              <View style={styles.metaRow}>
                <Text style={[styles.source, { color: theme.primary }]}>
                  {article.source_name}
                </Text>
                <View style={[styles.dot, { backgroundColor: theme.textMuted }]} />
                <Text style={[styles.date, { color: theme.textMuted }]}>
                  {formatDate(article.published)}
                </Text>
              </View>
              {article.genre && (
                <View style={[styles.genreTag, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.genreText, { color: theme.textMuted }]}>
                    {article.genre}
                  </Text>
                </View>
              )}
            </View>

            {/* Summary */}
            <Text style={[styles.summary, { color: theme.textSecondary }]}>
              {article.summary}
            </Text>

            {/* Content */}
            {article.content && article.content !== article.summary && (
              <Text style={[styles.content, { color: theme.text }]}>
                {article.content}
              </Text>
            )}

            {/* Read More Button */}
            <TouchableOpacity
              style={[styles.readMoreButton, { backgroundColor: theme.primary }]}
              onPress={openInBrowser}
            >
              <Text style={styles.readMoreText}>Read Full Article</Text>
              <Ionicons name="open-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <WebView
          source={{ uri: article.link }}
          style={{ flex: 1 }}
          onError={(error) => {
            console.error('WebView error:', error);
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading article...
              </Text>
            </View>
          )}
        />
      )}
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
  viewModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  articleImage: {
    width: '100%',
    height: 200,
  },
  articleContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    marginBottom: 16,
  },
  metaContainer: {
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  source: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  date: {
    fontSize: 14,
  },
  genreTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  readMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    gap: 16,
  },
});