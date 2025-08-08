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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

interface StorageItem {
  name: string;
  size: number; // in MB
  count?: number;
  icon: string;
  color: string;
  description: string;
  lastAccessed?: string;
}

interface StorageData {
  totalUsed: number;
  totalAvailable: number;
  breakdown: {
    audioFiles: StorageItem;
    articles: StorageItem;
    imageCache: StorageItem;
    appData: StorageItem;
    temporary: StorageItem;
  };
  largestFiles: Array<{
    name: string;
    size: number;
    type: 'audio' | 'article' | 'image' | 'cache';
    lastAccessed: string;
  }>;
  recommendations: Array<{
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    action?: string;
    actionCallback?: () => void;
  }>;
}

export default function StorageUsageScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storageData, setStorageData] = useState<StorageData | null>(null);

  const styles = createStyles(theme);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔍 Loading storage usage data...');
      
      // Simulate storage analysis
      // In a real app, this would analyze actual file system usage
      const mockStorageData: StorageData = {
        totalUsed: 156.8, // MB
        totalAvailable: 2048, // MB
        breakdown: {
          audioFiles: {
            name: 'Audio Files',
            size: 89.3,
            count: 23,
            icon: 'musical-note-outline',
            color: '#3B82F6',
            description: 'Generated podcast audio files',
            lastAccessed: '2024-12-08T10:30:00Z'
          },
          articles: {
            name: 'Cached Articles',
            size: 32.1,
            count: 145,
            icon: 'document-text-outline',
            color: '#10B981',
            description: 'Article text and metadata cache',
            lastAccessed: '2024-12-08T09:15:00Z'
          },
          imageCache: {
            name: 'Image Cache',
            size: 18.7,
            count: 67,
            icon: 'image-outline',
            color: '#F59E0B',
            description: 'Article thumbnails and images',
            lastAccessed: '2024-12-08T08:45:00Z'
          },
          appData: {
            name: 'App Data',
            size: 12.4,
            icon: 'settings-outline',
            color: '#8B5CF6',
            description: 'User preferences and settings',
            lastAccessed: '2024-12-08T11:00:00Z'
          },
          temporary: {
            name: 'Temporary Files',
            size: 4.3,
            count: 8,
            icon: 'folder-outline',
            color: '#EF4444',
            description: 'Temporary processing files',
            lastAccessed: '2024-12-08T07:20:00Z'
          }
        },
        largestFiles: [
          { name: 'Tech News Digest #42.mp3', size: 15.2, type: 'audio', lastAccessed: '2024-12-07T14:30:00Z' },
          { name: 'Finance Weekly Summary.mp3', size: 12.8, type: 'audio', lastAccessed: '2024-12-06T16:45:00Z' },
          { name: 'Article Cache DB', size: 8.9, type: 'cache', lastAccessed: '2024-12-08T09:15:00Z' },
          { name: 'Sports Update #15.mp3', size: 7.3, type: 'audio', lastAccessed: '2024-12-05T11:20:00Z' },
          { name: 'Image Thumbnails', size: 6.1, type: 'image', lastAccessed: '2024-12-08T08:45:00Z' },
        ],
        recommendations: [
          {
            type: 'info',
            title: 'Storage is Healthy',
            message: 'You\'re using 7.7% of available storage. No immediate action needed.',
          },
          {
            type: 'info',
            title: 'Old Audio Files',
            message: '5 audio files haven\'t been played in 30+ days',
            action: 'Archive Old Files',
            actionCallback: () => archiveOldFiles()
          },
          {
            type: 'success',
            title: 'Cache Optimization',
            message: 'Image cache is well-managed and under limits',
          }
        ]
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStorageData(mockStorageData);
      
    } catch (error: any) {
      console.error('❌ Error loading storage data:', error);
      Alert.alert('Error', 'Failed to load storage information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearStorageType = (type: keyof StorageData['breakdown']) => {
    if (!storageData) return;
    
    const item = storageData.breakdown[type];
    const actionMap = {
      audioFiles: 'Delete Audio Files',
      articles: 'Clear Article Cache', 
      imageCache: 'Clear Image Cache',
      appData: 'Reset App Data',
      temporary: 'Clear Temporary Files'
    };

    Alert.alert(
      actionMap[type],
      `This will free up ${item.size.toFixed(1)} MB of storage space. ${
        type === 'appData' ? 'Your settings and preferences will be reset.' : 
        type === 'audioFiles' ? 'Downloaded audio files will be deleted.' :
        'Cached data will be cleared and re-downloaded when needed.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: type === 'appData' ? 'Reset' : 'Clear',
          style: type === 'appData' ? 'destructive' : 'default',
          onPress: () => performClearAction(type)
        }
      ]
    );
  };

  const performClearAction = async (type: keyof StorageData['breakdown']) => {
    if (!storageData) return;
    
    try {
      // Simulate clearing action
      const clearedSize = storageData.breakdown[type].size;
      
      // Update storage data
      const newStorageData = { ...storageData };
      newStorageData.totalUsed -= clearedSize;
      newStorageData.breakdown[type].size = 0;
      newStorageData.breakdown[type].count = 0;
      
      setStorageData(newStorageData);
      
      const typeNames = {
        audioFiles: 'audio files',
        articles: 'article cache', 
        imageCache: 'image cache',
        appData: 'app data',
        temporary: 'temporary files'
      };
      
      Alert.alert(
        'Success',
        `${typeNames[type]} cleared successfully. Freed ${clearedSize.toFixed(1)} MB of storage.`
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  const optimizeStorage = () => {
    Alert.alert(
      'Optimize Storage',
      'This will:\n\n• Clear temporary files\n• Remove old cached articles\n• Optimize image cache\n• Archive old audio files\n\nThis may free up significant space.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Optimize',
          onPress: () => performOptimization()
        }
      ]
    );
  };

  const performOptimization = async () => {
    if (!storageData) return;
    
    try {
      // Simulate optimization
      const freedSpace = storageData.breakdown.temporary.size + 
                        storageData.breakdown.imageCache.size * 0.3;
      
      const newStorageData = { ...storageData };
      newStorageData.totalUsed -= freedSpace;
      newStorageData.breakdown.temporary.size = 0;
      newStorageData.breakdown.temporary.count = 0;
      newStorageData.breakdown.imageCache.size *= 0.7;
      
      setStorageData(newStorageData);
      
      Alert.alert(
        'Optimization Complete',
        `Storage optimized successfully! Freed ${freedSpace.toFixed(1)} MB of space.`
      );
      
    } catch (error) {
      Alert.alert('Error', 'Storage optimization failed');
    }
  };

  const archiveOldFiles = () => {
    Alert.alert(
      'Archive Complete',
      'Old audio files have been archived. You can restore them from the Archive section if needed.'
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const formatSize = (sizeInMB: number) => {
    if (sizeInMB >= 1000) {
      return `${(sizeInMB / 1000).toFixed(1)} GB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 80) return '#EF4444';
    if (percentage > 60) return '#F59E0B';
    return theme.primary;
  };

  if (loading && !storageData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Storage Usage</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Analyzing storage...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!storageData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Storage Usage</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.errorText, { color: theme.textMuted }]}>Unable to load storage data</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => loadStorageData()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const usagePercentage = (storageData.totalUsed / storageData.totalAvailable) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Storage Usage</Text>
        <TouchableOpacity
          style={styles.optimizeButton}
          onPress={optimizeStorage}
        >
          <Ionicons name="flash-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStorageData(true)}
            tintColor={theme.primary}
          />
        }
      >
        
        {/* Storage Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewStats}>
              <Text style={[styles.usageNumber, { color: theme.text }]}>
                {formatSize(storageData.totalUsed)}
              </Text>
              <Text style={[styles.usageTotal, { color: theme.textSecondary }]}>
                of {formatSize(storageData.totalAvailable)} used ({usagePercentage.toFixed(1)}%)
              </Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: getUsageColor(usagePercentage),
                      width: `${Math.min(100, usagePercentage)}%`
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
                {formatSize(storageData.totalAvailable - storageData.totalUsed)} available
              </Text>
            </View>
          </View>
        </View>

        {/* Storage Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Breakdown</Text>
          <View style={styles.breakdownCard}>
            {Object.entries(storageData.breakdown).map(([key, item]) => (
              <View key={key} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Text style={[styles.breakdownTitle, { color: theme.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.breakdownSubtitle, { color: theme.textSecondary }]}>
                      {item.description}
                      {item.count && ` • ${item.count} items`}
                    </Text>
                    {item.lastAccessed && (
                      <Text style={[styles.breakdownDate, { color: theme.textMuted }]}>
                        Last accessed: {formatDate(item.lastAccessed)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={[styles.breakdownSize, { color: theme.text }]}>
                    {formatSize(item.size)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.clearButton, { backgroundColor: theme.accent }]}
                    onPress={() => clearStorageType(key as keyof StorageData['breakdown'])}
                    disabled={item.size === 0}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Largest Files */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Largest Files</Text>
          <View style={styles.filesCard}>
            {storageData.largestFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileLeft}>
                  <View style={[styles.fileIcon, { backgroundColor: theme.accent }]}>
                    <Ionicons 
                      name={
                        file.type === 'audio' ? 'musical-note-outline' :
                        file.type === 'image' ? 'image-outline' :
                        file.type === 'article' ? 'document-text-outline' :
                        'folder-outline'
                      } 
                      size={18} 
                      color={theme.primary} 
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={[styles.fileDate, { color: theme.textMuted }]}>
                      {formatDate(file.lastAccessed)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.fileSize, { color: theme.textSecondary }]}>
                  {formatSize(file.size)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.recommendationsCard}>
            {storageData.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationLeft}>
                  <View style={[
                    styles.recommendationIcon,
                    { 
                      backgroundColor: 
                        rec.type === 'warning' ? '#FEF3C7' :
                        rec.type === 'success' ? '#D1FAE5' :
                        theme.accent
                    }
                  ]}>
                    <Ionicons 
                      name={
                        rec.type === 'warning' ? 'warning-outline' :
                        rec.type === 'success' ? 'checkmark-circle-outline' :
                        'information-circle-outline'
                      }
                      size={18} 
                      color={
                        rec.type === 'warning' ? '#F59E0B' :
                        rec.type === 'success' ? '#10B981' :
                        theme.primary
                      }
                    />
                  </View>
                  <View style={styles.recommendationInfo}>
                    <Text style={[styles.recommendationTitle, { color: theme.text }]}>
                      {rec.title}
                    </Text>
                    <Text style={[styles.recommendationMessage, { color: theme.textSecondary }]}>
                      {rec.message}
                    </Text>
                  </View>
                </View>
                {rec.action && rec.actionCallback && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.accent }]}
                    onPress={rec.actionCallback}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                      {rec.action}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
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
  optimizeButton: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 16,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 20,
  },
  overviewStats: {
    alignItems: 'center',
    marginBottom: 20,
  },
  usageNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  usageTotal: {
    fontSize: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Breakdown Card
  breakdownCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  breakdownSubtitle: {
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 2,
  },
  breakdownDate: {
    fontSize: 12,
  },
  breakdownRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  breakdownSize: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Files Card
  filesCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  fileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileDate: {
    fontSize: 12,
  },
  fileSize: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Recommendations Card
  recommendationsCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  recommendationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  recommendationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});