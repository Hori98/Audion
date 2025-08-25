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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Article } from '../types';

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
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll functionality (3-5s interval)
  useEffect(() => {
    if (articles.length <= 1) return;

    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % articles.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * (CARD_WIDTH + CARD_SPACING),
            animated: true,
          });
          return nextIndex;
        });
      }, 4000); // 4 seconds
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [articles.length]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    setCurrentIndex(index);
  };

  const handleManualScroll = () => {
    // Reset auto-scroll timer when user manually scrolls
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    
    // Restart auto-scroll after 6 seconds of inactivity
    setTimeout(() => {
      if (articles.length > 1) {
        autoScrollTimer.current = setInterval(() => {
          setCurrentIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % articles.length;
            scrollViewRef.current?.scrollTo({
              x: nextIndex * (CARD_WIDTH + CARD_SPACING),
              animated: true,
            });
            return nextIndex;
          });
        }, 4000);
      }
    }, 6000);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const publishedDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '数分前';
    if (diffInHours < 24) return `${diffInHours}時間前`;
    return `${Math.floor(diffInHours / 24)}日前`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const styles = createStyles(theme);

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
        onScrollBeginDrag={handleManualScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContainer}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {articles.slice(0, 3).map((article, index) => (
          <TouchableOpacity
            key={article.id}
            style={styles.heroCard}
            onPress={() => onArticlePress(article)}
            activeOpacity={0.95}
          >
            {/* Background Image */}
            {article.image_url ? (
              <Image
                source={{ uri: article.image_url }}
                style={styles.backgroundImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.backgroundImage, styles.placeholderBackground]}>
                <Ionicons name="newspaper-outline" size={40} color={theme.textSecondary} />
              </View>
            )}
            
            {/* Gradient Overlay */}
            <View style={styles.gradientOverlay} />
            
            {/* Content Overlay */}
            <View style={styles.contentOverlay}>
              {/* Personalization Badge */}
              <View style={styles.personalizationBadge}>
                <Ionicons name="analytics-outline" size={12} color="#ffffff" />
                <Text style={styles.personalizationText}>あなた向けにカスタマイズ</Text>
              </View>

              {/* Source and Time */}
              <View style={styles.metaInfo}>
                <View style={styles.sourceContainer}>
                  <Ionicons name="radio-outline" size={14} color="#ffffff" />
                  <Text style={styles.sourceText}>{article.source_name}</Text>
                </View>
                <Text style={styles.timeText}>{formatTimeAgo(article.published_at)}</Text>
              </View>

              {/* Title and Summary */}
              <View style={styles.textContent}>
                <Text style={styles.heroTitle}>
                  {truncateText(article.title, 100)}
                </Text>
                {article.summary && (
                  <Text style={styles.heroSummary}>
                    {truncateText(article.summary, 120)}
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => onPlayPress(article)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={20} color="#ffffff" />
                  <Text style={styles.playButtonText}>聴く</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.readButton}
                  onPress={() => onArticlePress(article)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={18} color={theme.primary} />
                  <Text style={styles.readButtonText}>読む</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      {articles.length > 1 && (
        <View style={styles.indicators}>
          {articles.slice(0, 3).map((_, index) => (
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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    height: 280,
    marginVertical: 8,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingRight: 32, // Extra padding for last item
  },
  heroCard: {
    width: CARD_WIDTH,
    height: 240,
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
    backgroundColor: theme.surface || '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
    backgroundColor: 'rgba(0,0,0,0.4)', // Fallback for React Native
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'space-between',
  },
  personalizationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.9)', // Primary color with transparency
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    marginBottom: 8,
  },
  personalizationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
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
    flex: 1,
    justifyContent: 'center',
    marginVertical: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 28,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroSummary: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary || '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  readButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary || '#4f46e5',
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
    backgroundColor: theme.border || '#e2e8f0',
  },
  activeIndicator: {
    backgroundColor: theme.primary || '#4f46e5',
    width: 24,
  },
});