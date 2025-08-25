/**
 * HomeActionBar - Fixed action bar for Home screen
 * Context-aware AutoPick based on current genre filter
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HomeActionBarProps {
  currentGenre: string;
  onAutoPick: () => void;
  isCreating: boolean;
  articlesCount: number;
  // AutoPick progress
  autoPickProgress?: {
    isActive: boolean;
    progress: number;
    stage: 'articles' | 'script' | 'audio' | 'complete';
    articlesCount?: number;
  };
}

export default function HomeActionBar({ 
  currentGenre, 
  onAutoPick, 
  isCreating, 
  articlesCount,
  autoPickProgress
}: HomeActionBarProps) {
  const { theme } = useTheme();

  if (articlesCount === 0) {
    return null;
  }

  const getGenreLabel = () => {
    return currentGenre === 'All' ? 'all articles' : `${currentGenre} articles`;
  };

  const getContextText = () => {
    // Show AutoPick progress if active
    if (autoPickProgress?.isActive) {
      const stageText = {
        articles: 'Selecting articles',
        script: 'Generating script',
        audio: 'Creating audio',
        complete: 'Complete'
      }[autoPickProgress.stage];
      return `${Math.round(autoPickProgress.progress)}% • ${stageText}${autoPickProgress.articlesCount ? ` • ${autoPickProgress.articlesCount} articles` : ''}`;
    }
    
    return `${articlesCount} ${getGenreLabel()} available`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Context Info */}
      <View style={styles.contextInfo}>
        <Text style={[styles.contextText, { color: theme.textMuted }]}>
          {getContextText()}
        </Text>
        
        {/* Progress Bar for AutoPick */}
        {autoPickProgress?.isActive && (
          <View style={[styles.progressBarContainer, { backgroundColor: theme.divider }]}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  backgroundColor: theme.primary,
                  width: `${Math.round(autoPickProgress.progress)}%`
                }
              ]} 
            />
          </View>
        )}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.primary }]}
        onPress={onAutoPick}
        disabled={isCreating}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          {isCreating ? (
            <ActivityIndicator size={16} color="#fff" />
          ) : (
            <Ionicons name="sparkles" size={16} color="#fff" />
          )}
          <Text style={styles.buttonText}>
            {isCreating ? 'Creating...' : 'Auto-Pick'}
          </Text>
        </View>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // No border - seamless integration with filter above
  },
  contextInfo: {
    flex: 1,
  },
  contextText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 2,
    borderRadius: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});