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
  SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect, useRouter } from 'expo-router';
// Removed expo-web-browser - using native reader mode instead
import { Ionicons } from '@expo/vector-icons';
import BookmarkService, { Bookmark } from '../services/BookmarkService';
import SearchBar from '../components/SearchBar';
import SearchUtils from '../utils/searchUtils';

export default function ReadLaterScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  const [readLaterArticles, setReadLaterArticles] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadReadLaterArticles();
      }
    }, [token])
  );

  const loadReadLaterArticles = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const articles = await BookmarkService.getInstance().getReadLaterArticles(token);
      setReadLaterArticles(articles);
    } catch (error) {
      console.error('Error loading read later articles:', error);
      Alert.alert('エラー', '後で読む記事の読み込みに失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReadLaterArticles();
  };

  const handleArticlePress = async (article: Bookmark) => {
    try {
      // Navigate to native reader mode instead of external browser
      const articleForReader = {
        id: article.id,
        title: article.article_title,
        summary: article.summary || '',
        link: article.article_link,
        published: article.created_at,
        source_name: article.source || 'Read Later',
        content: article.content || article.summary,
        genre: 'Bookmarked'
      };
      
      router.push({
        pathname: '/article-detail',
        params: { articleData: JSON.stringify(articleForReader) }
      });
    } catch (error) {
      Alert.alert('エラー', '記事を開けませんでした');
    }
  };

  const handleRemoveFromReadLater = async (article: Bookmark) => {
    if (!token) return;
    
    try {
      await BookmarkService.getInstance().removeFromReadLater(token, article.article_id);
      // Update local state
      setReadLaterArticles(prev => prev.filter(item => item.id !== article.id));
    } catch (error) {
      console.error('Error removing from read later:', error);
      Alert.alert('エラー', '後で読むから削除できませんでした');
    }
  };

  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() && query.length > 2) {
      await SearchUtils.saveSearchHistory(query, 'read_later_search_history');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown Date';
    }
  };

  // Filter articles based on search query
  const filteredArticles = readLaterArticles.filter(article => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      article.article_title?.toLowerCase().includes(query) ||
      article.article_summary?.toLowerCase().includes(query) ||
      article.article_source?.toLowerCase().includes(query)
    );
  });

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>後で読む</Text>
          <Text style={styles.headerSubtitle}>
            {filteredArticles.length}件の記事
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="記事を検索..."
      />

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={styles.loadingIndicator} />
        ) : filteredArticles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() ? '検索結果がありません' : '後で読む記事がありません'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim() 
                ? '別のキーワードで検索してみてください' 
                : 'ニュース記事の後で読むボタンを押して記事を保存しましょう'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.articlesList}>
            {filteredArticles.map((article) => (
              <View key={article.id} style={styles.articleCard}>
                <TouchableOpacity
                  style={styles.articleContent}
                  onPress={() => handleArticlePress(article)}
                  activeOpacity={0.7}
                >
                  <View style={styles.articleHeader}>
                    <Text style={styles.articleSource}>
                      {article.article_source}
                    </Text>
                    <Text style={styles.articleDate}>
                      {formatDate(article.bookmarked_at)}
                    </Text>
                  </View>
                  
                  <Text style={styles.articleTitle} numberOfLines={2}>
                    {article.article_title}
                  </Text>
                  
                  {article.article_summary && (
                    <Text style={styles.articleSummary} numberOfLines={3}>
                      {article.article_summary}
                    </Text>
                  )}

                  {article.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* Remove Button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFromReadLater(article)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={24} color={theme.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
          <Text style={styles.infoText}>
            後で読む機能を使って、興味のある記事を保存し、時間があるときにじっくり読むことができます。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  articlesList: {
    paddingVertical: 16,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleContent: {
    flex: 1,
    padding: 16,
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
    color: theme.primary,
  },
  articleDate: {
    fontSize: 12,
    color: theme.textMuted,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: theme.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  removeButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.accent,
    borderRadius: 8,
    padding: 16,
    marginVertical: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },
});