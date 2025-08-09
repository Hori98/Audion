import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useScrollPosition } from '../hooks/useScrollPosition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface Source {
  id: string;
  name: string;
  url: string;
  enabled?: boolean;
}

interface GenrePreference {
  name: string;
  enabled: boolean;
  priority: number;
}

interface ScheduleSettings {
  sources: Source[];
  genres: GenrePreference[];
  promptStyle: string;
  customPrompt?: string;
}

export default function ScheduleContentSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  const { scrollViewRef, handleScroll, scrollEventThrottle, restoreScrollPosition } = useScrollPosition({ 
    screenKey: 'schedule-content-settings',
    restoreDelay: 500 // Longer delay for data-heavy page
  });
  
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    sources: [],
    genres: [],
    promptStyle: 'standard',
  });
  
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<any[]>([]);
  const [customPromptModalVisible, setCustomPromptModalVisible] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');
  const [editingCustomPromptId, setEditingCustomPromptId] = useState<string | null>(null);

  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

  const availableGenres = [
    { name: 'Technology', icon: 'hardware-chip-outline' },
    { name: 'Finance', icon: 'trending-up-outline' },
    { name: 'Politics', icon: 'flag-outline' },
    { name: 'Sports', icon: 'football-outline' },
    { name: 'Health', icon: 'fitness-outline' },
    { name: 'Science', icon: 'flask-outline' },
    { name: 'Entertainment', icon: 'musical-notes-outline' },
    { name: 'Environment', icon: 'leaf-outline' },
    { name: 'Education', icon: 'school-outline' },
    { name: 'Travel', icon: 'airplane-outline' },
    { name: 'General', icon: 'newspaper-outline' },
  ];

  const builtInPrompts = [
    { id: 'standard', name: 'Standard', description: 'Balanced approach with comprehensive coverage', icon: 'checkmark-circle-outline', color: theme.primary },
    { id: 'strict', name: 'Strict', description: 'Precise, fact-focused reporting', icon: 'shield-checkmark-outline', color: '#EF4444' },
    { id: 'gentle', name: 'Gentle', description: 'Accessible, conversational tone', icon: 'happy-outline', color: '#10B981' },
    { id: 'insightful', name: 'Insightful', description: 'Deep analysis with context and implications', icon: 'bulb-outline', color: '#F59E0B' }
  ];

  const getAllPrompts = () => {
    return [...builtInPrompts, ...customPrompts.map(prompt => ({
      id: prompt.id,
      name: prompt.name,
      description: 'Custom prompt',
      icon: 'create-outline',
      color: theme.accent,
      isCustom: true
    }))];
  };

  // Custom prompt management functions
  const addCustomPrompt = (name: string, prompt: string) => {
    const newId = `custom_${Date.now()}`;
    const newPrompt = {
      id: newId,
      name,
      description: 'Custom user-created prompt',
      style: prompt,
      type: 'custom',
      prompt
    };
    setCustomPrompts([...customPrompts, newPrompt]);
    saveScheduleSettings({ ...scheduleSettings, promptStyle: newId });
    return newId;
  };

  const editCustomPrompt = (id: string, name: string, prompt: string) => {
    setCustomPrompts(customPrompts.map(p => 
      p.id === id ? { ...p, name, prompt, style: prompt } : p
    ));
    saveScheduleSettings(scheduleSettings);
  };

  const deleteCustomPrompt = (id: string) => {
    setCustomPrompts(customPrompts.filter(p => p.id !== id));
    // If the deleted prompt was selected, switch to standard
    if (scheduleSettings.promptStyle === id) {
      const newSettings = { ...scheduleSettings, promptStyle: 'standard' };
      saveScheduleSettings(newSettings);
    } else {
      saveScheduleSettings(scheduleSettings);
    }
  };

  const openCustomPromptModal = (editingId?: string) => {
    if (editingId) {
      const prompt = customPrompts.find(p => p.id === editingId);
      if (prompt) {
        setCustomPromptText(prompt.prompt);
        setEditingCustomPromptId(editingId);
      }
    } else {
      setCustomPromptText('');
      setEditingCustomPromptId(null);
    }
    setPromptModalVisible(false);
    setTimeout(() => setCustomPromptModalVisible(true), 100);
  };

  const styles = createStyles(theme);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-sync when page becomes focused (user might have changed sources)
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchSources(); // Refresh sources when page is focused
      }
    }, [token])
  );

  // Auto-sync when sources change (detect new/removed sources)
  useEffect(() => {
    if (sources.length > 0 && scheduleSettings.sources.length > 0) {
      autoSyncSources();
    }
  }, [sources.length]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load these individually so one failure doesn't block others
      await loadScheduleSettings();
      await loadCustomPrompts();
      await fetchSources(); // This can fail gracefully
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Continue loading even if some APIs fail
    } finally {
      setLoading(false);
      // Restore scroll position after all data is loaded
      setTimeout(() => {
        restoreScrollPosition();
      }, 200);
    }
  };

  const fetchSources = async () => {
    try {
      const response = await axios.get(`${API}/rss-sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSources(response.data || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
      // Set empty sources array if API fails
      setSources([]);
      // Don't show error alert, just log it
    }
  };

  const loadCustomPrompts = async () => {
    try {
      const stored = await AsyncStorage.getItem('custom_prompts');
      if (stored) {
        setCustomPrompts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading custom prompts:', error);
    }
  };

  const saveCustomPrompts = async (prompts: any[]) => {
    try {
      await AsyncStorage.setItem('custom_prompts', JSON.stringify(prompts));
      setCustomPrompts(prompts);
    } catch (error) {
      console.error('Error saving custom prompts:', error);
    }
  };

  const loadScheduleSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('schedule_content_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        setScheduleSettings(settings);
      } else {
        // Initialize with default settings
        const defaultGenres = availableGenres.map((genre, index) => ({
          name: genre.name,
          enabled: index < 3, // Enable first 3 genres by default
          priority: index + 1,
        }));
        setScheduleSettings(prev => ({
          ...prev,
          genres: defaultGenres,
        }));
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    }
  };

  const saveScheduleSettings = async (newSettings: ScheduleSettings) => {
    try {
      await AsyncStorage.setItem('schedule_content_settings', JSON.stringify(newSettings));
      setScheduleSettings(newSettings);
      // Also save custom prompts when settings are saved
      await saveCustomPrompts(customPrompts);
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSource = (sourceId: string) => {
    const updatedSources = scheduleSettings.sources.map(source =>
      source.id === sourceId ? { ...source, enabled: !source.enabled } : source
    );
    
    const newSettings = { ...scheduleSettings, sources: updatedSources };
    saveScheduleSettings(newSettings);
  };

  const toggleGenre = (genreName: string) => {
    const updatedGenres = scheduleSettings.genres.map(genre =>
      genre.name === genreName ? { ...genre, enabled: !genre.enabled } : genre
    );
    
    const newSettings = { ...scheduleSettings, genres: updatedGenres };
    saveScheduleSettings(newSettings);
  };

  const syncWithGlobalSources = () => {
    const updatedSources = sources.map(source => {
      const existingSetting = scheduleSettings.sources.find(s => s.id === source.id);
      return {
        ...source,
        enabled: existingSetting?.enabled ?? true, // Default to enabled
      };
    });

    const newSettings = { ...scheduleSettings, sources: updatedSources };
    saveScheduleSettings(newSettings);
    Alert.alert('Success', 'Sources synchronized successfully!');
  };

  const autoSyncSources = () => {
    const currentSourceIds = sources.map(s => s.id);
    const scheduleSourceIds = scheduleSettings.sources.map(s => s.id);
    
    // Check for new sources (added in RSS sources)
    const newSources = sources.filter(source => !scheduleSourceIds.includes(source.id));
    
    // Check for removed sources (deleted from RSS sources)
    const validScheduleSources = scheduleSettings.sources.filter(scheduledSource => 
      currentSourceIds.includes(scheduledSource.id)
    );

    // If there are changes, update automatically
    if (newSources.length > 0 || validScheduleSources.length !== scheduleSettings.sources.length) {
      const updatedSources = [
        ...validScheduleSources,
        ...newSources.map(source => ({
          ...source,
          enabled: true, // New sources default to enabled
        }))
      ];

      const newSettings = { ...scheduleSettings, sources: updatedSources };
      saveScheduleSettings(newSettings);
      
      console.log(`Auto-synced: +${newSources.length} new sources, -${scheduleSettings.sources.length - validScheduleSources.length} removed sources`);
    }
  };

  const getPromptDisplayName = () => {
    const allPrompts = getAllPrompts();
    const prompt = allPrompts.find(p => p.id === scheduleSettings.promptStyle);
    return prompt?.name || 'Standard';
  };

  const selectPromptStyle = (styleId: string) => {
    const newSettings = { ...scheduleSettings, promptStyle: styleId };
    saveScheduleSettings(newSettings);
    setPromptModalVisible(false);
  };

  const enabledSourcesCount = scheduleSettings.sources.filter(s => s.enabled).length;
  const enabledGenresCount = scheduleSettings.genres.filter(g => g.enabled).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Content Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        
        {/* Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: theme.card }]}>
          <View style={styles.overviewHeader}>
            <View style={[styles.overviewIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="calendar-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.overviewInfo}>
              <Text style={[styles.overviewTitle, { color: theme.text }]}>Scheduled Content Configuration</Text>
              <Text style={[styles.overviewSubtitle, { color: theme.textSecondary }]}>
                Content preferences for automated scheduled podcast creation
              </Text>
            </View>
          </View>
          
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{enabledSourcesCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sources</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{enabledGenresCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Genres</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>1</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Style</Text>
            </View>
          </View>
        </View>

        {/* News Sources Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>News Sources</Text>
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: theme.primary }]}
              onPress={syncWithGlobalSources}
            >
              <Ionicons name="sync" size={16} color="#FFFFFF" />
              <Text style={styles.syncButtonText}>
                Sync ({sources.length})
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Select which RSS sources to include in scheduled content generation
          </Text>

          <View style={styles.sourcesList}>
            {scheduleSettings.sources.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.accent }]}>
                <Ionicons name="newspaper-outline" size={32} color={theme.textMuted} />
                <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>
                  No sources configured. Add sources in Feed & Auto-Pick Settings first.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                  onPress={() => router.push('/feed-autopick-settings')}
                >
                  <Text style={styles.emptyStateButtonText}>Add Sources</Text>
                </TouchableOpacity>
              </View>
            ) : (
              scheduleSettings.sources.map((source) => (
                <View key={source.id} style={[styles.sourceItem, { backgroundColor: theme.card }]}>
                  <View style={styles.sourceInfo}>
                    <View style={[styles.sourceIcon, { backgroundColor: source.enabled ? theme.primary + '20' : theme.accent }]}>
                      <Ionicons 
                        name="newspaper-outline" 
                        size={20} 
                        color={source.enabled ? theme.primary : theme.textMuted} 
                      />
                    </View>
                    <View style={styles.sourceDetails}>
                      <Text style={[styles.sourceName, { color: theme.text }]}>{source.name}</Text>
                      <Text style={[styles.sourceUrl, { color: theme.textSecondary }]} numberOfLines={1}>
                        {source.url}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={source.enabled}
                    onValueChange={() => toggleSource(source.id)}
                    trackColor={{ false: theme.textMuted, true: theme.primary + '40' }}
                    thumbColor={source.enabled ? theme.primary : '#f4f3f4'}
                  />
                </View>
              ))
            )}
          </View>
        </View>

        {/* Genre Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Genre Preferences</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Choose content categories to focus on for scheduled podcasts
          </Text>

          <View style={styles.genreGrid}>
            {scheduleSettings.genres.map((genre) => {
              const genreInfo = availableGenres.find(g => g.name === genre.name);
              return (
                <TouchableOpacity
                  key={genre.name}
                  style={[
                    styles.genreItem,
                    {
                      backgroundColor: genre.enabled ? theme.primary + '20' : theme.card,
                      borderColor: genre.enabled ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => toggleGenre(genre.name)}
                >
                  <Ionicons
                    name={genreInfo?.icon as any || 'folder-outline'}
                    size={24}
                    color={genre.enabled ? theme.primary : theme.textMuted}
                  />
                  <Text style={[
                    styles.genreText,
                    { color: genre.enabled ? theme.primary : theme.text }
                  ]}>
                    {genre.name}
                  </Text>
                  {genre.enabled && (
                    <View style={[styles.genreBadge, { backgroundColor: theme.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Script Style Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Script Style</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Choose how the AI should present and format the scheduled content
          </Text>

          <TouchableOpacity
            style={[styles.styleSelector, { backgroundColor: theme.card }]}
            onPress={() => setPromptModalVisible(true)}
          >
            <View style={styles.styleSelectorContent}>
              <View style={[styles.styleSelectorIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="create-outline" size={24} color={theme.primary} />
              </View>
              <View style={styles.styleSelectorInfo}>
                <Text style={[styles.styleSelectorTitle, { color: theme.text }]}>
                  Current Style: {getPromptDisplayName()}
                </Text>
                <Text style={[styles.styleSelectorSubtitle, { color: theme.textSecondary }]}>
                  Tap to change script generation style
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Prompt Style Modal */}
      <Modal
        visible={promptModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPromptModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setPromptModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Script Style</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Choose how the AI should generate scheduled content
            </Text>
            
            <View style={styles.promptStylesContainer}>
              {getAllPrompts().map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.promptStyleOption,
                    {
                      backgroundColor: scheduleSettings.promptStyle === style.id ? style.color + '20' : theme.accent,
                      borderColor: scheduleSettings.promptStyle === style.id ? style.color : 'transparent',
                      borderWidth: scheduleSettings.promptStyle === style.id ? 2 : 0,
                    }
                  ]}
                  onPress={() => selectPromptStyle(style.id)}
                >
                  <View style={styles.promptStyleOptionContent}>
                    <Ionicons
                      name={style.icon}
                      size={24}
                      color={style.color}
                      style={styles.promptStyleIcon}
                    />
                    <View style={styles.promptStyleTextContainer}>
                      <Text style={[styles.promptStyleName, { color: theme.text }]}>
                        {style.name}
                      </Text>
                      <Text style={[styles.promptStyleDescription, { color: theme.textSecondary }]}>
                        {style.description}
                      </Text>
                    </View>
                    <View style={styles.promptActions}>
                      {style.isCustom && (
                        <>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              openCustomPromptModal(style.id);
                            }}
                            style={styles.promptActionButton}
                          >
                            <Ionicons name="create-outline" size={20} color={theme.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              Alert.alert(
                                'Delete Custom Prompt',
                                `Are you sure you want to delete "${style.name}"?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: () => deleteCustomPrompt(style.id) }
                                ]
                              );
                            }}
                            style={styles.promptActionButton}
                          >
                            <Ionicons name="trash-outline" size={20} color={theme.error} />
                          </TouchableOpacity>
                        </>
                      )}
                      {scheduleSettings.promptStyle === style.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={style.color}
                          style={styles.promptStyleCheckmark}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* Add Custom Prompt Button */}
              <TouchableOpacity
                style={[styles.addCustomPromptButton, { backgroundColor: theme.accent }]}
                onPress={() => openCustomPromptModal()}
              >
                <Ionicons name="add" size={24} color={theme.primary} />
                <Text style={[styles.addCustomPromptText, { color: theme.primary }]}>
                  オリジナルプロンプトを作成
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Custom Prompt Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={customPromptModalVisible}
        onRequestClose={() => setCustomPromptModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setCustomPromptModalVisible(false);
                setTimeout(() => setPromptModalVisible(true), 100);
              }}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingCustomPromptId ? 'Edit Custom Prompt' : 'Create Custom Prompt'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (customPromptText.trim()) {
                  const promptName = `Custom Prompt ${customPrompts.length + 1}`;
                  if (editingCustomPromptId) {
                    editCustomPrompt(editingCustomPromptId, promptName, customPromptText.trim());
                  } else {
                    const newId = addCustomPrompt(promptName, customPromptText.trim());
                  }
                  setCustomPromptModalVisible(false);
                  setTimeout(() => setPromptModalVisible(true), 100);
                  Alert.alert('Success', editingCustomPromptId ? 'Custom prompt updated!' : 'Custom prompt created!');
                }
              }}
              style={styles.saveButton}
            >
              <Text style={[styles.saveButtonText, { color: theme.primary }]}>
                {editingCustomPromptId ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.customPromptSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Prompt Instructions</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Write your custom instructions for how the AI should generate and present the scheduled content.
              </Text>
              
              <View style={[styles.textInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.customPromptInput, { color: theme.text }]}
                  value={customPromptText}
                  onChangeText={setCustomPromptText}
                  placeholder="Enter your custom prompt instructions here..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
              </View>
              
              <Text style={[styles.promptTip, { color: theme.textMuted }]}>
                Tip: Be specific about tone, style, length, and any special formatting you want for your scheduled podcasts.
              </Text>
            </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  overviewCard: {
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  overviewInfo: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sourcesList: {
    gap: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceDetails: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  sourceUrl: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreItem: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '30%',
    position: 'relative',
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  genreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleSelector: {
    borderRadius: 12,
    padding: 16,
  },
  styleSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  styleSelectorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  styleSelectorInfo: {
    flex: 1,
  },
  styleSelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  styleSelectorSubtitle: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  promptStylesContainer: {
    gap: 12,
  },
  promptStyleOption: {
    borderRadius: 12,
    padding: 16,
  },
  promptStyleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptStyleIcon: {
    marginRight: 16,
  },
  promptStyleTextContainer: {
    flex: 1,
  },
  promptStyleName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  promptStyleDescription: {
    fontSize: 14,
  },
  promptStyleCheckmark: {
    marginLeft: 12,
  },
  promptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promptActionButton: {
    padding: 4,
  },
  addCustomPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  addCustomPromptText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customPromptSection: {
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  textInputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  customPromptInput: {
    fontSize: 16,
    lineHeight: 22,
    padding: 16,
    minHeight: 120,
  },
  promptTip: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});