import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Article } from '../../types';

interface StandardCardProps {
  article: Article;
  onPress: (article: Article) => void;
  onPlayPress: (article: Article) => void;
  onLongPress?: (article: Article) => void;
  style?: any;
  isRead?: boolean;
}

export default function StandardCard({
  article,
  onPress,
  onPlayPress,
  onLongPress,
  style,
  isRead = false,
}: StandardCardProps) {
  const { theme } = useTheme();

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const publishedDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '数分前';
    if (diffInHours < 24) return `${diffInHours}時間前`;
    return `${Math.floor(diffInHours / 24)}日前`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getEstimatedDuration = (article: Article) => {
    // Estimate reading time (average 200 words per minute, 5 chars per word)
    const textLength = (article.title || '').length + (article.summary || '').length;
    const estimatedWords = textLength / 5;
    const estimatedMinutes = Math.max(1, Math.round(estimatedWords / 200));
    return estimatedMinutes;
  };

  const styles = createStyles(theme, isRead);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(article)}
      onLongPress={() => onLongPress?.(article)}
      activeOpacity={0.95}
    >
      <View style={styles.cardContent}>
        {/* Left: Text Content */}
        <View style={styles.textContent}>
          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.sourceContainer}>
              <Ionicons name="radio-outline" size={12} color={theme.primary} />
              <Text style={styles.sourceText}>{article.source_name}</Text>
            </View>
            {isRead && (
              <View style={styles.readIndicator}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {truncateText(article.title, 80)}
          </Text>

          {/* Summary */}
          {article.summary && (
            <Text style={styles.summary}>
              {truncateText(article.summary, 100)}
            </Text>
          )}

          {/* Bottom Row: Genre, Time, Actions */}
          <View style={styles.bottomRow}>
            <View style={styles.metaInfo}>
              {article.genre && (
                <>
                  <Text style={styles.genreText}>{article.genre}</Text>
                  <Text style={styles.separator}>•</Text>
                </>
              )}
              <Text style={styles.timeText}>{formatTimeAgo(article.published_at)}</Text>
            </View>

            <TouchableOpacity
              style={styles.playButton}
              onPress={() => onPlayPress(article)}
              activeOpacity={0.7}
            >
              <Ionicons name="play" size={14} color={theme.primary} />
              <Text style={styles.playButtonText}>{getEstimatedDuration(article)}分</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: Image */}
        <View style={styles.imageContainer}>
          {article.image_url ? (
            <Image
              source={{ uri: article.image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <Ionicons name="newspaper-outline" size={20} color={theme.textSecondary} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: any, isRead: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.background || '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isRead ? 0.04 : 0.08,
    shadowRadius: 4,
    elevation: isRead ? 1 : 2,
    borderWidth: 1,
    borderColor: theme.border || '#e2e8f0',
    opacity: isRead ? 0.75 : 1,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  textContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
  },
  readIndicator: {
    backgroundColor: theme.surface || '#f3f4f6',
    borderRadius: 10,
    padding: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isRead ? theme.textSecondary : theme.text || '#1f2937',
    lineHeight: 22,
    marginBottom: 6,
  },
  summary: {
    fontSize: 14,
    color: isRead ? theme.textSecondary : (theme.textSecondary || '#6b7280'),
    lineHeight: 20,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  genreText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.textSecondary || '#6b7280',
  },
  separator: {
    fontSize: 11,
    color: theme.textSecondary || '#6b7280',
  },
  timeText: {
    fontSize: 11,
    color: theme.textSecondary || '#6b7280',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accent || '#f0f4f8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  playButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
  },
  imageContainer: {
    width: 80,
    height: 80,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: theme.surface || '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});