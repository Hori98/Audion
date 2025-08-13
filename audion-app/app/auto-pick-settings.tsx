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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

interface AutoPickSettings {
  max_articles: number;
  diversity_enabled: boolean;
  max_per_genre: number;
  preferred_genres: string[];
  excluded_genres: string[];
  source_priority: string;
  time_based_filtering: boolean;
  freshness_weight: number;
  popularity_weight: number;
  diversity_weight: number;
  personalization_weight: number;
}

export default function AutoPickSettingsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoPickSettings>({
    max_articles: 5,
    diversity_enabled: true,
    max_per_genre: 2,
    preferred_genres: [],
    excluded_genres: [],
    source_priority: 'balanced',
    time_based_filtering: true,
    freshness_weight: 0.3,
    popularity_weight: 0.2,
    diversity_weight: 0.3,
    personalization_weight: 0.2
  });

  const genres = [
    'Technology', 'Finance', 'Sports', 'Politics', 'Health',
    'Entertainment', 'Science', 'Environment', 'Education', 'Travel', 'General'
  ];

  const sourcePriorityOptions = [
    { value: 'balanced', label: 'バランス型', description: '全ソースから均等に選択' },
    { value: 'popular', label: '人気重視', description: '人気記事を優先' },
    { value: 'recent', label: '最新重視', description: '新しい記事を優先' }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/user/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.auto_pick_settings) {
        setSettings(prevSettings => ({
          ...prevSettings,
          ...response.data.auto_pick_settings
        }));
      }
    } catch (error) {
      console.warn('Error loading auto-pick settings:', error);
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
              max_articles: 5,
              diversity_enabled: true,
              max_per_genre: 2,
              preferred_genres: [],
              excluded_genres: [],
              source_priority: 'balanced',
              time_based_filtering: true,
              freshness_weight: 0.3,
              popularity_weight: 0.2,
              diversity_weight: 0.3,
              personalization_weight: 0.2
            });
          }
        }
      ]
    );
  };

  const toggleGenrePreference = (genre: string, isPreferred: boolean) => {
    if (isPreferred) {
      setSettings(prev => ({
        ...prev,
        preferred_genres: prev.preferred_genres.includes(genre) 
          ? prev.preferred_genres.filter(g => g !== genre)
          : [...prev.preferred_genres, genre],
        excluded_genres: prev.excluded_genres.filter(g => g !== genre)
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        excluded_genres: prev.excluded_genres.includes(genre)
          ? prev.excluded_genres.filter(g => g !== genre)
          : [...prev.excluded_genres, genre],
        preferred_genres: prev.preferred_genres.filter(g => g !== genre)
      }));
    }
  };

  if (loading) {
    return <LoadingIndicator variant="fullscreen" text="設定を読み込み中..." />;
  }

  const styles = createStyles(theme);

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
        {/* Basic Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🎯 基本設定
          </Text>
          
          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              最大記事数: {settings.max_articles}
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              Auto-Pickで選択する記事の最大数 (1-20)
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
                onPress={() => setSettings(prev => ({...prev, max_articles: Math.min(20, prev.max_articles + 1)}))}
              >
                <Ionicons name="add" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              ジャンル別最大数: {settings.max_per_genre}
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              同じジャンルから選択する記事の最大数 (1-10)
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, max_per_genre: Math.max(1, prev.max_per_genre - 1)}))}
              >
                <Ionicons name="remove" size={20} color={theme.primary} />
              </TouchableOpacity>
              <View style={styles.sliderValueContainer}>
                <Text style={[styles.sliderValue, { color: theme.primary }]}>{settings.max_per_genre}</Text>
              </View>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, max_per_genre: Math.min(10, prev.max_per_genre + 1)}))}
              >
                <Ionicons name="add" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <View style={styles.settingHeader}>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  多様性を重視
                </Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  異なるジャンル・ソースから記事を選択
                </Text>
              </View>
              <Switch
                value={settings.diversity_enabled}
                onValueChange={(value) => setSettings(prev => ({...prev, diversity_enabled: value}))}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={settings.diversity_enabled ? '#fff' : theme.background}
              />
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

        {/* Source Priority */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📰 ソース優先度
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

        {/* Algorithm Weights */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            ⚖️ アルゴリズム重み調整
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            記事選定に影響する各要素の重要度を調整できます
          </Text>

          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              新しさ重視: {Math.round(settings.freshness_weight * 100)}%
            </Text>
            <View style={styles.percentSliderContainer}>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, freshness_weight: Math.max(0, prev.freshness_weight - 0.1)}))}
              >
                <Ionicons name="remove" size={16} color={theme.primary} />
              </TouchableOpacity>
              <View style={[styles.percentBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.percentFill, 
                    { backgroundColor: theme.primary, width: `${settings.freshness_weight * 100}%` }
                  ]} 
                />
              </View>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, freshness_weight: Math.min(1, prev.freshness_weight + 0.1)}))}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              人気度重視: {Math.round(settings.popularity_weight * 100)}%
            </Text>
            <View style={styles.percentSliderContainer}>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, popularity_weight: Math.max(0, prev.popularity_weight - 0.1)}))}
              >
                <Ionicons name="remove" size={16} color={theme.primary} />
              </TouchableOpacity>
              <View style={[styles.percentBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.percentFill, 
                    { backgroundColor: theme.primary, width: `${settings.popularity_weight * 100}%` }
                  ]} 
                />
              </View>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, popularity_weight: Math.min(1, prev.popularity_weight + 0.1)}))}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              多様性重視: {Math.round(settings.diversity_weight * 100)}%
            </Text>
            <View style={styles.percentSliderContainer}>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, diversity_weight: Math.max(0, prev.diversity_weight - 0.1)}))}
              >
                <Ionicons name="remove" size={16} color={theme.primary} />
              </TouchableOpacity>
              <View style={[styles.percentBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.percentFill, 
                    { backgroundColor: theme.primary, width: `${settings.diversity_weight * 100}%` }
                  ]} 
                />
              </View>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, diversity_weight: Math.min(1, prev.diversity_weight + 0.1)}))}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              個人化重視: {Math.round(settings.personalization_weight * 100)}%
            </Text>
            <View style={styles.percentSliderContainer}>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, personalization_weight: Math.max(0, prev.personalization_weight - 0.1)}))}
              >
                <Ionicons name="remove" size={16} color={theme.primary} />
              </TouchableOpacity>
              <View style={[styles.percentBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.percentFill, 
                    { backgroundColor: theme.primary, width: `${settings.personalization_weight * 100}%` }
                  ]} 
                />
              </View>
              <TouchableOpacity
                style={[styles.sliderButton, { backgroundColor: theme.surface }]}
                onPress={() => setSettings(prev => ({...prev, personalization_weight: Math.min(1, prev.personalization_weight + 0.1)}))}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Genre Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📝 ジャンル設定
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            優先したいジャンルを緑、除外したいジャンルを赤で選択してください
          </Text>

          <View style={styles.genreGrid}>
            {genres.map((genre) => {
              const isPreferred = settings.preferred_genres.includes(genre);
              const isExcluded = settings.excluded_genres.includes(genre);
              
              return (
                <View key={genre} style={styles.genreItem}>
                  <Text style={[styles.genreTitle, { color: theme.text }]}>{genre}</Text>
                  <View style={styles.genreButtons}>
                    <TouchableOpacity
                      style={[
                        styles.genreButton,
                        { backgroundColor: isPreferred ? theme.success : theme.surface }
                      ]}
                      onPress={() => toggleGenrePreference(genre, true)}
                    >
                      <Ionicons 
                        name="heart" 
                        size={16} 
                        color={isPreferred ? '#fff' : theme.success} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genreButton,
                        { backgroundColor: isExcluded ? theme.error : theme.surface }
                      ]}
                      onPress={() => toggleGenrePreference(genre, false)}
                    >
                      <Ionicons 
                        name="close" 
                        size={16} 
                        color={isExcluded ? '#fff' : theme.error} 
                      />
                    </TouchableOpacity>
                  </View>
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
  percentSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  percentBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  percentFill: {
    height: '100%',
    borderRadius: 4,
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
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreItem: {
    width: '48%',
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  genreTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  genreButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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