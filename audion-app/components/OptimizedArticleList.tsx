import React, { memo, useCallback } from 'react';
import { FlatList, View, Text, TouchableOpacity, Image, ListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Article } from '../types';

interface OptimizedArticleListProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

// メモ化されたアーティクルアイテムコンポーネント
const ArticleItem = memo(({ item, onPress }: { item: Article; onPress: (article: Article) => void }) => {
  const { theme } = useTheme();

  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Just now';
    }
  }, []);

  return (
    <TouchableOpacity
      style={{
        backgroundColor: theme.surface,
        padding: 16,
        borderRadius: 12,
        marginVertical: 4,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
      }}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Text content */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: '600', 
              color: theme.primary,
              textTransform: 'uppercase'
            }}>
              {item.source_name || 'Unknown Source'}
            </Text>
            <View style={{ 
              width: 3, 
              height: 3, 
              borderRadius: 1.5, 
              backgroundColor: theme.textMuted,
              marginHorizontal: 8
            }} />
            <Text style={{ fontSize: 12, color: theme.textMuted }}>
              {formatDate(item.published || '')}
            </Text>
          </View>
          
          <Text 
            style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: theme.text,
              lineHeight: 22,
              marginBottom: 4
            }}
            numberOfLines={3}
          >
            {item.title || 'Untitled'}
          </Text>
          
          {item.summary && item.summary.trim() && (
            <Text 
              style={{ 
                fontSize: 14, 
                color: theme.textSecondary,
                lineHeight: 20
              }}
              numberOfLines={2}
            >
              {item.summary.trim()}
            </Text>
          )}
        </View>

        {/* Thumbnail */}
        <View style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 8, 
          overflow: 'hidden',
          backgroundColor: theme.accent
        }}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}>
              <Ionicons name="newspaper-outline" size={24} color={theme.textMuted} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// 最適化されたリストコンポーネント
const OptimizedArticleList: React.FC<OptimizedArticleListProps> = ({
  articles,
  onArticlePress,
  refreshing = false,
  onRefresh,
  loading = false
}) => {
  const { theme } = useTheme();

  const renderArticleItem: ListRenderItem<Article> = useCallback(
    ({ item }) => (
      <ArticleItem item={item} onPress={onArticlePress} />
    ),
    [onArticlePress]
  );

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: 104, // 推定アイテム高さ
      offset: 104 * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: Article) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      paddingVertical: 60 
    }}>
      <Ionicons name="newspaper-outline" size={64} color={theme.textMuted} />
      <Text style={{ 
        fontSize: 18, 
        fontWeight: '600', 
        color: theme.textSecondary,
        marginTop: 16,
        marginBottom: 8
      }}>
        {loading ? 'Loading articles...' : 'No articles available'}
      </Text>
      {!loading && (
        <Text style={{ 
          fontSize: 14, 
          color: theme.textMuted,
          textAlign: 'center',
          paddingHorizontal: 40
        }}>
          Pull down to refresh and check for new content
        </Text>
      )}
    </View>
  ), [theme, loading]);

  return (
    <FlatList
      data={articles}
      renderItem={renderArticleItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10} // 初期レンダリング数を制限
      maxToRenderPerBatch={5} // バッチ処理数を制限
      windowSize={10} // ウィンドウサイズを最適化
      removeClippedSubviews={true} // 画面外要素を削除
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={articles.length === 0 ? { flex: 1 } : { paddingVertical: 8 }}
    />
  );
};

export default memo(OptimizedArticleList);