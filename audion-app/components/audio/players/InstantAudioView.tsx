/**
 * InstantAudioView - Full-screen instant audio with all features
 * Features: Script display, chapter navigation, save functionality, sharing
 * 最重要: ニュース原稿とニュースリストが完全実装
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useUnifiedAudio } from '../../../context/UnifiedAudioContext';
import { InstantPlayerProps, AudioTrack, Chapter } from '../../../types/audio';
import { PlayPauseButton, TimeDisplay, PlaybackSpeedControl, ActionButton } from '../shared/AudioControls';
import { SeekBar } from '../shared/SeekBar';
import { ChapterNavigation, ScriptDisplay } from '../shared/ChapterNavigation';

interface Article {
  id: string;
  title: string;
  summary: string;
  published_at: string;
  source_name: string;
  link: string;
  genre: string;
}

const InstantAudioView: React.FC<InstantPlayerProps> = ({
  visible,
  onClose,
  onSave,
  context
}) => {
  const { theme } = useTheme();
  const { 
    state, 
    togglePlayPause, 
    seekTo, 
    jumpToChapter, 
    convertToSaved, 
    setPlaybackRate 
  } = useUnifiedAudio();
  
  const { 
    currentTrack, 
    playbackState, 
    positionMillis, 
    durationMillis,
    playbackRate 
  } = state;

  // UI state
  const [activeTab, setActiveTab] = useState<'chapters' | 'script'>('chapters');
  const [showArticleReader, setShowArticleReader] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Only show if we have instant audio
  const shouldShow = visible && 
                    currentTrack && 
                    state.audioType === 'instant';

  const handlePlayPause = useCallback(async () => {
    await togglePlayPause();
  }, [togglePlayPause]);

  const handleSeek = useCallback((timeSeconds: number) => {
    seekTo(timeSeconds);
  }, [seekTo]);

  const handleChapterPress = useCallback((chapter: Chapter) => {
    jumpToChapter(chapter);
  }, [jumpToChapter]);

  const handleSpeedChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
  }, [setPlaybackRate]);

  const handleSaveAudio = useCallback(async () => {
    if (!currentTrack) return;

    Alert.alert(
      '音声を保存',
      'この即席音声をライブラリに保存しますか？カスタム名前を付けることも可能です。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'そのまま保存',
          onPress: async () => {
            try {
              await convertToSaved();
              onSave?.(currentTrack);
              Alert.alert('完了', '音声がライブラリに保存されました');
            } catch (error) {
              Alert.alert('エラー', '保存に失敗しました');
            }
          },
        },
        {
          text: 'カスタム名で保存',
          onPress: () => {
            // TODO: Show text input dialog for custom name
            Alert.prompt(
              'カスタム名前',
              '保存する音声の名前を入力してください：',
              async (customName) => {
                if (customName) {
                  try {
                    await convertToSaved(customName);
                    onSave?.(currentTrack);
                    Alert.alert('完了', `"${customName}"として保存されました`);
                  } catch (error) {
                    Alert.alert('エラー', '保存に失敗しました');
                  }
                }
              }
            );
          },
        },
      ]
    );
  }, [currentTrack, convertToSaved, onSave]);

  const handleShareAudio = useCallback(() => {
    if (!currentTrack) return;
    
    Alert.alert(
      '音声をシェア',
      'この即席音声をシェアしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'シェア',
          onPress: () => {
            // TODO: Implement sharing functionality
            console.log('Sharing instant audio:', currentTrack.title);
          },
        },
      ]
    );
  }, [currentTrack]);

  const handleArticlePress = useCallback((articleUrl: string, articleTitle: string) => {
    const article: Article = {
      id: `instant_article_${Date.now()}`,
      title: articleTitle,
      summary: '',
      published_at: new Date().toISOString(),
      source_name: 'Instant Audio',
      link: articleUrl,
      genre: 'News'
    };
    
    setSelectedArticle(article);
    setShowArticleReader(true);
  }, []);

  const handleCloseArticleReader = useCallback(() => {
    setShowArticleReader(false);
    setSelectedArticle(null);
  }, []);

  const getContextTitle = () => {
    const contextMap = {
      home: 'Home Auto-Pick',
      feed: 'Feed Auto-Pick'
    };
    return contextMap[context || 'home'] || '即席音声';
  };

  const getVoiceLanguageDisplay = () => {
    const languageMap: { [key: string]: string } = {
      'en-US': '🇺🇸 English',
      'ja-JP': '🇯🇵 日本語',
      'es-ES': '🇪🇸 Spanish',
      'fr-FR': '🇫🇷 French',
      'de-DE': '🇩🇪 German',
    };
    return languageMap[currentTrack?.voice_language || 'ja-JP'] || '🎵 Audio';
  };

  if (!shouldShow) {
    return null;
  }

  const isPlaying = playbackState === 'PLAYING';
  const isLoading = playbackState === 'LOADING';
  const currentTimeSeconds = positionMillis / 1000;
  const totalTimeSeconds = durationMillis / 1000;

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
            {getContextTitle()}
          </Text>
          
          <TouchableOpacity onPress={handleShareAudio} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Audio Info Section */}
          <View style={[styles.section, styles.audioInfoSection]}>
            <View style={styles.audioHeader}>
              <View style={[styles.audioIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="radio" size={28} color="#fff" />
              </View>
              
              <View style={styles.audioDetails}>
                <Text style={[styles.audioTitle, { color: theme.text }]}>
                  {currentTrack?.title || 'Instant Audio'}
                </Text>
                
                <View style={styles.audioMeta}>
                  <Text style={[styles.audioMetaText, { color: theme.textSecondary }]}>
                    {getVoiceLanguageDisplay()}
                  </Text>
                  <Text style={[styles.audioMetaText, { color: theme.textSecondary }]}>
                    • {currentTrack?.chapters?.length || 0}記事
                  </Text>
                </View>
                
                {currentTrack?.prompt_style && (
                  <Text style={[styles.promptStyle, { color: theme.accent }]}>
                    プロンプト: {currentTrack.prompt_style}
                  </Text>
                )}
              </View>
            </View>

            {/* Save Button */}
            <ActionButton
              icon="save-outline"
              label="ライブラリに保存"
              onPress={handleSaveAudio}
              variant="primary"
            />
          </View>

          {/* Playback Controls Section */}
          <View style={[styles.section, styles.controlsSection]}>
            <SeekBar
              currentTime={currentTimeSeconds}
              totalTime={totalTimeSeconds}
              onSeek={handleSeek}
              variant="full"
              showThumb={true}
            />
            
            <View style={styles.playbackControls}>
              <TimeDisplay
                currentTime={currentTimeSeconds}
                totalTime={totalTimeSeconds}
                variant="full"
              />
              
              <View style={styles.centerControls}>
                <PlayPauseButton
                  isPlaying={isPlaying}
                  isLoading={isLoading}
                  onPress={handlePlayPause}
                  size="large"
                  variant="primary"
                />
              </View>
              
              <PlaybackSpeedControl
                currentRate={playbackRate}
                onRateChange={handleSpeedChange}
              />
            </View>
          </View>

          {/* Content Tabs */}
          <View style={[styles.section, styles.tabSection]}>
            <View style={styles.tabHeader}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'chapters' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setActiveTab('chapters')}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === 'chapters' ? '#fff' : theme.text,
                    },
                  ]}
                >
                  ニュースリスト
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'script' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setActiveTab('script')}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === 'script' ? '#fff' : theme.text,
                    },
                  ]}
                >
                  原稿
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={styles.tabContent}>
              {activeTab === 'chapters' && currentTrack && (
                <ChapterNavigation
                  audioTrack={currentTrack}
                  onChapterPress={handleChapterPress}
                  onArticlePress={handleArticlePress}
                  showArticleLinks={true}
                  variant="full"
                />
              )}
              
              {activeTab === 'script' && currentTrack?.script && (
                <ScriptDisplay
                  script={currentTrack.script}
                  currentTime={currentTimeSeconds}
                  totalTime={totalTimeSeconds}
                  variant="full"
                />
              )}
              
              {activeTab === 'script' && !currentTrack?.script && (
                <View style={styles.emptyScript}>
                  <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyScriptText, { color: theme.textSecondary }]}>
                    原稿がまだ作成されていません
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Article Reader Modal */}
        {showArticleReader && selectedArticle && (
          <Modal
            visible={showArticleReader}
            animationType="slide"
            onRequestClose={handleCloseArticleReader}
          >
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={handleCloseArticleReader}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                  記事を読む
                </Text>
                <View style={{ width: 24 }} />
              </View>
              
              <ScrollView style={styles.content}>
                <Text style={[styles.articleTitle, { color: theme.text }]}>
                  {selectedArticle.title}
                </Text>
                <Text style={[styles.articleMeta, { color: theme.textSecondary }]}>
                  {selectedArticle.source_name} • {selectedArticle.genre}
                </Text>
                <View style={styles.articlePlaceholder}>
                  <Ionicons name="globe-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.articlePlaceholderText, { color: theme.textSecondary }]}>
                    記事の内容はWebビューで表示されます
                  </Text>
                  <ActionButton
                    icon="open-outline"
                    label="外部ブラウザで開く"
                    onPress={() => {
                      // TODO: Open in external browser
                      console.log('Opening in external browser:', selectedArticle.link);
                    }}
                    variant="primary"
                  />
                </View>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
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
  },
  closeButton: {
    padding: 4,
  },
  shareButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  audioInfoSection: {
    alignItems: 'center',
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  audioIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  audioDetails: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  audioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  audioMetaText: {
    fontSize: 14,
    marginRight: 8,
  },
  promptStyle: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  controlsSection: {},
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  centerControls: {
    alignItems: 'center',
  },
  tabSection: {
    flex: 1,
    paddingBottom: 0,
  },
  tabHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    minHeight: 300,
  },
  emptyScript: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyScriptText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  articleMeta: {
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  articlePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  articlePlaceholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
});

export default InstantAudioView;