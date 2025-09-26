/**
 * Skeleton Loading Components for improved perceived performance
 *
 * These components provide visual feedback while content is loading,
 * improving the user experience during data fetching operations.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Shimmer Animation Hook
const useShimmerAnimation = () => {
  const shimmerTranslateX = useSharedValue(-width);

  React.useEffect(() => {
    shimmerTranslateX.value = withRepeat(
      withTiming(width, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [shimmerTranslateX]);

  return shimmerTranslateX;
};

// Base Skeleton Box Component
interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width,
  height,
  borderRadius = 8,
  style
}) => {
  const shimmerTranslateX = useShimmerAnimation();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E1E9EE',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
};

// Article Card Skeleton
export const SkeletonArticleCard: React.FC = () => (
  <View style={styles.articleCard}>
    {/* Article Thumbnail */}
    <SkeletonBox width={80} height={80} borderRadius={8} />

    <View style={styles.articleContent}>
      {/* Title lines */}
      <SkeletonBox width="90%" height={16} style={styles.titleLine} />
      <SkeletonBox width="75%" height={16} style={styles.titleLine} />

      {/* Summary lines */}
      <SkeletonBox width="100%" height={12} style={styles.summaryLine} />
      <SkeletonBox width="85%" height={12} style={styles.summaryLine} />

      {/* Metadata */}
      <View style={styles.metadata}>
        <SkeletonBox width={60} height={10} />
        <SkeletonBox width={40} height={10} />
      </View>
    </View>
  </View>
);

// Feed List Skeleton
export const SkeletonFeedList: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={styles.container}>
    {Array.from({ length: count }, (_, index) => (
      <SkeletonArticleCard key={index} />
    ))}
  </View>
);

// Hero Carousel Skeleton
export const SkeletonHeroCarousel: React.FC = () => (
  <View style={styles.heroContainer}>
    <SkeletonBox width="100%" height={200} borderRadius={12} />

    {/* Carousel indicators */}
    <View style={styles.indicators}>
      {Array.from({ length: 3 }, (_, index) => (
        <SkeletonBox
          key={index}
          width={8}
          height={8}
          borderRadius={4}
          style={styles.indicator}
        />
      ))}
    </View>
  </View>
);

// Compact Article Card Skeleton (for horizontal lists)
export const SkeletonCompactCard: React.FC = () => (
  <View style={styles.compactCard}>
    <SkeletonBox width="100%" height={120} borderRadius={8} />
    <View style={styles.compactContent}>
      <SkeletonBox width="90%" height={14} style={styles.compactTitle} />
      <SkeletonBox width="70%" height={12} style={styles.compactMeta} />
    </View>
  </View>
);

// Genre Filter Skeleton
export const SkeletonGenreFilter: React.FC = () => (
  <View style={styles.genreContainer}>
    {Array.from({ length: 5 }, (_, index) => (
      <SkeletonBox
        key={index}
        width={80}
        height={32}
        borderRadius={16}
        style={styles.genreItem}
      />
    ))}
  </View>
);

// Combined Home Screen Skeleton
export const SkeletonHomeScreen: React.FC = () => (
  <View style={styles.container}>
    <SkeletonHeroCarousel />
    <SkeletonGenreFilter />
    <SkeletonFeedList count={5} />
  </View>
);

// Combined Feed Screen Skeleton
export const SkeletonFeedScreen: React.FC = () => (
  <View style={styles.container}>
    <SkeletonGenreFilter />
    <SkeletonFeedList count={8} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Article Card Styles
  articleCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  articleContent: {
    flex: 1,
    marginLeft: 12,
  },

  titleLine: {
    marginBottom: 4,
  },

  summaryLine: {
    marginBottom: 3,
    marginTop: 8,
  },

  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  // Hero Carousel Styles
  heroContainer: {
    margin: 16,
    marginBottom: 24,
  },

  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },

  indicator: {
    marginHorizontal: 4,
  },

  // Compact Card Styles
  compactCard: {
    width: 160,
    marginRight: 12,
  },

  compactContent: {
    marginTop: 8,
  },

  compactTitle: {
    marginBottom: 4,
  },

  compactMeta: {
    marginBottom: 2,
  },

  // Genre Filter Styles
  genreContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },

  genreItem: {
    marginRight: 8,
  },
});

export default {
  SkeletonArticleCard,
  SkeletonFeedList,
  SkeletonHeroCarousel,
  SkeletonCompactCard,
  SkeletonGenreFilter,
  SkeletonHomeScreen,
  SkeletonFeedScreen,
};