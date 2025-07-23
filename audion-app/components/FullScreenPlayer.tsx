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
import { format } from 'date-fns';
import axios from 'axios';

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
    recordInteraction,
  } = useAudio();
  
  const { token } = useAuth();
  const [isSaved, setIsSaved] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
  const scriptScrollRef = React.useRef<ScrollView>(null);
  
  const API = process.env.EXPO_PUBLIC_BACKEND_URL ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` : 'http://localhost:8000/api';
  
  const playbackRates = [0.7, 1.0, 1.3, 1.5];

  // Calculate words per second for synchronization (approximate)
  const estimateWordsPerSecond = (script: string, durationMs: number) => {
    const words = script.split(/\s+/).filter(word => word.length > 0);
    const totalWords = words.length;
    const durationSeconds = durationMs / 1000;
    return totalWords / durationSeconds;
  };

  // Calculate current word index based on playback position and auto-scroll
  React.useEffect(() => {
    if (currentAudio?.script && duration > 0) {
      const wordsPerSecond = estimateWordsPerSecond(currentAudio.script, duration);
      const currentSeconds = position / 1000;
      const estimatedWordIndex = Math.floor(currentSeconds * wordsPerSecond);
      setCurrentWordIndex(estimatedWordIndex);

      // Auto-scroll to current word
      if (scriptScrollRef.current && estimatedWordIndex > 0) {
        const wordsPerLine = 8;
        const currentLine = Math.floor(estimatedWordIndex / wordsPerLine);
        const scrollY = currentLine * 32; // Approximate line height
        
        scriptScrollRef.current.scrollTo({
          y: Math.max(0, scrollY - 100), // Keep some words visible above current
          animated: true
        });
      }
    }
  }, [position, currentAudio?.script, duration]);

  if (!showFullScreenPlayer || !currentAudio) {
    return null;
  }

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  // Render news script with highlight
  const renderNewsScript = () => {
    if (!currentAudio?.script) return null;

    const words = currentAudio.script.split(/\s+/).filter(word => word.length > 0);
    const wordsPerLine = 8; // Average words per line for readability

    return (
      <View style={styles.scriptContainer}>
        {words.map((word, index) => {
          const isCurrentWord = index === currentWordIndex;
          const isNearCurrentWord = Math.abs(index - currentWordIndex) <= 2;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.wordContainer,
                index % wordsPerLine === 0 && styles.lineStart,
              ]}
              onPress={() => handleWordPress(index, words.length)}
            >
              <Text
                style={[
                  styles.scriptWord,
                  isCurrentWord && styles.currentWord,
                  isNearCurrentWord && !isCurrentWord && styles.nearCurrentWord,
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

  return (
    <Modal
      visible={showFullScreenPlayer}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowFullScreenPlayer(false)}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-down" size={28} color="#1f2937" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Now Playing</Text>
          
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={styles.headerButton}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Main Player Section */}
          <View style={styles.mainPlayerSection}>
          {/* Album Art */}
          <View style={styles.albumArtContainer}>
            <View style={styles.albumArt}>
              <Ionicons name="musical-notes" size={80} color="#9ca3af" />
            </View>
          </View>

          {/* Audio Info */}
          <View style={styles.audioInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {currentAudio.title}
            </Text>
            <Text style={styles.subtitle}>
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
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              onPress={skipBackward}
              style={styles.skipButton}
            >
              <Ionicons name="play-back" size={32} color="#1f2937" />
              <Text style={styles.skipText}>30</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isPlaying ? pauseAudio : resumeAudio}
              style={styles.playButton}
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
              <Ionicons name="play-forward" size={32} color="#1f2937" />
              <Text style={styles.skipText}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Scroll Indicator */}
          <View style={styles.scrollIndicator}>
            <Ionicons name="chevron-up" size={20} color="#9ca3af" />
            <Text style={styles.scrollHint}>Swipe up for news script</Text>
          </View>
        </View>

        {/* Chapters Section */}
          {currentAudio.chapters && currentAudio.chapters.length > 0 && (
            <View style={styles.chaptersSection}>
              <Text style={styles.sectionTitle}>Chapters</Text>
              <ScrollView style={styles.chaptersScrollView} showsVerticalScrollIndicator={false}>
                {currentAudio.chapters.map((chapter: any, index: number) => {
                  const isCurrentChapter = position >= chapter.start_time && position < chapter.end_time;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.chapterItem, isCurrentChapter && styles.currentChapterItem]}
                      onPress={() => seekTo(chapter.start_time)}
                    >
                      <View style={styles.chapterNumber}>
                        <Text style={[styles.chapterNumberText, isCurrentChapter && styles.currentChapterText]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.chapterInfo}>
                        <Text style={[styles.chapterTitle, isCurrentChapter && styles.currentChapterText]} numberOfLines={2}>
                          {chapter.title}
                        </Text>
                        <Text style={styles.chapterTime}>
                          {formatTime(chapter.start_time)} - {formatTime(chapter.end_time)}
                        </Text>
                      </View>
                      {isCurrentChapter && (
                        <Ionicons name="play" size={16} color="#4f46e5" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* News Script Section */}
          {currentAudio.script && (
            <View style={styles.fullNewsScriptSection}>
              <Text style={styles.scriptSectionTitle}>News Script</Text>
              <ScrollView 
                ref={scriptScrollRef}
                style={styles.fullNewsScriptScrollView} 
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {renderNewsScript()}
              </ScrollView>
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
    lineHeight: 32,
  },
  wordContainer: {
    marginRight: 2,
    marginVertical: 1,
  },
  lineStart: {
    marginLeft: 0,
  },
  scriptWord: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '400',
    lineHeight: 28,
  },
  currentWord: {
    color: '#4f46e5',
    fontWeight: '700',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nearCurrentWord: {
    color: '#1f2937',
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
});