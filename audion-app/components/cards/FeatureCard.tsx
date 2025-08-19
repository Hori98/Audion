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

interface FeatureCardProps {
  article: Article;
  onPress: (article: Article) => void;
  onPlayPress: (article: Article) => void;
  onLongPress?: (article: Article) => void;
  style?: any;
  isRead?: boolean;
}

export default function FeatureCard({
  article,
  onPress,
  onPlayPress,
  onLongPress,
  style,
  isRead = false,
}: FeatureCardProps) {
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
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {article.image_url ? (
          <Image
            source={{ uri: article.image_url }}
            style={styles.featureImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.featureImage, styles.placeholderImage]}>
            <Ionicons name="newspaper-outline" size={32} color={theme.textSecondary} />
          </View>
        )}
        
        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />
        
        {/* Play Button Overlay */}
        <TouchableOpacity
          style={styles.playButtonOverlay}
          onPress={() => onPlayPress(article)}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Duration Badge */}
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={12} color="#ffffff" />
          <Text style={styles.durationText}>{getEstimatedDuration(article)}分</Text>
        </View>

        {/* Read Indicator */}
        {isRead && (
          <View style={styles.readIndicator}>
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Meta Info */}
        <View style={styles.metaContainer}>
          <View style={styles.sourceContainer}>
            <Ionicons name="radio-outline" size={14} color={theme.primary} />
            <Text style={styles.sourceText}>{article.source_name}</Text>
          </View>
          
          <View style={styles.genreTimeContainer}>
            {article.genre && (
              <>
                <Text style={styles.genreText}>{article.genre}</Text>
                <Text style={styles.separator}>•</Text>
              </>
            )}
            <Text style={styles.timeText}>{formatTimeAgo(article.published_at)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {truncateText(article.title, 120)}
        </Text>

        {/* Summary */}
        {article.summary && (
          <Text style={styles.summary}>
            {truncateText(article.summary, 150)}
          </Text>
        )}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.listenButton}
            onPress={() => onPlayPress(article)}
            activeOpacity={0.7}
          >
            <Ionicons name="headset-outline" size={16} color={theme.primary} />
            <Text style={styles.listenButtonText}>聴く</Text>
          </TouchableOpacity>

          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.actionIcon} activeOpacity={0.7}>
              <Ionicons name="bookmark-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: any, isRead: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.background || '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isRead ? 0.06 : 0.1,
    shadowRadius: 8,
    elevation: isRead ? 2 : 4,
    overflow: 'hidden',
    opacity: isRead ? 0.75 : 1,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: theme.surface || '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  durationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  readIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 4,
  },
  contentContainer: {
    padding: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
  },
  genreTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary || '#6b7280',
  },
  separator: {
    fontSize: 12,
    color: theme.textSecondary || '#6b7280',
  },
  timeText: {
    fontSize: 12,
    color: theme.textSecondary || '#6b7280',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isRead ? theme.textSecondary : theme.text || '#1f2937',
    lineHeight: 26,
    marginBottom: 8,
  },
  summary: {
    fontSize: 15,
    color: isRead ? theme.textSecondary : (theme.textSecondary || '#6b7280'),
    lineHeight: 22,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accent || '#f0f4f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  listenButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    padding: 8,
  },
});