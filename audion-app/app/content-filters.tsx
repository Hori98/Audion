import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

interface ContentFilter {
  id: string;
  name: string;
  description: string;
  type: 'keyword' | 'source' | 'genre' | 'length' | 'sentiment' | 'content_type';
  enabled: boolean;
  value: string | number | boolean;
  icon: string;
}

interface FilterCategory {
  title: string;
  description: string;
  filters: ContentFilter[];
}

export default function ContentFiltersScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>([]);
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  const styles = createStyles(theme);

  useEffect(() => {
    loadContentFilters();
  }, []);

  const loadContentFilters = async () => {
    try {
      setLoading(true);
      
      // Try to load user's filter preferences
      try {
        const response = await axios.get(`${API}/user/content-filters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const userFilters = response.data;
        setBlockedKeywords(userFilters.blocked_keywords || []);
        
        // Update filter categories with user preferences
        setFilterCategories(getDefaultFilterCategories(userFilters));
        
      } catch (error) {
        // If endpoint doesn't exist yet, use defaults
        console.log('Content filters endpoint not available, using defaults');
        setFilterCategories(getDefaultFilterCategories({}));
      }
      
    } catch (error) {
      console.error('Error loading content filters:', error);
      setFilterCategories(getDefaultFilterCategories({}));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultFilterCategories = (userPrefs: any): FilterCategory[] => [
    {
      title: 'Content Safety',
      description: 'Filter potentially sensitive or inappropriate content',
      filters: [
        {
          id: 'violence_filter',
          name: 'Violence & Crime',
          description: 'Filter articles about violence, crime, and disturbing events',
          type: 'content_type',
          enabled: userPrefs.violence_filter || false,
          value: true,
          icon: 'shield-outline'
        },
        {
          id: 'explicit_filter',
          name: 'Explicit Content',
          description: 'Filter articles with explicit language or adult content',
          type: 'content_type',
          enabled: userPrefs.explicit_filter || false,
          value: true,
          icon: 'eye-off-outline'
        },
        {
          id: 'political_bias_filter',
          name: 'Highly Partisan Content',
          description: 'Filter heavily biased political content',
          type: 'content_type',
          enabled: userPrefs.political_bias_filter || false,
          value: true,
          icon: 'balance-outline'
        }
      ]
    },
    {
      title: 'Content Quality',
      description: 'Filter based on article quality and reliability',
      filters: [
        {
          id: 'clickbait_filter',
          name: 'Clickbait Headlines',
          description: 'Filter sensationalized or clickbait articles',
          type: 'content_type',
          enabled: userPrefs.clickbait_filter || false,
          value: true,
          icon: 'warning-outline'
        },
        {
          id: 'min_word_count',
          name: 'Minimum Article Length',
          description: 'Only show articles with at least this many words',
          type: 'length',
          enabled: userPrefs.min_word_count_enabled || false,
          value: userPrefs.min_word_count || 200,
          icon: 'document-text-outline'
        },
        {
          id: 'source_reliability',
          name: 'High-Quality Sources Only',
          description: 'Prioritize articles from reliable, established sources',
          type: 'source',
          enabled: userPrefs.source_reliability || false,
          value: true,
          icon: 'checkmark-circle-outline'
        }
      ]
    },
    {
      title: 'Content Preferences',
      description: 'Customize what types of content you see',
      filters: [
        {
          id: 'breaking_news_only',
          name: 'Breaking News Priority',
          description: 'Prioritize recent breaking news over older articles',
          type: 'content_type',
          enabled: userPrefs.breaking_news_only || false,
          value: true,
          icon: 'flash-outline'
        },
        {
          id: 'local_news_filter',
          name: 'Include Local News',
          description: 'Show local and regional news content',
          type: 'genre',
          enabled: userPrefs.local_news_filter !== false,
          value: true,
          icon: 'location-outline'
        },
        {
          id: 'opinion_pieces',
          name: 'Opinion & Editorial',
          description: 'Include opinion pieces and editorial content',
          type: 'content_type',
          enabled: userPrefs.opinion_pieces !== false,
          value: true,
          icon: 'chatbox-outline'
        }
      ]
    },
    {
      title: 'Advanced Filters',
      description: 'Advanced content filtering options',
      filters: [
        {
          id: 'duplicate_filter',
          name: 'Remove Duplicates',
          description: 'Filter out duplicate or very similar articles',
          type: 'content_type',
          enabled: userPrefs.duplicate_filter !== false,
          value: true,
          icon: 'copy-outline'
        },
        {
          id: 'sentiment_neutral',
          name: 'Balanced Sentiment',
          description: 'Balance negative, neutral, and positive content',
          type: 'sentiment',
          enabled: userPrefs.sentiment_neutral || false,
          value: true,
          icon: 'happy-outline'
        },
        {
          id: 'max_age_hours',
          name: 'Article Freshness',
          description: 'Only show articles newer than this many hours',
          type: 'length',
          enabled: userPrefs.max_age_hours_enabled || false,
          value: userPrefs.max_age_hours || 24,
          icon: 'time-outline'
        }
      ]
    }
  ];

  const updateFilter = async (filterId: string, enabled: boolean, value?: any) => {
    setSaving(true);
    try {
      // Update local state immediately
      setFilterCategories(prev => 
        prev.map(category => ({
          ...category,
          filters: category.filters.map(filter => 
            filter.id === filterId 
              ? { ...filter, enabled, value: value !== undefined ? value : filter.value }
              : filter
          )
        }))
      );

      // Prepare filter data for backend
      const allFilters: any = {};
      filterCategories.forEach(category => {
        category.filters.forEach(filter => {
          if (filter.id === filterId) {
            allFilters[filter.id] = enabled;
            if (value !== undefined) {
              allFilters[`${filter.id}_value`] = value;
            }
          } else {
            allFilters[filter.id] = filter.enabled;
            if (filter.type === 'length') {
              allFilters[`${filter.id}_value`] = filter.value;
            }
          }
        });
      });

      allFilters.blocked_keywords = blockedKeywords;

      // Try to save to backend
      try {
        await axios.put(`${API}/user/content-filters`, allFilters, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.log('Content filters endpoint not available, saving locally only');
      }

    } catch (error) {
      console.error('Error updating filter:', error);
      Alert.alert('Error', 'Failed to update content filter');
    } finally {
      setSaving(false);
    }
  };

  const addBlockedKeyword = async () => {
    if (!newKeyword.trim()) return;
    
    const keyword = newKeyword.trim().toLowerCase();
    if (blockedKeywords.includes(keyword)) {
      Alert.alert('Duplicate', 'This keyword is already in your blocked list');
      return;
    }

    const updatedKeywords = [...blockedKeywords, keyword];
    setBlockedKeywords(updatedKeywords);
    setNewKeyword('');
    
    await saveBlockedKeywords(updatedKeywords);
  };

  const removeBlockedKeyword = async (keyword: string) => {
    const updatedKeywords = blockedKeywords.filter(k => k !== keyword);
    setBlockedKeywords(updatedKeywords);
    await saveBlockedKeywords(updatedKeywords);
  };

  const saveBlockedKeywords = async (keywords: string[]) => {
    try {
      await axios.put(`${API}/user/content-filters`, {
        blocked_keywords: keywords
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.log('Saving blocked keywords locally only');
    }
  };

  const resetFilters = () => {
    Alert.alert(
      'Reset Filters',
      'Reset all content filters to default settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setFilterCategories(getDefaultFilterCategories({}));
            setBlockedKeywords([]);
            try {
              await axios.delete(`${API}/user/content-filters`, {
                headers: { Authorization: `Bearer ${token}` },
              });
            } catch (error) {
              console.log('Reset filters locally only');
            }
          }
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
          <Text style={styles.headerTitle}>Content Filters</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading filters...</Text>
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
        <Text style={styles.headerTitle}>Content Filters</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetFilters}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Blocked Keywords Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Keywords</Text>
          <Text style={styles.sectionSubtitle}>
            Articles containing these keywords will be filtered out
          </Text>
          
          <View style={styles.keywordInput}>
            <TextInput
              style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Add keyword to block..."
              placeholderTextColor={theme.textMuted}
              value={newKeyword}
              onChangeText={setNewKeyword}
              onSubmitEditing={addBlockedKeyword}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={addBlockedKeyword}
              disabled={!newKeyword.trim()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.keywordTags}>
            {blockedKeywords.map((keyword, index) => (
              <View key={index} style={[styles.keywordTag, { backgroundColor: theme.accent }]}>
                <Text style={[styles.keywordText, { color: theme.text }]}>{keyword}</Text>
                <TouchableOpacity
                  onPress={() => removeBlockedKeyword(keyword)}
                  style={styles.removeKeywordButton}
                >
                  <Ionicons name="close" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Filter Categories */}
        {filterCategories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <Text style={styles.sectionSubtitle}>{category.description}</Text>
            
            <View style={styles.filterGrid}>
              {category.filters.map((filter) => (
                <View key={filter.id} style={[styles.filterCard, { backgroundColor: theme.card }]}>
                  <View style={styles.filterHeader}>
                    <View style={[styles.filterIconContainer, { backgroundColor: filter.enabled ? theme.primary + '20' : theme.accent }]}>
                      <Ionicons 
                        name={filter.icon as any} 
                        size={20} 
                        color={filter.enabled ? theme.primary : theme.textMuted}
                      />
                    </View>
                    <Switch
                      value={filter.enabled}
                      onValueChange={(enabled) => updateFilter(filter.id, enabled)}
                      trackColor={{ false: theme.border, true: theme.primary + '40' }}
                      thumbColor={filter.enabled ? theme.primary : theme.textMuted}
                      disabled={saving}
                    />
                  </View>

                  <Text style={[styles.filterName, { color: theme.text }]}>{filter.name}</Text>
                  <Text style={[styles.filterDescription, { color: theme.textSecondary }]}>
                    {filter.description}
                  </Text>

                  {/* Number input for length-based filters */}
                  {filter.type === 'length' && filter.enabled && (
                    <View style={styles.numberInputContainer}>
                      <TextInput
                        style={[styles.numberInput, { 
                          color: theme.text, 
                          borderColor: theme.border,
                          backgroundColor: theme.background 
                        }]}
                        value={String(filter.value)}
                        onChangeText={(text) => {
                          const value = parseInt(text) || 0;
                          updateFilter(filter.id, filter.enabled, value);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.savingText, { color: theme.primary }]}>Saving filters...</Text>
          </View>
        )}

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
  resetButton: {
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
  keywordInput: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keywordTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 4,
  },
  keywordText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  removeKeywordButton: {
    padding: 2,
  },
  filterGrid: {
    gap: 16,
  },
  filterCard: {
    borderRadius: 12,
    padding: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  filterDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  numberInputContainer: {
    marginTop: 12,
  },
  numberInput: {
    height: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 14,
    textAlign: 'center',
    width: 80,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});