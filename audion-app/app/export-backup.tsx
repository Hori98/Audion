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
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'export' | 'backup';
  action: () => void;
  disabled?: boolean;
}

interface BackupData {
  timestamp: string;
  version: string;
  user_data: {
    preferences: any;
    settings: any;
    sources: any[];
    audio_library: any[];
  };
}

export default function ExportBackupScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token, user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  const styles = createStyles(theme);

  useEffect(() => {
    loadLastBackupDate();
  }, []);

  const loadLastBackupDate = async () => {
    try {
      const date = await AsyncStorage.getItem('last_backup_date');
      setLastBackupDate(date);
    } catch (error) {
      console.error('Error loading last backup date:', error);
    }
  };

  const saveLastBackupDate = async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem('last_backup_date', now);
      setLastBackupDate(now);
    } catch (error) {
      console.error('Error saving backup date:', error);
    }
  };

  const gatherUserData = async (): Promise<BackupData> => {
    try {
      // Gather all local data
      const preferences = await AsyncStorage.getItem('genre_preferences');
      const playbackSettings = await AsyncStorage.getItem('playback_settings');
      const textFontSettings = await AsyncStorage.getItem('text_font_settings');
      const themeSettings = await AsyncStorage.getItem('theme_settings');

      // Gather server data
      let sources: any[] = [];
      let audioLibrary: any[] = [];
      
      try {
        const sourcesResponse = await axios.get(`${API}/sources`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        sources = sourcesResponse.data;
      } catch (error) {
        console.log('Could not fetch sources for backup');
      }

      try {
        const audioResponse = await axios.get(`${API}/audio/library`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        audioLibrary = audioResponse.data;
      } catch (error) {
        console.log('Could not fetch audio library for backup');
      }

      return {
        timestamp: new Date().toISOString(),
        version: '1.0',
        user_data: {
          preferences: {
            genre_preferences: preferences ? JSON.parse(preferences) : null,
            theme_settings: themeSettings ? JSON.parse(themeSettings) : null,
          },
          settings: {
            playback: playbackSettings ? JSON.parse(playbackSettings) : null,
            text_font: textFontSettings ? JSON.parse(textFontSettings) : null,
          },
          sources,
          audio_library: audioLibrary.map(audio => ({
            id: audio.id,
            title: audio.title,
            created_at: audio.created_at,
            article_titles: audio.article_titles,
            // Don't include large binary data, just metadata
          })),
        }
      };
    } catch (error) {
      console.error('Error gathering user data:', error);
      throw new Error('Failed to gather user data for backup');
    }
  };

  const exportToJSON = async () => {
    try {
      setLoading(true);
      const backupData = await gatherUserData();
      
      const fileContent = JSON.stringify(backupData, null, 2);
      
      // Use basic sharing for all platforms
      await Share.share({
        message: fileContent,
        title: 'Audion Backup Data'
      });
      
      await saveLastBackupDate();
      Alert.alert('Export Complete', 'Your data has been exported successfully.');
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportAudioList = async () => {
    try {
      setLoading(true);
      
      const audioResponse = await axios.get(`${API}/audio/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const audioList = audioResponse.data.map((audio: any, index: number) => 
        `${index + 1}. ${audio.title}\n   Created: ${new Date(audio.created_at).toLocaleDateString()}\n   Articles: ${audio.article_titles?.join(', ') || 'N/A'}\n`
      ).join('\n');
      
      const content = `Audion Audio Library Export\nGenerated: ${new Date().toLocaleDateString()}\n\n${audioList}`;
      
      await Share.share({ message: content });
      Alert.alert('Export Complete', 'Your audio library list has been exported.');
      
    } catch (error) {
      console.error('Audio list export error:', error);
      Alert.alert('Export Failed', 'Could not export audio library.');
    } finally {
      setLoading(false);
    }
  };

  const exportSourcesList = async () => {
    try {
      setLoading(true);
      
      const sourcesResponse = await axios.get(`${API}/sources`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const sourcesList = sourcesResponse.data.map((source: any, index: number) => 
        `${index + 1}. ${source.name}\n   URL: ${source.url}\n   Added: ${new Date(source.created_at).toLocaleDateString()}\n`
      ).join('\n');
      
      const content = `Audion RSS Sources Export\nGenerated: ${new Date().toLocaleDateString()}\n\n${sourcesList}`;
      
      await Share.share({ message: content });
      Alert.alert('Export Complete', 'Your RSS sources list has been exported.');
      
    } catch (error) {
      console.error('Sources export error:', error);
      Alert.alert('Export Failed', 'Could not export RSS sources.');
    } finally {
      setLoading(false);
    }
  };

  const createFullBackup = async () => {
    try {
      setLoading(true);
      const backupData = await gatherUserData();
      
      const fileContent = JSON.stringify(backupData, null, 2);
      
      await Share.share({
        message: fileContent,
        title: 'Audion Full Backup',
      });
      
      await saveLastBackupDate();
      Alert.alert(
        'Backup Created', 
        'Full backup created successfully. Copy and save this data to restore later.'
      );
      
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Backup Failed', 'Could not create backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportOptions: ExportOption[] = [
    {
      id: 'full_backup',
      title: 'Create Full Backup',
      description: 'Complete backup of all your data, settings, and preferences',
      icon: 'cloud-upload-outline',
      type: 'backup',
      action: createFullBackup
    },
    {
      id: 'export_json',
      title: 'Export Data as JSON',
      description: 'Export all your data in a structured JSON format',
      icon: 'document-text-outline',
      type: 'export',
      action: exportToJSON
    },
    {
      id: 'export_audio_list',
      title: 'Export Audio Library',
      description: 'Export a list of your created audio files',
      icon: 'musical-notes-outline',
      type: 'export',
      action: exportAudioList
    },
    {
      id: 'export_sources',
      title: 'Export RSS Sources',
      description: 'Export your RSS feed sources list',
      icon: 'rss-outline',
      type: 'export',
      action: exportSourcesList
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export & Backup</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Backup Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Status</Text>
          <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIconContainer, { backgroundColor: lastBackupDate ? theme.primary + '20' : theme.accent }]}>
                <Ionicons 
                  name={lastBackupDate ? "checkmark-circle" : "time-outline"} 
                  size={24} 
                  color={lastBackupDate ? theme.primary : theme.textMuted}
                />
              </View>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusTitle, { color: theme.text }]}>
                  {lastBackupDate ? 'Last Backup' : 'No Backup Created'}
                </Text>
                <Text style={[styles.statusDate, { color: theme.textSecondary }]}>
                  {lastBackupDate 
                    ? new Date(lastBackupDate).toLocaleDateString() + ' at ' + new Date(lastBackupDate).toLocaleTimeString()
                    : 'Create your first backup to secure your data'
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Export & Backup Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export & Backup Options</Text>
          <Text style={styles.sectionSubtitle}>
            Keep your data safe and portable with these export options
          </Text>
          
          <View style={styles.optionsGrid}>
            {exportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, { backgroundColor: theme.card }]}
                onPress={option.action}
                disabled={loading || option.disabled}
              >
                <View style={styles.optionHeader}>
                  <View style={[
                    styles.optionIconContainer, 
                    { 
                      backgroundColor: option.type === 'backup' ? theme.primary + '20' : theme.accent 
                    }
                  ]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={24} 
                      color={option.type === 'backup' ? theme.primary : theme.textMuted}
                    />
                  </View>
                  <View style={[
                    styles.typeBadge,
                    { 
                      backgroundColor: option.type === 'backup' ? theme.primary + '20' : theme.accent
                    }
                  ]}>
                    <Text style={[
                      styles.typeBadgeText,
                      { 
                        color: option.type === 'backup' ? theme.primary : theme.textMuted
                      }
                    ]}>
                      {option.type.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.optionTitle, { color: theme.text }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
                  {option.description}
                </Text>

                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Notes</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.accent }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
              <Text style={[styles.infoTitle, { color: theme.text }]}>Data Protection</Text>
            </View>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              • Exports include your settings, preferences, and library metadata{'\n'}
              • Audio files are not included due to size limitations{'\n'}
              • Copy exported data to a secure location for safekeeping{'\n'}
              • Regular exports help prevent data loss during app updates{'\n'}
              • You can manually restore settings using exported JSON data
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.primary }]}>Processing...</Text>
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
  placeholder: {
    width: 40,
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
  statusCard: {
    borderRadius: 12,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 14,
    lineHeight: 18,
  },
  optionsGrid: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingIndicator: {
    alignItems: 'center',
    paddingVertical: 32,
    marginTop: 20,
    marginBottom: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});