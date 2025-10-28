/**
 * Playlist Detail View - Spotify-like expanded playlist view
 * Shows full playlist with track list and controls
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MockPlaylist, MockTrack } from '../data/mock-playlists';

interface PlaylistDetailViewProps {
  playlist: MockPlaylist;
  onBack: () => void;
  onPlayTrack?: (track: MockTrack) => void;
}

interface TrackItemProps {
  track: MockTrack;
  index: number;
  onPress: () => void;
  isPlaying?: boolean;
}

const TrackItem: React.FC<TrackItemProps> = ({ track, index, onPress, isPlaying }) => {
  return (
    <TouchableOpacity style={styles.trackItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.trackLeft}>
        <View style={styles.trackNumber}>
          {isPlaying ? (
            <Ionicons name="pause" size={16} color="#1DB954" />
          ) : (
            <Text style={styles.trackNumberText}>{index + 1}</Text>
          )}
        </View>
        
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isPlaying && styles.trackTitlePlaying]} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.articleTitle} numberOfLines={1}>
            {track.article.title}
          </Text>
          <Text style={styles.articleSource} numberOfLines={1}>
            {track.article.source}
          </Text>
        </View>
      </View>

      <View style={styles.trackRight}>
        <Text style={styles.trackDuration}>{track.duration}</Text>
        <TouchableOpacity style={styles.trackMenu}>
          <Feather name="more-horizontal" size={20} color="#888888" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlist,
  onBack,
  onPlayTrack
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTrackPress = (track: MockTrack) => {
    setCurrentTrackId(track.id);
    setIsPlaying(true);
    onPlayTrack?.(track);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Feather name="more-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Playlist Header */}
        <View style={styles.playlistHeader}>
          <Image
            source={{ uri: playlist.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          
          <Text style={styles.playlistTitle}>{playlist.title}</Text>
          
          {playlist.description && (
            <Text style={styles.playlistDescription}>{playlist.description}</Text>
          )}
          
          <View style={styles.playlistMeta}>
            <View style={styles.creatorInfo}>
              <Image
                source={{ uri: playlist.creator.avatar || 'https://picsum.photos/32/32?random=200' }}
                style={styles.creatorAvatar}
              />
              <Text style={styles.creatorName}>{playlist.creator.name}</Text>
            </View>
            <Text style={styles.metaText}>
              {playlist.trackCount}曲 • {playlist.duration}
            </Text>
          </View>

          {/* Beta Notice */}
          <View style={styles.betaNotice}>
            <Ionicons name="information-circle" size={20} color="#FF6B35" />
            <Text style={styles.betaNoticeText}>
              プレイリスト機能はβ版では利用できません
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.playButton, { opacity: 0.5 }]} 
            onPress={handlePlayPause}
            disabled
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={24} 
              color="#000000" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlButton, { opacity: 0.5 }]} disabled>
            <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlButton, { opacity: 0.5 }]} disabled>
            <Ionicons name="download-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlButton, { opacity: 0.5 }]} disabled>
            <Feather name="more-horizontal" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Track List */}
        <View style={styles.trackList}>
          <View style={styles.trackListHeader}>
            <Text style={styles.trackListTitle}>トラック</Text>
          </View>
          
          {playlist.tracks.map((track, index) => (
            <TrackItem
              key={track.id}
              track={track}
              index={index}
              onPress={() => handleTrackPress(track)}
              isPlaying={currentTrackId === track.id && isPlaying}
            />
          ))}
          
          {playlist.tracks.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color="#666666" />
              <Text style={styles.emptyStateText}>プレイリストにトラックがありません</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  playlistHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  coverImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 24,
  },
  playlistTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  playlistDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  playlistMeta: {
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  metaText: {
    color: '#888888',
    fontSize: 13,
  },
  betaNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: '#FF6B35',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  betaNoticeText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
  },
  controlButton: {
    padding: 8,
    marginRight: 16,
  },
  trackList: {
    paddingHorizontal: 16,
  },
  trackListHeader: {
    marginBottom: 16,
  },
  trackListTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  trackLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackNumber: {
    width: 32,
    alignItems: 'center',
  },
  trackNumberText: {
    color: '#888888',
    fontSize: 14,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  trackTitlePlaying: {
    color: '#1DB954',
  },
  articleTitle: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 2,
  },
  articleSource: {
    color: '#888888',
    fontSize: 12,
  },
  trackRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDuration: {
    color: '#888888',
    fontSize: 14,
    marginRight: 8,
  },
  trackMenu: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
  },
});

export default PlaylistDetailView;
