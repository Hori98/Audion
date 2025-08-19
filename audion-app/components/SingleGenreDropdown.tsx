import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SingleGenreDropdownProps {
  genres: string[];
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  style?: any;
}

export default function SingleGenreDropdown({
  genres,
  selectedGenre,
  onGenreChange,
  style,
}: SingleGenreDropdownProps) {
  const { theme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleGenreSelect = (genre: string) => {
    onGenreChange(genre);
    setDropdownOpen(false);
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
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={[styles.toggleButton, dropdownOpen && styles.toggleButtonActive]}
            onPress={handleToggle}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Current category: ${selectedGenre}. Tap to open category options`}
          >
            <View style={styles.filterInfo}>
              <Ionicons 
                name={getGenreIcon(selectedGenre) as any} 
                size={18} 
                color={theme.primary} 
              />
              <Text style={styles.filterText}>{selectedGenre}</Text>
            </View>
            <Ionicons 
              name={dropdownOpen ? "chevron-up" : "chevron-down"} 
              size={14} 
              color={theme.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Genre Dropdown */}
        {dropdownOpen && (
          <View style={styles.dropdown}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {genres.map((genre) => {
                const isSelected = genre === selectedGenre;
                return (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                    onPress={() => handleGenreSelect(genre)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={getGenreIcon(genre) as any} 
                      size={16} 
                      color={isSelected ? theme.primary : theme.textSecondary} 
                    />
                    <Text style={[
                      styles.dropdownItemText,
                      isSelected && styles.dropdownItemTextSelected
                    ]}>
                      {genre}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.background || '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: theme.border || '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterSection: {
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text || '#1f2937',
    width: 80,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface || '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border || '#e2e8f0',
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  toggleButtonActive: {
    borderColor: theme.primary || '#4f46e5',
    backgroundColor: theme.accent || '#f0f4f8',
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text || '#1f2937',
    flex: 1,
  },
  dropdown: {
    backgroundColor: theme.surface || '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border || '#e2e8f0',
    marginLeft: 92, // Align with toggle button
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border || '#e2e8f0',
  },
  dropdownItemSelected: {
    backgroundColor: theme.accent || '#f0f4f8',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.textSecondary || '#6b7280',
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
  },
});