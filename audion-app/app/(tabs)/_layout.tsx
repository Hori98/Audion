import { Tabs } from 'expo-router';
import { Home, Library, Sparkles, Settings } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  const { logout } = useAuth();
  const router = useRouter();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.push('/settings')} 
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="person-circle-outline" size={28} color="#4f46e5" />
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