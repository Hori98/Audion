/**
 * Playlist Card Component - Spotify-like design
 * Displays playlist information in a card format
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MockPlaylist } from '../data/mock-playlists';

interface PlaylistCardProps {
  playlist: MockPlaylist;
  onPress: (playlist: MockPlaylist) => void;
  size?: 'small' | 'medium' | 'large';
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPress,
  size = 'medium'
}) => {
  const cardStyle = [
    styles.container,
    size === 'small' && styles.containerSmall,
    size === 'large' && styles.containerLarge
  ];

  const imageSize = size === 'small' ? 80 : size === 'large' ? 180 : 120;

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={() => onPress(playlist)}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* Cover Image */}
        <View style={[styles.imageContainer, { width: imageSize, height: imageSize }]}>
          <Image
            source={{ uri: playlist.coverImage }}
            style={[styles.coverImage, { width: imageSize, height: imageSize }]}
            resizeMode="cover"
          />
          {/* Play overlay on hover/press would go here in web */}
          <View style={styles.playOverlay}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>
        </View>

        {/* Playlist Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {playlist.title}
          </Text>
          
          {playlist.description && size !== 'small' && (
            <Text style={styles.description} numberOfLines={2}>
              {playlist.description}
            </Text>
          )}
          
          <View style={styles.metaInfo}>
            <Text style={styles.creator}>
              {playlist.creator.name}
            </Text>
            {size !== 'small' && (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.trackCount}>
                  {playlist.trackCount}曲
                </Text>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.duration}>
                  {playlist.duration}
                </Text>
              </>
            )}
          </View>

          {/* Beta Badge */}
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>β版では利用できません</Text>
          </View>
        </View>

        {/* More options button */}
        <TouchableOpacity style={styles.moreButton}>
          <Feather name="more-horizontal" size={20} color="#888888" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    minHeight: 140,
  },
  containerSmall: {
    padding: 12,
    minHeight: 100,
  },
  containerLarge: {
    padding: 20,
    minHeight: 200,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333333',
  },
  coverImage: {
    borderRadius: 8,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0, // Would be controlled by hover/press state
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  creator: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '500',
  },
  separator: {
    color: '#666666',
    fontSize: 13,
    marginHorizontal: 6,
  },
  trackCount: {
    color: '#888888',
    fontSize: 13,
  },
  duration: {
    color: '#888888',
    fontSize: 13,
  },
  betaBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default PlaylistCard;
