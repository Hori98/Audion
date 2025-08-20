/**
 * Create Tab - Central audio creation hub
 * Replaces floating AutoPick/ManualPick buttons
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { apiService } from '../../services/ApiService';

export default function CreateTab() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleAutoPickCreate = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to create audio content.');
      return;
    }

    setIsCreating(true);
    
    try {
      // Call auto-pick endpoint
      const response = await apiService.getEndpoint<any>('content.autopick');
      
      if (response.success && response.data?.selected_articles) {
        const articles = response.data.selected_articles;
        
        if (articles.length === 0) {
          Alert.alert('No Articles', 'No articles available for auto-pick. Please add some RSS sources first.');
          return;
        }

        // Create audio from auto-picked articles
        const audioResponse = await apiService.postEndpoint('audio.create', {
          articles: articles,
          title: `Auto-Pick Audio - ${new Date().toLocaleDateString()}`,
        });

        if (audioResponse.success) {
          Alert.alert(
            'Audio Created!', 
            `Successfully created audio from ${articles.length} articles.`,
            [{ text: 'Go to Playlist', onPress: () => router.push('/(tabs)/playlist') }]
          );
        } else {
          throw new Error(audioResponse.error || 'Failed to create audio');
        }
      } else {
        throw new Error(response.error || 'Auto-pick failed');
      }
    } catch (error: any) {
      console.error('Auto-pick creation error:', error);
      Alert.alert('Creation Failed', error.message || 'Failed to create audio. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualPick = () => {
    router.push('/(tabs)/feed');
  };

  const handleDirectTTS = () => {
    // Navigate to direct text-to-speech input
    Alert.alert('Coming Soon', 'Direct text-to-speech feature will be available soon.');
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.textMuted} />
          <Text style={[styles.title, { color: theme.text }]}>Login Required</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Please log in to create audio content
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Create Audio</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Choose how you'd like to create your podcast
          </Text>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.actionsContainer}>
          
          {/* Auto-Pick Option */}
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryCard, { backgroundColor: theme.primary }]}
            onPress={handleAutoPickCreate}
            disabled={isCreating}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              {isCreating ? (
                <ActivityIndicator size={32} color="#fff" />
              ) : (
                <Ionicons name="sparkles" size={32} color="#fff" />
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#fff' }]}>Auto-Pick</Text>
              <Text style={[styles.actionDescription, { color: 'rgba(255,255,255,0.8)' }]}>
                Automatically select and create audio from your latest articles
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Manual Pick Option */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handleManualPick}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.accent }]}>
              <Ionicons name="hand-left" size={28} color={theme.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Manual Pick</Text>
              <Text style={[styles.actionDescription, { color: theme.textMuted }]}>
                Browse and manually select articles from your feed
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Direct TTS Option */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={handleDirectTTS}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.accent }]}>
              <Ionicons name="mic" size={28} color={theme.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Direct Text</Text>
              <Text style={[styles.actionDescription, { color: theme.textMuted }]}>
                Enter text directly and convert to speech
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

        </View>

        {/* Quick Stats */}
        <View style={[styles.statsContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statsTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push('/(tabs)/feed')}
            >
              <Ionicons name="newspaper-outline" size={20} color={theme.primary} />
              <Text style={[styles.statText, { color: theme.textMuted }]}>Browse Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={20} color={theme.primary} />
              <Text style={[styles.statText, { color: theme.textMuted }]}>Manage Sources</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCard: {
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsContainer: {
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    textAlign: 'center',
  },
});