import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '../../context/AuthContext';

export default function LibraryScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Audio Library</Text>
          
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎧</Text>
            <Text style={styles.emptyStateTitle}>Your library is empty</Text>
            <Text style={styles.emptyStateDescription}>
              Start creating audio content from articles to build your personal library
            </Text>
            
            <TouchableOpacity style={styles.createButton}>
              <Text style={styles.createButtonText}>Create Your First Audio</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Playlists</Text>
          
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyStateTitle}>No playlists yet</Text>
            <Text style={styles.emptyStateDescription}>
              Organize your audio content into custom playlists
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Download Queue</Text>
          
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⬇️</Text>
            <Text style={styles.emptyStateTitle}>No downloads</Text>
            <Text style={styles.emptyStateDescription}>
              Downloaded audio will appear here for offline listening
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
