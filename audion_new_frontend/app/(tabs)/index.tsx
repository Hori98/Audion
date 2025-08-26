import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '../../context/AuthContext';

const GENRES = [
  { id: 'all', name: 'すべて', icon: '📰' },
  { id: 'news', name: 'ニュース', icon: '📰' },
  { id: 'technology', name: 'テクノロジー', icon: '💻' },
  { id: 'business', name: 'ビジネス', icon: '💼' },
  { id: 'sports', name: 'スポーツ', icon: '⚽' },
  { id: 'entertainment', name: 'エンタメ', icon: '🎬' },
  { id: 'science', name: 'サイエンス', icon: '🔬' }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ホーム</Text>
        <TouchableOpacity style={styles.autoPickButton}>
          <Text style={styles.autoPickText}>🎯 Auto Pick</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Genre Selection */}
        <View style={styles.genreSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreScrollContent}>
            {GENRES.map((genre) => (
              <TouchableOpacity
                key={genre.id}
                style={[
                  styles.genreChip,
                  selectedGenre === genre.id && styles.genreChipSelected
                ]}
                onPress={() => setSelectedGenre(genre.id)}
              >
                <Text style={styles.genreIcon}>{genre.icon}</Text>
                <Text style={[
                  styles.genreText,
                  selectedGenre === genre.id && styles.genreTextSelected
                ]}>
                  {genre.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Hero Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>注目のニュース</Text>
          <TouchableOpacity style={styles.heroCard}>
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
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>おすすめ記事</Text>
          
          <TouchableOpacity style={styles.articleCard}>
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>新しいスマートフォン技術の革新</Text>
              <Text style={styles.articleSummary}>
                最新の5G技術とAIプロセッサーが組み合わさった革新的なデバイス...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>ITmedia NEWS</Text>
                <Text style={styles.articleTime}>15分前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>🎵</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.articleCard}>
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>経済市場の最新分析レポート</Text>
              <Text style={styles.articleSummary}>
                今四半期の経済指標と来年の予測について専門家が分析...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>日本経済新聞</Text>
                <Text style={styles.articleTime}>1時間前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>🎵</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.articleCard}>
            <View style={styles.articleContent}>
              <Text style={styles.articleTitle}>スポーツ界の注目ニュース</Text>
              <Text style={styles.articleSummary}>
                来シーズンに向けた新しい戦略と選手の動向について...
              </Text>
              <View style={styles.articleMeta}>
                <Text style={styles.articleSource}>スポーツナビ</Text>
                <Text style={styles.articleTime}>2時間前</Text>
                <TouchableOpacity style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>🎵</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Breaking News */}
        <View style={styles.section}>
          <View style={styles.breakingHeader}>
            <Text style={styles.sectionTitle}>🚨 速報ニュース</Text>
            <Text style={styles.liveIndicator}>LIVE</Text>
          </View>
          
          <TouchableOpacity style={styles.breakingCard}>
            <View style={styles.breakingContent}>
              <Text style={styles.breakingTitle}>重要な政策発表が予定されています</Text>
              <Text style={styles.breakingTime}>たった今</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  autoPickButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  autoPickText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  genreSection: {
    paddingVertical: 16,
  },
  genreScrollContent: {
    paddingHorizontal: 24,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  genreChipSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  genreIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  genreText: {
    fontSize: 14,
    color: '#cccccc',
    fontWeight: '500',
  },
  genreTextSelected: {
    color: '#ffffff',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
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
  articleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
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
  },
  breakingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    backgroundColor: '#dc3545',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  breakingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  breakingTime: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
  },
});
