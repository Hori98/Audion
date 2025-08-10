import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

interface RSSSource {
  id: string;
  name: string;
  url: string;
  is_active?: boolean;
  created_at: string;
}

interface SourceFilterProps {
  sources: RSSSource[];
  selectedSource: string;
  onSourceSelect: (source: string) => void;
}

export default function SourceFilter({ 
  sources, 
  selectedSource, 
  onSourceSelect 
}: SourceFilterProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const allSources = ['All', ...sources.map(source => source.name)];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.text }]}>Sources</Text>
        <TouchableOpacity 
          onPress={() => router.push('/sources')}
          style={styles.manageButton}
        >
          <Ionicons name="settings-outline" size={18} color={theme.primary} />
          <Text style={[styles.manageButtonText, { color: theme.primary }]}>Manage</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {allSources.map((source) => (
          <TouchableOpacity
            key={source}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedSource === source ? theme.primary : theme.accent,
                borderColor: selectedSource === source ? theme.primary : theme.border,
              }
            ]}
            onPress={() => onSourceSelect(source)}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: selectedSource === source ? '#ffffff' : theme.textSecondary }
              ]}
            >
              {source}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
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