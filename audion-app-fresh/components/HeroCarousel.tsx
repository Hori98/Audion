import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UI_FLAGS } from '../config/uiFlags';

// ArticleServiceから型をインポート
import { Article } from '../services/ArticleService';
import { formatTimeAgo } from '../utils/dateUtils';

interface HeroCarouselProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  onPlayPress: (article: Article) => void;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_SPACING = 0; // カード間のスペースなし
const CARD_WIDTH = screenWidth; // カード幅を画面幅いっぱいに
const SIDE_PADDING = 0; // パディングなし

export default function HeroCarousel({
  articles,
  onArticlePress,
  onPlayPress,
  style,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hero carousel layout initialized

  // 最大5記事まで表示
  const displayArticles = React.useMemo(() => {
    if (articles.length === 0) return [];
    return articles.slice(0, 5);
  }, [articles]);

  // 自動スクロールは廃止（ユーザー操作中心のページング挙動に）

  // 現在表示されているアイテムが変更されたときの処理
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0]?.index ?? 0;
      setCurrentIndex(idx);
      currentIndexRef.current = idx;
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60, // 60%以上表示されたらアクティブとみなす（精度向上）
  }).current;

  // 手動スクロール開始時の処理（何もしないが、将来の拡張用）
  const handleScrollBegin = () => {
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }
  };

  // 慣性終了時：最寄りのカードにスナップ（フルスクリーン）
  const handleScrollEnd = (e?: any) => {
    if (!flatListRef.current || displayArticles.length === 0) return;
    const x = e?.nativeEvent?.contentOffset?.x ?? 0;
    let index = Math.round(x / screenWidth);
    index = Math.max(0, Math.min(displayArticles.length - 1, index));
    setCurrentIndex(index);
    currentIndexRef.current = index;
    const targetOffset = index * screenWidth;
    flatListRef.current.scrollToOffset({ offset: targetOffset, animated: true });

    // 次回の自動遷移をスケジュール
    scheduleAutoAdvance();
  };

  // snapToOffsets: 各カードがフルスクリーンで表示されるオフセット群
  const snapOffsets = useMemo(
    () => Array.from({ length: displayArticles.length }, (_, i) =>
      i * screenWidth
    ),
    [displayArticles.length]
  );

  // 自動遷移（ベストプラクティス：単発タイマー + ユーザー操作で停止/終了後に再開）
  const scheduleAutoAdvance = (delayMs: number = 5000) => {
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }
    if (displayArticles.length <= 1) return;
    autoTimeoutRef.current = setTimeout(() => {
      // 次インデックスを計算（末尾なら先頭へラップ）
      const next = (currentIndexRef.current + 1) % displayArticles.length;
      const offset = next * screenWidth;
      flatListRef.current?.scrollToOffset({ offset, animated: true });
      setCurrentIndex(next);
      currentIndexRef.current = next;
      // 次も予約
      scheduleAutoAdvance(delayMs);
    }, delayMs);
  };

  useEffect(() => {
    // 初期スケジュール
    scheduleAutoAdvance();
    return () => {
      if (autoTimeoutRef.current) {
        clearTimeout(autoTimeoutRef.current);
        autoTimeoutRef.current = null;
      }
    };
  }, [displayArticles.length]);

  // 各カードをレンダリングする関数
  const renderCard = ({ item: article }: { item: Article }) => (
    <TouchableOpacity
      style={styles.heroCard}
      onPress={() => onArticlePress(article)}
      activeOpacity={0.95}
    >
      {/* Background Image */}
      {article.thumbnail_url ? (
        <Image
          source={{ uri: article.thumbnail_url }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.backgroundImage, styles.placeholderBackground]}>
          <Ionicons name="newspaper-outline" size={48} color="#666666" />
        </View>
      )}

      {/* Gradient Overlay */}
      <View style={styles.gradientOverlay} />

      {/* Content Overlay */}
      <View style={styles.contentOverlay}>
        <View style={styles.bottomContent}>
          {/* Source and Time */}
          <View style={styles.metaInfo}>
            <View style={styles.sourceContainer}>
              <Text style={styles.sourceText}>{article.source_name}</Text>
            </View>
            <Text style={styles.timeText}>{formatTimeAgo(article.published_at)}</Text>
          </View>

          {/* Title and Summary */}
          <View style={styles.textContent}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {truncateText(article.title, 80)}
            </Text>
            {article.summary && (
              <Text style={styles.heroSummary} numberOfLines={2}>
                {truncateText(article.summary, 100)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={flatListRef}
        data={displayArticles}
        renderItem={renderCard}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContainer}
        contentOffset={{ x: 0, y: 0 }} // 初期位置を明示的に設定
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      {/* Page Indicators */}
      {displayArticles.length > 1 && (
        <View style={styles.indicators}>
          {displayArticles.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // 画像外インジケータ領域を最小限にするため、
    // コンテナ高さは「画像高＋約20px」に抑制
    height: (UI_FLAGS.COMPACT_HERO ? 220 : 260) + 20,
    marginTop: UI_FLAGS.COMPACT_HERO ? 4 : 6,
    marginBottom: UI_FLAGS.COMPACT_HERO ? 6 : 8,
  },
  flatListContainer: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  heroCard: {
    width: CARD_WIDTH,
    height: UI_FLAGS.COMPACT_HERO ? 220 : 260,
    marginHorizontal: 0,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  placeholderBackground: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
    opacity: 0.5,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: 'flex-end',
  },
  bottomContent: {
    // 画面下部50%に内容を集約
    height: '50%',
    justifyContent: 'flex-end',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  textContent: {
    marginTop: 0,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroSummary: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  readButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // 画像外配置のまま上下余白を最小化
    marginTop: 4,
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555555',
  },
  activeIndicator: {
    backgroundColor: '#007bff',
  },
});
