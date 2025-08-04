import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface SelectionManagerProps {
  articlesCount: number;
  selectedCount: number;
  areAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function SelectionManager({ 
  articlesCount,
  selectedCount,
  areAllSelected,
  onSelectAll,
  onDeselectAll 
}: SelectionManagerProps) {
  const { theme } = useTheme();

  if (articlesCount === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={[styles.countText, { color: theme.text }]}>
            {selectedCount} of {articlesCount} selected
          </Text>
          {selectedCount > 0 && (
            <Text style={[styles.maxText, { color: theme.textMuted }]}>
              Max 10 articles for audio creation
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.selectButton,
            { 
              backgroundColor: areAllSelected ? theme.error : theme.primary,
              borderColor: areAllSelected ? theme.error : theme.primary,
            }
          ]}
          onPress={areAllSelected ? onDeselectAll : onSelectAll}
        >
          <Ionicons 
            name={areAllSelected ? "remove-circle" : "checkmark-circle"} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.selectButtonText}>
            {areAllSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  maxText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});