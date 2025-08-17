import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Article } from '../types';
import { format } from 'date-fns';

interface UnifiedArticleCardProps {
  article: Article;
  onPress: (article: Article) => void;
  showActions?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (article: Article) => void;
  onLike?: (article: Article) => void;
  onDislike?: (article: Article) => void;
  onArchive?: (article: Article) => void;
  onBookmark?: (article: Article) => void;
  isLiked?: boolean;
  isDisliked?: boolean;
  isArchived?: boolean;
  isBookmarked?: boolean;
  isRead?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function UnifiedArticleCard({
  article,
  onPress,
  showActions = false,
  isSelected = false,
  onToggleSelection,
  onLike,
  onDislike,
  onArchive,
  onBookmark,
  isLiked = false,
  isDisliked = false,
  isArchived = false,
  isBookmarked = false,
  isRead = false,
  variant = 'default',
}: UnifiedArticleCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return styles.compactCard;
      case 'detailed':
        return styles.detailedCard;
      default:
        return styles.defaultCard;
    }
  };

  const handleMainPress = () => {
    if (onToggleSelection && isSelected !== undefined) {
      onToggleSelection(article);
    } else {
      onPress(article);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, HH:mm');
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        getVariantStyles(),
        isSelected && styles.selected,
        isRead && styles.readArticle,
      ]}
      onPress={handleMainPress}
      activeOpacity={0.7}
    >
      {/* Selection indicator */}
      {isSelected !== undefined && (
        <View style={styles.selectionIndicator}>
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={isSelected ? theme.primary : theme.textMuted}
          />
        </View>
      )}

      {/* Article Image */}
      {article.image_url && variant !== 'compact' && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: article.image_url }}
            style={styles.articleImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sourceName} numberOfLines={1}>
            {article.source_name}
          </Text>
          <Text style={styles.date}>
            {formatDate(article.published_at || article.created_at)}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            variant === 'compact' && styles.compactTitle,
            isRead && styles.readTitle,
          ]}
          numberOfLines={variant === 'compact' ? 2 : 3}
        >
          {article.title}
        </Text>

        {/* Summary */}
        {variant !== 'compact' && article.summary && (
          <Text
            style={[styles.summary, isRead && styles.readSummary]}
            numberOfLines={2}
          >
            {article.summary}
          </Text>
        )}

        {/* Genre */}
        {article.genre && article.genre !== 'General' && (
          <View style={styles.genreContainer}>
            <Text style={styles.genre}>{article.genre}</Text>
          </View>
        )}

        {/* Actions */}
        {showActions && (
          <View style={styles.actionsContainer}>
            {onLike && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isLiked && { backgroundColor: theme.success },
                ]}
                onPress={() => onLike(article)}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={16}
                  color={isLiked ? '#fff' : theme.textMuted}
                />
              </TouchableOpacity>
            )}

            {onDislike && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isDisliked && { backgroundColor: theme.error },
                ]}
                onPress={() => onDislike(article)}
              >
                <Ionicons
                  name={isDisliked ? 'heart-dislike' : 'heart-dislike-outline'}
                  size={16}
                  color={isDisliked ? '#fff' : theme.textMuted}
                />
              </TouchableOpacity>
            )}

            {onBookmark && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isBookmarked && { backgroundColor: theme.warning },
                ]}
                onPress={() => onBookmark(article)}
              >
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={isBookmarked ? '#fff' : theme.textMuted}
                />
              </TouchableOpacity>
            )}

            {onArchive && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isArchived && { backgroundColor: theme.secondary },
                ]}
                onPress={() => onArchive(article)}
              >
                <Ionicons
                  name={isArchived ? 'archive' : 'archive-outline'}
                  size={16}
                  color={isArchived ? '#fff' : theme.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.card,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  defaultCard: {
    // Default styling
  },
  compactCard: {
    marginVertical: 3,
  },
  detailedCard: {
    marginVertical: 8,
  },
  selected: {
    borderWidth: 2,
    borderColor: theme.primary,
  },
  readArticle: {
    opacity: 0.7,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 2,
  },
  imageContainer: {
    height: 120,
    width: '100%',
    backgroundColor: theme.surface,
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: theme.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  readTitle: {
    color: theme.textSecondary,
  },
  summary: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  readSummary: {
    color: theme.textMuted,
  },
  genreContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  genre: {
    fontSize: 11,
    color: theme.accent,
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 8,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});