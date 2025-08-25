import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingIndicator from '../components/LoadingIndicator';
import SubscriptionService from '../services/SubscriptionService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

interface AutoPickSettings {
  max_articles: number;
  preferred_genres: string[];
  excluded_genres: string[];
  source_priority: string;
  time_based_filtering: boolean;
}

export default function AutoPickSettingsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [settings, setSettings] = useState<AutoPickSettings>({
    max_articles: 5,
    preferred_genres: [],
    excluded_genres: [],
    source_priority: 'balanced',
    time_based_filtering: true
  });

  const genres = [
    'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  const sourcePriorityOptions = [
    { value: 'balanced', label: 'バランス型', description: 'すべてのソースから均等に記事を選択' },
    { value: 'popular', label: '人気重視', description: '人気の高い記事を優先的に選択' },
    { value: 'recent', label: '最新重視', description: '新しい記事を優先的に選択' }
  ];

  useEffect(() => {
    loadSettingsAndSubscription();
  }, []);

  const loadSettingsAndSubscription = async () => {
    try {
      // Ensure Debug Service is loaded first
      const { default: DebugService } = await import('../services/DebugService');
      await DebugService.loadDebugSettings();
      console.log('🔧 AutoPick Settings: DebugService loaded, forced tier:', DebugService.getForcedSubscriptionTier());
      
      // Load both settings and subscription info in parallel
      const [settingsResponse, subscriptionResponse] = await Promise.all([
        axios.get(`${API}/user/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        SubscriptionService.getInstance().getSubscriptionInfo(token, true) // Force refresh to ensure debug tier applies
      ]);
      
      if (settingsResponse.data?.auto_pick_settings) {
        setSettings(prevSettings => ({
          ...prevSettings,
          ...settingsResponse.data.auto_pick_settings
        }));
      }
      
      console.log('📊 AutoPick Settings: Final subscription info:', subscriptionResponse);
      setSubscriptionInfo(subscriptionResponse);
      
    } catch (error) {
      console.warn('Error loading auto-pick settings or subscription:', error);
      // Use default settings if loading fails
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/user/settings`,
        { auto_pick_settings: settings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('設定保存完了', 'Auto-Pick設定が保存されました');
    } catch (error: any) {
      console.error('Error saving auto-pick settings:', error);
      Alert.alert('保存エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'デフォルト設定に戻す',
      '全ての設定をデフォルト値に戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            setSettings({
              max_articles: Math.min(5, subscriptionInfo?.subscription?.max_audio_articles || 3),
              preferred_genres: [],
              excluded_genres: [],
              source_priority: 'balanced',
              time_based_filtering: true
            });
          }
        }
      ]
    );
  };

  if (loading) {
    return <LoadingIndicator variant="fullscreen" text="設定を読み込み中..." />;
  }

  const styles = createStyles(theme);
  
  // Get plan info for display
  const currentPlan = subscriptionInfo?.subscription?.plan || 'free';
  const maxArticlesLimit = subscriptionInfo?.subscription?.max_audio_articles || 3;
  const planDisplayName = currentPlan === 'free' ? 'フリー' : 
                         currentPlan === 'basic' ? 'ベーシック' : 'プレミアム';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auto-Pick設定</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, { color: theme.primary }]}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            💎 プラン情報
          </Text>
          <View style={[styles.planCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.planTitle, { color: theme.text }]}>
              現在のプラン: {planDisplayName}
            </Text>
            <Text style={[styles.planDescription, { color: theme.textSecondary }]}>
              1回の音声生成で最大{maxArticlesLimit}記事まで選択可能
            </Text>
          </View>
        </View>

        {/* Basic Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🎯 基本設定
          </Text>
          
          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              最大記事数: {settings.max_articles} / {maxArticlesLimit}
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              Auto-Pickで選択する記事の最大数 (プラン制限: {maxArticlesLimit})
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, max_articles: Math.max(1, prev.max_articles - 1)}))}
              >
                <Ionicons name="remove" size={20} color={theme.primary} />
              </TouchableOpacity>
              <View style={styles.sliderValueContainer}>
                <Text style={[styles.sliderValue, { color: theme.primary }]}>{settings.max_articles}</Text>
              </View>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, max_articles: Math.min(maxArticlesLimit, prev.max_articles + 1)}))}
              >
                <Ionicons name="add" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <View style={styles.settingHeader}>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  時間ベースフィルタ
                </Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  時間帯に応じて記事を選択
                </Text>
              </View>
              <Switch
                value={settings.time_based_filtering}
                onValueChange={(value) => setSettings(prev => ({...prev, time_based_filtering: value}))}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.time_based_filtering ? '#fff' : theme.background}
              />
            </View>
          </View>
        </View>

        {/* Source Priority - Home Tab Only */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🏠 ホーム画面でのソース選択
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            ホーム画面のAuto-Pick機能で記事を選択する際の優先度設定
          </Text>
          
          {sourcePriorityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.priorityOption,
                { 
                  backgroundColor: theme.surface,
                  borderColor: settings.source_priority === option.value ? theme.primary : 'transparent',
                  borderWidth: settings.source_priority === option.value ? 2 : 1
                }
              ]}
              onPress={() => setSettings(prev => ({...prev, source_priority: option.value}))}
            >
              <View style={styles.priorityContent}>
                <Text style={[styles.priorityTitle, { color: theme.text }]}>
                  {option.label}
                </Text>
                <Text style={[styles.priorityDescription, { color: theme.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              {settings.source_priority === option.value && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Genre Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📝 ジャンル設定
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            優先するジャンルをオンにしてください
          </Text>

          <View style={styles.genreList}>
            {genres.map((genre) => {
              const isPreferred = settings.preferred_genres.includes(genre);
              
              return (
                <View key={genre} style={[styles.genreToggleItem, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.genreToggleTitle, { color: theme.text }]}>
                    {genre}
                  </Text>
                  <Switch
                    value={isPreferred}
                    onValueChange={(value) => {
                      if (value) {
                        // Add to preferred, remove from excluded
                        setSettings(prev => ({
                          ...prev,
                          preferred_genres: [...prev.preferred_genres, genre],
                          excluded_genres: prev.excluded_genres.filter(g => g !== genre)
                        }));
                      } else {
                        // Remove from preferred
                        setSettings(prev => ({
                          ...prev,
                          preferred_genres: prev.preferred_genres.filter(g => g !== genre)
                        }));
                      }
                    }}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={isPreferred ? '#fff' : theme.background}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Reset Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: theme.surface, borderColor: theme.error }]}
            onPress={resetToDefaults}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.error} />
            <Text style={[styles.resetButtonText, { color: theme.error }]}>
              デフォルト設定に戻す
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sliderValueContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  priorityContent: {
    flex: 1,
  },
  priorityTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  priorityDescription: {
    fontSize: 14,
  },
  genreList: {
    gap: 8,
  },
  genreToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  genreToggleTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 32,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});