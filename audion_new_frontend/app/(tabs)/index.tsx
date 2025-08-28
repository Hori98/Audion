import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, View, Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import HorizontalTabs from '../../components/HorizontalTabs';
import UnifiedHeader from '../../components/UnifiedHeader';
import SearchModal from '../../components/SearchModal';
import HeroCarousel from '../../components/HeroCarousel';
import { useRSSFeed } from '../../hooks/useRSSFeed';
import AudioService from '../../services/AudioService';

const GENRES = [
  { id: 'all', name: 'すべて' },
  { id: 'news', name: 'ニュース' },
  { id: 'technology', name: 'テクノロジー' },
  { id: 'business', name: 'ビジネス' },
  { id: 'sports', name: 'スポーツ' },
  { id: 'entertainment', name: 'エンタメ' },
  { id: 'science', name: 'サイエンス' },
  { id: 'politics', name: '政治' },
  { id: 'economics', name: '経済' },
  { id: 'international', name: '国際' },
  { id: 'health', name: '健康' },
  { id: 'lifestyle', name: 'ライフスタイル' },
  { id: 'education', name: '教育' },
  { id: 'environment', name: '環境' },
  { id: 'culture', name: '文化' },
  { id: 'food', name: '食・グルメ' },
  { id: 'travel', name: '旅行' },
  { id: 'automotive', name: '自動車' },
  { id: 'real-estate', name: '不動産' },
  { id: 'finance', name: '金融' }
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { 
    articles, 
    loading, 
    selectedGenre,
    setSelectedGenre,
    onRefresh: rssRefresh 
  } = useRSSFeed();

  // Transform RSS articles to hero format, fallback to mock data
  const getHeroItems = () => {
    if (articles && articles.length > 0) {
      return articles.slice(0, 5).map((article, index) => ({
        id: article.id,
        title: article.title,
        description: article.summary || article.title,
        mediaName: article.source_name || 'ニュースソース',
        publishedAt: article.published_at,
        imageUrl: `https://picsum.photos/400/240?random=${article.id}`, // Placeholder until RSS images
        url: article.url
      }));
    }
    
    // Fallback to mock data when no articles available
    return [
      {
        id: 'mock-1',
        title: 'AI技術の最新動向：ChatGPTを超える新世代モデルが登場',
        description: '人工知能の分野で革命的な進歩が続く中、新たなLLMモデルが業界に大きな変化をもたらす可能性を秘めている。',
        mediaName: 'TechCrunch Japan',
        publishedAt: '2025-01-23T09:00:00Z',
        imageUrl: 'https://picsum.photos/400/240?random=1',
        url: 'https://example.com/ai-tech-news'
      },
      {
        id: 'mock-2', 
        title: '経済市場の回復傾向が鮮明に、専門家が分析する今後の展望',
        description: '今四半期の経済指標は予想を上回る結果となり、アナリストたちは慎重ながらも楽観的な見通しを示している。',
        mediaName: '日本経済新聞',
        publishedAt: '2025-01-23T08:30:00Z',
        imageUrl: 'https://picsum.photos/400/240?random=2',
        url: 'https://example.com/economy-news'
      }
    ];
  };

  const heroItems = getHeroItems();

  // 実際の記事から注目記事とおすすめ記事を取得
  const getFeaturedArticles = () => {
    if (articles && articles.length > 5) {
      return articles.slice(5, 7); // Hero Carouselの後の2記事を使用
    }
    return [{
      id: 'sample-featured-1',
      title: 'サンプル記事',
      summary: 'これはサンプル記事です。実際の記事データが取得できない場合に表示されます。',
      url: null,
      source_name: 'ダミー',
      published_at: new Date().toISOString(),
      category: 'news'
    }, {
      id: 'sample-featured-2', 
      title: 'サンプル記事',
      summary: 'これはサンプル記事です。実際の記事データが取得できない場合に表示されます。',
      url: null,
      source_name: 'ダミー',
      published_at: new Date().toISOString(),
      category: 'sports'
    }];
  };

  const getRecommendedArticles = () => {
    if (articles && articles.length > 7) {
      return articles.slice(7, 10); // さらに次の3記事を使用
    }
    return [{
      id: 'sample-recommended-1',
      title: 'サンプル記事',
      summary: 'これはサンプル記事です。実際の記事データが取得できない場合に表示されます。',
      url: null,
      source_name: 'ダミー',
      published_at: new Date().toISOString(),
      category: 'technology'
    }, {
      id: 'sample-recommended-2',
      title: 'サンプル記事', 
      summary: 'これはサンプル記事です。実際の記事データが取得できない場合に表示されます。',
      url: null,
      source_name: 'ダミー',
      published_at: new Date().toISOString(),
      category: 'business'
    }, {
      id: 'sample-recommended-3',
      title: 'サンプル記事',
      summary: 'これはサンプル記事です。実際の記事データが取得できない場合に表示されます。',
      url: null,
      source_name: 'ダミー',
      published_at: new Date().toISOString(),
      category: 'sports'
    }];
  };

  const featuredArticles = getFeaturedArticles();
  const recommendedArticles = getRecommendedArticles();

  const onRefresh = () => {
    setRefreshing(true);
    rssRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleArticlePress = (article: { title: string; url?: string }) => {
    if (article.url) {
      router.push({
        pathname: '/article-webview',
        params: { 
          url: article.url, 
          title: article.title 
        }
      });
    } else {
      // Sample articles don't have real URLs, so show a demo message
      Alert.alert(
        '記事を開く',
        `${article.title}\n\n※ これはサンプル記事です。実際の実装では記事のURLが必要です。`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSearchResult = (result: any) => {
    // Handle different types of search results
    switch (result.type) {
      case 'article':
        handleArticlePress({ title: result.title, url: result.url });
        break;
      case 'genre':
        setSelectedGenre(result.id || 'all');
        break;
      case 'source':
        // Navigate to feed tab with selected source
        Alert.alert('ソース選択', `${result.title}のコンテンツを表示します`);
        break;
      default:
        break;
    }
  };

  const handleHeroItemPress = (item: any) => {
    if (item.url) {
      router.push({
        pathname: '/article-webview',
        params: { 
          url: item.url, 
          title: item.title 
        }
      });
    } else {
      Alert.alert(
        'ニュース記事',
        `${item.title}\n\n※ サンプル記事です`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleAudioGenerate = async (articleId: string, title: string) => {
    console.log('🎵 [AUDIO DEBUG] Generate button pressed for:', title);
    
    Alert.alert(
      '音声生成',
      `"${title}"の音声を生成しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '生成開始',
          onPress: async () => {
            try {
              console.log('🎵 [AUDIO DEBUG] Starting audio generation...');
              
              // Call AudioService (シングルトンなのでnewは不要)
              const response = await AudioService.generateAudio({
                article_id: articleId,
                title: title,
                language: 'ja',
                voice_type: 'standard'
              });
              
              console.log('🎵 [AUDIO DEBUG] Audio generation response:', response);
              Alert.alert('成功', '音声生成を開始しました！');
              
            } catch (error) {
              console.error('🎵 [AUDIO ERROR] Audio generation failed:', error);
              Alert.alert('エラー', `音声生成に失敗しました: ${error.message || 'Unknown error'}`);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader 
        onSearchPress={() => setShowSearchModal(true)}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />}
      >
        {/* Genre Selection */}
        <HorizontalTabs
          tabs={GENRES}
          selectedTab={selectedGenre}
          onTabSelect={setSelectedGenre}
          style={styles.genreSection}
        />

        {/* Hero Carousel Section */}
        <HeroCarousel
          items={heroItems}
          onItemPress={handleHeroItemPress}
        />

        {/* Featured News Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>注目のニュース</Text>
          
          {featuredArticles.map((article, index) => (
            <TouchableOpacity 
              key={article.id}
              style={styles.articleCard}
              onPress={() => handleArticlePress({
                title: article.title,
                url: article.url
              })}
            >
              <View style={styles.articleContent}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSummary}>
                  {article.summary || 'サンプル記事の概要です。'}
                </Text>
                <View style={styles.articleMeta}>
                  <Text style={styles.articleSource}>{article.source_name}</Text>
                  <Text style={styles.articleTime}>
                    {article.published_at ? new Date(article.published_at).toLocaleString('ja-JP', { 
                      month: 'numeric', 
                      day: 'numeric', 
                      hour: 'numeric',
                      minute: '2-digit'
                    }) : '最近'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.generateButton}
                    onPress={() => handleAudioGenerate(article.id, article.title)}
                  >
                    <Text style={styles.generateButtonText}>♪</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recommended Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>おすすめ</Text>
          
          {recommendedArticles.map((article, index) => (
            <TouchableOpacity 
              key={article.id}
              style={styles.articleCard}
              onPress={() => handleArticlePress({
                title: article.title,
                url: article.url
              })}
            >
              <View style={styles.articleContent}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleSummary}>
                  {article.summary || 'サンプル記事の概要です。'}
                </Text>
                <View style={styles.articleMeta}>
                  <Text style={styles.articleSource}>{article.source_name}</Text>
                  <Text style={styles.articleTime}>
                    {article.published_at ? new Date(article.published_at).toLocaleString('ja-JP', { 
                      month: 'numeric', 
                      day: 'numeric', 
                      hour: 'numeric',
                      minute: '2-digit'
                    }) : '最近'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.generateButton}
                    onPress={() => handleAudioGenerate(article.id, article.title)}
                  >
                    <Text style={styles.generateButtonText}>♪</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Floating AutoPick Button */}
      <TouchableOpacity 
        style={styles.floatingAutoPickButton}
        onPress={() => Alert.alert('AutoPick', 'AutoPick機能（実装予定）')}
      >
        <Text style={styles.floatingAutoPickText}>🎯</Text>
      </TouchableOpacity>

      {/* Search Modal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onResultPress={handleSearchResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Account for status bar and dynamic island
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  floatingAutoPickButton: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#007bff',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Android shadow
  },
  floatingAutoPickText: {
    fontSize: 24,
    color: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  genreSection: {
    paddingVertical: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  articleCard: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleSource: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
    flex: 1,
  },
  articleTime: {
    fontSize: 12,
    color: '#888888',
    marginRight: 12,
  },
  generateButton: {
    backgroundColor: '#007bff',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 14,
    color: '#ffffff',
  },
});
