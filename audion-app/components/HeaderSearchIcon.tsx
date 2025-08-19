import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HeaderSearchIconProps {
  onPress: () => void;
  style?: any;
  iconSize?: number;
}

export default function HeaderSearchIcon({
  onPress,
  style,
  iconSize = 20
}: HeaderSearchIconProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.searchIcon, { backgroundColor: theme.surface }, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="search" size={iconSize} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});