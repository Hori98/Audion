/**
 * News Card Component
 * ニュースURLを表示するミニマルなカードコンポーネント
 * Enhanced: Thumbnail, order number, unified card size
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

interface NewsCardProps {
  title: string;
  url: string;
  onPress: () => void;
  index?: number;
  thumbnailUrl?: string;
  sourceName?: string;
}

export default function NewsCard({
  title,
  url,
  onPress,
  index,
  thumbnailUrl,
  sourceName
}: NewsCardProps) {
  // URLからドメイン名を抽出
  const getDomainFromUrl = (url: string): string => {
    try {
      return url
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return (
    <TouchableOpacity
      style={styles.newsCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.newsCardContent}>
        {/* Thumbnail or Fallback Icon */}
        <View style={styles.thumbnailContainer}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.fallbackIcon}>
              <Text style={styles.newsIcon}>📰</Text>
            </View>
          )}
        </View>

        {/* Text Content */}
        <View style={styles.newsTextContent}>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {title || `記事 ${(index || 0) + 1}`}
          </Text>
          <Text style={styles.newsDomain} numberOfLines={1}>
            {sourceName || getDomainFromUrl(url)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  newsCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 8,
    height: 88, // Fixed height for unified card size (12px padding top + 64px content + 12px padding bottom)
  },
  newsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  fallbackIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsIcon: {
    fontSize: 32,
  },
  newsTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 18,
  },
  newsDomain: {
    fontSize: 12,
    color: '#888888',
  },
});