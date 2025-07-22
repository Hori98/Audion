import { Tabs } from 'expo-router';
import { Home, Rss, Library, Sparkles } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { TouchableOpacity } from 'react-native';
import { LogOut } from 'lucide-react-native';

export default function AppLayout() {
  const { logout } = useAuth();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
            <LogOut color="#333" size={24} />
          </TouchableOpacity>
        )
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
        name="auto-pick"
        options={{
          tabBarLabel: 'Auto-Pick',
          headerTitle: 'Auto-Pick',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
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