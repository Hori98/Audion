import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
const SIDE_PADDING = 16; // 左右余白
const CARD_SPACING = 16; // カード間の余白
const CARD_WIDTH = screenWidth - SIDE_PADDING * 2; // 画面左右の余白を差し引いた幅

export default function HeroCarousel({
  articles,
  onArticlePress,
  onPlayPress,
  style,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(1); // 真ん中から開始
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserScrollingRef = useRef(false);
  const isAdjustingRef = useRef(false);
  const currentIndexRef = useRef(1);

  // 指定インデックスを画面中央にスナップさせるオフセットを算出
  const getOffsetForIndex = (i: number) =>
    SIDE_PADDING + i * (CARD_WIDTH + CARD_SPACING) + CARD_WIDTH / 2 - screenWidth / 2;

  // snapToOffsetsを利用して、常に最寄りのカード中央へ吸着させる
  const snapOffsets = React.useMemo(() => {
    return Array.from({ length: displayArticles.length }, (_, i) => getOffsetForIndex(i));
  }, [displayArticles.length]);

  // 表示用記事配列（前後に複製を配置して無限スクロールを実現）
  const displayArticles = React.useMemo(() => {
    if (articles.length === 0) return [];
    if (articles.length === 1) return articles;
    
    const limitedArticles = articles.slice(0, 5); // 最大5記事まで
    
    // [last, 1, 2, 3, 4, 5, first] の配列を作成
    return [
      limitedArticles[limitedArticles.length - 1], // 最後の記事を先頭に
      ...limitedArticles,
      limitedArticles[0] // 最初の記事を末尾に
    ];
  }, [articles]);

  // 初期位置設定（1番目を中央に）
  useEffect(() => {
    if (displayArticles.length > 2 && scrollViewRef.current) {
      // 初期位置へ正確に移動（中央スナップ用オフセット）
      const initialX = getOffsetForIndex(1);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ x: initialX, animated: false });
        setCurrentIndex(1);
        currentIndexRef.current = 1;
      });
    }
  }, [displayArticles.length]);

  const handleScroll = (event: any) => {
    // インジケータ・インデックスは確定後（onMomentumScrollEnd）で更新する
    if (displayArticles.length <= 2) return;
  };

  const handleScrollEnd = (event: any) => {
    if (displayArticles.length <= 2) return;
    isUserScrollingRef.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    // i ≒ round((x - SIDE_PADDING - CARD_WIDTH/2 + screenWidth/2) / (CARD_WIDTH + CARD_SPACING))
    let index = Math.round(
      (offsetX - SIDE_PADDING - CARD_WIDTH / 2 + screenWidth / 2) /
        (CARD_WIDTH + CARD_SPACING)
    );

    // 無限ループの境界処理
    if (index <= 0) {
      // 最初の複製 → 最後の実記事へジャンプ
      isAdjustingRef.current = true;
      const targetIndex = displayArticles.length - 2;
      const x = getOffsetForIndex(targetIndex);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ x, animated: false });
        setCurrentIndex(targetIndex);
        currentIndexRef.current = targetIndex;
        isAdjustingRef.current = false;
      });
    } else if (index >= displayArticles.length - 1) {
      // 最後の複製 → 最初の実記事へジャンプ
      isAdjustingRef.current = true;
      const targetIndex = 1;
      const x = getOffsetForIndex(targetIndex);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ x, animated: false });
        setCurrentIndex(targetIndex);
        currentIndexRef.current = targetIndex;
        isAdjustingRef.current = false;
      });
    } else {
      setCurrentIndex(index);
      currentIndexRef.current = index;
      // 既にsnapToOffsetsで中央に吸着される
    }
  };

  const handleScrollBegin = () => {
    isUserScrollingRef.current = true;
    // 自動スクロールは廃止（ユーザー操作優先のページング挙動）
  };

  // インジケータ表示用のインデックス計算
  const getIndicatorIndex = () => {
    if (displayArticles.length <= 2) return 0;
    
    const actualArticleCount = Math.min(articles.length, 5);
    
    if (currentIndex <= 0) {
      return actualArticleCount - 1;
    } else if (currentIndex >= displayArticles.length - 1) {
      return 0;
    } else {
      return (currentIndex - 1) % actualArticleCount;
    }
  };


  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContainer}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
      >
        {displayArticles.map((article, index) => (
          <TouchableOpacity
            key={`${article.id}-${index}`}
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
            
            {/* Content Overlay - 画面下部40%に集約 */}
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
        ))}
      </ScrollView>

      {/* Page Indicators */}
      {articles.length > 1 && (
        <View style={styles.indicators}>
          {articles.slice(0, 5).map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === getIndicatorIndex() && styles.activeIndicator,
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
  scrollContainer: {
    paddingLeft: SIDE_PADDING,
    paddingRight: SIDE_PADDING,
  },
  heroCard: {
    width: CARD_WIDTH,
    height: 260,
    marginRight: CARD_SPACING,
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
  // personalizationBadge: {
  //   alignSelf: 'flex-start',
  //   backgroundColor: 'rgba(0, 123, 255, 0.9)',
  //   paddingHorizontal: 10,
  //   paddingVertical: 6,
  //   borderRadius: 16,
  //   marginBottom: 8,
  // },
  // personalizationText: {
  //   fontSize: 11,
  //   fontWeight: '600',
  //   color: '#ffffff',
  // },
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
