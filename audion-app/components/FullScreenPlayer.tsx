import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

export default function FullScreenPlayer() {
  const {
    currentAudio,
    isPlaying,
    isLoading,
    position,
    duration,
    playbackRate,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setPlaybackRate,
    showFullScreenPlayer,
    setShowFullScreenPlayer,
    openDirectToScript,
    recordInteraction,
  } = useAudio();
  
  const { token } = useAuth();
  const { theme } = useTheme();
  const [isSaved, setIsSaved] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [showFullScript, setShowFullScript] = React.useState(false);
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
  const [showHeaderMiniPlayer, setShowHeaderMiniPlayer] = React.useState(false);
  const scriptScrollRef = React.useRef<ScrollView>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Auto-open script when requested from mini player
  React.useEffect(() => {
    if (openDirectToScript && showFullScreenPlayer) {
      setShowFullScript(true);
      // Reset the flag after opening
      setShowFullScreenPlayer(true, false);
    }
  }, [openDirectToScript, showFullScreenPlayer]);
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8003/api';

  // スクロール検知: 再生ボタンが画面外に出たらヘッダーにミニプレイヤー表示
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    // 再生ボタン位置の推定（アルバムアート + 音声情報 + プログレス + コントロールの高さ）
    const controlsPosition = 320 + 80 + 100 + 80; // 約580px
    const shouldShowMiniPlayer = scrollY > controlsPosition;
    setShowHeaderMiniPlayer(shouldShowMiniPlayer);
  };
  
  const playbackRates = [0.7, 1.0, 1.3, 1.5];

  // Calculate words per second for synchronization (approximate)
  const estimateWordsPerSecond = (script: string, durationMs: number) => {
    const words = script.split(/\s+/).filter(word => word.length > 0);
    const totalWords = words.length;
    const durationSeconds = durationMs / 1000;
    return totalWords / durationSeconds;
  };

  // Enhanced high-precision word synchronization
  React.useEffect(() => {
    if (currentAudio?.script && duration > 0) {
      const words = currentAudio.script.split(/\s+/).filter(word => word.length > 0);
      const totalWords = words.length;
      
      if (totalWords === 0) return;
      
      // More accurate timing calculation
      const effectiveDuration = duration; // Use actual duration without playback rate division
      const currentSeconds = position / 1000;
      
      // Calculate words per second based on real audio duration
      const wordsPerSecond = totalWords / (effectiveDuration / 1000);
      
      // Apply playback rate to current position instead of duration
      const adjustedCurrentSeconds = currentSeconds * (playbackRate || 1.0);
      
      // Calculate precise word index with minimal buffering
      const rawWordIndex = adjustedCurrentSeconds * wordsPerSecond;
      
      // Fine-tuning: slight advancement to compensate for audio processing delay
      const audioProcessingDelay = 0.1; // 100ms processing compensation
      const adjustedWordIndex = rawWordIndex + (audioProcessingDelay * wordsPerSecond);
      
      const clampedWordIndex = Math.max(0, Math.min(Math.floor(adjustedWordIndex), totalWords - 1));
      
      // Only update if there's a significant change to reduce jitter
      if (Math.abs(clampedWordIndex - currentWordIndex) >= 1) {
        setCurrentWordIndex(clampedWordIndex);
      }

      // Enhanced auto-scroll with smoother tracking
      if (scriptScrollRef.current && clampedWordIndex > 0 && isPlaying) {
        const wordsPerLine = 8;
        const lineHeight = 32;
        const currentLine = Math.floor(clampedWordIndex / wordsPerLine);
        const scrollY = currentLine * lineHeight;
        
        scriptScrollRef.current.scrollTo({
          y: Math.max(0, scrollY - 100),
          animated: false // Disable animation for real-time sync
        });
      }
    }
  }, [position, currentAudio?.script, duration, isPlaying, playbackRate, currentWordIndex]);

  // Handle seeking operations for immediate sync
  React.useEffect(() => {
    if (currentAudio?.script && duration > 0) {
      const words = currentAudio.script.split(/\s+/).filter(word => word.length > 0);
      const totalWords = words.length;
      
      // Use consistent calculation with main sync logic
      const wordsPerSecond = totalWords / (duration / 1000);
      const currentSeconds = position / 1000;
      const adjustedCurrentSeconds = currentSeconds * (playbackRate || 1.0);
      const rawWordIndex = adjustedCurrentSeconds * wordsPerSecond;
      
      const estimatedWordIndex = Math.max(0, Math.min(Math.floor(rawWordIndex), totalWords - 1));
      
      // Immediate update for seeking operations
      setCurrentWordIndex(estimatedWordIndex);
    }
  }, [position]); // Only position dependency for seeking

  if (!showFullScreenPlayer || !currentAudio) {
    return null;
  }

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ヘッダーミニプレイヤーコンポーネント（スクリプトアイコンなし）
  const renderHeaderMiniPlayer = () => {
    if (!showHeaderMiniPlayer || !currentAudio) return null;

    return (
      <View style={[styles.headerMiniPlayer, { backgroundColor: theme.accent }]}>
        {/* アルバムアート */}
        <View style={[styles.headerMiniAlbumArt, { backgroundColor: theme.surface }]}>
          <Ionicons name="musical-notes" size={16} color={theme.textMuted} />
        </View>

        {/* タイトル・進行状況 */}
        <View style={styles.headerMiniInfo}>
          <Text style={[styles.headerMiniTitle, { color: theme.text }]} numberOfLines={1}>
            {currentAudio.title}
          </Text>
          <Text style={[styles.headerMiniSubtitle, { color: theme.textSecondary }]}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

        {/* 再生/一時停止ボタンのみ */}
        <TouchableOpacity
          onPress={isPlaying ? pauseAudio : resumeAudio}
          style={[styles.headerMiniPlayButton, { backgroundColor: theme.primary }]}
          disabled={isLoading}
        >
          {isLoading ? (
            <Ionicons name="hourglass" size={18} color="#ffffff" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={18}
              color="#ffffff"
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeek = (percentage: number) => {
    if (duration > 0 && isFinite(percentage) && percentage >= 0 && percentage <= 100) {
      const newPosition = (percentage / 100) * duration;
      seekTo(newPosition);
    }
  };

  const skipForward = () => {
    const newPosition = Math.min(position + 30000, duration);
    seekTo(newPosition);
  };

  const skipBackward = () => {
    const newPosition = Math.max(position - 30000, 0);
    seekTo(newPosition);
  };

  const handleSave = async () => {
    if (isSaved) return;
    
    setIsSaved(true);
    await recordInteraction('saved');
    // TODO: Implement actual save to library/favorites
  };

  const handleLike = async () => {
    await recordInteraction('liked');
    // TODO: Visual feedback for like
  };

  const handleReportMisreading = async () => {
    Alert.alert(
      'Report Misreading',
      'Report a misreading issue at the current playback position?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: async () => {
            try {
              await axios.post(`${API}/feedback/misreading`, {
                audio_id: currentAudio.id,
                timestamp: position,
              }, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Thank You', 'Misreading reported successfully! We\'ll use this to improve our TTS system.');
            } catch (error) {
              console.error('Error reporting misreading:', error);
              Alert.alert('Error', 'Failed to report misreading. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Render news script with enhanced theme-aware highlighting
  const renderNewsScript = () => {
    if (!currentAudio?.script) return null;

    const words = currentAudio.script.split(/\s+/).filter(word => word.length > 0);

    return (
      <View style={styles.scriptContainer}>
        {words.map((word, index) => {
          const isCurrent = index === currentWordIndex;
          const hasBeenRead = index < currentWordIndex;
          const isNext = index === currentWordIndex + 1;
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.wordContainer}
              onPress={() => handleWordPress(index, words.length)}
            >
              <Text
                style={[
                  styles.scriptWord,
                  { color: theme.lyricsDefault },
                  isCurrent && [styles.currentWord, { 
                    color: theme.lyricsCurrent, 
                    backgroundColor: theme.lyricsCurrentBg 
                  }],
                  hasBeenRead && [styles.readWord, { color: theme.lyricsRead }],
                  isNext && [styles.nextWord, { color: theme.lyricsNext }],
                ]}
              >
                {word}{' '}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Handle word press for seeking
  const handleWordPress = (wordIndex: number, totalWords: number) => {
    if (duration > 0) {
      const wordsPerSecond = estimateWordsPerSecond(currentAudio!.script!, duration);
      const targetSeconds = wordIndex / wordsPerSecond;
      const targetPosition = targetSeconds * 1000;
      seekTo(Math.min(targetPosition, duration - 1000)); // Ensure we don't seek past the end
    }
  };

  // Render synced preview script with current word highlighting
  const renderSyncedPreviewScript = () => {
    if (!currentAudio?.script) return null;

    const words = currentAudio.script.split(/\s+/).filter(word => word.length > 0);
    const totalWords = words.length;
    
    // Calculate which words to show in preview (around current position)
    const previewWordCount = 25; // Show about 25 words in preview
    const startIndex = Math.max(0, currentWordIndex - 8);
    const endIndex = Math.min(totalWords, startIndex + previewWordCount);
    const previewWords = words.slice(startIndex, endIndex);
    
    return (
      <View style={styles.syncedPreviewContainer}>
        {previewWords.map((word, index) => {
          const actualIndex = startIndex + index;
          const isCurrent = actualIndex === currentWordIndex;
          const isRead = actualIndex < currentWordIndex;
          const isNext = actualIndex === currentWordIndex + 1;
          
          return (
            <Text
              key={actualIndex}
              style={[
                styles.previewWord,
                { color: theme.lyricsDefault },
                isCurrent && [styles.currentPreviewWord, { 
                  color: theme.lyricsCurrent, 
                  backgroundColor: theme.lyricsCurrentBg 
                }],
                isRead && [styles.readPreviewWord, { color: theme.lyricsRead }],
                isNext && [styles.nextPreviewWord, { color: theme.lyricsNext }],
              ]}
              onPress={() => handleWordPress(actualIndex, totalWords)}
            >
              {word}{' '}
            </Text>
          );
        })}
        {endIndex < totalWords && (
          <Text style={styles.previewEllipsis}>...</Text>
        )}
      </View>
    );
  };

  const handleViewOriginalArticle = async (originalUrl: string) => {
    if (originalUrl) {
      try {
        await WebBrowser.openBrowserAsync(originalUrl);
      } catch (error) {
        console.error('Error opening article:', error);
        Alert.alert('Error', 'Failed to open the original article.');
      }
    } else {
      Alert.alert('Error', 'Original article URL not available.');
    }
  };

  const handleJumpToChapter = async (startTime: number) => {
    try {
      // Record the jump interaction
      await recordInteraction('jumped_to_chapter');
      
      // Use seekTo for proper audio jumping without restarting
      if (duration > 0 && startTime >= 0 && startTime < duration) {
        seekTo(startTime);
        
        // Ensure audio continues playing after seek
        if (!isPlaying) {
          setTimeout(() => {
            resumeAudio();
          }, 100);
        }
      } else {
        console.warn('Invalid jump time:', startTime, 'Duration:', duration);
        Alert.alert('Error', 'Cannot jump to this position in the audio.');
      }
    } catch (error) {
      console.error('Error jumping to chapter:', error);
      Alert.alert('Error', 'Failed to jump to the selected story.');
    }
  };

  return (
    <Modal
      visible={showFullScreenPlayer}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header - 条件的表示 */}
        {showHeaderMiniPlayer ? (
          // ヘッダーミニプレイヤー
          <View style={[styles.header, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              onPress={() => setShowFullScreenPlayer(false)}
              style={styles.headerButton}
            >
              <Ionicons name="chevron-down" size={28} color={theme.text} />
            </TouchableOpacity>
            
            {renderHeaderMiniPlayer()}
            
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={styles.headerButton}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        ) : (
          // 通常ヘッダー
          <View style={[styles.header, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              onPress={() => setShowFullScreenPlayer(false)}
              style={styles.headerButton}
            >
              <Ionicons name="chevron-down" size={28} color={theme.text} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.text }]}>Now Playing</Text>
            
            <TouchableOpacity
              onPress={() => setShowMenu(true)}
              style={styles.headerButton}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Scrollable Content */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Main Player Section */}
          <View style={styles.mainPlayerSection}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            <View style={[styles.albumArt, { backgroundColor: theme.accent }]}>
              <Ionicons name="musical-notes" size={80} color={theme.textMuted} />
            </View>
          </View>

          {/* Audio Info */}
          <View style={styles.audioInfo}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {currentAudio.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {format(new Date(currentAudio.created_at), 'MMMM dd, yyyy')}
            </Text>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <TouchableOpacity
              style={styles.progressBarContainer}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                if (isFinite(locationX) && width > 0) {
                  const percentage = (locationX / width) * 100;
                  handleSeek(Math.max(0, Math.min(100, percentage)));
                }
              }}
            >
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` }
                  ]}
                />
                <View
                  style={[
                    styles.progressThumb,
                    { left: `${progressPercentage}%` }
                  ]}
                />
              </View>
            </TouchableOpacity>
            
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(position)}</Text>
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              onPress={skipBackward}
              style={styles.skipButton}
            >
              <Ionicons name="play-back" size={32} color={theme.text} />
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>30</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isPlaying ? pauseAudio : resumeAudio}
              style={[styles.playButton, { backgroundColor: theme.primary }]}
              disabled={isLoading}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={36} color="#ffffff" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={36}
                  color="#ffffff"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={skipForward}
              style={styles.skipButton}
            >
              <Ionicons name="play-forward" size={32} color={theme.text} />
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Scroll Indicator */}
          <View style={styles.scrollIndicator}>
            <Ionicons name="chevron-up" size={20} color={theme.textMuted} />
            <Text style={[styles.scrollHint, { color: theme.textMuted }]}>Swipe up for news script</Text>
          </View>
        </View>

          {/* News Script Preview Section with Real-time Sync */}
          {currentAudio.script && (
            <View style={[styles.scriptPreviewSection, { backgroundColor: theme.background }]}>
              <Text style={[styles.scriptSectionTitle, { color: theme.text }]}>📝 News Script</Text>
              <TouchableOpacity 
                style={[styles.scriptPreviewContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setShowFullScript(true)}
              >
                {renderSyncedPreviewScript()}
                <View style={styles.scriptExpandHint}>
                  <Ionicons name="expand" size={16} color={theme.textMuted} />
                  <Text style={[styles.scriptExpandText, { color: theme.textMuted }]}>Tap to expand full script</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Sources Section - Minimal Design */}
          {currentAudio.chapters && currentAudio.chapters.length > 0 && (
            <View style={[styles.sourcesSection, { backgroundColor: theme.background }]}>
              <Text style={[styles.sourcesSectionTitle, { color: theme.text }]}>📰 News Sources</Text>
              <View style={styles.sourcesContainer}>
                {currentAudio.chapters.map((chapter: any, index: number) => {
                  const isCurrentChapter = position >= chapter.start_time && position < chapter.end_time;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.minimalSourceCard, 
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        isCurrentChapter && [styles.currentSourceCard, { backgroundColor: theme.accent, borderColor: theme.primary }]
                      ]}
                      onPress={() => handleJumpToChapter(chapter.start_time)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.sourceCardContent}>
                        <Text style={[
                          styles.minimalSourceTitle, 
                          { color: isCurrentChapter ? theme.primary : theme.text },
                          isCurrentChapter && styles.currentSourceTitle
                        ]} numberOfLines={2}>
                          {chapter.title}
                        </Text>
                        <Text style={[styles.minimalSourceTime, { color: theme.textSecondary }]}>
                          {formatTime(chapter.start_time)} - {formatTime(chapter.end_time)}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.minimalViewButton, { backgroundColor: theme.accent, borderColor: theme.border }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          console.log('=== NEWS SOURCE BUTTON PRESSED ===');
                          console.log('Chapter data:', chapter);
                          console.log('Chapter original_url:', chapter.original_url);
                          console.log('Chapter title:', chapter.title);
                          
                          if (chapter.original_url && chapter.original_url.trim() !== '') {
                            console.log('Opening URL:', chapter.original_url);
                            handleViewOriginalArticle(chapter.original_url);
                          } else {
                            console.log('No URL available for chapter:', chapter.title);
                            Alert.alert('Info', 'Original article URL not available for this news source.');
                          }
                        }}
                      >
                        <Ionicons name="open-outline" size={18} color={theme.primary} />
                      </TouchableOpacity>
                      {isCurrentChapter && (
                        <View style={styles.minimalCurrentIndicator}>
                          <View style={[styles.currentDot, { backgroundColor: theme.primary }]} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Minimal Legal Notice */}
              <Text style={styles.minimalLegalText}>
                AI-generated summaries • Original articles remain property of their publishers
              </Text>
            </View>
          )}
        </ScrollView>

      </SafeAreaView>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { handleSave(); setShowMenu(false); }}>
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color="#1f2937" />
              <Text style={styles.menuItemText}>{isSaved ? 'Bookmarked' : 'Bookmark'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { handleLike(); setShowMenu(false); }}>
              <Ionicons name="heart-outline" size={20} color="#1f2937" />
              <Text style={styles.menuItemText}>Like</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { handleReportMisreading(); setShowMenu(false); }}>
              <Ionicons name="warning-outline" size={20} color="#1f2937" />
              <Text style={styles.menuItemText}>Report Issue</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <Text style={styles.menuSectionTitle}>Playback Speed</Text>
            {playbackRates.map((rate) => (
              <TouchableOpacity
                key={rate}
                style={styles.menuItem}
                onPress={() => {
                  setPlaybackRate(rate);
                  setShowMenu(false);
                }}
              >
                <Ionicons name="speedometer-outline" size={20} color="#1f2937" />
                <Text style={styles.menuItemText}>{rate}x</Text>
                {playbackRate === rate && (
                  <Ionicons name="checkmark" size={16} color="#4f46e5" style={styles.menuCheckmark} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Script Modal */}
      <Modal
        visible={showFullScript}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={[styles.fullScriptModalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.fullScriptHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => setShowFullScript(false)}
              style={styles.fullScriptCloseButton}
            >
              <Ionicons name="chevron-down" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.fullScriptTitle, { color: theme.text }]}>Full Script</Text>
            <View style={styles.fullScriptCloseButton} />
          </View>
          <ScrollView 
            ref={scriptScrollRef}
            style={styles.fullScriptScrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.fullScriptContent, { backgroundColor: theme.background }]}>
              {renderNewsScript()}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerButton: {
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  scrollContainer: {
    flex: 1,
  },
  mainPlayerSection: {
    minHeight: Dimensions.get('window').height - 100, // Full screen minus header
    paddingHorizontal: 30,
    paddingTop: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  albumArt: {
    width: 280,
    height: 280,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  audioInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 40,
  },
  progressBarContainer: {
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    marginLeft: -8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  skipButton: {
    padding: 20,
    marginHorizontal: 20,
    position: 'relative',
  },
  skipText: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    bottom: 12,
    alignSelf: 'center',
  },
  playButton: {
    backgroundColor: '#4f46e5',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  chaptersSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  chaptersScrollView: {
    maxHeight: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  currentChapterItem: {
    backgroundColor: '#f0f0ff',
  },
  chapterNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chapterNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  currentChapterText: {
    color: '#4f46e5',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  chapterTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  scriptSection: {
    flex: 1,
    marginTop: 20,
  },
  newsScriptSection: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  newsScriptScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 200,
  },
  scriptContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  wordContainer: {
    marginRight: 4,
    marginVertical: 2,
  },
  lineStart: {
    marginLeft: 0,
  },
  scriptWord: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 32,
    letterSpacing: 0.3,
  },
  currentWord: {
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  readWord: {
    fontWeight: '500',
  },
  nextWord: {
    fontWeight: '500',
  },
  scrollIndicator: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  scrollHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    fontWeight: '500',
  },
  fullNewsScriptSection: {
    minHeight: Dimensions.get('window').height - 100,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  scriptSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  fullNewsScriptScrollView: {
    flex: 1,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  scriptScrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
  },
  stopButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    minWidth: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  menuCheckmark: {
    marginLeft: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attributionNote: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  currentSourceItem: {
    backgroundColor: '#f0f0ff',
  },
  sourceNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  currentSourceText: {
    color: '#4f46e5',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sourceAttribution: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  sourceTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  jumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    flex: 1,
    minWidth: 120,
  },
  jumpButtonText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
    marginLeft: 4,
  },
  viewArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    flex: 1,
    minWidth: 120,
  },
  viewArticleButtonText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
    marginLeft: 4,
  },
  currentIndicator: {
    marginLeft: 8,
  },
  legalNotice: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginHorizontal: 16,
  },
  legalText: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
    textAlign: 'center',
  },
  // Script Preview Styles
  scriptPreviewSection: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  scriptPreviewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scriptPreviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    marginBottom: 12,
  },
  scriptExpandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  scriptExpandText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  // Full Script Modal Styles
  fullScriptModalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  fullScriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  fullScriptCloseButton: {
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScriptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  fullScriptScrollView: {
    flex: 1,
  },
  fullScriptContent: {
    padding: 20,
  },
  // Minimal Sources Styles
  sourcesSection: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  sourcesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  sourcesContainer: {
    gap: 12,
  },
  minimalSourceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  currentSourceCard: {
    borderColor: '#4f46e5',
    backgroundColor: '#fafaff',
  },
  sourceCardContent: {
    flex: 1,
    marginRight: 12,
  },
  minimalSourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  currentSourceTitle: {
    color: '#4f46e5',
  },
  minimalSourceTime: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  minimalViewButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 8,
  },
  minimalCurrentIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
  },
  minimalLegalText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  // Synced Preview Styles
  syncedPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  previewWord: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginRight: 4,
    marginVertical: 1,
  },
  currentPreviewWord: {
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  readPreviewWord: {
    fontWeight: '500',
  },
  nextPreviewWord: {
    fontWeight: '500',
  },
  previewEllipsis: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '400',
  },
  
  // ヘッダーミニプレイヤー用スタイル
  headerMiniPlayer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
  },
  headerMiniAlbumArt: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerMiniInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerMiniTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerMiniSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  headerMiniPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});