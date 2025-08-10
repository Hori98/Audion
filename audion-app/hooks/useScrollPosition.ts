import { useRef, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScrollPositionService from '../services/ScrollPositionService';

interface UseScrollPositionProps {
  screenKey: string;
  saveDelay?: number; // Delay in milliseconds before saving scroll position
  alwaysStartAtTop?: boolean; // If true, always start at top (useful for main settings page)
  restoreDelay?: number; // Custom delay for scroll position restoration
  shouldRestoreScroll?: () => boolean; // Function to determine if scroll should be restored
}

export const useScrollPosition = ({ screenKey, saveDelay = 500, alwaysStartAtTop = false, restoreDelay = 300, shouldRestoreScroll }: UseScrollPositionProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentScrollY = useRef<number>(0);

  // Load scroll position when screen comes into focus
  useFocusEffect(() => {
    const loadPosition = async () => {
      try {
        if (alwaysStartAtTop) {
          // Always start at top, but still initialize the scroll view
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: 0,
              animated: false
            });
          }, 100);
          return;
        }

        // Check if scroll restoration should happen (when modals are not open)
        if (shouldRestoreScroll && !shouldRestoreScroll()) {
          return; // Don't restore scroll position if modal is open
        }

        const savedPosition = await ScrollPositionService.loadScrollPosition(screenKey);
        if (savedPosition > 0 && scrollViewRef.current) {
          // Use custom delay for scroll position restoration
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: savedPosition,
              animated: false
            });
          }, restoreDelay);
        }
      } catch (error) {
        console.error('Failed to load scroll position:', error);
      }
    };

    loadPosition();
    
    // Cleanup function to save current position when leaving screen
    return () => {
      if (!alwaysStartAtTop && currentScrollY.current > 0) {
        ScrollPositionService.saveScrollPosition(screenKey, currentScrollY.current);
      }
    };
  });

  // Handle scroll events with debouncing
  const handleScroll = (event: any) => {
    const { y } = event.nativeEvent.contentOffset;
    currentScrollY.current = y;

    // Don't save scroll position if alwaysStartAtTop is true
    if (alwaysStartAtTop) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save position after delay
    saveTimeoutRef.current = setTimeout(() => {
      ScrollPositionService.saveScrollPosition(screenKey, y);
    }, saveDelay);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Manual restore function for cases where automatic restore doesn't work well
  const restoreScrollPosition = async () => {
    if (alwaysStartAtTop) return;
    
    // Check if scroll restoration should happen (when modals are not open)
    if (shouldRestoreScroll && !shouldRestoreScroll()) {
      return; // Don't restore scroll position if modal is open
    }
    
    try {
      const savedPosition = await ScrollPositionService.loadScrollPosition(screenKey);
      if (savedPosition > 0 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: savedPosition,
          animated: false
        });
      }
    } catch (error) {
      console.error('Failed to manually restore scroll position:', error);
    }
  };

  return {
    scrollViewRef,
    handleScroll,
    scrollEventThrottle: 16, // Smooth scrolling
    restoreScrollPosition // Manual restore function
  };
};