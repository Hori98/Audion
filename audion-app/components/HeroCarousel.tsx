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
const CARD_WIDTH = screenWidth - 32; // 16px margin on each side
const CARD_SPACING = 16;

export default function HeroCarousel({
  articles,
  onArticlePress,
  onPlayPress,
  style,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(1); // 真ん中から開始
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<number | null>(null);
  const isScrollingRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);

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

  // 初期位置設定（真ん中から開始するため1番目に移動）
  useEffect(() => {
    if (displayArticles.length > 2 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: 1 * (CARD_WIDTH + CARD_SPACING),
          animated: false,
        });
      }, 100);
    }
  }, [displayArticles.length]);

  // 自動スクロール機能（5秒間隔）
  useEffect(() => {
    if (displayArticles.length <= 2) return; // 実質的に1記事以下の場合は自動スクロールしない

    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        if (!isScrollingRef.current) {
          setCurrentIndex(prev => {
            const nextIndex = prev + 1;
            scrollViewRef.current?.scrollTo({
              x: nextIndex * (CARD_WIDTH + CARD_SPACING),
              animated: true,
            });
            return nextIndex;
          });
        }
      }, 5000); // 5秒間隔
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [displayArticles.length]);

  const handleScroll = (event: any) => {
    if (displayArticles.length <= 2) return;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    
    // インジケータ表示用のインデックス計算（0-4の範囲）
    const actualArticleCount = Math.min(articles.length, 5);
    let indicatorIndex;
    
    if (index <= 0) {
      indicatorIndex = actualArticleCount - 1; // 最後
    } else if (index >= displayArticles.length - 1) {
      indicatorIndex = 0; // 最初
    } else {
      indicatorIndex = (index - 1) % actualArticleCount;
    }
    
    setCurrentIndex(index);
  };

  const handleScrollEnd = (event: any) => {
    if (displayArticles.length <= 2) return;
    
    isScrollingRef.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    
    // 無限ループの境界処理
    if (index <= 0) {
      // 最初の複製（実際は最後の記事）から最後の実記事に移動
      setTimeout(() => {
        const targetIndex = displayArticles.length - 2;
        scrollViewRef.current?.scrollTo({
          x: targetIndex * (CARD_WIDTH + CARD_SPACING),
          animated: false,
        });
        setCurrentIndex(targetIndex);
      }, 50);
    } else if (index >= displayArticles.length - 1) {
      // 最後の複製（実際は最初の記事）から最初の実記事に移動
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: 1 * (CARD_WIDTH + CARD_SPACING),
          animated: false,
        });
        setCurrentIndex(1);
      }, 50);
    } else {
      setCurrentIndex(index);
    }
  };

  const handleScrollBegin = () => {
    isScrollingRef.current = true;
    
    // 自動スクロールを一時停止
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    
    // 既存の再開タイマーをクリア
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    // 4秒後に自動スクロールを再開
    restartTimeoutRef.current = setTimeout(() => {
      if (displayArticles.length > 2) {
        autoScrollTimer.current = setInterval(() => {
          if (!isScrollingRef.current) {
            setCurrentIndex(prev => {
              const nextIndex = prev + 1;
              scrollViewRef.current?.scrollTo({
                x: nextIndex * (CARD_WIDTH + CARD_SPACING),
                animated: true,
              });
              return nextIndex;
            });
          }
        }, 5000);
      }
    }, 4000) as unknown as number;
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
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
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
    paddingHorizontal: 16,
    paddingRight: 32, // Extra padding for last item
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