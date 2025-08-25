/**
 * SavedAudioView - Full-screen saved audio with all features
 * Features: Playlist management, analytics, sharing, full script, chapters
 * All features except sleep timer as requested
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../../../context/ThemeContext';
import { useUnifiedAudio } from '../../../context/UnifiedAudioContext';
import { SavedPlayerProps, AudioTrack, Chapter } from '../../../types/audio';
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

const SavedAudioView: React.FC<SavedPlayerProps> = ({
  visible,
  onClose,
  onAddToPlaylist,
  onShare
}) => {
  const { theme } = useTheme();
  const { 
    state, 
    togglePlayPause, 
    seekTo, 
    jumpToChapter, 
    setPlaybackRate,
    addToPlaylist,
    toggleFavorite 
  } = useUnifiedAudio();
  
  const { 
    currentTrack, 
    playbackState, 
    positionMillis, 
    durationMillis,
    playbackRate 
  } = state;

  // UI state
  const [activeTab, setActiveTab] = useState<'chapters' | 'script' | 'info'>('chapters');
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [showArticleReader, setShowArticleReader] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Only show if we have saved audio
  const shouldShow = visible && 
                    currentTrack && 
                    state.audioType === 'saved';

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

  const handleToggleFavorite = useCallback(async () => {
    try {
      await toggleFavorite();
      setIsFavorite(!isFavorite);
      Alert.alert('お気に入り', isFavorite ? 'お気に入りから削除しました' : 'お気に入りに追加しました');
    } catch (error) {
      Alert.alert('エラー', 'お気に入りの変更に失敗しました');
    }
  }, [toggleFavorite, isFavorite]);

  const handleAddToPlaylist = useCallback(() => {
    setShowPlaylistSelector(true);
  }, []);

  const handlePlaylistSelect = useCallback(async (playlistId: string, playlistName: string) => {
    try {
      await addToPlaylist(playlistId);
      onAddToPlaylist?.(playlistId);
      setShowPlaylistSelector(false);
      Alert.alert('プレイリスト', `"${playlistName}"に追加されました`);
    } catch (error) {
      Alert.alert('エラー', 'プレイリストへの追加に失敗しました');
    }
  }, [addToPlaylist, onAddToPlaylist]);

  const handleShareAudio = useCallback(() => {
    if (!currentTrack) return;
    
    Alert.alert(
      '音声をシェア',
      'この音声をシェアしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'シェア',
          onPress: () => {
            onShare?.(currentTrack);
            console.log('Sharing saved audio:', currentTrack.title);
          },
        },
      ]
    );
  }, [currentTrack, onShare]);

  const handleArticlePress = useCallback((articleUrl: string, articleTitle: string) => {
    const article: Article = {
      id: `saved_article_${Date.now()}`,
      title: articleTitle,
      summary: '',
      published_at: new Date().toISOString(),
      source_name: 'Saved Audio',
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

  const getListeningProgress = () => {
    // Calculate listening progress for analytics
    if (durationMillis > 0) {
      return Math.round((positionMillis / durationMillis) * 100);
    }
    return 0;
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
            保存済み音声
          </Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerAction}>
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorite ? "#FF6B6B" : theme.text} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleShareAudio} style={styles.headerAction}>
              <Ionicons name="share-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Audio Info Section */}
          <View style={[styles.section, styles.audioInfoSection]}>
            <View style={styles.audioHeader}>
              <View style={[styles.audioIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="library" size={28} color="#fff" />
              </View>
              
              <View style={styles.audioDetails}>
                <Text style={[styles.audioTitle, { color: theme.text }]}>
                  {currentTrack?.title || 'Saved Audio'}
                </Text>
                
                <View style={styles.audioMeta}>
                  <Text style={[styles.audioMetaText, { color: theme.textSecondary }]}>
                    {getVoiceLanguageDisplay()}
                  </Text>
                  <Text style={[styles.audioMetaText, { color: theme.textSecondary }]}>
                    • {currentTrack?.chapters?.length || 0}記事
                  </Text>
                </View>
                
                {currentTrack?.created_at && (
                  <Text style={[styles.createdDate, { color: theme.textSecondary }]}>
                    作成日: {format(new Date(currentTrack.created_at), 'yyyy年MM月dd日')}
                  </Text>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <ActionButton
                icon="list-outline"
                label="プレイリスト追加"
                onPress={handleAddToPlaylist}
                variant="secondary"
                size="medium"
              />
            </View>
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

          {/* Analytics Section */}
          <View style={[styles.section, styles.analyticsSection]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              再生統計
            </Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: theme.text }]}>
                  {getListeningProgress()}%
                </Text>
                <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>
                  視聴進捗
                </Text>
              </View>
              
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: theme.text }]}>
                  {playbackRate}x
                </Text>
                <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>
                  再生速度
                </Text>
              </View>
              
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: theme.text }]}>
                  {Math.floor(totalTimeSeconds / 60)}分
                </Text>
                <Text style={[styles.analyticsLabel, { color: theme.textSecondary }]}>
                  総再生時間
                </Text>
              </View>
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
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'info' && { backgroundColor: theme.primary },
                ]}
                onPress={() => setActiveTab('info')}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === 'info' ? '#fff' : theme.text,
                    },
                  ]}
                >
                  情報
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
              
              {activeTab === 'info' && currentTrack && (
                <View style={styles.infoContent}>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>音声ID</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{currentTrack.id}</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>音声言語</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      {getVoiceLanguageDisplay()}
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>音声モデル</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      {currentTrack.voice_name || 'alloy'}
                    </Text>
                  </View>
                  
                  {currentTrack.prompt_style && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>プロンプトスタイル</Text>
                      <Text style={[styles.infoValue, { color: theme.text }]}>
                        {currentTrack.prompt_style}
                      </Text>
                    </View>
                  )}
                  
                  {currentTrack.context && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>作成元</Text>
                      <Text style={[styles.infoValue, { color: theme.text }]}>
                        {currentTrack.context}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Playlist Selector Modal */}
        {showPlaylistSelector && (
          <Modal
            visible={showPlaylistSelector}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowPlaylistSelector(false)}
          >
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => setShowPlaylistSelector(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  プレイリスト選択
                </Text>
                <View style={{ width: 24 }} />
              </View>
              
              <ScrollView style={styles.content}>
                {/* Mock playlist data */}
                {[
                  { id: 'playlist1', name: 'お気に入り' },
                  { id: 'playlist2', name: 'ニュース' },
                  { id: 'playlist3', name: 'ビジネス' },
                  { id: 'playlist4', name: 'テクノロジー' },
                ].map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={[styles.playlistItem, { borderBottomColor: theme.border }]}
                    onPress={() => handlePlaylistSelect(playlist.id, playlist.name)}
                  >
                    <Ionicons name="list-outline" size={24} color={theme.textSecondary} />
                    <Text style={[styles.playlistName, { color: theme.text }]}>
                      {playlist.name}
                    </Text>
                    <Ionicons name="add" size={20} color={theme.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    padding: 4,
    marginLeft: 8,
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
  createdDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionButtons: {
    width: '100%',
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
  analyticsSection: {},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
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
    paddingHorizontal: 12,
    marginRight: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    minHeight: 300,
  },
  infoContent: {
    paddingVertical: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  playlistName: {
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
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

export default SavedAudioView;