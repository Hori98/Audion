import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source_name: string;
  content?: string;
  genre?: string;
  normalizedId?: string;
}

interface ArticleCardProps {
  article: Article;
  isSelected: boolean;
  onPress: (url: string) => void;
  onToggleSelection: (articleId: string) => void;
}

function ArticleCard({ 
  article, 
  isSelected, 
  onPress, 
  onToggleSelection 
}: ArticleCardProps) {
  const { theme } = useTheme();

  // Memoize formatted date to prevent re-computation
  const formattedDate = useMemo(() => {
    return article.published ? format(new Date(article.published), 'MMM dd, yyyy') : 'Unknown Date';
  }, [article.published]);

  // Memoize press handlers to prevent re-creation
  const handlePress = useCallback(() => {
    onPress(article.link);
  }, [onPress, article.link]);

  const handleToggleSelection = useCallback(() => {
    onToggleSelection(article.id);
  }, [onToggleSelection, article.id]);

  return (
    <View style={[styles.articleCard, { backgroundColor: theme.surface }]}>
      <TouchableOpacity 
        onPress={handlePress}
        style={styles.articleContent}
      >
        <View style={styles.articleHeader}>
          <Text style={[styles.articleSource, { color: theme.textMuted }]}>{article.source_name}</Text>
          {article.genre && (
            <View style={[styles.genreTag, { backgroundColor: theme.secondary }]}>
              <Text style={[styles.genreText, { color: theme.primary }]}>{article.genre}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.articleTitle, { color: theme.text }]}>{article.title}</Text>
        <Text style={[styles.articleSummary, { color: theme.textSecondary }]} numberOfLines={3}>
          {article.summary}
        </Text>
        <Text style={[styles.articlePublished, { color: theme.textMuted }]}>
          {formattedDate}
        </Text>
      </TouchableOpacity>
      
      {/* Selection Button */}
      <TouchableOpacity 
        onPress={handleToggleSelection}
        style={[
          styles.selectionButton, 
          { backgroundColor: isSelected ? theme.primary : theme.surface }
        ]}
      >
        <Ionicons 
          name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
          size={24} 
          color={isSelected ? "#fff" : theme.primary} 
        />
      </TouchableOpacity>
    </View>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(ArticleCard, (prevProps, nextProps) => {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.article.title === nextProps.article.title &&
    prevProps.article.published === nextProps.article.published
  );
});

const styles = StyleSheet.create({
  articleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleContent: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  genreTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  genreText: {
    fontSize: 10,
    color: '#4f46e5',
    fontWeight: '600',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  articlePublished: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectionButton: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
});