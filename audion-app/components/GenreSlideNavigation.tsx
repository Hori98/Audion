import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface GenreSlideNavigationProps {
  genres: string[];
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  style?: any;
}

export default function GenreSlideNavigation({
  genres,
  selectedGenre,
  onGenreChange,
  style,
}: GenreSlideNavigationProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {genres.map((genre) => {
          const isSelected = genre === selectedGenre;
          return (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreButton,
                { backgroundColor: isSelected ? theme.primary : theme.surface },
              ]}
              onPress={() => onGenreChange(genre)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.genreButtonText,
                  { color: isSelected ? '#ffffff' : theme.textSecondary },
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  genreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    height: 34,
  },
  genreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});