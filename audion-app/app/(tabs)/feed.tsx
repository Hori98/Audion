import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import InfiniteFeed from '../../components/InfiniteFeed';
import LoadingIndicator from '../../components/LoadingIndicator';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

export default function FeedScreen() {
  const { token } = useAuth();
  const { theme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<any[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        loadFeedData();
      }
    }, [token])
  );

  const loadFeedData = async () => {
    try {
      setLoading(true);
      
      // Load RSS sources for content generation
      const sourcesResponse = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSources(sourcesResponse.data || []);
      
    } catch (error) {
      console.error('Error loading feed data:', error);
      // Don't show error to user, just log it
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAudio = async (articles: any[]): Promise<string> => {
    try {
      // Generate a more meaningful title based on articles
      const today = new Date();
      const timeStr = today.toLocaleString('ja-JP', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      let titlePrefix = '今日のニュース';
      if (articles.length > 0) {
        const categories = articles.map(a => a.category || 'General').filter(Boolean);
        const uniqueCategories = [...new Set(categories)];
        if (uniqueCategories.length === 1) {
          const categoryMap: {[key: string]: string} = {
            'Technology': 'テクノロジー',
            'Finance': '経済',
            'Politics': '政治',
            'Sports': 'スポーツ',
            'Health': '健康',
            'Entertainment': 'エンタメ'
          };
          titlePrefix = categoryMap[uniqueCategories[0]] || uniqueCategories[0];
        }
      }
      
      const response = await axios.post(
        `${API}/audio/create`,
        {
          articles: articles,
          prompt_style: 'standard',
          title: `${titlePrefix} (${timeStr})`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000, // 60 second timeout for AI generation
        }
      );

      return response.data.id;
    } catch (error: any) {
      console.error('Error creating audio:', error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('音声生成がタイムアウトしました。もう一度お試しください。');
      } else if (error.response?.status === 429) {
        throw new Error('生成回数の上限に達しました。しばらくお待ちください。');
      } else if (error.response?.status === 402) {
        throw new Error('この機能を使用するにはアップグレードが必要です。');
      } else {
        throw new Error('音声生成に失敗しました。');
      }
    }
  };

  const handleRefresh = () => {
    loadFeedData();
  };

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <InfiniteFeed
        onCreateAudio={handleCreateAudio}
        onRefresh={handleRefresh}
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
});