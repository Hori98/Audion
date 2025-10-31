import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../styles/commonStyles';

interface SectionPlaceholderProps {
  message?: string;
  lines?: number;
  insetHorizontal?: number;
}

export default function SectionPlaceholder({ message, lines = 1, insetHorizontal = 0 }: SectionPlaceholderProps) {
  return (
    <View style={[styles.container, insetHorizontal ? { paddingHorizontal: insetHorizontal } : null]}>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {Array.from({ length: Math.max(0, lines) }).map((_, i) => (
        <View key={i} style={styles.band} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.SCREEN_HORIZONTAL,
    paddingVertical: SPACING[2],
  },
  message: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: SPACING[1],
  },
  band: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 5,
    marginTop: SPACING[1],
  },
});

