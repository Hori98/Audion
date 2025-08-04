import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface GenreFilterProps {
  genres: string[];
  selectedGenre: string;
  onGenreSelect: (genre: string) => void;
}

function GenreFilter({ 
  genres, 
  selectedGenre, 
  onGenreSelect 
}: GenreFilterProps) {
  const { theme } = useTheme();

  const handleGenrePress = useCallback((genre: string) => {
    onGenreSelect(genre);
  }, [onGenreSelect]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.text }]}>Genres</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedGenre === genre ? theme.primary : theme.accent,
                borderColor: selectedGenre === genre ? theme.primary : theme.border,
              }
            ]}
            onPress={() => handleGenrePress(genre)}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: selectedGenre === genre ? '#ffffff' : theme.textSecondary }
              ]}
            >
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(GenreFilter, (prevProps, nextProps) => {
  return (
    prevProps.selectedGenre === nextProps.selectedGenre &&
    prevProps.genres.length === nextProps.genres.length
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
});