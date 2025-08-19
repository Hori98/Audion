import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Article } from '../../types';

interface BriefCardProps {
  article: Article;
  onPress: (article: Article) => void;
  onPlayPress: (article: Article) => void;
  onLongPress?: (article: Article) => void;
  style?: any;
  isRead?: boolean;
}

export default function BriefCard({
  article,
  onPress,
  onPlayPress,
  onLongPress,
  style,
  isRead = false,
}: BriefCardProps) {
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

  const getSummaryBullets = (summary: string) => {
    if (!summary) return [];
    
    // Split summary into sentences and take first 3
    const sentences = summary.split(/[.。!?！？]/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(s => s.trim());
  };

  const styles = createStyles(theme, isRead);

  const summaryBullets = getSummaryBullets(article.summary || '');

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(article)}
      onLongPress={() => onLongPress?.(article)}
      activeOpacity={0.95}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.sourceContainer}>
          <Ionicons name="radio-outline" size={12} color={theme.primary} />
          <Text style={styles.sourceText}>{article.source_name}</Text>
          {article.genre && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.genreText}>{article.genre}</Text>
            </>
          )}
        </View>

        <View style={styles.rightHeader}>
          {isRead && (
            <View style={styles.readIndicator}>
              <Ionicons name="checkmark-circle" size={12} color={theme.success} />
            </View>
          )}
          <Text style={styles.timeText}>{formatTimeAgo(article.published_at)}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>
        {truncateText(article.title, 90)}
      </Text>

      {/* Summary Bullets */}
      {summaryBullets.length > 0 && (
        <View style={styles.bulletsContainer}>
          {summaryBullets.map((bullet, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                {truncateText(bullet, 60)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => onPlayPress(article)}
          activeOpacity={0.7}
        >
          <Ionicons name="headset-outline" size={14} color={theme.primary} />
          <Text style={styles.playButtonText}>{getEstimatedDuration(article)}分で聴く</Text>
        </TouchableOpacity>

        <View style={styles.actionIcons}>
          <TouchableOpacity style={styles.actionIcon} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: any, isRead: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.background || '#ffffff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border || '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isRead ? 0.02 : 0.04,
    shadowRadius: 2,
    elevation: isRead ? 0.5 : 1,
    opacity: isRead ? 0.75 : 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
  },
  separator: {
    fontSize: 11,
    color: theme.textSecondary || '#6b7280',
  },
  genreText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.textSecondary || '#6b7280',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readIndicator: {
    backgroundColor: theme.surface || '#f3f4f6',
    borderRadius: 8,
    padding: 2,
  },
  timeText: {
    fontSize: 11,
    color: theme.textSecondary || '#6b7280',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: isRead ? theme.textSecondary : theme.text || '#1f2937',
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletsContainer: {
    marginBottom: 10,
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.primary || '#4f46e5',
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: isRead ? theme.textSecondary : (theme.textSecondary || '#6b7280'),
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.accent || '#f0f4f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  playButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 6,
  },
});