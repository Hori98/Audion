import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ChapterSourceButtonProps {
  visible: boolean;
}

export default function ChapterSourceButton({ visible }: ChapterSourceButtonProps) {
  const { currentChapter, openCurrentChapterSource } = useAudio();
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (!visible || !currentChapter || !currentChapter.chapter.original_url) {
    return null;
  }

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={openCurrentChapterSource}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="newspaper-outline" 
              size={20} 
              color={theme.primary} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {currentChapter.chapter.title}
            </Text>
            <Text style={styles.subtitle}>
              {t('audio.tapToReadOriginal')}
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={theme.textMuted} 
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below the status bar
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  button: {
    backgroundColor: theme.card,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary + '30',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: theme.textSecondary,
  },
});