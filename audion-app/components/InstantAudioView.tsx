/**
 * InstantAudioView - Minimal modal for instant audio interaction
 * Shows URL links, prompt preset icons, and conversion to saved audio
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import UnifiedArticleCard from './UnifiedArticleCard';
import ArticleReader from './ArticleReader';
import { Article } from '../types';

interface InstantAudioViewProps {
  visible: boolean;
  onClose: () => void;
  context?: 'home' | 'feed'; // Context for dynamic header title
}

// Prompt preset icons mapping
const PROMPT_ICONS: { [key: string]: string } = {
  'instant': 'flash-outline',
  'recommended': 'star-outline',
  'detailed': 'document-text-outline',
  'brief': 'time-outline',
  'conversational': 'chatbubbles-outline',
  'news': 'newspaper-outline',
  'professional': 'business-outline',
  'casual': 'cafe-outline',
};

export default function InstantAudioView({ visible, onClose, context }: InstantAudioViewProps) {
  const { theme } = useTheme();
  
  // Legacy AudioContext (existing audio system)
  const { 
    currentAudio, 
    isPlaying, 
    position, 
    duration, 
    playAudio, 
    pauseAudio,
    seekTo 
  } = useAudio();
  
  // New AudioPlayerContext (for new instant audio system)
  const {
    currentTrack: newCurrentTrack,
    playbackState: newPlaybackState,
    positionMillis: newPositionMillis,
    durationMillis: newDurationMillis,
    togglePlayPause: newTogglePlayPause,
    jumpToChapter
  } = useAudioPlayer();

  const [convertingToSaved, setConvertingToSaved] = useState(false);
  const [showArticleReader, setShowArticleReader] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Determine which audio system is active and if it's instant audio
  const isNewSystemActive = newCurrentTrack && newPlaybackState !== 'IDLE';
  const isLegacySystemActive = currentAudio && isPlaying;
  
  // Check for instant audio in both systems
  const isInstantAudio = 
    // Legacy system instant audio
    (currentAudio && (
      currentAudio.id.includes('instant_') || 
      currentAudio.title?.includes('Instant Audio')
    )) ||
    // New system instant audio (all new system audio is considered instant for now)
    (newCurrentTrack && newPlaybackState !== 'IDLE');

  // Use appropriate audio data based on which system is active
  const activeAudioData = isNewSystemActive ? {
    id: newCurrentTrack?.id,
    title: newCurrentTrack?.title,
    chapters: newCurrentTrack?.chapters,
    position: newPositionMillis,
    duration: newDurationMillis,
    isPlaying: newPlaybackState === 'PLAYING',
    prompt_style: 'instant' // Default for new system
  } : {
    id: currentAudio?.id,
    title: currentAudio?.title,
    chapters: currentAudio?.chapters,
    position: position,
    duration: duration,
    isPlaying: isPlaying,
    prompt_style: currentAudio?.prompt_style || 'instant'
  };

  const handlePlayPause = async () => {
    if (isNewSystemActive) {
      // Use new AudioPlayerContext
      await newTogglePlayPause();
    } else if (currentAudio) {
      // Use legacy AudioContext
      if (isPlaying) {
        pauseAudio();
      } else {
        await playAudio(currentAudio);
      }
    }
  };

  const handleOpenURL = async (url: string, title: string) => {
    try {
      // 🔧 Use ArticleReader (in-app browser) instead of external browser
      const article: Article = {
        id: `instant_article_${Date.now()}`,
        title: title || 'ニュース記事',
        summary: '',
        published_at: new Date().toISOString(),
        source_name: 'Instant Audio',
        link: url,
        genre: 'News'
      };
      
      setSelectedArticle(article);
      setShowArticleReader(true);
      console.log('🔍 InstantAudioView: Opening article in ArticleReader:', title);
    } catch (error) {
      console.error('Error opening article reader:', error);
      Alert.alert('エラー', '記事を開く際にエラーが発生しました');
    }
  };

  const handleJumpToChapter = async (startTime: number, title: string) => {
    try {
      if (isNewSystemActive && newCurrentTrack?.chapters) {
        // Use new AudioPlayerContext with chapter object
        const chapterObj = newCurrentTrack.chapters.find(ch => ch.startTime === startTime);
        if (chapterObj) {
          await jumpToChapter(chapterObj);
          console.log(`🎵 InstantAudioView: Jumped to chapter: ${title} at ${formatTime(startTime * 1000)}`);
        } else {
          // Fallback to direct seek
          await jumpToChapter({ 
            id: `chapter_${title}`, 
            title, 
            startTime, 
            endTime: startTime + 60 // Default duration
          });
        }
      } else {
        // Use legacy AudioContext
        await seekTo(startTime);
        console.log(`Jumped to: ${title} at ${formatTime(startTime)}`);
      }
    } catch (error) {
      console.error('Error jumping to chapter:', error);
      Alert.alert('エラー', 'ジャンプに失敗しました');
    }
  };

  const handleConvertToSaved = async () => {
    if (!currentAudio) return;

    Alert.alert(
      '音声を保存',
      'この即席音声を保存済みライブラリに追加しますか？より豊富な機能でお楽しみいただけます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '保存する',
          onPress: async () => {
            setConvertingToSaved(true);
            try {
              // This would trigger a conversion API call
              // For now, we'll just simulate the process
              await new Promise(resolve => setTimeout(resolve, 2000));
              Alert.alert('完了', '音声がライブラリに保存されました');
              onClose();
            } catch (error) {
              Alert.alert('エラー', '保存に失敗しました');
            } finally {
              setConvertingToSaved(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPromptIcon = (promptStyle?: string) => {
    return PROMPT_ICONS[promptStyle || 'instant'] || 'flash-outline';
  };

  const getPromptDisplayName = (promptStyle?: string) => {
    const displayNames: { [key: string]: string } = {
      'instant': '即席プロンプト',
      'standard': '標準プロンプト', 
      'strict': 'ストリクトプロンプト',
      'gentle': 'ジェントルプロンプト',
      'insightful': 'インサイトフルプロンプト',
      'custom': 'カスタムプロンプト',
      'recommended': '推奨プロンプト'
    };
    return displayNames[promptStyle || 'standard'] || 'プロンプト未設定';
  };

  const getHeaderTitle = () => {
    if (context === 'home') {
      return 'Home Auto-Pick';
    } else if (context === 'feed') {
      return 'Feed Auto-Pick';
    } else {
      return '即席音声'; // Fallback to original title
    }
  };

  const generateAudioTitle = (chapters: any[], voiceLanguage?: string) => {
    if (!chapters || chapters.length === 0) {
      return voiceLanguage === 'ja-JP' ? '音声ニュース' : 'Audio News';
    }
    
    if (voiceLanguage === 'ja-JP') {
      return `${chapters.length}記事の音声ニュース`;
    } else {
      return `${chapters.length} Articles Audio News`;
    }
  };

  // Convert chapter data to Article format for UnifiedArticleCard
  const convertChapterToArticle = (chapter: any, index: number): Article => ({
    id: `instant_chapter_${index}`,
    title: chapter.title,
    summary: `${formatTime((chapter.start_time || chapter.startTime || 0) * 1000)} - ${formatTime((chapter.end_time || chapter.endTime || 0) * 1000)}`,
    published_at: new Date().toISOString(),
    source_name: 'Instant Audio',
    link: chapter.original_url || chapter.originalUrl || '',
    genre: 'News'
  });

  const handleArticlePress = (article: Article) => {
    // Extract chapter info from article
    const chapterIndex = parseInt(article.id.replace('instant_chapter_', ''));
    const chapter = activeAudioData?.chapters?.[chapterIndex];
    if (chapter) {
      // First, jump to the chapter
      handleJumpToChapter(
        chapter.start_time || chapter.startTime || 0, 
        chapter.title
      );
      
      // Then open the article if URL is available  
      const articleUrl = chapter.original_url || article.link;
      if (articleUrl) {
        setTimeout(() => {
          handleOpenURL(articleUrl, chapter.title);
        }, 500); // Small delay after chapter jump
      }
    }
  };

  const handleCloseArticleReader = () => {
    setShowArticleReader(false);
    setSelectedArticle(null);
  };

  // Debug: Log audio data from both systems
  React.useEffect(() => {
    if (isNewSystemActive && newCurrentTrack) {
      console.log('🎵 InstantAudioView - New System Audio:', {
        id: newCurrentTrack.id,
        title: newCurrentTrack.title,
        hasChapters: !!newCurrentTrack.chapters,
        chaptersLength: newCurrentTrack.chapters?.length || 0,
        chapters: newCurrentTrack.chapters,
        playbackState: newPlaybackState
      });
    } else if (currentAudio) {
      console.log('🎵 InstantAudioView - Legacy System Audio:', {
        id: currentAudio.id,
        title: currentAudio.title,
        hasChapters: !!currentAudio.chapters,
        chaptersLength: currentAudio.chapters?.length || 0,
        chapters: currentAudio.chapters
      });
    }
  }, [currentAudio, newCurrentTrack, newPlaybackState, isNewSystemActive]);

  if (!isInstantAudio) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {getHeaderTitle()}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Audio Info */}
          <View style={[styles.section, styles.audioInfo]}>
            <View style={[styles.audioIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="radio" size={24} color="#fff" />
            </View>
            
            <View style={styles.audioDetails}>
              <Text style={[styles.audioTitle, { color: theme.text }]}>
                {generateAudioTitle(activeAudioData?.chapters, activeAudioData?.voice_language || (isNewSystemActive ? newCurrentTrack?.voice_language : currentAudio?.voice_language))}
              </Text>
              <Text style={[styles.audioSubtitle, { color: theme.textSecondary }]}>
                {getPromptDisplayName(activeAudioData?.prompt_style)} • {formatTime(activeAudioData?.position || 0)} / {formatTime(activeAudioData?.duration || 0)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: theme.primary }]}
              onPress={handlePlayPause}
            >
              <Ionicons 
                name={activeAudioData?.isPlaying ? "pause" : "play"} 
                size={20} 
                color="#fff" 
                style={!activeAudioData?.isPlaying && { marginLeft: 2 }}
              />
            </TouchableOpacity>
          </View>

          {/* News Script Display Section */}
          {activeAudioData?.script && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                獲得したニュース原稿
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                AI生成されたポッドキャストスクリプト
              </Text>
              
              <View style={[styles.scriptContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ScrollView 
                  style={styles.scriptScrollView}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  <Text style={[styles.scriptText, { color: theme.text }]}>
                    {activeAudioData.script}
                  </Text>
                </ScrollView>
              </View>
            </View>
          )}

          {/* Script Content Tab - New Feature */}
          {activeAudioData?.script && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                📄 作成された原稿
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                この音声コンテンツで使用された原稿
              </Text>
              
              <ScrollView 
                style={[styles.scriptContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.scriptText, { color: theme.text }]}>
                  {activeAudioData.script}
                </Text>
              </ScrollView>
            </View>
          )}

          {/* Source Articles - News List with Jump Functionality */}
          {activeAudioData?.chapters && activeAudioData.chapters.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                📰 ニュースリスト ({activeAudioData.chapters.length})
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                タップして再生位置をジャンプ
              </Text>
              
              {/* DEBUG: Log chapters data */}
              {(() => {
                console.log('🗞️ InstantAudioView: Rendering chapters list');
                console.log('🗞️ Chapters data:', activeAudioData?.chapters);
                console.log('🗞️ Chapters length:', activeAudioData?.chapters?.length);
                return activeAudioData.chapters.map((chapter: any, index: number) => {
                  console.log(`🗞️ Chapter ${index}:`, chapter);
                  return (
                <UnifiedArticleCard
                  key={index}
                  article={convertChapterToArticle(chapter, index)}
                  onPress={handleArticlePress}
                  style={styles.articleCardOverride}
                />
                  );
                });
              })()}
            </View>
          )}

          {/* Action Section */}
          <View style={[styles.section, styles.actionSection]}>
            <TouchableOpacity
              style={[
                styles.convertButton, 
                { backgroundColor: theme.primary },
                convertingToSaved && styles.convertButtonDisabled
              ]}
              onPress={handleConvertToSaved}
              disabled={convertingToSaved}
            >
              {convertingToSaved ? (
                <>
                  <Ionicons name="hourglass-outline" size={20} color="#fff" />
                  <Text style={styles.convertButtonText}>保存中...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.convertButtonText}>ライブラリに保存</Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>
              保存すると、スクリプト表示、ブックマーク、ダウンロードなどの機能が利用できます
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Article Reader (In-app browser) */}
      <ArticleReader
        article={selectedArticle}
        visible={showArticleReader}
        onClose={handleCloseArticleReader}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioDetails: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  audioSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSection: {
    marginTop: 8,
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  convertButtonDisabled: {
    opacity: 0.6,
  },
  convertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  articleCardOverride: {
    marginHorizontal: 0, // Override default horizontal margin
    marginVertical: 6,   // Smaller vertical spacing
  },
  scriptContainer: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200, // Max height for scrollable content
    padding: 16,
    marginTop: 8,
  },
  scriptText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto', // Native fonts for better readability
  },
});