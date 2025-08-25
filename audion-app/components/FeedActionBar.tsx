/**
 * FeedActionBar - Unified action bar for Feed screen
 * Seamless integration with filters: AutoPick, ManualPick, Read Status
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

interface FeedActionBarProps {
  articlesCount: number;
  selectedCount: number;
  selectionMode: boolean;
  isCreating: boolean;
  currentReadFilter: string;
  onAutoPick: () => void;
  onToggleSelection: () => void;
  onReadStatusFilter: () => void;
  // AutoPick progress
  autoPickProgress?: {
    isActive: boolean;
    progress: number;
    stage: 'articles' | 'script' | 'audio' | 'complete';
    articlesCount?: number;
  };
}

export default function FeedActionBar({ 
  articlesCount,
  selectedCount,
  selectionMode,
  isCreating,
  currentReadFilter,
  onAutoPick,
  onToggleSelection,
  onReadStatusFilter,
  autoPickProgress,
}: FeedActionBarProps) {
  const { theme } = useTheme();

  if (articlesCount === 0) {
    return null;
  }

  // Check if ManualPick should be available (for "Read" and "This Week's Reads" filters)
  const isManualPickAvailable = currentReadFilter === 'Read' || currentReadFilter === "This Week's Reads";

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

    if (selectionMode) {
      const filterType = currentReadFilter === "This Week's Reads" ? "this week's reads" : "read articles";
      return `${selectedCount} selected from ${articlesCount} ${filterType}`;
    }
    if (isManualPickAvailable) {
      const filterType = currentReadFilter === "This Week's Reads" ? "this week's reads" : "read articles";
      return `${articlesCount} ${filterType} available`;
    }
    return `${articlesCount} articles available`;
  };

  const getFilterButtonStyle = () => {
    // Simple style without filter detection
    return {
      backgroundColor: theme.surface,
      borderColor: theme.primary,
      borderWidth: 1,
    };
  };

  const getFilterIconColor = () => {
    return theme.primary;
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

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>

        {/* Manual Selection Toggle - Show for Read articles and This Week's Reads */}
        {isManualPickAvailable && (
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.smallButton,
              { 
                backgroundColor: selectionMode ? theme.primary : theme.surface,
                borderColor: theme.primary,
                borderWidth: selectionMode ? 0 : 1,
              }
            ]}
            onPress={onToggleSelection}
            disabled={isCreating}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="list" 
              size={14} 
              color={selectionMode ? '#fff' : theme.primary} 
            />
          </TouchableOpacity>
        )}

        {/* Auto-Pick or Create Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={selectionMode && selectedCount > 0 ? onToggleSelection : onAutoPick}
          disabled={isCreating || (selectionMode && selectedCount === 0)}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            {isCreating ? (
              <ActivityIndicator size={14} color="#fff" />
            ) : (
              <Ionicons 
                name={selectionMode && selectedCount > 0 ? "checkmark-circle" : "sparkles"} 
                size={14} 
                color="#fff" 
              />
            )}
            <Text style={styles.buttonText}>
              {isCreating ? 'Creating...' : 
               selectionMode && selectedCount > 0 ? 'Create' : 
               isManualPickAvailable ? 'Auto-Pick' : 'Auto-Pick'}
            </Text>
          </View>
        </TouchableOpacity>

      </View>

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
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});