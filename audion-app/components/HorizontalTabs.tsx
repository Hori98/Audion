/**
 * Horizontal Tabs Component - Twitter-style sliding tabs with underline
 * Reusable component for genre/category selection across the app
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface Tab {
  id: string;
  name: string;
}

interface HorizontalTabsProps {
  tabs: Tab[];
  selectedTab: string;
  onTabSelect: (tabId: string) => void;
  style?: any;
}

export default function HorizontalTabs({
  tabs,
  selectedTab,
  onTabSelect,
  style
}: HorizontalTabsProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const underlineAnim = useRef(new Animated.Value(0)).current;
  const [tabWidths, setTabWidths] = useState<{ [key: string]: number }>({});
  const [tabPositions, setTabPositions] = useState<{ [key: string]: number }>({});

  // Animate underline to selected tab
  useEffect(() => {
    if (tabPositions[selectedTab] !== undefined && tabWidths[selectedTab] !== undefined) {
      const targetPosition = tabPositions[selectedTab];
      
      Animated.spring(underlineAnim, {
        toValue: targetPosition,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [selectedTab, tabPositions, tabWidths]);

  const handleTabLayout = (tabId: string, event: any) => {
    const { x, width } = event.nativeEvent.layout;
    setTabPositions(prev => ({ ...prev, [tabId]: x }));
    setTabWidths(prev => ({ ...prev, [tabId]: width }));
  };

  const handleTabPress = (tabId: string) => {
    onTabSelect(tabId);
    
    // Auto-scroll to center the selected tab
    if (scrollViewRef.current && tabPositions[tabId] !== undefined) {
      const screenWidth = Dimensions.get('window').width;
      const tabPosition = tabPositions[tabId];
      const tabWidth = tabWidths[tabId] || 0;
      const centerPosition = tabPosition - (screenWidth / 2) + (tabWidth / 2);
      
      scrollViewRef.current.scrollTo({
        x: Math.max(0, centerPosition),
        animated: true,
      });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handleTabPress(tab.id)}
            onLayout={(event) => handleTabLayout(tab.id, event)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.tabTextSelected
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Animated Underline - Now inside ScrollView */}
        <Animated.View
          style={[
            styles.underlineInScroll,
            {
              left: underlineAnim,
              width: tabWidths[selectedTab] || 0,
            }
          ]}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: '100%',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '500',
  },
  tabTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  underlineContainer: {
    position: 'relative',
    height: 2,
    backgroundColor: 'transparent',
  },
  underline: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#007bff',
    borderRadius: 1,
  },
  underlineInScroll: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#007bff',
    borderRadius: 1,
  },
});