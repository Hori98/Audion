import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, router } from 'expo-router';
import { Pressable, View, Text, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '../../context/AuthContext';
import { RSSFeedProvider } from '../../context/RSSFeedContext';
import GlobalMiniPlayer from '../../components/GlobalMiniPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // セーフエリアを含む適切なタブバー高さを計算
  const baseTabHeight = Platform.OS === 'ios' ? 49 : 56;
  const defaultTabBarHeight = baseTabHeight + insets.bottom;
  
  // 実際のタブバー高さを測定して保存
  const [actualTabBarHeight, setActualTabBarHeight] = React.useState(defaultTabBarHeight);

  // Always call all hooks - no conditional hooks
  const headerShown = useClientOnlyValue(false, true);

  // Handle authentication redirect
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isLoading, isAuthenticated]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colorScheme === 'dark' ? '#000000' : '#ffffff'
      }}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <Text style={{
          marginTop: 16,
          color: Colors[colorScheme ?? 'light'].text,
          fontSize: 16
        }}>
          Loading...
        </Text>
      </View>
    );
  }

  // Show empty view while redirecting
  if (!isAuthenticated) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  return (
    <RSSFeedProvider>
      <Tabs
        screenOptions={{
          headerShown: headerShown,
          tabBarStyle: {
            backgroundColor: '#000000', // Force dark theme
            borderTopColor: 'transparent',
            borderTopWidth: 0,
            zIndex: 1000, // ミニプレイヤーより上に配置
            elevation: 1000, // Android対応
          },
          tabBarActiveTintColor: '#007bff',
          tabBarInactiveTintColor: '#888888',
        }}
        // タブバーの実高さを測定
        tabBar={(props) => (
          <View 
            onLayout={(e) => {
              const height = e.nativeEvent.layout.height;
              console.log('📊 [TAB-BAR] Measured actual height:', height, 'insets.bottom:', insets.bottom);
              setActualTabBarHeight(height);
            }}
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#000000',
              borderTopColor: 'transparent',
              borderTopWidth: 0,
              zIndex: 1000,
              elevation: 1000,
              // セーフエリアを含む適切な高さ
              height: defaultTabBarHeight,
              paddingBottom: insets.bottom, // セーフエリア分のパディング
            }}
          >
            <View style={{ 
              flexDirection: 'row', 
              height: baseTabHeight, // アイコンとテキストエリアの高さ
              alignItems: 'center',
            }}>
              {props.state.routes.map((route, index) => {
                const isFocused = props.state.index === index;
                const color = isFocused ? '#007bff' : '#888888';
                
                const onPress = () => {
                  const event = props.navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    props.navigation.navigate(route.name);
                  }
                };

                const getTabIcon = (routeName: string) => {
                  switch (routeName) {
                    case 'index': return 'home';
                    case 'articles': return 'newspaper-o';
                    case 'discover': return 'search';
                    case 'two': return 'music';
                    default: return 'circle';
                  }
                };

                const getTabLabel = (routeName: string) => {
                  switch (routeName) {
                    case 'index': return 'ホーム';
                    case 'articles': return 'フィード';
                    case 'discover': return 'ディスカバー';
                    case 'two': return 'ライブラリ';
                    default: return routeName;
                  }
                };

                return (
                  <TouchableOpacity
                    key={route.key}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                    }}
                    onPress={onPress}
                  >
                    <TabBarIcon name={getTabIcon(route.name) as any} color={color} />
                    <Text style={{ 
                      color, 
                      fontSize: 12, 
                      marginTop: 2,
                      fontWeight: isFocused ? '600' : '400'
                    }}>
                      {getTabLabel(route.name)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'ホーム',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="articles"
          options={{
            title: 'フィード',
            tabBarIcon: ({ color }) => <TabBarIcon name="newspaper-o" color={color} />,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'ディスカバー',
            tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
            headerShown: false,
          }}
        />
        {/* Library Tab: ファイル名は two.tsx だが機能は「ライブラリ」 */}
        <Tabs.Screen
          name="two"
          options={{
            title: 'ライブラリ',
            tabBarIcon: ({ color }) => <TabBarIcon name="music" color={color} />,
            headerShown: false,
          }}
        />
      </Tabs>
      
      {/* グローバルミニプレイヤー - すべてのタブで表示 */}
      <GlobalMiniPlayer 
        onExpand={() => router.push('/player')}
        bottomOffset={actualTabBarHeight}
      />
    </RSSFeedProvider>
  );
}
