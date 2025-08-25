import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PersonalizationService from '../services/PersonalizationService';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

interface GenreData {
  name: string;
  icon: string;
  color: string;
  description: string;
  examples: string[];
  weight: number;
  enabled: boolean;
}

interface UserInsights {
  top_genres: {
    genre: string;
    preference_score: number;
    rank: number;
  }[];
  recent_activity: { [key: string]: number };
  listening_patterns: {
    total_audio_created: number;
    total_listening_time: number;
    average_completion_rate: number;
  };
}

export default function GenrePreferencesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [genres, setGenres] = useState<GenreData[]>([]);
  const [userInsights, setUserInsights] = useState<UserInsights | null>(null);
  const [presetModalVisible, setPresetModalVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const styles = createStyles(theme);

  // Genre configuration with icons and metadata
  const genreConfig: Record<string, Omit<GenreData, 'weight' | 'enabled'>> = {
    'Technology': {
      name: 'Technology',
      icon: 'laptop-outline',
      color: '#3B82F6',
      description: 'Tech news, gadgets, software, AI, and digital innovations',
      examples: ['AI breakthroughs', 'New gadgets', 'Software updates', 'Tech companies']
    },
    'Finance': {
      name: 'Finance', 
      icon: 'trending-up-outline',
      color: '#10B981',
      description: 'Markets, economy, business, investing, and financial trends',
      examples: ['Stock market', 'Economic reports', 'Company earnings', 'Investment advice']
    },
    'Sports': {
      name: 'Sports',
      icon: 'basketball-outline', 
      color: '#F59E0B',
      description: 'Sports news, games, athletes, and competitions',
      examples: ['Game results', 'Player transfers', 'Championships', 'Team analysis']
    },
    'Politics': {
      name: 'Politics',
      icon: 'flag-outline',
      color: '#EF4444',
      description: 'Political news, government, elections, and policy',
      examples: ['Elections', 'Policy changes', 'Government news', 'Political analysis']
    },
    'Health': {
      name: 'Health',
      icon: 'heart-outline',
      color: '#EC4899',
      description: 'Health news, medical research, wellness, and fitness',
      examples: ['Medical breakthroughs', 'Health tips', 'Disease research', 'Wellness trends']
    },
    'Entertainment': {
      name: 'Entertainment',
      icon: 'film-outline',
      color: '#8B5CF6',
      description: 'Movies, TV, music, celebrities, and entertainment industry',
      examples: ['Movie releases', 'Celebrity news', 'Music charts', 'Award shows']
    },
    'Science': {
      name: 'Science',
      icon: 'flask-outline',
      color: '#06B6D4',
      description: 'Scientific discoveries, research, and innovation',
      examples: ['Research findings', 'Space exploration', 'Climate science', 'Discoveries']
    },
    'Environment': {
      name: 'Environment',
      icon: 'leaf-outline',
      color: '#84CC16',
      description: 'Climate change, sustainability, and environmental issues',
      examples: ['Climate news', 'Conservation', 'Green technology', 'Environmental policy']
    },
    'Education': {
      name: 'Education',
      icon: 'school-outline',
      color: '#F97316',
      description: 'Education news, learning, and academic developments',
      examples: ['School policies', 'Learning methods', 'Educational research', 'Academic news']
    },
    'Travel': {
      name: 'Travel',
      icon: 'airplane-outline',
      color: '#14B8A6',
      description: 'Travel news, destinations, and tourism industry',
      examples: ['Travel tips', 'Destination guides', 'Tourism news', 'Travel restrictions']
    },
    'General': {
      name: 'General',
      icon: 'newspaper-outline',
      color: '#6B7280',
      description: 'General news and miscellaneous topics',
      examples: ['Breaking news', 'Local events', 'Community stories', 'Miscellaneous']
    }
  };

  const presets = [
    {
      id: 'balanced',
      name: 'Balanced Explorer',
      description: 'Equal interest in all topics',
      icon: 'balance-outline',
      weights: Object.keys(genreConfig).reduce((acc, genre) => ({ ...acc, [genre]: 1.0 }), {})
    },
    {
      id: 'business',
      name: 'Business Professional', 
      description: 'Focus on business, finance, and technology',
      icon: 'briefcase-outline',
      weights: {
        ...Object.keys(genreConfig).reduce((acc, genre) => ({ ...acc, [genre]: 0.5 }), {}),
        'Finance': 2.0,
        'Technology': 1.5,
        'Politics': 1.2,
        'General': 0.8
      }
    },
    {
      id: 'tech',
      name: 'Tech Enthusiast',
      description: 'Heavy focus on technology and science',
      icon: 'code-outline',
      weights: {
        ...Object.keys(genreConfig).reduce((acc, genre) => ({ ...acc, [genre]: 0.5 }), {}),
        'Technology': 2.0,
        'Science': 1.8,
        'Finance': 1.0,
        'General': 0.6
      }
    },
    {
      id: 'lifestyle',
      name: 'Lifestyle Focused',
      description: 'Health, entertainment, and personal interests',
      icon: 'heart-circle-outline',
      weights: {
        ...Object.keys(genreConfig).reduce((acc, genre) => ({ ...acc, [genre]: 0.6 }), {}),
        'Health': 2.0,
        'Entertainment': 1.8,
        'Travel': 1.5,
        'Environment': 1.2,
        'General': 0.8
      }
    },
    {
      id: 'news',
      name: 'News Focused',
      description: 'Current events and important topics',
      icon: 'newspaper-outline',
      weights: {
        ...Object.keys(genreConfig).reduce((acc, genre) => ({ ...acc, [genre]: 0.7 }), {}),
        'Politics': 1.8,
        'General': 1.6,
        'Finance': 1.4,
        'Environment': 1.2,
        'Entertainment': 0.5,
        'Sports': 0.5
      }
    }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Load both backend and frontend preferences
      const [backendProfileResponse, frontendPreferences] = await Promise.all([
        axios.get(`${API}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        PersonalizationService.loadPreferences()
      ]);
      
      // Get user insights
      let insights = null;
      try {
        const insightsResponse = await axios.get(`${API}/user/insights`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        insights = insightsResponse.data;
      } catch (error) {
        console.warn('Could not fetch user insights:', error);
      }
      
      setUserInsights(insights);
      
      // Merge backend and frontend preferences (backend takes priority)
      const backendProfile = backendProfileResponse.data;
      const backendGenrePreferences = backendProfile.genre_preferences || {};
      const frontendGenrePreferences = frontendPreferences.favoriteCategories || {};
      
      // Create unified genre preferences
      const mergedPreferences: { [key: string]: number } = {};
      Object.keys(genreConfig).forEach(genreName => {
        // Use backend preference if available, fallback to frontend, then default
        mergedPreferences[genreName] = 
          backendGenrePreferences[genreName] || 
          frontendGenrePreferences[genreName] || 
          1.0;
      });
      
      const genreData: GenreData[] = Object.keys(genreConfig).map(genreName => ({
        ...genreConfig[genreName],
        weight: mergedPreferences[genreName],
        enabled: true // All genres enabled by default
      }));
      
      setGenres(genreData);
      
      // Sync frontend preferences with backend if there are differences
      const frontendNeedsUpdate = Object.keys(genreConfig).some(genre => 
        frontendGenrePreferences[genre] !== mergedPreferences[genre]
      );
      
      if (frontendNeedsUpdate) {
        console.log('🔄 Syncing frontend preferences with backend');
        await PersonalizationService.savePreferences({
          ...frontendPreferences,
          favoriteCategories: mergedPreferences
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching genre preferences:', error);
      
      // Try to load from PersonalizationService as fallback
      try {
        const frontendPreferences = await PersonalizationService.loadPreferences();
        const frontendGenrePreferences = frontendPreferences.favoriteCategories || {};
        
        const genreData: GenreData[] = Object.keys(genreConfig).map(genreName => ({
          ...genreConfig[genreName],
          weight: frontendGenrePreferences[genreName] || 1.0,
          enabled: true
        }));
        
        setGenres(genreData);
        console.log('📱 Loaded preferences from PersonalizationService fallback');
        
      } catch (fallbackError) {
        console.error('❌ Fallback failed, using defaults:', fallbackError);
        // Initialize with default genres
        const defaultGenres: GenreData[] = Object.keys(genreConfig).map(genreName => ({
          ...genreConfig[genreName],
          weight: 1.0,
          enabled: true
        }));
        setGenres(defaultGenres);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateGenreWeight = async (genreName: string, sliderValue: number) => {
    setSaving(true);
    try {
      // Convert slider value (0-100) to preference score (0.1-2.0)
      // Clamp sliderValue to ensure it stays within 0-100 range
      const clampedSliderValue = Math.max(0, Math.min(100, sliderValue));
      const weight = Math.round((0.1 + (clampedSliderValue / 100) * 1.9) * 10) / 10;
      
      // Double-check that weight is within valid range
      const clampedWeight = Math.max(0.1, Math.min(2.0, weight));
      
      const newGenrePreferences = genres.reduce((acc, genre) => ({
        ...acc,
        [genre.name]: genre.name === genreName ? clampedWeight : Math.max(0.1, Math.min(2.0, genre.weight))
      }), {});
      
      // Update both backend and frontend preferences in parallel
      await Promise.all([
        // Backend update
        axios.put(`${API}/user/profile`, {
          genre_preferences: newGenrePreferences,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        
        // Frontend PersonalizationService update
        (async () => {
          const currentPreferences = await PersonalizationService.loadPreferences();
          await PersonalizationService.savePreferences({
            ...currentPreferences,
            favoriteCategories: newGenrePreferences
          });
        })()
      ]);
      
      // Update local state
      setGenres(prev => prev.map(genre => 
        genre.name === genreName ? { ...genre, weight: clampedWeight } : genre
      ));
      
      console.log(`✅ Updated ${genreName} preference to ${clampedWeight} (both backend & frontend)`);
      
    } catch (error: any) {
      console.error('Error updating genre weight:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update genre preferences');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    
    setSaving(true);
    try {
      // Update both backend and frontend preferences in parallel
      await Promise.all([
        // Backend update
        axios.put(`${API}/user/profile`, {
          genre_preferences: preset.weights,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        
        // Frontend PersonalizationService update
        (async () => {
          const currentPreferences = await PersonalizationService.loadPreferences();
          await PersonalizationService.savePreferences({
            ...currentPreferences,
            favoriteCategories: preset.weights
          });
        })()
      ]);
      
      // Update local state
      setGenres(prev => prev.map(genre => ({
        ...genre,
        weight: preset.weights[genre.name] || 1.0
      })));
      
      setPresetModalVisible(false);
      Alert.alert('Applied!', `${preset.name} preferences have been applied to both backend and frontend.`);
      
      console.log(`✅ Applied preset "${preset.name}" (both backend & frontend)`);
      
    } catch (error: any) {
      console.error('Error applying preset:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to apply preset');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Preferences',
      'Reset all genre preferences to balanced (1.0x each)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => applyPreset('balanced')
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Genre Preferences</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Genre Preferences</Text>
        <TouchableOpacity
          style={styles.presetButton}
          onPress={() => setPresetModalVisible(true)}
        >
          <Ionicons name="options-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Insights Section */}
        {userInsights && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Reading Patterns</Text>
            <View style={styles.insightsCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <Text style={[styles.insightNumber, { color: theme.primary }]}>
                    {userInsights.listening_patterns?.total_audio_created || 0}
                  </Text>
                  <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Audio Created</Text>
                </View>
                <View style={styles.insightItem}>
                  <Text style={[styles.insightNumber, { color: theme.primary }]}>
                    {Math.round((userInsights.listening_patterns?.average_completion_rate || 0) * 100)}%
                  </Text>
                  <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Avg. Completion</Text>
                </View>
              </View>
              
              {userInsights.top_genres && userInsights.top_genres.length > 0 && (
                <View style={styles.topGenres}>
                  <Text style={[styles.insightTitle, { color: theme.text }]}>Your Top Genres</Text>
                  {userInsights.top_genres.slice(0, 3).map((topGenre, index) => (
                    <View key={topGenre.genre} style={styles.topGenreItem}>
                      <View style={[styles.rankBadge, { backgroundColor: theme.accent }]}>
                        <Text style={[styles.rankText, { color: theme.primary }]}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.topGenreName, { color: theme.text }]}>{topGenre.genre}</Text>
                      <Text style={[styles.topGenreScore, { color: theme.textSecondary }]}>
                        {topGenre.preference_score.toFixed(1)}x
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Genre Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customize Your Interests</Text>
          <Text style={styles.sectionSubtitle}>
            Adjust how much content you want to see from each topic. Higher values mean more content.
          </Text>
          
          <View style={styles.genreGrid}>
            {genres.map((genre) => (
              <View key={genre.name} style={[styles.genreCard, { backgroundColor: theme.card }]}>
                <View style={styles.genreHeader}>
                  <View style={[styles.genreIconContainer, { backgroundColor: genre.color + '20' }]}>
                    <Ionicons 
                      name={genre.icon as any} 
                      size={24} 
                      color={genre.color}
                    />
                  </View>
                  <View style={styles.genreInfo}>
                    <Text style={[styles.genreName, { color: theme.text }]}>{genre.name}</Text>
                    <Text style={[styles.genreWeight, { color: theme.textSecondary }]}>
                      {Math.round(((Math.max(0.1, Math.min(2.0, genre.weight)) - 0.1) / 1.9) * 100)}/100 ({Math.max(0.1, Math.min(2.0, genre.weight)).toFixed(1)}x)
                    </Text>
                  </View>
                </View>

                <Text style={[styles.genreDescription, { color: theme.textSecondary }]}>
                  {genre.description}
                </Text>

                <View style={styles.sliderSection}>
                  <View style={styles.sliderRow}>
                    <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>0</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={100}
                      step={0.5}
                      value={Math.max(0, Math.min(100, ((Math.max(0.1, Math.min(2.0, genre.weight)) - 0.1) / 1.9) * 100))}
                      onValueChange={(sliderValue) => {
                        // Convert slider value to weight for immediate UI update with clamping
                        const clampedSliderValue = Math.max(0, Math.min(100, sliderValue));
                        const weight = Math.round((0.1 + (clampedSliderValue / 100) * 1.9) * 10) / 10;
                        const clampedWeight = Math.max(0.1, Math.min(2.0, weight));
                        setGenres(prev => prev.map(g => 
                          g.name === genre.name ? { ...g, weight: clampedWeight } : g
                        ));
                      }}
                      onSlidingComplete={(sliderValue) => updateGenreWeight(genre.name, sliderValue)}
                      minimumTrackTintColor={genre.color}
                      maximumTrackTintColor={theme.border}
                      thumbTintColor={genre.color}
                      disabled={saving}
                    />
                    <Text style={[styles.sliderLabel, { color: theme.textMuted }]}>100</Text>
                  </View>
                </View>

                <View style={styles.genreExamples}>
                  {genre.examples.slice(0, 2).map((example, index) => (
                    <View key={index} style={[styles.exampleTag, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.exampleText, { color: theme.textMuted }]}>{example}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.savingText, { color: theme.primary }]}>Saving preferences...</Text>
          </View>
        )}

      </ScrollView>

      {/* Preset Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={presetModalVisible}
        onRequestClose={() => setPresetModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setPresetModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Preference Presets</Text>
            <TouchableOpacity
              onPress={resetToDefaults}
              style={styles.resetButton}
            >
              <Ionicons name="refresh-outline" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.presetDescription, { color: theme.textSecondary }]}>
              Choose a preset that matches your interests, or manually adjust individual genres.
            </Text>

            {presets.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetOption,
                  { backgroundColor: theme.card },
                  selectedPreset === preset.id && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => setSelectedPreset(preset.id)}
              >
                <View style={styles.presetLeft}>
                  <View style={[styles.presetIcon, { backgroundColor: theme.accent }]}>
                    <Ionicons 
                      name={preset.icon as any} 
                      size={24} 
                      color={selectedPreset === preset.id ? theme.primary : theme.textMuted}
                    />
                  </View>
                  <View style={styles.presetInfo}>
                    <Text style={[
                      styles.presetName, 
                      { color: selectedPreset === preset.id ? theme.primary : theme.text }
                    ]}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.presetSubtitle, { color: theme.textSecondary }]}>
                      {preset.description}
                    </Text>
                  </View>
                </View>
                {selectedPreset === preset.id && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}

            {selectedPreset && (
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={() => applyPreset(selectedPreset)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.applyButtonText}>Apply Preset</Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  presetButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  insightsCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  insightItem: {
    alignItems: 'center',
  },
  insightNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  topGenres: {
    borderTopWidth: 1,
    borderTopColor: theme.divider,
    paddingTop: 16,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  topGenreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  topGenreName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  topGenreScore: {
    fontSize: 12,
    fontWeight: '500',
  },
  genreGrid: {
    gap: 16,
  },
  genreCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  genreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  genreIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  genreInfo: {
    flex: 1,
  },
  genreName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  genreWeight: {
    fontSize: 13,
    fontWeight: '500',
  },
  genreDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
  },
  sliderSection: {
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'center',
  },
  genreExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  exampleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exampleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalBackButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  presetDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  presetSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  applyButton: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});