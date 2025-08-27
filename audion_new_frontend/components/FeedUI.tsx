/**
 * Feed UI Component - プレゼンテーショナル層
 * ロジックを一切持たず、propsで渡されたデータの表示のみ担当
 * bolt.new/Figma刷新時はこのファイルを差し替えるだけ
 */

import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  FlatList,
  View,
  Text,
} from 'react-native';
import { Link } from 'expo-router';
import { RSSFeedState, RSSFeedActions } from '../hooks/useRSSFeed';
import { Article } from '../services/ArticleService';
import HorizontalTabs from './HorizontalTabs';
import UnifiedHeader from './UnifiedHeader';

interface FeedUIProps extends RSSFeedState, RSSFeedActions {
  user: any; // From auth context
}

// ミニマムなUIスタイル（将来のUI刷新で差し替え対象）
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60, // Account for status bar and dynamic island
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
  },
  subText: {
    fontSize: 16,
    opacity: 0.7,
    color: '#ffffff',
  },
  filterSection: {
    paddingVertical: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#111111',
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeFilterChip: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#cccccc',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#ffffff',
  },
  articlesList: {
    flex: 1,
  },
  articleItem: {
    backgroundColor: '#111111',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff',
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  articleDate: {
    fontSize: 12,
    color: '#888888',
  },
  audioButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  audioButtonGenerating: {
    backgroundColor: '#FF9500',
  },
  audioButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  addSourceButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 16,
  },
  addSourceButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sourceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sourceDetails: {
    flex: 1,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sourceDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  addSourceSmallButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addSourceSmallButtonText: {
    color: 'white',
    fontSize: 12,
  },
  customRssInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
});

const RSS_SOURCES = [
  { id: 'all', name: 'すべて' },
  { id: 'nhk', name: 'NHK NEWS' },
  { id: 'asahi', name: '朝日新聞' },
  { id: 'nikkei', name: '日経新聞' },
  { id: 'itmedia', name: 'ITmedia' }
];

const GENRES = [
  { id: 'all', name: 'すべて' },
  { id: 'news', name: 'ニュース' },
  { id: 'technology', name: 'テクノロジー' },
  { id: 'business', name: 'ビジネス' },
  { id: 'sports', name: 'スポーツ' },
  { id: 'entertainment', name: 'エンタメ' }
];

export const FeedUI: React.FC<FeedUIProps> = ({
  // State
  user,
  articles,
  categories,
  preConfiguredSources,
  userSources,
  loading,
  refreshing,
  sourcesLoading,
  importing,
  showSourceModal,
  selectedSource,
  selectedGenre,
  rssUrl,
  audioGenerating,
  audioProgress,
  
  // Actions
  onRefresh,
  generateAudio,
  addPreConfiguredSource,
  setShowSourceModal,
  setSelectedSource,
  setSelectedGenre,
  setRssUrl,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading articles...</Text>
      </View>
    );
  }

  const renderArticle = ({ item }: { item: Article }) => {
    const isGenerating = audioGenerating[item.id] || false;
    const progress = audioProgress[item.id];
    
    return (
      <View style={styles.articleItem}>
        <Link
          href={{
            pathname: '/article-webview',
            params: { url: item.url, title: item.title }
          }}
          asChild
        >
          <TouchableOpacity>
            <Text style={styles.articleTitle}>{item.title}</Text>
            <View style={styles.articleMeta}>
              <Text style={styles.articleSource}>{item.source_name || 'Unknown Source'}</Text>
              <Text style={styles.articleDate}>
                {new Date(item.published_at).toLocaleDateString('ja-JP')}
              </Text>
            </View>
          </TouchableOpacity>
        </Link>
        
        <TouchableOpacity
          style={[
            styles.audioButton,
            isGenerating && styles.audioButtonGenerating
          ]}
          onPress={() => generateAudio(item.id, item.title)}
          disabled={isGenerating}
        >
          <Text style={styles.audioButtonText}>
            {isGenerating ? '⏳ 生成中...' : '🎧 音声生成'}
          </Text>
        </TouchableOpacity>
        
        {progress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {progress.status === 'processing' 
                ? `進捗: ${progress.progress_percent}% - ${progress.message}`
                : progress.message}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader />
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Source Filter */}
        <HorizontalTabs
          tabs={RSS_SOURCES}
          selectedTab={selectedSource}
          onTabSelect={setSelectedSource}
          style={styles.filterSection}
        />

        {/* Genre Filter */}
        <HorizontalTabs
          tabs={GENRES}
          selectedTab={selectedGenre}
          onTabSelect={setSelectedGenre}
          style={styles.filterSection}
        />

        {/* Add Source Button */}
        <TouchableOpacity
          style={styles.addSourceButton}
          onPress={() => setShowSourceModal(true)}
        >
          <Text style={styles.addSourceButtonText}>+ RSSソースを追加</Text>
        </TouchableOpacity>

        {/* Articles List */}
        <View style={styles.articlesList}>
          <FlatList
            data={articles}
            renderItem={renderArticle}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {/* RSS Source Modal */}
      <Modal visible={showSourceModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSourceModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>RSSソースを追加</Text>
            
            <ScrollView>
              {/* Pre-configured Sources */}
              <View style={styles.sourceSection}>
                <Text style={styles.sectionTitle}>おすすめソース</Text>
                {sourcesLoading ? (
                  <ActivityIndicator />
                ) : (
                  preConfiguredSources.map((source) => (
                    <View key={source.id} style={styles.sourceItem}>
                      <View style={styles.sourceInfo}>
                        <Text style={styles.sourceIcon}>📰</Text>
                        <View style={styles.sourceDetails}>
                          <Text style={styles.sourceName}>{source.name}</Text>
                          <Text style={styles.sourceDescription}>{source.description}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.addSourceSmallButton}
                        onPress={() => addPreConfiguredSource(source.id, source.name)}
                      >
                        <Text style={styles.addSourceSmallButtonText}>+ 追加</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Custom RSS */}
              <View style={styles.sourceSection}>
                <Text style={styles.sectionTitle}>カスタムRSS</Text>
                <TextInput
                  style={styles.customRssInput}
                  placeholder="RSS URLを入力"
                  value={rssUrl}
                  onChangeText={setRssUrl}
                />
                <TouchableOpacity
                  style={[styles.addSourceSmallButton, { alignSelf: 'stretch' }]}
                  disabled={!rssUrl}
                >
                  <Text style={styles.addSourceSmallButtonText}>URLを追加</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};