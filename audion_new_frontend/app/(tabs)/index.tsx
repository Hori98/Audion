import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, View, Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import HorizontalTabs from '../../components/HorizontalTabs';
import UnifiedHeader from '../../components/UnifiedHeader';

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
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Fetch latest content
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

  return (
    <View style={styles.container}>
      <UnifiedHeader 
        onUserPress={() => Alert.alert('Settings', '設定メニュー（実装予定）')}
        onSearchPress={() => Alert.alert('Search', '検索機能（実装予定）')}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Genre Selection */}
        <HorizontalTabs
          tabs={GENRES}
          selectedTab={selectedGenre}
          onTabSelect={setSelectedGenre}
          style={styles.genreSection}
        />

        {/* Hero Section - 5 Featured Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hero</Text>
          
          {/* Main Hero Article */}
          <TouchableOpacity 
            style={styles.heroCard}
            onPress={() => handleArticlePress({
              title: 'Breaking: テクノロジー業界の最新動向'
            })}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Breaking: テクノロジー業界の最新動向</Text>
              <Text style={styles.heroDescription}>
                AI技術の進歩により、今年は大きな変革の年になると予想されています...
              </Text>
              <View style={styles.heroMeta}>
                <Text style={styles.heroSource}>NHK NEWS WEB</Text>
                <Text style={styles.heroTime}>5分前</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Additional Hero Articles */}
          {[
            { title: '量子コンピューティングの商業化が現実に', source: '日経新聞', time: '15分前' },
            { title: '気候変動対策で新たな国際合意', source: 'CNN Japan', time: '30分前' },
            { title: '宇宙探査ミッション、火星でのサンプル採取に成功', source: 'NASA Japan', time: '1時間前' },
            { title: '医療AI、がん診断の精度が95%に向上', source: 'Medical News', time: '2時間前' }
          ].map((article, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.heroSubCard}
              onPress={() => handleArticlePress({
                title: article.title
              })}
            >
              <View style={styles.heroSubContent}>
                <Text style={styles.heroSubTitle}>{article.title}</Text>
                <View style={styles.heroSubMeta}>
                  <Text style={styles.heroSubSource}>{article.source}</Text>
                  <Text style={styles.heroSubTime}>{article.time}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured News Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>注目のニュース</Text>
          
          <TouchableOpacity 
            style={styles.articleCard}
            onPress={() => handleArticlePress({
              title: '経済市場の回復基調が続く'
            })}
          >
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>経済市場の回復基調が続く</Text>
              <Text style={styles.articleSummary}>
                今四半期の経済指標は予想を上回る結果となり、市場の回復傾向が鮮明に...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>Bloomberg Japan</Text>
                <Text style={styles.articleTime}>3時間前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>♪</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.articleCard}
            onPress={() => handleArticlePress({
              title: 'スポーツ界での新記録達成'
            })}
          >
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>スポーツ界での新記録達成</Text>
              <Text style={styles.articleSummary}>
                昨日の大会で複数の世界記録が更新され、スポーツ界に新たな歴史が刻まれました...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>Sports Today</Text>
                <Text style={styles.articleTime}>4時間前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>♪</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recommended Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>おすすめ</Text>
          
          <TouchableOpacity 
            style={styles.articleCard}
            onPress={() => handleArticlePress({
              title: '新しいスマートフォン技術の革新'
            })}
          >
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>新しいスマートフォン技術の革新</Text>
              <Text style={styles.articleSummary}>
                最新の5G技術とAIプロセッサーが組み合わさった革新的なデバイス...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>ITmedia NEWS</Text>
                <Text style={styles.articleTime}>15分前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>♪</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.articleCard}
            onPress={() => handleArticlePress({
              title: '経済市場の最新分析レポート'
            })}
          >
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>経済市場の最新分析レポート</Text>
              <Text style={styles.articleSummary}>
                今四半期の経済指標と来年の予測について専門家が分析...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>日本経済新聞</Text>
                <Text style={styles.articleTime}>1時間前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>♪</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.articleCard}
            onPress={() => handleArticlePress({
              title: 'スポーツ界の注目ニュース'
            })}
          >
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>スポーツ界の注目ニュース</Text>
              <Text style={styles.articleSummary}>
                来シーズンに向けた新しい戦略と選手の動向について...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>スポーツナビ</Text>
                <Text style={styles.articleTime}>2時間前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>♪</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Floating AutoPick Button */}
      <TouchableOpacity 
        style={styles.floatingAutoPickButton}
        onPress={() => Alert.alert('AutoPick', 'AutoPick機能（実装予定）')}
      >
        <Text style={styles.floatingAutoPickText}>🎯</Text>
      </TouchableOpacity>
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
  heroCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 26,
  },
  heroDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSource: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  heroTime: {
    fontSize: 12,
    color: '#888888',
  },
  heroSubCard: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  heroSubContent: {
    flex: 1,
  },
  heroSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 18,
  },
  heroSubMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSubSource: {
    fontSize: 11,
    color: '#007bff',
    fontWeight: '600',
  },
  heroSubTime: {
    fontSize: 11,
    color: '#888888',
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
