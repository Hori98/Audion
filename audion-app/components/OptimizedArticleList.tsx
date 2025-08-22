import React, { memo, useCallback, useState, useEffect } from 'react';
import { FlatList, View, Text, TouchableOpacity, Image, ListRenderItem, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Article } from '../types';
import BookmarkService from '../services/BookmarkService';
import ShareService from '../services/ShareService';
import ArchiveService from '../services/ArchiveService';

interface OptimizedArticleListProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  readingHistory?: Map<string, Date>;
  archivedArticles?: Set<string>;
  feedLikedArticles?: Set<string>;
  feedDislikedArticles?: Set<string>;
  // Selection mode support
  selectionMode?: boolean;
  selectedArticleIds?: string[];
  onToggleSelection?: (articleId: string) => void;
  onLongPress?: (article: Article) => void;
}

// メモ化されたアーティクルアイテムコンポーネント
const ArticleItem = memo(({ 
  item, 
  onPress, 
  selectionMode = false, 
  isSelected = false, 
  onToggleSelection,
  onLongPress,
  isRead = false
}: { 
  item: Article; 
  onPress: (article: Article) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (articleId: string) => void;
  onLongPress?: (article: Article) => void;
  isRead?: boolean;
}) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  useEffect(() => {
    if (token) {
      // Check bookmark status from cache
      const cachedStatus = BookmarkService.getInstance().getBookmarkStatusFromCache(item.id);
      if (cachedStatus !== null) {
        setIsBookmarked(cachedStatus);
      } else {
        // Load from API
        BookmarkService.getInstance().isBookmarked(token, item.id)
          .then(setIsBookmarked)
          .catch(() => setIsBookmarked(false));
      }

      // Check archive status
      ArchiveService.getInstance().initialize(token).then(() => {
        setIsArchived(ArchiveService.getInstance().isArchived(item.id));
      });
    }
  }, [item.id, token]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!token || bookmarkLoading) return;
    
    setBookmarkLoading(true);
    try {
      const newBookmarkStatus = await BookmarkService.getInstance().toggleBookmark(token, item);
      setIsBookmarked(newBookmarkStatus);
      
      // Show feedback
      Alert.alert(
        newBookmarkStatus ? 'Bookmarked' : 'Removed',
        newBookmarkStatus ? 'Article saved to bookmarks' : 'Article removed from bookmarks',
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  }, [token, item, bookmarkLoading]);

  const handleShare = useCallback(() => {
    ShareService.getInstance().showShareOptions(item);
  }, [item]);

  const handleArchiveToggle = useCallback(async () => {
    if (!token || archiveLoading) return;
    
    setArchiveLoading(true);
    try {
      const newArchiveStatus = await ArchiveService.getInstance().toggleArchiveStatus(token, item);
      setIsArchived(newArchiveStatus);
      
      // Show feedback
      Alert.alert(
        newArchiveStatus ? 'Archived' : 'Removed',
        newArchiveStatus ? 'Article saved to archive' : 'Article removed from archive',
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update archive');
    } finally {
      setArchiveLoading(false);
    }
  }, [token, item, archiveLoading]);

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
        backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
        padding: 16,
        borderRadius: 12,
        marginVertical: 4,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: isSelected ? 2 : 0,
        borderColor: isSelected ? theme.primary : 'transparent',
        opacity: isRead ? 0.7 : 1,
      }}
      onPress={() => {
        if (selectionMode && onToggleSelection) {
          onToggleSelection(item.id);
        } else {
          onPress(item);
        }
      }}
      onLongPress={() => {
        if (onLongPress) {
          onLongPress(item);
        }
      }}
      activeOpacity={0.7}
      disabled={false} // Allow selection for all articles (filtering is handled at Feed level)
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Selection indicator */}
        {selectionMode && (
          <View style={{ marginRight: 8, paddingTop: 2 }}>
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: isSelected ? theme.primary : theme.border,
              backgroundColor: isSelected ? theme.primary : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {isSelected && (
                <Ionicons name="checkmark" size={12} color="#fff" />
              )}
            </View>
          </View>
        )}

        {/* Text content */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={{ 
                fontSize: 12, 
                fontWeight: '600', 
                color: theme.primary,
                textTransform: 'uppercase'
              }}>
                {item.source_name || 'Unknown Source'}
              </Text>
              
              {/* Read status indicator */}
              {isRead && (
                <>
                  <View style={{ 
                    width: 3, 
                    height: 3, 
                    borderRadius: 1.5, 
                    backgroundColor: theme.textMuted,
                    marginHorizontal: 8
                  }} />
                  <View style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginRight: 8,
                  }}>
                    <Text style={{ 
                      fontSize: 9, 
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      既読
                    </Text>
                  </View>
                </>
              )}
              
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
            
            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Share Button */}
              <TouchableOpacity
                onPress={handleShare}
                style={{
                  padding: 8,
                  marginRight: 4,
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="share-outline" 
                  size={16} 
                  color={theme.textMuted} 
                />
              </TouchableOpacity>

              {/* Archive Button */}
              <TouchableOpacity
                onPress={handleArchiveToggle}
                style={{
                  padding: 8,
                  marginRight: 4,
                  opacity: archiveLoading ? 0.5 : 1,
                }}
                disabled={archiveLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={isArchived ? 'archive' : 'archive-outline'} 
                  size={16} 
                  color={isArchived ? theme.primary : theme.textMuted} 
                />
              </TouchableOpacity>

              {/* Bookmark Button */}
              <TouchableOpacity
                onPress={handleBookmarkToggle}
                style={{
                  padding: 8,
                  marginRight: -8,
                  opacity: bookmarkLoading ? 0.5 : 1,
                }}
                disabled={bookmarkLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                  size={16} 
                  color={isBookmarked ? theme.primary : theme.textMuted} 
                />
              </TouchableOpacity>
            </View>
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
  loading = false,
  readingHistory,
  archivedArticles,
  feedLikedArticles,
  feedDislikedArticles,
  selectionMode = false,
  selectedArticleIds = [],
  onToggleSelection,
  onLongPress
}) => {
  const { theme } = useTheme();

  const renderArticleItem: ListRenderItem<Article> = useCallback(
    ({ item }) => (
      <ArticleItem 
        item={item} 
        onPress={onArticlePress}
        selectionMode={selectionMode}
        isSelected={selectedArticleIds.includes(item.id)}
        onToggleSelection={onToggleSelection}
        onLongPress={onLongPress}
        isRead={readingHistory ? readingHistory.has(item.id) : false}
      />
    ),
    [onArticlePress, selectionMode, selectedArticleIds, onToggleSelection, onLongPress, readingHistory]
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
      contentContainerStyle={articles.length === 0 ? { flex: 1 } : { paddingVertical: 8, paddingBottom: 160 }}
    />
  );
};

export default memo(OptimizedArticleList);