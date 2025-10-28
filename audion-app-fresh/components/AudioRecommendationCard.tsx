/**
 * Audio Recommendation Card Component
 * おすすめ音声セクション用の音声コンテンツカード
 * Discover Tab統合後も互換性を保つ設計
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './common/Icon';

export interface AudioRecommendation {
  id: string;
  title: string;
  creator: string;
  creatorType: 'user' | 'system';
  thumbnail: string;
  duration: number; // 秒
  playCount: number;
  likeCount: number;
  type: 'autopick' | 'manualpick' | 'schedulepick' | 'ugc';
  category: string;
  tags: string[];
  audioUrl?: string;
  description?: string;
  createdAt: string;
  engagementScore: number; // 0-100
}

interface AudioRecommendationCardProps {
  audio: AudioRecommendation;
  onPress: (audio: AudioRecommendation) => void;
  onPlay?: (audio: AudioRecommendation) => void;
  showPlayButton?: boolean;
  width?: number;
}

export default function AudioRecommendationCard({
  audio,
  onPress,
  onPlay,
  showPlayButton = true,
  width = 200
}: AudioRecommendationCardProps) {

  const handleCardPress = () => {
    onPress(audio);
  };

  const handlePlayPress = (e: any) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(audio);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (iso: string | undefined): string => {
    if (!iso) return '';
    try {
      const then = new Date(iso).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - then);
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      if (diffMin < 1) return '今';
      if (diffHr < 1) return `${diffMin}分前`;
      if (diffDay < 1) return `${diffHr}時間前`;
      return `${diffDay}日前`;
    } catch {
      return '';
    }
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'autopick':
        return <Icon name="sparkles" size={16} color="#ffffff"/>;
      case 'manualpick':
        return <Ionicons name="create-outline" size={16} color="#ffffff" />;
      case 'schedulepick':
        return <Ionicons name="time-outline" size={16} color="#ffffff" />;
      case 'ugc':
        return <Icon name="user" size={16} color="#ffffff"/>;
      default:
        return <Icon name="music" size={16} color="#ffffff"/>;
    }
  };

  const getCreatorTypeStyle = (creatorType: string) => {
    return creatorType === 'system' ? styles.systemCreator : styles.userCreator;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={handleCardPress}
      activeOpacity={0.8}
    >
      {/* サムネイル（高さ短縮） */}
      <View style={styles.thumbnailContainer}>
        {audio.thumbnail && audio.thumbnail !== 'placeholder_url' ? (
          <Image 
            source={{ uri: audio.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            {renderTypeIcon(audio.type)}
          </View>
        )}

        {/* 再生時間表示 */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(audio.duration)}
          </Text>
        </View>

        {/* 再生ボタンは非表示（サムネ上の重ねアイコンを廃止） */}
      </View>

      {/* コンテンツ情報エリア（3行構成） */}
      <View style={styles.contentInfo}>
        {/* 1: タイトル */}
        <Text style={styles.title} numberOfLines={2}>{audio.title}</Text>

        {/* 2: ユーザーアイコン＋ユーザー名＋時間 */}
        <View style={styles.metaRow}>
          <Ionicons name="person-circle-outline" size={12} color="#9a9a9a" />
          <Text style={[styles.metaUser, getCreatorTypeStyle(audio.creatorType)]} numberOfLines={1}>
            {audio.creator}
          </Text>
        </View>

        {/* 3: 再生回数・お気に入り数（左）＋ 時間（右） */}
        <View style={styles.engagementContainer}>
          <View style={styles.engagementLeft}>
            <View style={styles.engagementItem}>
              <Ionicons name="play-outline" size={11} color="#888888" />
              <Text style={styles.engagementText}>
                {audio.playCount >= 1000000 ? `${(audio.playCount/1000000>=10?Math.floor(audio.playCount/1000000):(audio.playCount/1000000).toFixed(1))}m` : (
                  audio.playCount >= 1000 ? `${(audio.playCount/1000>=10?Math.floor(audio.playCount/1000):(audio.playCount/1000).toFixed(1))}k` : audio.playCount
                )}
              </Text>
            </View>
            {audio.likeCount > 0 && (
              <View style={styles.engagementItem}>
                <Ionicons name="heart-outline" size={11} color="#888888" />
                <Text style={styles.engagementText}>
                  {audio.likeCount >= 1000000 ? `${(audio.likeCount/1000000>=10?Math.floor(audio.likeCount/1000000):(audio.likeCount/1000000).toFixed(1))}m` : (
                    audio.likeCount >= 1000 ? `${(audio.likeCount/1000>=10?Math.floor(audio.likeCount/1000):(audio.likeCount/1000).toFixed(1))}k` : audio.likeCount
                  )}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.engagementTime}>{formatTimeAgo(audio.createdAt)}</Text>
        </View>

        {/* ジャンル/カテゴリは非表示（仕様変更） */}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 12,
    // marginRight: 12,
    marginRight: 3, // unify with trending half-margin
    // Fix card height to keep engagement row pinned at bottom
    // height: 180, // previous
    height: 172, // Option A: audio slightly smaller than trending
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222222',
  },

  // サムネイルエリア
  thumbnailContainer: {
    position: 'relative',
    // height: 120,
    height: 96, // shortened
    backgroundColor: '#2a2a2a',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.7,
  },

  // 再生時間バッジ
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
  // 時間バッジは使用しない

  // プレイボタン
  playButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // コンテンツ情報
  contentInfo: {
    flex: 1,
    paddingHorizontal: 8, // unify with trending card content padding
    paddingVertical: 8,
    paddingBottom: 28, // reserve space for fixed footer (engagement row)
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 16, // unify with trending
    marginBottom: 2,
  },
  // 2: ユーザー行
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaUser: {
    fontSize: 10, // unify with engagement text size
    color: '#cccccc',
    marginLeft: 4,
    maxWidth: 120,
  },
  metaDot: {
    fontSize: 12,
    color: '#888888',
    marginHorizontal: 4,
  },
  metaTime: {
    fontSize: 12,
    color: '#888888',
  },
  systemCreator: { color: '#007bff' },
  userCreator:   { color: '#cccccc' },

  // エンゲージメント情報（カード最下部に固定）
  engagementContainer: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  engagementText: {
    fontSize: 10, // unify with trending
    color: '#888888',
    marginLeft: 2,
  },
  engagementTime: {
    fontSize: 10,
    color: '#888888',
  },

  // ジャンル/カテゴリ表示は削除
});
