/**
 * ChapterNavigation - News list and chapter navigation
 * Core component for both instant and saved audio
 * 最重要: ニュース原稿とニュースリスト表示
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Chapter, AudioTrack } from '../../../types/audio';

interface ChapterNavigationProps {
  audioTrack: AudioTrack;
  currentChapter?: Chapter;
  onChapterPress: (chapter: Chapter) => void;
  onArticlePress?: (articleUrl: string, articleTitle: string) => void;
  showArticleLinks?: boolean;
  variant?: 'compact' | 'full';
}

export const ChapterNavigation: React.FC<ChapterNavigationProps> = ({
  audioTrack,
  currentChapter,
  onChapterPress,
  onArticlePress,
  showArticleLinks = true,
  variant = 'full'
}) => {
  const { theme } = useTheme();
  
  if (!audioTrack.chapters || audioTrack.chapters.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-outline" size={32} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          チャプター情報がありません
        </Text>
      </View>
    );
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleChapterPress = useCallback((chapter: Chapter) => {
    console.log(`🎵 ChapterNavigation: Jumping to chapter: ${chapter.title} at ${formatTime(chapter.startTime)}`);
    onChapterPress(chapter);
  }, [onChapterPress]);
  
  const handleArticlePress = useCallback((chapter: Chapter) => {
    const articleUrl = chapter.original_url || chapter.originalUrl;
    if (articleUrl && onArticlePress) {
      console.log(`📰 ChapterNavigation: Opening article: ${chapter.title}`);
      onArticlePress(articleUrl, chapter.title);
    } else {
      Alert.alert('記事リンク', '記事のURLが見つかりません');
    }
  }, [onArticlePress]);
  
  const isCurrentChapter = useCallback((chapter: Chapter) => {
    return currentChapter?.id === chapter.id || 
           currentChapter?.title === chapter.title ||
           currentChapter?.startTime === chapter.startTime;
  }, [currentChapter]);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list-outline" size={20} color={theme.text} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          ニュースリスト ({audioTrack.chapters.length}記事)
        </Text>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {audioTrack.chapters.map((chapter, index) => {
          const isCurrent = isCurrentChapter(chapter);
          const hasArticleUrl = !!(chapter.original_url || chapter.originalUrl);
          
          // Handle different naming conventions
          const startTime = chapter.startTime || chapter.start_time || 0;
          const endTime = chapter.endTime || chapter.end_time || 0;
          
          return (
            <View
              key={chapter.id || `chapter_${index}`}
              style={[
                styles.chapterItem,
                {
                  backgroundColor: isCurrent ? theme.accent : theme.surface,
                  borderColor: isCurrent ? theme.primary : theme.border,
                }
              ]}
            >
              {/* Chapter info and playback */}
              <TouchableOpacity
                style={styles.chapterContent}
                onPress={() => handleChapterPress(chapter)}
                activeOpacity={0.7}
              >
                <View style={styles.chapterHeader}>
                  <View style={styles.chapterNumber}>
                    <Text style={[
                      styles.chapterNumberText, 
                      { color: isCurrent ? theme.primary : theme.textSecondary }
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                  
                  <View style={styles.timeInfo}>
                    <Text style={[
                      styles.timeText, 
                      { color: isCurrent ? theme.primary : theme.textSecondary }
                    ]}>
                      {formatTime(startTime)}
                      {variant === 'full' && endTime > startTime && ` - ${formatTime(endTime)}`}
                    </Text>
                  </View>
                  
                  {isCurrent && (
                    <View style={styles.playingIndicator}>
                      <Ionicons name="play" size={12} color={theme.primary} />
                    </View>
                  )}
                </View>
                
                <Text
                  style={[
                    styles.chapterTitle,
                    { 
                      color: isCurrent ? theme.text : theme.text,
                      fontWeight: isCurrent ? '600' : '500'
                    }
                  ]}
                  numberOfLines={variant === 'compact' ? 2 : 3}
                >
                  {chapter.title}
                </Text>
              </TouchableOpacity>
              
              {/* Article link button */}
              {showArticleLinks && hasArticleUrl && variant === 'full' && (
                <TouchableOpacity
                  style={[styles.articleButton, { borderColor: theme.border }]}
                  onPress={() => handleArticlePress(chapter)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="newspaper-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.articleButtonText, { color: theme.textSecondary }]}>
                    記事を読む
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

interface ScriptDisplayProps {
  script: string;
  currentTime?: number;
  totalTime?: number;
  variant?: 'compact' | 'full';
  onWordPress?: (word: string, timeIndex: number) => void;
}

export const ScriptDisplay: React.FC<ScriptDisplayProps> = ({
  script,
  currentTime = 0,
  totalTime = 0,
  variant = 'full',
  onWordPress
}) => {
  const { theme } = useTheme();
  const [showFullScript, setShowFullScript] = useState(false);
  
  if (!script) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={32} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          原稿が見つかりません
        </Text>
      </View>
    );
  }
  
  // Simple word tracking (can be enhanced with precise timestamps)
  const words = script.split(/\s+/).filter(word => word.length > 0);
  const estimatedWordsPerSecond = totalTime > 0 ? words.length / totalTime : 0;
  const currentWordIndex = Math.floor(currentTime * estimatedWordsPerSecond);
  
  const displayScript = showFullScript || variant === 'full' 
    ? script 
    : script.substring(0, 200) + (script.length > 200 ? '...' : '');
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={20} color={theme.text} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          原稿
        </Text>
        {variant === 'compact' && !showFullScript && script.length > 200 && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setShowFullScript(true)}
          >
            <Text style={[styles.expandButtonText, { color: theme.primary }]}>
              全文表示
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        style={styles.scriptContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.scriptText, { color: theme.text }]}>
          {displayScript}
        </Text>
        
        {variant === 'full' && currentTime > 0 && (
          <View style={styles.progressIndicator}>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              読み上げ進度: {Math.round((currentTime / totalTime) * 100)}%
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  expandButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chapterItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  chapterContent: {
    padding: 16,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterNumberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  playingIndicator: {
    marginLeft: 8,
  },
  chapterTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  articleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  articleButtonText: {
    fontSize: 14,
    marginLeft: 6,
  },
  scriptContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scriptText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
  },
  progressIndicator: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 16,
  },
  progressText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});