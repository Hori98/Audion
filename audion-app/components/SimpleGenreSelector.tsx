import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SmartGenreToggleProps {
  genres: string[];
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  style?: any;
}

export default function SmartGenreToggle({
  genres,
  selectedGenre,
  onGenreChange,
  style,
}: SmartGenreToggleProps) {
  const { theme } = useTheme();

  const handleToggle = () => {
    const currentIndex = genres.indexOf(selectedGenre);
    const nextIndex = (currentIndex + 1) % genres.length;
    onGenreChange(genres[nextIndex]);
  };

  const getGenreIcon = (genre: string) => {
    switch (genre) {
      case 'All': return 'apps-outline';
      case 'Breaking News': return 'flash-outline';
      case 'Technology': return 'phone-portrait-outline';
      case 'Business': return 'trending-up-outline';
      case 'Politics': return 'flag-outline';
      case 'World': return 'earth-outline';
      case 'Sports': return 'football-outline';
      case 'Entertainment': return 'musical-notes-outline';
      default: return 'bookmark-outline';
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={handleToggle}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Current category: ${selectedGenre}. Tap to switch to next category`}
          accessibilityHint="Cycles through available categories"
        >
          <View style={styles.genreInfo}>
            <Ionicons 
              name={getGenreIcon(selectedGenre) as any} 
              size={20} 
              color={theme.primary} 
            />
            <Text style={styles.genreText}>{selectedGenre}</Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: theme.background || '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: theme.border || '#e2e8f0',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text || '#1f2937',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface || '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border || '#e2e8f0',
    minWidth: 140,
    justifyContent: 'space-between',
  },
  genreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genreText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text || '#1f2937',
  },
});