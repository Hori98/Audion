import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '../../context/AuthContext';

interface CommunityAudio {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  author: string;
  playCount: number;
  isOfficial: boolean;
  createdAt: string;
  audioUrl?: string;
}

export default function DiscoverScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [communityAudios, setCommunityAudios] = useState<CommunityAudio[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'すべて', icon: '🌟' },
    { id: 'official', name: '公式', icon: '⭐' },
    { id: 'news', name: 'ニュース', icon: '📰' },
    { id: 'technology', name: 'テクノロジー', icon: '💻' },
    { id: 'business', name: 'ビジネス', icon: '💼' }
  ];

  // Mock data for beta version with admin content
  const mockCommunityAudios: CommunityAudio[] = [
    {
      id: '1',
      title: '【公式】今週のニュースダイジェスト',
      description: 'Audion運営チームが厳選した今週の重要ニュースをわかりやすく解説します。',
      duration: 900, // 15 minutes
      category: 'official',
      author: 'Audion 運営チーム',
      playCount: 1245,
      isOfficial: true,
      createdAt: '2025-08-26T02:00:00Z',
      audioUrl: 'mock-url-1'
    },
    {
      id: '2', 
      title: '【公式】AI技術の最新動向レポート',
      description: '今月注目のAI技術動向と業界への影響について専門解説します。',
      duration: 720, // 12 minutes
      category: 'technology',
      author: 'Audion テック編集部',
      playCount: 892,
      isOfficial: true,
      createdAt: '2025-08-25T10:30:00Z',
      audioUrl: 'mock-url-2'
    },
    {
      id: '3',
      title: '【公式】経済市場ウィークリー分析',
      description: '株式市場、為替動向、経済指標を分かりやすく解説。投資の参考に。',
      duration: 660, // 11 minutes
      category: 'business',
      author: 'Audion ビジネス編集部',
      playCount: 634,
      isOfficial: true,
      createdAt: '2025-08-24T08:00:00Z',
      audioUrl: 'mock-url-3'
    },
    {
      id: '4',
      title: '【公式】速報：重要政策発表の解説',
      description: '本日発表された重要政策について、背景と影響を詳しく解説します。',
      duration: 480, // 8 minutes
      category: 'news',
      author: 'Audion ニュース編集部',
      playCount: 2156,
      isOfficial: true,
      createdAt: '2025-08-26T06:00:00Z',
      audioUrl: 'mock-url-4'
    }
  ];

  const fetchCommunityAudios = async () => {
    try {
      // TODO: Replace with actual API call in production
      // For beta version, use mock data representing admin-created content
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      setCommunityAudios(mockCommunityAudios);
    } catch (error) {
      console.error('Error fetching community audios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '1時間未満前';
    if (diffInHours < 24) return `${diffInHours}時間前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}日前`;
  };

  const filteredAudios = communityAudios.filter(audio => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'official') return audio.isOfficial;
    return audio.category === selectedCategory;
  });

  useEffect(() => {
    fetchCommunityAudios();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommunityAudios();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>コミュニティコンテンツを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ディスカバー</Text>
        <View style={styles.betaBadge}>
          <Text style={styles.betaBadgeText}>BETA</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Beta Notice */}
        <View style={styles.betaNotice}>
          <Text style={styles.betaNoticeTitle}>🚧 ベータ版のお知らせ</Text>
          <Text style={styles.betaNoticeText}>
            現在、運営チームが作成したオーディオコンテンツのみを配信しています。
            今後、コミュニティ機能を拡張予定です。
          </Text>
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipSelected
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextSelected
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Community Audio List */}
        <View style={styles.audioSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'official' ? '公式コンテンツ' : 'コミュニティオーディオ'}
          </Text>
          
          {filteredAudios.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎧</Text>
              <Text style={styles.emptyStateTitle}>コンテンツがありません</Text>
              <Text style={styles.emptyStateDescription}>
                選択したカテゴリーにはまだコンテンツがありません
              </Text>
            </View>
          ) : (
            filteredAudios.map((audio) => (
              <TouchableOpacity key={audio.id} style={styles.audioCard}>
                <View style={styles.audioHeader}>
                  <View style={styles.audioTitleSection}>
                    <Text style={styles.audioTitle}>{audio.title}</Text>
                    <Text style={styles.audioDescription} numberOfLines={2}>
                      {audio.description}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.playButton}>
                    <Text style={styles.playButtonText}>▶️</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.audioMeta}>
                  <View style={styles.authorSection}>
                    {audio.isOfficial && (
                      <View style={styles.officialBadge}>
                        <Text style={styles.officialBadgeText}>✓ 公式</Text>
                      </View>
                    )}
                    <Text style={styles.authorName}>{audio.author}</Text>
                  </View>
                  <Text style={styles.audioTime}>{getRelativeTime(audio.createdAt)}</Text>
                </View>

                <View style={styles.audioStats}>
                  <Text style={styles.duration}>⏱️ {formatDuration(audio.duration)}</Text>
                  <Text style={styles.playCount}>🎧 {formatPlayCount(audio.playCount)}回再生</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Coming Soon Section */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.comingSoonTitle}>🚀 今後の機能</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• ユーザー投稿コンテンツ</Text>
            <Text style={styles.featureItem}>• いいね・コメント機能</Text>
            <Text style={styles.featureItem}>• フォロー・フォロワー機能</Text>
            <Text style={styles.featureItem}>• おすすめアルゴリズム</Text>
            <Text style={styles.featureItem}>• カスタムプレイリスト共有</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888888',
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
  betaBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  betaBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  betaNotice: {
    margin: 24,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  betaNoticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffc107',
    marginBottom: 8,
  },
  betaNoticeText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  categorySection: {
    paddingVertical: 12,
  },
  categoryScrollContent: {
    paddingHorizontal: 24,
  },
  categoryChip: {
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
  categoryChipSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#cccccc',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  audioSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  audioCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  audioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  audioTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 22,
  },
  audioDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 18,
  },
  playButton: {
    width: 48,
    height: 48,
    backgroundColor: '#007bff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 20,
  },
  audioMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  officialBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  officialBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  audioTime: {
    fontSize: 12,
    color: '#888888',
  },
  audioStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: '#666666',
  },
  playCount: {
    fontSize: 12,
    color: '#666666',
  },
  comingSoonSection: {
    margin: 24,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  featureList: {
    marginLeft: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    lineHeight: 20,
  },
});