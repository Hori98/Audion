import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Article } from '../types';

const { width: screenWidth } = Dimensions.get('window');

interface UnifiedArticleCardProps {
  article: Article;
  onPress: (article: Article) => void;
  onReadLaterToggle?: (article: Article, event: any) => void;
  readLaterStatus?: boolean;
  showReadingIndicator?: boolean;
  isRead?: boolean;
  style?: any;
}

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Unknown Date';
  }
};

export default function UnifiedArticleCard({
  article,
  onPress,
  onReadLaterToggle,
  readLaterStatus = false,
  showReadingIndicator = false,
  isRead = false,
  style
}: UnifiedArticleCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    onPress(article);
  };

  const handleReadLaterPress = (event: any) => {
    event.stopPropagation();
    if (onReadLaterToggle) {
      onReadLaterToggle(article, event);
    }
  };

  // Check if article has image
  const hasImage = article.image_url && article.image_url.trim() !== '';

  return (
    <TouchableOpacity
      style={[styles.articleCard, { backgroundColor: theme.surface }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.articleHeader}>
          <Text style={[styles.articleSource, { color: theme.textMuted }]}>
            {article.source_name}
          </Text>
          {showReadingIndicator && isRead && (
            <View style={[styles.readIndicator, { backgroundColor: theme.success }]}>
              <Text style={styles.readIndicatorText}>✓</Text>
            </View>
          )}
        </View>

        {/* Main content area with fixed height */}
        <View style={styles.mainContent}>
          {/* Left side - Text content */}
          <View style={[styles.textContent, hasImage ? styles.textContentWithImage : styles.textContentFull]}>
            <Text style={[styles.articleTitle, { color: theme.text }]} numberOfLines={hasImage ? 2 : 3}>
              {article.title}
            </Text>
            
            <Text 
              style={[styles.articleSummary, { color: theme.textSecondary }]} 
              numberOfLines={hasImage ? 2 : 3}
            >
              {article.summary}
            </Text>
          </View>

          {/* Right side - Thumbnail if available */}
          {hasImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: article.image_url }}
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() => console.warn('Failed to load image:', article.image_url)}
              />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.articleFooter}>
          <View style={styles.articleMeta}>
            <Text style={[styles.articleDate, { color: theme.textMuted }]}>
              {formatDate(article.published_at || article.published)}
            </Text>
            {article.genre && (
              <View style={[styles.genreTag, { backgroundColor: theme.secondary }]}>
                <Text style={[styles.genreTagText, { color: theme.primary }]}>
                  {article.genre}
                </Text>
              </View>
            )}
          </View>

          {/* Read Later Button */}
          {onReadLaterToggle && (
            <TouchableOpacity
              style={[
                styles.readLaterButton, 
                { backgroundColor: readLaterStatus ? theme.primary : theme.surface }
              ]}
              onPress={handleReadLaterPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={readLaterStatus ? "bookmark" : "bookmark-outline"}
                size={16}
                color={readLaterStatus ? '#fff' : theme.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  articleCard: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 160, // Fixed minimum height for consistency
  },
  cardContent: {
    padding: 16,
    height: '100%',
    justifyContent: 'space-between',
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
  },
  readIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mainContent: {
    flexDirection: 'row',
    flex: 1,
    marginBottom: 8,
    minHeight: 80, // Ensure consistent content area height
  },
  textContent: {
    justifyContent: 'flex-start',
  },
  textContentWithImage: {
    flex: 1,
    marginRight: 12,
  },
  textContentFull: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0', // Placeholder background
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto', // Push to bottom
    minHeight: 32, // Consistent footer height
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  articleDate: {
    fontSize: 12,
    marginRight: 8,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  genreTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  readLaterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});