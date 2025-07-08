
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Rss, Library } from 'lucide-react-native';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
      }}>
      <Tabs.Screen
        name="feed"
        options={{
          tabBarLabel: 'Feed',
          headerTitle: 'Feed',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sources"
        options={{
          tabBarLabel: 'Sources',
          headerTitle: 'Sources',
          tabBarIcon: ({ color, size }) => <Rss color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarLabel: 'Library',
          headerTitle: 'Library',
          tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
