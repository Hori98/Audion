/**
 * Audio Recommendation Carousel Component
 * おすすめ音声セクション用の横スクロールカルーセル
 * Home Tab統合用、モックデータ対応
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AudioRecommendationCard, { AudioRecommendation } from './AudioRecommendationCard';
import { SPACING } from '../styles/commonStyles';

interface AudioRecommendationCarouselProps {
  recommendations: AudioRecommendation[];
  onAudioPress: (audio: AudioRecommendation) => void;
  onAudioPlay?: (audio: AudioRecommendation) => void;
  onSeeMore?: () => void;
  maxItems?: number;
  loading?: boolean;
  showSeeMore?: boolean;
}

export default function AudioRecommendationCarousel({
  recommendations,
  onAudioPress,
  onAudioPlay,
  onSeeMore,
  maxItems = 5,
  loading = false,
  showSeeMore = true
}: AudioRecommendationCarouselProps) {

  // 表示用データの準備
  const displayRecommendations = recommendations.slice(0, maxItems);

  const handleAudioPress = (audio: AudioRecommendation) => {
    console.log('[AudioCarousel] Audio pressed:', audio.title);
    onAudioPress(audio);
  };

  const handleAudioPlay = (audio: AudioRecommendation) => {
    console.log('[AudioCarousel] Audio play:', audio.title);
    if (onAudioPlay) {
      onAudioPlay(audio);
    } else {
      // フォールバック: Discover Tab へ遷移
      onAudioPress(audio);
    }
  };

  const handleSeeMore = () => {
    console.log('[AudioCarousel] See more pressed');
    if (onSeeMore) {
      onSeeMore();
    }
  };

  // ローディング状態
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
          <View style={styles.loadingCard} />
        </View>
      </View>
    );
  }

  // データがない場合は非表示（要件書に従い条件付き表示）
  if (!displayRecommendations.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* メインカルーセル */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {displayRecommendations.map((audio, index) => (
          <AudioRecommendationCard
            key={audio.id}
            audio={audio}
            onPress={handleAudioPress}
            onPlay={handleAudioPlay}
            showPlayButton={true}
            // width={200} // original width
            // width={168}   // TEMP: match trending card width (2.x cards visible)
            width={148}     // Option A: audio slightly smaller than trending
          />
        ))}

        {/* さらに見るカード */}
        {showSeeMore && onSeeMore && recommendations.length > maxItems && (
          <TouchableOpacity
            style={styles.seeMoreCard}
            onPress={handleSeeMore}
            activeOpacity={0.8}
          >
            <View style={styles.seeMoreContent}>
              <Ionicons 
                name="arrow-forward-circle-outline" 
                size={32} 
                color="#007bff" 
              />
              <Text style={styles.seeMoreTitle}>さらに見る</Text>
              <Text style={styles.seeMoreSubtitle}>
                全{recommendations.length}件の音声
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 準備中インジケーター（モックデータ時） */}
      {displayRecommendations.some(audio => audio.tags?.includes('準備中')) && (
        <View style={styles.preparingIndicator}>
          <Ionicons name="construct-outline" size={14} color="#ffa500" />
          <Text style={styles.preparingText}>
            Discover Tab 統合準備中
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // コンテナスタイルは親で管理
  },

  // スクロールビュー
  scrollView: {
    // ScrollView自体のスタイル
  },
  scrollContent: {
    paddingHorizontal: SPACING.SCREEN_HORIZONTAL,
    paddingRight: SPACING.SCREEN_HORIZONTAL + 12, // 最後のカードの余白確保
  },

  // ローディング状態
  loadingContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.SCREEN_HORIZONTAL,
  },
  loadingCard: {
    // width: 200,
    // width: 168,
    width: 148,   // Option A: audio smaller
    // height: 200,
    // height: 180,
    height: 172,  // match AudioRecommendationCard container height
    backgroundColor: '#333333',
    borderRadius: 12,
    marginRight: 12,
    opacity: 0.5,
  },

  // さらに見るカード
  seeMoreCard: {
    // width: 200,
    // width: 168,
    width: 148,   // Option A: audio smaller
    // height: 200,
    // height: 180,
    height: 172,  // match AudioRecommendationCard container height
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  seeMoreContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  seeMoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007bff',
    marginTop: 8,
    marginBottom: 4,
  },
  seeMoreSubtitle: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },

  // 準備中インジケーター
  preparingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  preparingText: {
    fontSize: 12,
    color: '#ffa500',
    marginLeft: 4,
    fontWeight: '500',
  },
});
