/**
 * ManualPickPanel - Selection management panel for read articles
 * Appears when ManualPick mode is activated in Feed tab
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ManualPickPanelProps {
  selectedCount: number;
  onCreateInstantAudio: () => void; // Instant audio creation only
  onCancel: () => void;
  isCreating: boolean;
}

export default function ManualPickPanel({
  selectedCount,
  onCreateInstantAudio,
  onCancel,
  isCreating,
}: ManualPickPanelProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {selectedCount}記事を選択
          </Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
            キャンセル
          </Text>
        </TouchableOpacity>
      </View>


      {/* Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            { 
              backgroundColor: selectedCount > 0 ? '#10B981' : theme.surface,
              borderColor: '#10B981',
            }
          ]}
          onPress={onCreateInstantAudio}
          disabled={selectedCount === 0 || isCreating}
        >
          <View style={styles.buttonContent}>
            {isCreating ? (
              <ActivityIndicator size={16} color="#fff" />
            ) : (
              <Ionicons name="flash" size={16} color="#fff" />
            )}
            <Text style={[styles.createButtonText, { opacity: selectedCount > 0 ? 1 : 0.5 }]}>
              ⚡ Instant Audio
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
  },
  createButton: {
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});