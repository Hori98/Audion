import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QuickListenBarProps {
  selectedGenre?: string;
  selectedSource?: string;
  style?: any;
}

interface QuickListenOption {
  duration: number; // in seconds
  label: string;
  icon: string;
}

const QUICK_LISTEN_OPTIONS: QuickListenOption[] = [
  { duration: 180, label: '3分', icon: 'flash-outline' },
  { duration: 300, label: '5分', icon: 'time-outline' },
  { duration: 600, label: '10分', icon: 'hourglass-outline' },
];

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

export default function QuickListenBar({
  selectedGenre = 'All',
  selectedSource = 'All Sources',
  style,
}: QuickListenBarProps) {
  const { theme } = useTheme();
  const { playNewTrack } = useAudioPlayer();
  const [isGenerating, setIsGenerating] = useState<number | null>(null);

  const handleQuickListen = async (option: QuickListenOption) => {
    setIsGenerating(option.duration);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      // Auto-pick request with time budget and filters
      const autoPickRequest = {
        max_articles: 8, // Get more articles to ensure we have enough content
        time_budget: option.duration, // seconds
        ...(selectedGenre !== 'All' && { preferred_genres: [selectedGenre] }),
        ...(selectedSource !== 'All Sources' && { preferred_sources: [selectedSource] }),
      };

      console.log('Quick Listen request:', autoPickRequest);

      // Step 1: Auto-pick articles
      const autoPickResponse = await axios.post(
        `${API}/auto-pick`,
        autoPickRequest,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!autoPickResponse.data || autoPickResponse.data.length === 0) {
        Alert.alert(
          '記事なし',
          ' 選択した条件に合う記事が見つかりませんでした。条件を変更してお試しください。'
        );
        return;
      }

      console.log(`Quick Listen: Selected ${autoPickResponse.data.length} articles`);

      // Step 2: Create audio from selected articles
      const audioResponse = await axios.post(
        `${API}/audio/create`,
        { 
          articles: autoPickResponse.data,
          title: `${option.label}で聴くニュース`,
          description: `AI が選んだ${autoPickResponse.data.length}件の記事を${option.label}で聴けるようにまとめました`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (audioResponse.data?.audio_url) {
        // Step 3: Immediately start playing
        const audioItem = {
          id: audioResponse.data.id,
          title: audioResponse.data.title || `${option.label}で聴くニュース`,
          audio_url: audioResponse.data.audio_url,
          duration: audioResponse.data.duration || option.duration,
          created_at: new Date().toISOString(),
          script: audioResponse.data.script,
        };

        await playNewTrack({
          id: audioItem.id,
          title: audioItem.title,
          url: audioItem.audio_url,
          duration: audioItem.duration,
          created_at: audioItem.created_at,
          context: 'quick-listen'
        });

        // Show success message
        Alert.alert(
          '再生開始！',
          `${autoPickResponse.data.length}件の記事から${option.label}のポッドキャストを作成しました。再生を開始します。`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('エラー', '音声の作成に失敗しました');
      }
    } catch (error: any) {
      console.error('Quick Listen error:', error);
      
      let errorMessage = '音声作成に失敗しました';
      if (error.response?.status === 429) {
        errorMessage = 'リクエストが多すぎます。しばらく待ってからお試しください。';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      Alert.alert('エラー', errorMessage);
    } finally {
      setIsGenerating(null);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="sparkles" size={20} color={theme.primary} />
          <Text style={styles.title}>クイック再生</Text>
        </View>
        <Text style={styles.subtitle}>
          AIが記事を選んで即座にポッドキャストを作成
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        {QUICK_LISTEN_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.duration}
            style={[
              styles.quickButton,
              isGenerating === option.duration && styles.quickButtonGenerating,
            ]}
            onPress={() => handleQuickListen(option)}
            disabled={isGenerating !== null}
            activeOpacity={0.7}
          >
            {isGenerating === option.duration ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons 
                name={option.icon as any} 
                size={18} 
                color={isGenerating !== null ? theme.textSecondary : '#ffffff'} 
              />
            )}
            <Text style={[
              styles.quickButtonText,
              isGenerating !== null && isGenerating !== option.duration && styles.quickButtonTextDisabled,
            ]}>
              {option.label}で聴く
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Filters Display */}
      {(selectedGenre !== 'All' || selectedSource !== 'All Sources') && (
        <View style={styles.filtersDisplay}>
          <Text style={styles.filtersText}>
            フィルター: {selectedGenre !== 'All' ? selectedGenre : ''}{selectedGenre !== 'All' && selectedSource !== 'All Sources' ? ' • ' : ''}{selectedSource !== 'All Sources' ? selectedSource : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.surface || '#f8f9fa',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border || '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text || '#1f2937',
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSecondary || '#6b7280',
    lineHeight: 18,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary || '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  quickButtonGenerating: {
    backgroundColor: theme.accent || '#6366f1',
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  quickButtonTextDisabled: {
    color: theme.textSecondary || '#6b7280',
  },
  filtersDisplay: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border || '#e2e8f0',
  },
  filtersText: {
    fontSize: 12,
    color: theme.textSecondary || '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});