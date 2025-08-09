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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

interface SettingItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  type: 'toggle' | 'navigation' | 'selection' | 'info';
  value?: any;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

interface SettingCategory {
  title: string;
  description: string;
  items: SettingItem[];
}

export default function FeedAutoPickSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Schedule interface
  interface ScheduleItem {
    id: string;
    time: string;
    enabled: boolean;
  }

  // Feed & Auto-Pick Settings State
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    { id: '1', time: '08:00', enabled: true }
  ]);
  const [scheduleCount, setScheduleCount] = useState(3);
  const [autoPlay, setAutoPlay] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleManagementModalVisible, setScheduleManagementModalVisible] = useState(false);
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('standard');
  const [customPrompts, setCustomPrompts] = useState<any[]>([]);
  const [customPromptModalVisible, setCustomPromptModalVisible] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');
  const [editingCustomPromptId, setEditingCustomPromptId] = useState<string | null>(null);
  
  // Get enabled schedules for display
  const enabledSchedules = schedules.filter(s => s.enabled);
  const maxSchedules = 3; // For now, will be dynamic based on subscription later

  const styles = createStyles(theme);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await AsyncStorage.getItem('feed_autopick_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setScheduleEnabled(parsed.scheduleEnabled || false);
        
        // Load schedules array, fallback to legacy single schedule
        if (parsed.schedules && Array.isArray(parsed.schedules)) {
          setSchedules(parsed.schedules);
        } else if (parsed.scheduleTime) {
          // Legacy single schedule migration
          setSchedules([{ id: '1', time: parsed.scheduleTime, enabled: true }]);
        }
        
        setScheduleCount(parsed.scheduleCount || 3);
        setAutoPlay(parsed.autoPlay !== false);
        setPushNotifications(parsed.pushNotifications !== false);
        setSelectedPrompt(parsed.selectedPrompt || 'standard');
        setCustomPrompts(parsed.customPrompts || []);
      }
    } catch (error) {
      console.error('Error loading feed/auto-pick settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const settings = {
        scheduleEnabled,
        schedules,
        scheduleCount,
        autoPlay,
        pushNotifications,
        selectedPrompt,
        customPrompts,
      };
      await AsyncStorage.setItem('feed_autopick_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Helper functions for schedule management
  const addSchedule = () => {
    if (schedules.length >= maxSchedules) {
      Alert.alert('Limit Reached', `You can have up to ${maxSchedules} schedules. Upgrade your plan for more.`);
      return;
    }
    
    const newId = (Math.max(...schedules.map(s => parseInt(s.id)), 0) + 1).toString();
    const newSchedule = { id: newId, time: '09:00', enabled: true };
    setSchedules([...schedules, newSchedule]);
    saveSettings();
  };

  const updateSchedule = (id: string, time: string) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, time } : s));
    saveSettings();
  };

  const editScheduleTime = (id: string) => {
    setEditingScheduleId(id);
    setScheduleManagementModalVisible(false);
    setTimeout(() => setTimePickerVisible(true), 100);
  };

  const toggleSchedule = (id: string) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    saveSettings();
  };

  const removeSchedule = (id: string) => {
    if (schedules.length <= 1) {
      Alert.alert('Cannot Remove', 'You must have at least one schedule.');
      return;
    }
    setSchedules(schedules.filter(s => s.id !== id));
    saveSettings();
  };

  // Unified prompt system
  const getPromptDisplayName = () => {
    // Check if it's a custom prompt
    const customPrompt = customPrompts.find(p => p.id === selectedPrompt);
    if (customPrompt) return customPrompt.name;
    
    const builtInPrompts: Record<string, string> = {
      'standard': '標準（Standard）',
      'strict': '厳格（Strict）',
      'gentle': '優しめ（Gentle）',
      'insightful': 'インサイト提供（Insightful）'
    };
    return builtInPrompts[selectedPrompt] || '標準（Standard）';
  };

  const getAllPrompts = () => {
    const builtInPrompts = [
      {
        id: 'standard',
        name: '標準 (Standard)',
        description: 'バランスの取れた一般的なニュース解説スタイル',
        style: 'Clear and balanced news commentary',
        type: 'builtin'
      },
      {
        id: 'strict',
        name: '厳格 (Strict)',
        description: '事実重視で客観的な報道スタイル',
        style: 'Fact-focused and objective reporting',
        type: 'builtin'
      },
      {
        id: 'gentle',
        name: '優しめ (Gentle)',
        description: '親しみやすく理解しやすい解説スタイル',
        style: 'Friendly and accessible explanations',
        type: 'builtin'
      },
      {
        id: 'insightful',
        name: 'インサイト提供 (Insightful)',
        description: '深い分析と洞察を含む専門的な解説',
        style: 'Deep analysis with professional insights',
        type: 'builtin'
      }
    ];
    return [...builtInPrompts, ...customPrompts];
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
    saveSettings();
    return newId;
  };

  const editCustomPrompt = (id: string, name: string, prompt: string) => {
    setCustomPrompts(customPrompts.map(p => 
      p.id === id ? { ...p, name, prompt, style: prompt } : p
    ));
    saveSettings();
  };

  const deleteCustomPrompt = (id: string) => {
    setCustomPrompts(customPrompts.filter(p => p.id !== id));
    // If the deleted prompt was selected, switch to standard
    if (selectedPrompt === id) {
      setSelectedPrompt('standard');
    }
    saveSettings();
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

  const settingCategories: SettingCategory[] = [
    {
      title: 'Content Sources & Discovery',
      description: 'Manage your news sources and content discovery',
      items: [
        {
          id: 'rss-sources',
          title: 'RSS News Sources',
          subtitle: 'Add and manage RSS feeds',
          icon: 'radio-outline',
          type: 'navigation',
          onPress: () => router.push('/sources')
        },
        {
          id: 'genre-preferences',
          title: 'Genre Preferences',
          subtitle: 'Customize content categories and weights',
          icon: 'heart-outline',
          type: 'navigation',
          onPress: () => router.push('/genre-preferences')
        },
        {
          id: 'content-filters',
          title: 'Content Filters',
          subtitle: 'Block unwanted topics and keywords',
          icon: 'funnel-outline',
          type: 'navigation',
          onPress: () => router.push('/content-filters')
        }
      ]
    },
    {
      title: 'Auto-Pick Configuration',
      description: 'Automatic content selection and audio generation',
      items: [
        {
          id: 'schedule-enabled',
          title: 'Daily Auto-Generation',
          subtitle: 'Automatically create daily podcast episodes',
          icon: 'time-outline',
          type: 'toggle',
          value: scheduleEnabled,
          onToggle: (value: boolean) => {
            setScheduleEnabled(value);
            setTimeout(() => saveSettings(), 100);
          }
        },
        {
          id: 'schedule-time',
          title: 'Generation Schedule',
          subtitle: enabledSchedules.length === 0 
            ? 'No active schedules'
            : enabledSchedules.length === 1
              ? `Daily at ${formatTime(enabledSchedules[0].time)} (Active)`
              : `${enabledSchedules.length} active schedules (${formatTime(enabledSchedules[0].time)}${enabledSchedules.length > 1 ? ' +' + (enabledSchedules.length - 1) + ' more' : ''})`,
          icon: 'alarm-outline',
          type: 'navigation',
          onPress: () => setScheduleManagementModalVisible(true)
        },
        {
          id: 'article-count',
          title: 'Articles Per Episode',
          subtitle: `${scheduleCount} articles selected per auto-generated episode`,
          icon: 'document-duplicate-outline',
          type: 'selection',
          value: scheduleCount,
          onPress: () => {
            Alert.alert(
              'Articles Per Episode',
              'How many articles should be included in each auto-generated episode?',
              [
                { text: '1 Article', onPress: () => { setScheduleCount(1); setTimeout(() => saveSettings(), 100); } },
                { text: '3 Articles', onPress: () => { setScheduleCount(3); setTimeout(() => saveSettings(), 100); } },
                { text: '5 Articles', onPress: () => { setScheduleCount(5); setTimeout(() => saveSettings(), 100); } },
                { text: '7 Articles', onPress: () => { setScheduleCount(7); setTimeout(() => saveSettings(), 100); } },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        },
        {
          id: 'script-style',
          title: 'AI Script Style',
          subtitle: `Current: ${getPromptDisplayName()}`,
          icon: 'document-text-outline',
          type: 'navigation',
          onPress: () => setPromptModalVisible(true)
        }
      ]
    },
    {
      title: 'Scheduled Content Creation',
      description: 'Custom content creation for specific times with personalized preferences',
      items: [
        {
          id: 'schedule-sources',
          title: 'Custom News Sources',
          subtitle: 'Select specific RSS sources for scheduled content',
          icon: 'newspaper-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Custom source selection for schedules will be available soon');
          }
        },
        {
          id: 'schedule-genres',
          title: 'Custom Genre Preferences',
          subtitle: 'Set specific content categories for each schedule',
          icon: 'library-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Custom genre preferences for schedules will be available soon');
          }
        },
        {
          id: 'schedule-prompts',
          title: 'Script Style',
          subtitle: `Current: ${getPromptDisplayName()}`,
          icon: 'create-outline',
          type: 'navigation',
          onPress: () => setPromptModalVisible(true)
        },
        {
          id: 'schedule-templates',
          title: 'Content Templates',
          subtitle: 'Pre-configured templates for different use cases',
          icon: 'copy-outline',
          type: 'navigation',
          onPress: () => {
            Alert.alert('Coming Soon', 'Content templates will be available soon');
          }
        }
      ]
    },
    {
      title: 'Playback & Auto-Play',
      description: 'Control automatic playback behavior',
      items: [
        {
          id: 'auto-play-next',
          title: 'Auto-Play Next Episode',
          subtitle: 'Automatically play the next episode in queue',
          icon: 'play-forward-outline',
          type: 'toggle',
          value: autoPlay,
          onToggle: (value: boolean) => {
            setAutoPlay(value);
            setTimeout(() => saveSettings(), 100);
          }
        },
        {
          id: 'playback-controls',
          title: 'Advanced Playback Controls',
          subtitle: 'Speed, skip, repeat, and gesture controls',
          icon: 'play-circle-outline',
          type: 'navigation',
          onPress: () => router.push('/playback-controls')
        }
      ]
    },
    {
      title: 'Notifications & Alerts',
      description: 'Stay updated with content and generation status',
      items: [
        {
          id: 'push-notifications',
          title: 'Push Notifications',
          subtitle: 'Get notified when new episodes are ready',
          icon: 'notifications-outline',
          type: 'toggle',
          value: pushNotifications,
          onToggle: (value: boolean) => {
            setPushNotifications(value);
            setTimeout(() => saveSettings(), 100);
          }
        },
        {
          id: 'notification-settings',
          title: 'Notification Preferences',
          subtitle: 'Customize when and how you receive alerts',
          icon: 'settings-outline',
          type: 'navigation',
          onPress: () => router.push('/notification-settings')
        }
      ]
    }
  ];



  const renderSettingItem = (item: SettingItem) => {
    switch (item.type) {
      case 'toggle':
        return (
          <View key={item.id} style={[styles.settingCard, { backgroundColor: theme.card }]}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: item.value ? theme.primary + '20' : theme.accent }]}>
                <Ionicons 
                  name={item.icon as any} 
                  size={20} 
                  color={item.value ? theme.primary : theme.textMuted}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onToggle}
                trackColor={{ false: theme.border, true: theme.primary + '40' }}
                thumbColor={item.value ? theme.primary : theme.textMuted}
                disabled={saving}
              />
            </View>
          </View>
        );

      case 'navigation':
      case 'selection':
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.settingCard, { backgroundColor: theme.card }]}
            onPress={item.onPress}
            disabled={saving}
          >
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme.accent }]}>
                <Ionicons 
                  name={item.icon as any} 
                  size={20} 
                  color={theme.primary}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
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
          <Text style={styles.headerTitle}>Feed & Auto-Pick Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading settings...</Text>
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
        <Text style={styles.headerTitle}>Feed & Auto-Pick Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Overview Card */}
        <View style={styles.section}>
          <View style={[styles.overviewCard, { backgroundColor: theme.card }]}>
            <View style={styles.overviewHeader}>
              <View style={[styles.overviewIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="sparkles" size={24} color={theme.primary} />
              </View>
              <View style={styles.overviewInfo}>
                <Text style={[styles.overviewTitle, { color: theme.text }]}>
                  Smart Content Management
                </Text>
                <Text style={[styles.overviewSubtitle, { color: theme.textSecondary }]}>
                  Centralized control for content discovery, auto-generation, and playback
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>
                  {scheduleEnabled ? scheduleCount : '0'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Daily Articles</Text>
              </View>
              
              {/* Dynamic generation times display */}
              {enabledSchedules.length === 1 ? (
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.primary }]}>
                    {formatTime(enabledSchedules[0].time)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Generation Time</Text>
                </View>
              ) : (
                <View style={styles.statItem}>
                  <View style={styles.multiTimeContainer}>
                    {enabledSchedules.slice(0, 2).map((schedule, index) => (
                      <Text 
                        key={schedule.id} 
                        style={[styles.statNumber, { 
                          color: theme.primary,
                          fontSize: enabledSchedules.length > 1 ? 16 : 20,
                          marginBottom: index < enabledSchedules.slice(0, 2).length - 1 ? 2 : 0
                        }]}
                      >
                        {formatTime(schedule.time)}
                      </Text>
                    ))}
                    {enabledSchedules.length > 2 && (
                      <Text style={[styles.statNumber, { 
                        color: theme.primary,
                        fontSize: 14,
                        fontWeight: '500'
                      }]}>
                        +{enabledSchedules.length - 2} more
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Generation Times</Text>
                </View>
              )}
              
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: scheduleEnabled ? theme.success : theme.textMuted }]}>
                  {scheduleEnabled ? 'ON' : 'OFF'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Auto-Pick</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Setting Categories */}
        {settingCategories.map((category, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.title}</Text>
            <Text style={styles.sectionDescription}>{category.description}</Text>
            
            <View style={styles.categoryContainer}>
              {category.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.savingText, { color: theme.primary }]}>Saving settings...</Text>
          </View>
        )}

      </ScrollView>

      {/* Time Picker Modal */}
      {timePickerVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={timePickerVisible}
          onRequestClose={() => setTimePickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.timePickerModal, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setTimePickerVisible(false);
                    setEditingScheduleId(null);
                    // Re-open schedule management modal if it was previously open
                    if (scheduleManagementModalVisible) {
                      setTimeout(() => setScheduleManagementModalVisible(true), 100);
                    }
                  }}
                  style={styles.modalButton}
                >
                  <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {editingScheduleId ? 'Edit Schedule Time' : 'Set Generation Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTimePickerVisible(false);
                    setEditingScheduleId(null);
                    saveSettings();
                    // Re-open schedule management modal if it was previously open
                    if (scheduleManagementModalVisible) {
                      setTimeout(() => setScheduleManagementModalVisible(true), 100);
                    }
                  }}
                  style={styles.modalButton}
                >
                  <Text style={[styles.modalButtonText, { color: theme.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date(`2000-01-01T${editingScheduleId ? schedules.find(s => s.id === editingScheduleId)?.time || '08:00' : '08:00'}:00`)}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate && editingScheduleId) {
                    const hours = selectedDate.getHours().toString().padStart(2, '0');
                    const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                    updateSchedule(editingScheduleId, `${hours}:${minutes}`);
                  }
                }}
                textColor={theme.text}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Prompt Style Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={promptModalVisible}
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>AI Script Style</Text>
            <TouchableOpacity
              onPress={() => {
                setPromptModalVisible(false);
                saveSettings();
                Alert.alert('Style Updated', 'AI script style has been updated for future episodes.');
              }}
              style={styles.saveButton}
            >
              <Text style={[styles.saveButtonText, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {getAllPrompts().map((prompt) => (
              <TouchableOpacity
                key={prompt.id}
                style={[
                  styles.promptOption,
                  { backgroundColor: theme.card },
                  selectedPrompt === prompt.id && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => setSelectedPrompt(prompt.id)}
              >
                <View style={styles.promptHeader}>
                  <Text style={[styles.promptName, { color: theme.text }]}>
                    {prompt.name}
                  </Text>
                  <View style={styles.promptActions}>
                    {prompt.type === 'custom' && (
                      <>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            openCustomPromptModal(prompt.id);
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
                              `Are you sure you want to delete "${prompt.name}"?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteCustomPrompt(prompt.id) }
                              ]
                            );
                          }}
                          style={styles.promptActionButton}
                        >
                          <Ionicons name="trash-outline" size={20} color={theme.error} />
                        </TouchableOpacity>
                      </>
                    )}
                    {selectedPrompt === prompt.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                    )}
                  </View>
                </View>
                <Text style={[styles.promptDescription, { color: theme.textSecondary }]}>
                  {prompt.description}
                </Text>
                <Text style={[styles.promptStyle, { color: theme.textMuted }]}>
                  {prompt.style}
                </Text>
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
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Schedule Management Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={scheduleManagementModalVisible}
        onRequestClose={() => setScheduleManagementModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setScheduleManagementModalVisible(false)}
              style={styles.modalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Schedules</Text>
            <TouchableOpacity
              onPress={addSchedule}
              style={styles.addButton}
            >
              <Ionicons name="add" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {schedules.length === 0 ? (
              // Empty State
              <View style={styles.emptyState}>
                <View style={[styles.emptyStateIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="time-outline" size={48} color={theme.textMuted} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  No Schedules Created
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                  Create your first generation schedule to start automated content creation
                </Text>
                <TouchableOpacity
                  style={[styles.createFirstButton, { backgroundColor: theme.primary }]}
                  onPress={addSchedule}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.createFirstButtonText}>Create First Schedule</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Schedule List
              <View style={styles.schedulesList}>
                <Text style={[styles.schedulesListTitle, { color: theme.text }]}>
                  Generation Schedules ({schedules.length}/{maxSchedules})
                </Text>
                <Text style={[styles.schedulesListSubtitle, { color: theme.textSecondary }]}>
                  Tap on any schedule to edit its time
                </Text>
                
                {schedules.map((schedule, index) => (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[
                      styles.scheduleItem,
                      { backgroundColor: theme.card },
                      !schedule.enabled && { opacity: 0.6 }
                    ]}
                    onPress={() => editScheduleTime(schedule.id)}
                  >
                    <View style={styles.scheduleItemLeft}>
                      <View style={[styles.scheduleIcon, { backgroundColor: schedule.enabled ? theme.primary + '20' : theme.accent }]}>
                        <Ionicons 
                          name="alarm-outline" 
                          size={20} 
                          color={schedule.enabled ? theme.primary : theme.textMuted}
                        />
                      </View>
                      <View style={styles.scheduleItemInfo}>
                        <Text style={[styles.scheduleItemTitle, { color: theme.text }]}>
                          Schedule {index + 1}
                        </Text>
                        <Text style={[styles.scheduleItemTime, { color: schedule.enabled ? theme.primary : theme.textMuted }]}>
                          {formatTime(schedule.time)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.scheduleItemRight}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleSchedule(schedule.id);
                        }}
                        style={styles.toggleButton}
                      >
                        <Ionicons 
                          name={schedule.enabled ? "checkmark-circle" : "ellipse-outline"} 
                          size={24} 
                          color={schedule.enabled ? theme.success : theme.textMuted}
                        />
                      </TouchableOpacity>
                      
                      {schedules.length > 1 && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                              'Delete Schedule',
                              `Are you sure you want to delete Schedule ${index + 1}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => removeSchedule(schedule.id) }
                              ]
                            );
                          }}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={20} color={theme.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
                    setSelectedPrompt(newId);
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
                Write your custom instructions for how the AI should generate and present the news content.
              </Text>
              
              <View style={[styles.textInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.customPromptInput, { color: theme.text }]}
                  value={customPromptText}
                  onChangeText={setCustomPromptText}
                  placeholder="Enter your custom prompt instructions here..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.promptExamples}>
                <Text style={[styles.examplesTitle, { color: theme.text }]}>Example Prompts:</Text>
                <Text style={[styles.exampleText, { color: theme.textSecondary }]}>
                  • "Focus on technology and innovation news with detailed technical explanations"{'\n'}
                  • "Present news in a casual, conversational tone suitable for commuting"{'\n'}
                  • "Emphasize business implications and market analysis in all stories"{'\n'}
                  • "Include historical context and background for better understanding"
                </Text>
              </View>
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
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  overviewCard: {
    borderRadius: 12,
    padding: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  multiTimeContainer: {
    alignItems: 'center',
  },
  categoryContainer: {
    gap: 12,
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  timePickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
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
  modalButton: {
    padding: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalBackButton: {
    padding: 8,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  promptOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promptName: {
    fontSize: 16,
    fontWeight: '600',
  },
  promptDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  promptStyle: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Schedule Management Modal Styles
  addButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  schedulesList: {
    paddingVertical: 20,
  },
  schedulesListTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  schedulesListSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  scheduleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scheduleItemInfo: {
    flex: 1,
  },
  scheduleItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleItemTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  
  // Custom Prompt Styles
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
    marginTop: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addCustomPromptText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  customPromptSection: {
    marginTop: 20,
  },
  textInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  customPromptInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 120,
    maxHeight: 200,
  },
  promptExamples: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});