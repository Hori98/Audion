/**
 * Hero Carousel Component
 * Horizontal sliding news carousel with thumbnails, titles, and media names
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_ITEM_WIDTH = SCREEN_WIDTH - 40; // Account for padding

interface HeroItem {
  id: string;
  title: string;
  description: string;
  mediaName: string;
  publishedAt: string;
  imageUrl?: string;
  url?: string;
}

interface HeroCarouselProps {
  items: HeroItem[];
  onItemPress?: (item: HeroItem) => void;
}

export default function HeroCarousel({ items, onItemPress }: HeroCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Create infinite loop by duplicating items
  const infiniteItems = items.length > 0 ? [
    ...items.slice(-2), // Last 2 items at the beginning
    ...items,           // Original items
    ...items.slice(0, 2) // First 2 items at the end
  ] : [];
  
  const totalItems = infiniteItems.length;
  const originalLength = items.length;
  
  useEffect(() => {
    // Start at the first real item (skip the duplicated items at the beginning)
    if (items.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: 2 * HERO_ITEM_WIDTH,
        animated: false
      });
      setActiveIndex(0);
    }
  }, [items]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / HERO_ITEM_WIDTH);
    
    // Calculate the real index (accounting for duplicated items)
    const realIndex = ((index - 2) % originalLength + originalLength) % originalLength;
    setActiveIndex(realIndex);
  };
  
  const handleScrollEnd = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / HERO_ITEM_WIDTH);
    
    setIsScrolling(false);
    
    // Handle infinite loop position reset
    if (scrollViewRef.current && !isScrolling) {
      if (index < 2) {
        // At the beginning duplicates, jump to the end of real items
        const targetIndex = originalLength + index;
        scrollViewRef.current.scrollTo({
          x: targetIndex * HERO_ITEM_WIDTH,
          animated: false
        });
      } else if (index >= originalLength + 2) {
        // At the end duplicates, jump to the beginning of real items
        const targetIndex = index - originalLength;
        scrollViewRef.current.scrollTo({
          x: targetIndex * HERO_ITEM_WIDTH,
          animated: false
        });
      }
    }
  };
  
  const handleScrollBegin = () => {
    setIsScrolling(true);
  };

  const renderHeroItem = (item: HeroItem, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={styles.heroItem}
      onPress={() => onItemPress?.(item)}
    >
      {/* Hero Image */}
      <View style={styles.heroImageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroImagePlaceholder}>
            <Text style={styles.heroImagePlaceholderText}>📰</Text>
          </View>
        )}
        
        {/* Overlay gradient for text readability */}
        <View style={styles.heroOverlay}>
          <View style={styles.heroOverlayTop} />
          <View style={styles.heroOverlayBottom} />
        </View>
        
        {/* Content overlay */}
        <View style={styles.heroContent}>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMediaName}>{item.mediaName}</Text>
            <Text style={styles.heroPublishedAt}>
              {new Date(item.publishedAt).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          
          <Text style={styles.heroTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <Text style={styles.heroDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!items || items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ニュースを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {infiniteItems.map((item, index) => renderHeroItem(item, index))}
      </ScrollView>
      
      {/* Page Indicator */}
      <View style={styles.pageIndicator}>
        {items.map((_, index) => (
          <View
            key={index}
            style={[
              styles.pageIndicatorDot,
              index === activeIndex && styles.pageIndicatorDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroItem: {
    width: HERO_ITEM_WIDTH,
    marginRight: 20,
  },
  heroImageContainer: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImagePlaceholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  heroOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  heroOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroMediaName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
    textTransform: 'uppercase',
  },
  heroPublishedAt: {
    fontSize: 12,
    color: '#cccccc',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  pageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
    marginHorizontal: 4,
  },
  pageIndicatorDotActive: {
    backgroundColor: '#007bff',
    width: 20,
  },
  emptyContainer: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
  },
});