/**
 * Library Playlist Section Component
 * Shows playlists in the library/audio tab with Spotify-like layout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mockPlaylists, MockPlaylist } from '../data/mock-playlists';
import PlaylistCard from './PlaylistCard';
import PlaylistDetailView from './PlaylistDetailView';

interface LibraryPlaylistSectionProps {
  onCreatePlaylist?: () => void;
}

export const LibraryPlaylistSection: React.FC<LibraryPlaylistSectionProps> = ({
  onCreatePlaylist
}) => {
  const [selectedPlaylist, setSelectedPlaylist] = useState<MockPlaylist | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('list');

  const handlePlaylistPress = (playlist: MockPlaylist) => {
    setSelectedPlaylist(playlist);
  };

  const handleCloseDetail = () => {
    setSelectedPlaylist(null);
  };

  const handleCreatePlaylist = () => {
    // Show beta notice for now
    onCreatePlaylist?.();
  };

  const renderPlaylistCard = ({ item }: { item: MockPlaylist }) => (
    <PlaylistCard
      playlist={item}
      onPress={handlePlaylistPress}
      size={viewType === 'grid' ? 'medium' : 'small'}
    />
  );

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>プレイリスト</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewType(viewType === 'grid' ? 'list' : 'grid')}
          >
            <Ionicons 
              name={viewType === 'grid' ? 'list' : 'grid'} 
              size={20} 
              color="#888888" 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton}>
            <Ionicons name="funnel" size={20} color="#888888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Playlist Button */}
      <TouchableOpacity 
        style={styles.createButton} 
        onPress={handleCreatePlaylist}
        activeOpacity={0.7}
      >
        <View style={styles.createButtonContent}>
          <View style={styles.createIcon}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.createTextContainer}>
            <Text style={styles.createButtonText}>プレイリストを作成</Text>
            <Text style={styles.createButtonSubtext}>お気に入りの記事をまとめましょう</Text>
          </View>
        </View>
        <View style={styles.betaBadgeSmall}>
          <Text style={styles.betaBadgeText}>β版では利用不可</Text>
        </View>
      </TouchableOpacity>

      {/* Recently Played Section */}
      <View style={styles.recentSection}>
        <Text style={styles.recentTitle}>最近再生したプレイリスト</Text>
        <TouchableOpacity style={styles.recentItem}>
          <View style={styles.recentIcon}>
            <Ionicons name="time" size={20} color="#1DB954" />
          </View>
          <Text style={styles.recentText}>最近再生した項目</Text>
        </TouchableOpacity>
      </View>

      {/* Playlists List */}
      <FlatList
        data={mockPlaylists}
        renderItem={renderPlaylistCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={viewType === 'grid' ? 2 : 1}
        key={viewType} // Force re-render when view type changes
      />

      {/* Playlist Detail Modal */}
      <Modal
        visible={selectedPlaylist !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedPlaylist && (
          <PlaylistDetailView
            playlist={selectedPlaylist}
            onBack={handleCloseDetail}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggle: {
    padding: 8,
    marginRight: 8,
  },
  sortButton: {
    padding: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  createIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createTextContainer: {
    flex: 1,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  createButtonSubtext: {
    color: '#888888',
    fontSize: 13,
  },
  betaBadgeSmall: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  betaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  recentSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recentTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
});

export default LibraryPlaylistSection;