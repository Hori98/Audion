import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { WebView } from 'react-native-webview';

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

interface ArticleReaderProps {
  article: Article | null;
  visible: boolean;
  onClose: () => void;
}

export default function ArticleReader({ article, visible, onClose }: ArticleReaderProps) {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'summary' | 'web'>('summary');

  if (!article) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const openInBrowser = async () => {
    try {
      await Linking.openURL(article.link);
    } catch (error) {
      console.error('Error opening browser:', error);
      Alert.alert('エラー', 'ブラウザで開けませんでした');
    }
  };

  const cleanSummary = (htmlString: string) => {
    // Remove HTML tags for clean text display
    return htmlString.replace(/<[^>]*>/g, '').trim();
  };

  const renderSummary = () => (
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
            {formatDate(article.published)}
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
          {cleanSummary(article.summary)}
        </Text>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => setViewMode('web')}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>記事全文を読む</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.border }]}
          onPress={openInBrowser}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={20} color={theme.primary} />
          <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
            ブラウザで開く
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderWebView = () => (
    <WebView
      source={{ uri: article.link }}
      style={styles.webView}
      startInLoadingState={true}
      onError={() => {
        Alert.alert('エラー', '記事の読み込みに失敗しました', [
          { text: 'ブラウザで開く', onPress: openInBrowser },
          { text: 'キャンセル' }
        ]);
      }}
    />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            記事
          </Text>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={openInBrowser}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        
        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              viewMode === 'summary' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setViewMode('summary')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: viewMode === 'summary' ? theme.primary : theme.textMuted }
            ]}>
              概要
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              viewMode === 'web' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setViewMode('web')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: viewMode === 'web' ? theme.primary : theme.textMuted }
            ]}>
              記事全文
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Content */}
        {viewMode === 'summary' ? renderSummary() : renderWebView()}
      </SafeAreaView>
    </Modal>
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
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    padding: 20,
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
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
});