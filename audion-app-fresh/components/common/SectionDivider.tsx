import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../styles/commonStyles';

interface SectionDividerProps {
  inset?: number; // optional left/right inset
  topMargin?: number;
}

export default function SectionDivider({ inset = 0, topMargin = 8 }: SectionDividerProps) {
  return <View style={[styles.line, { marginTop: topMargin, marginLeft: inset, marginRight: inset }]} />;
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: COLORS.HAIRLINE,
  },
});

