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
const SIDE_CARD_LENGTH = 40; // 画面左右の合計余白（= 中央表示用に左右20ずつ）
const CARD_SPACING = 16; // カード間のスペース
const CARD_WIDTH = screenWidth - SIDE_CARD_LENGTH; // カードの幅（中央に1枚を見せる幅）
const SIDE_PADDING = SIDE_CARD_LENGTH / 2; // FlatListの左右パディング（= 左右の余白）

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
    itemVisiblePercentThreshold: 50, // 50%以上表示されたらアクティブとみなす
  }).current;

  // 手動スクロール開始時の処理（何もしないが、将来の拡張用）
  const handleScrollBegin = () => {
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }
  };

  // 慣性終了時：最寄りのカードの中央に吸着（中央スナップ）
  const handleScrollEnd = (e?: any) => {
    if (!flatListRef.current || displayArticles.length === 0) return;
    const x = e?.nativeEvent?.contentOffset?.x ?? 0;
    const step = CARD_WIDTH + CARD_SPACING;
    // i ≒ round((x - SIDE_PADDING - CARD_WIDTH/2 + screenWidth/2) / step)
    let index = Math.round(
      (x - SIDE_PADDING - CARD_WIDTH / 2 + screenWidth / 2) / step
    );
    index = Math.max(0, Math.min(displayArticles.length - 1, index));
    setCurrentIndex(index);
    currentIndexRef.current = index;
    // FlatListはscrollToIndexで先頭位置に移動するため、中央表示になるようオフセットで指定
    const centeredOffset = SIDE_PADDING + index * step + CARD_WIDTH / 2 - screenWidth / 2;
    flatListRef.current.scrollToOffset({ offset: centeredOffset, animated: true });

    // 次回の自動遷移をスケジュール
    scheduleAutoAdvance();
  };

  // snapToOffsets: 各カードの中心が画面中央に来るオフセット群
  const snapOffsets = useMemo(
    () => Array.from({ length: displayArticles.length }, (_, i) =>
      SIDE_PADDING + i * (CARD_WIDTH + CARD_SPACING) + CARD_WIDTH / 2 - screenWidth / 2
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
      const step = CARD_WIDTH + CARD_SPACING;
      const next = (currentIndexRef.current + 1) % displayArticles.length;
      const offset = SIDE_PADDING + next * step + CARD_WIDTH / 2 - screenWidth / 2;
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
          <Text style={styles.placeholderIcon}>📰</Text>
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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + CARD_SPACING,
          offset: (CARD_WIDTH + CARD_SPACING) * index,
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
    height: 300,
    marginVertical: 8,
  },
  flatListContainer: {
    paddingLeft: SIDE_PADDING,
    paddingRight: SIDE_PADDING,
  },
  heroCard: {
    width: CARD_WIDTH,
    height: 260,
    marginHorizontal: CARD_SPACING / 2,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    padding: 20,
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
    borderRadius: 12,
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
    marginTop: 12,
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
    marginTop: 16,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#555555',
  },
  activeIndicator: {
    backgroundColor: '#007bff',
  },
});
