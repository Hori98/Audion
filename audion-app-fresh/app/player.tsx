/**
 * Full-Screen Audio Player
 * ミニプレイヤーから拡張される全画面プレイヤー
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Animated,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { router } from 'expo-router';
// import { PanGestureHandler, State } from 'react-native-gesture-handler'; // Spotify式アーキテクチャでは不要
import { WebView } from 'react-native-webview';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useGlobalAudio } from '../context/GlobalAudioContext';
import NewsCard from '../components/NewsCard';
import BottomSheet from '../components/BottomSheet';
import { extractScriptFromAudionXml } from '../utils/textUtils';
// Metadata refresh is provided via GlobalAudioContext

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PlayerScreen() {
  const {
    currentTrack,
    isPlaying,
    progress,
    positionMs,
    durationMs,
    buffering,
    togglePlayPause,
    stopSound,
    seekTo,
    playNext,
    playPrevious,
    hasNext,
    hasPrevious,
    refreshMetadata,
  } = useGlobalAudio();

  const [activeTab, setActiveTab] = useState<'script' | 'chapters'>('script');
  const [showWebView, setShowWebView] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  
  // BottomSheet用のstate
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  
  // Audio Detail Modal用のstate
  const [showAudioDetailModal, setShowAudioDetailModal] = useState(false);
  
  // メタデータ補完状態管理
  const [isRetryingMetadata, setIsRetryingMetadata] = useState(false);

  // Spotify式アーキテクチャ: スクロールベースのdismiss制御
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView>(null);

  // プレイヤーが表示されるべき音声がない場合は閉じる
  useEffect(() => {
    if (!currentTrack) {
      if (router.canGoBack()) {
        router.back();
      }
    }
  }, [currentTrack, router]);

  if (!currentTrack) {
    return null;
  }

  // デバッグ出力の抑制フラグ
  const DEBUG = false;

  // 念のためのメタデータ補完トリガー
  useEffect(() => {
    const checkAndEnhanceMetadata = async () => {
      if (!currentTrack) return;
      
      const needsMetadata = !currentTrack.script || !currentTrack.chapters?.length;
      const isLoading = currentTrack.metadataLoading;
      
      if (needsMetadata && !isLoading && !isRetryingMetadata) {
        if (DEBUG) console.log(`[PLAYER] Triggering metadata enhancement for audio ${currentTrack.id}`);
        setIsRetryingMetadata(true);
        try { await refreshMetadata(currentTrack.id); } catch {}
        setIsRetryingMetadata(false);
      }
    };

    checkAndEnhanceMetadata();
  }, [currentTrack?.id, currentTrack?.script, currentTrack?.chapters, isRetryingMetadata]);

  // メタデータ再試行関数
  const retryMetadata = async () => {
    if (!currentTrack || isRetryingMetadata) return;
    
    setIsRetryingMetadata(true);
    try {
      if (DEBUG) console.log(`[PLAYER] Manual retry metadata fetch for audio ${currentTrack.id}`);
      await refreshMetadata(currentTrack.id);
    } catch (error) {
      if (DEBUG) console.error(`[PLAYER] Manual retry failed for audio ${currentTrack.id}:`, error);
    } finally {
      setIsRetryingMetadata(false);
    }
  };

  // Spotify式のモーダル風dismissスタイル
  const handleCloseModal = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  // 共通のBottomSheetオプション生成（ライブラリタブと同じロジック）
  const getBottomSheetOptions = () => {
    if (!currentTrack) return [];
    
    return [
      {
        label: '音声詳細',
        icon: '📋',
        onPress: () => {
          setShowAudioDetailModal(true);
        }
      },
      {
        label: 'シェア',
        icon: '📤',
        onPress: async () => {
          try {
            await Share.share({
              message: `${currentTrack.title}${currentTrack.uri ? `\n${currentTrack.uri}` : ''}`,
              title: currentTrack.title,
              url: currentTrack.uri || '',
            });
          } catch (error) {
            console.error('Share error:', error);
          }
        }
      },
      {
        label: 'プレイリストに追加',
        icon: '📁',
        onPress: () => {
          Alert.alert('実装予定', 'プレイリスト機能は今後実装予定です');
        }
      },
      {
        label: 'タイトルをコピー',
        icon: '📋',
        onPress: () => {
          Alert.alert('コピー完了', `"${currentTrack.title}"をクリップボードにコピーしました`);
        }
      }
    ];
  };

  // Status check variables
  const isMetadataLoading = isRetryingMetadata || !!currentTrack?.metadataLoading;
  const hasScript = !!(currentTrack?.script || currentTrack?.xml_content);
  const hasChapters = !!(currentTrack?.chapters && currentTrack.chapters.length > 0);

  // SkeletonLoader Component - Fixed implementation without external deps
  const SkeletonLoader = ({ lines = 3 }: { lines: number }) => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonLine,
            index === lines - 1 && lines > 1 ? styles.skeletonLineShort : null,
          ]}
        />
      ))}
    </View>
  );

  // メタデータ再試行ボタンコンポーネント
  const RetryMetadataButton = () => (
    <View style={styles.retryContainer}>
      <Text style={styles.retryText}>
        メタデータを取得できませんでした
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={retryMetadata}>
        <Text style={styles.retryButtonText}>
          {isMetadataLoading ? '取得中...' : '再試行'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Spotify-like UI style
  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* ドラッグハンドル */}
        <View style={styles.dragHandle} />

        <ScrollView 
          ref={mainScrollRef}
          style={styles.mainScrollView}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* セクション1: ヘッダー */}
          <View style={styles.headerSection}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleCloseModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Now Playing</Text>
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => setShowBottomSheet(true)}
              >
                <Feather name="more-horizontal" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* セクション2: プレイヤーコントロール */}
          <View style={styles.playerSection}>
            <View style={styles.playerArea}>
              {/* 大きなサムネイル */}
              <View style={styles.largeThumbnail}>
                <Text style={[styles.largeThumbnailIcon, { color: '#666666' }]}>🎵</Text>
              </View>

              {/* 音声情報 */}
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={2}>
                  {currentTrack?.title || 'Unknown Title'}
                </Text>
                <Text style={styles.trackMetadata}>
                  {currentTrack?.source_name || 'Unknown Source'}
                </Text>
              </View>

              {/* プログレスバー */}
              <View style={styles.progressContainer}>
                <View style={styles.seekBar}>
                  <View style={styles.seekBarBackground}>
                    <View 
                      style={[styles.seekBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} 
                    />
                    <View 
                      style={[styles.seekBarThumb, { left: `${Math.min(progress * 100, 100)}%` }]} 
                    />
                  </View>
                </View>
                <View style={styles.timeLabels}>
                  <Text style={styles.timeLabel}>
                    {Math.floor(positionMs / 60000)}:{String(Math.floor((positionMs % 60000) / 1000)).padStart(2, '0')}
                  </Text>
                  <Text style={styles.timeLabel}>
                    {Math.floor(durationMs / 60000)}:{String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              {/* 音声コントロール */}
              <View style={styles.controls}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={playPrevious}
                  disabled={!hasPrevious}
                >
                  <Ionicons
                    name="play-skip-back-outline"
                    size={32}
                    color={hasPrevious ? '#ffffff' : '#666666'}
                  />
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={togglePlayPause}>
                  {buffering ? (
                    <Ionicons name="hourglass-outline" size={48} color="#ffffff" />
                  ) : (
                    <Ionicons
                      name={isPlaying ? 'pause-outline' : 'play-outline'}
                      size={48}
                      color="#ffffff"
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={playNext}
                  disabled={!hasNext}
                >
                  <Ionicons
                    name="play-skip-forward-outline"
                    size={32}
                    color={hasNext ? '#ffffff' : '#666666'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* セクション3: タブバー */}
          <View style={styles.tabSection}>
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'script' && styles.activeTab]}
                onPress={() => setActiveTab('script')}
              >
                <Text style={[styles.tabText, activeTab === 'script' && styles.activeTabText]}>
                  スクリプト
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'chapters' && styles.activeTab]}
                onPress={() => setActiveTab('chapters')}
              >
                <Text style={[styles.tabText, activeTab === 'chapters' && styles.activeTabText]}>
                  チャプター
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* セクション4: ネストスクロールコンテンツ */}
          <View style={styles.contentSection}>
            <ScrollView 
              style={styles.nestedScrollView} 
              contentContainerStyle={styles.nestedScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEnabled={true}
            >
                  {activeTab === 'script' ? (
                    <View style={styles.scriptContainer}>
                      {isMetadataLoading ? (
                        // ローディング中: スケルトン表示
                        <SkeletonLoader lines={5} />
                      ) : hasScript ? (
                        // スクリプト表示
                        <Text style={styles.scriptText}>
                          {extractScriptFromAudionXml(currentTrack.script)}
                        </Text>
                      ) : (
                        // エラー/未取得: 再試行UI
                        <RetryMetadataButton />
                      )}
                    </View>
                  ) : (
                    <View style={styles.chaptersContainer}>
                      {isMetadataLoading ? (
                        // ローディング中: チャプター用スケルトン表示
                        <View>
                          <SkeletonLoader lines={2} />
                          <SkeletonLoader lines={2} />
                          <SkeletonLoader lines={2} />
                        </View>
                      ) : hasChapters ? (
                        // チャプター表示 - Enhanced NewsCard with thumbnail, order number, and unified size
                        currentTrack.chapters!.map((chapter, index) => {
                          return (
                            <NewsCard
                              key={chapter.id}
                              index={index}
                              title={chapter.title}
                              url={chapter.original_url}
                              thumbnailUrl={chapter.thumbnail_url}
                              sourceName={chapter.source_name}
                              onPress={() => {
                                if (chapter.original_url) {
                                  setSelectedUrl(chapter.original_url);
                                  setShowWebView(true);
                                }
                              }}
                            />
                          );
                        })
                      ) : (
                        // エラー/未取得: 再試行UI
                        <RetryMetadataButton />
                      )}
                    </View>
                  )}
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* WebView Modal - ニュース記事表示 */}
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.webViewModalContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity 
              style={styles.webViewCloseButton}
              onPress={() => setShowWebView(false)}
            >
              <Text style={styles.webViewCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle} numberOfLines={1}>
              ニュース記事
            </Text>
            <View style={styles.webViewHeaderSpacer} />
          </View>
          
          {selectedUrl ? (
            <WebView
              source={{ uri: selectedUrl }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <Text style={styles.webViewLoadingText}>読み込み中...</Text>
                </View>
              )}
              onError={(error) => {
                console.warn('WebView error:', error);
                if (router.canGoBack()) {
                  router.back();
                }
              }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* BottomSheet Menu */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title={currentTrack?.title}
        options={getBottomSheetOptions()}
      />

      {/* Audio Detail Modal - 音声詳細表示 */}
      <Modal
        visible={showAudioDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.audioDetailModalContainer}>
          <View style={styles.audioDetailModalHeader}>
            <Text style={styles.audioDetailModalTitle}>音声詳細</Text>
            <TouchableOpacity 
              onPress={() => setShowAudioDetailModal(false)}
              style={styles.audioDetailCloseButton}
            >
              <Text style={styles.audioDetailCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {currentTrack && (
            <ScrollView style={styles.audioDetailModalContent}>
              {/* タイトルセクション */}
              <View style={styles.audioDetailSection}>
                <Text style={styles.audioDetailSectionTitle}>タイトル</Text>
                <Text style={styles.audioDetailTitle}>{currentTrack.title}</Text>
              </View>

              {/* 原稿セクション */}
              <View style={styles.audioDetailSection}>
                <Text style={styles.audioDetailSectionTitle}>原稿</Text>
                <ScrollView 
                  style={styles.audioDetailScriptContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <Text style={styles.audioDetailScriptText}>
                    {currentTrack.script ? extractScriptFromAudionXml(currentTrack.script) : '原稿が利用できません'}
                  </Text>
                </ScrollView>
              </View>

              {/* ニュース記事セクション */}
              {currentTrack.chapters && currentTrack.chapters.length > 0 && (
                <View style={styles.audioDetailSection}>
                  <Text style={styles.audioDetailSectionTitle}>ニュース記事</Text>
                  <View style={styles.audioDetailNewsContainer}>
                    {currentTrack.chapters.map((chapter, index) => (
                      <NewsCard
                        key={chapter.id}
                        index={index}
                        title={chapter.title}
                        url={chapter.original_url}
                        thumbnailUrl={chapter.thumbnail_url}
                        sourceName={chapter.source_name}
                        onPress={() => {
                          if (chapter.original_url) {
                            setSelectedUrl(chapter.original_url);
                            setShowWebView(true);
                            setShowAudioDetailModal(false); // 詳細モーダルを閉じる
                          }
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* 音声情報セクション */}
              <View style={styles.audioDetailSection}>
                <Text style={styles.audioDetailSectionTitle}>音声情報</Text>
                <View style={styles.audioDetailInfoRow}>
                  <Text style={styles.audioDetailInfoLabel}>音声タイプ:</Text>
                  <Text style={styles.audioDetailInfoValue}>{currentTrack.sourceName || '不明'}</Text>
                </View>
                <View style={styles.audioDetailInfoRow}>
                  <Text style={styles.audioDetailInfoLabel}>作成日:</Text>
                  <Text style={styles.audioDetailInfoValue}>
                    {currentTrack.publishedAt ? new Date(currentTrack.publishedAt).toLocaleDateString('ja-JP') : '不明'}
                  </Text>
                </View>
                <View style={styles.audioDetailInfoRow}>
                  <Text style={styles.audioDetailInfoLabel}>長さ:</Text>
                  <Text style={styles.audioDetailInfoValue}>
                    {Math.floor(durationMs / 60000)}:{String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // Spotify式アーキテクチャスタイル
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    flexGrow: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
  },
  playerSection: {
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  tabSection: {
    paddingHorizontal: 20,
  },
  contentSection: {
    height: SCREEN_HEIGHT * 0.4, // 固定高さでネストスクロール領域確保
    backgroundColor: '#1a1a1a',
  },
  nestedScrollView: {
    flex: 1,
  },
  nestedScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
  },
  playerArea: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  largeThumbnail: {
    width: 280,
    height: 280,
    backgroundColor: '#333333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    alignSelf: 'center', // 画面中央に配置
  },
  largeThumbnailIcon: {
    fontSize: 80,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  trackMetadata: {
    fontSize: 16,
    color: '#b3b3b3',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  seekBar: {
    width: '100%',
    height: 20,
    justifyContent: 'center',
    marginBottom: 8,
  },
  seekBarBackground: {
    height: 4,
    backgroundColor: '#404040',
    borderRadius: 2,
    position: 'relative',
  },
  seekBarFill: {
    height: 4,
    backgroundColor: '#1db954',
    borderRadius: 2,
  },
  seekBarThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    top: -4,
    marginLeft: -6,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 12,
    color: '#b3b3b3',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 16,
  },
  navButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1db954',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#b3b3b3',
  },
  activeTabText: {
    color: '#1db954',
  },
  contentScroll: {
    flex: 1,
    minHeight: 200, // 最小高さを設定
  },
  scriptContainer: {
    padding: 24,
  },
  scriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#ffffff',
  },
  chaptersContainer: {
    padding: 0, // 余白削除
  },
  // ✅ チャプターカードスタイル removed - now using enhanced NewsCard component
  // 旧スタイル（削除予定）
  chapterItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  chapterTime: {
    fontSize: 14,
    color: '#1db954',
    marginBottom: 12,
  },
  noContentText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 48,
    fontStyle: 'italic',
  },
  // WebView Modal styles
  webViewModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  webViewCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewCloseText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  webViewHeaderSpacer: {
    width: 32,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  webViewLoadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  
  // スケルトンローダー用のスタイル
  skeletonContainer: {
    paddingVertical: 8,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#333333',
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.6,
  },
  skeletonLineShort: {
    width: '70%',
  },
  
  // 再試行ボタン用のスタイル
  retryContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  retryText: {
    color: '#999999',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Audio Detail Modal Styles
  audioDetailModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  audioDetailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  audioDetailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  audioDetailCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
  },
  audioDetailCloseButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  audioDetailModalContent: {
    flex: 1,
    padding: 16,
  },
  audioDetailSection: {
    marginBottom: 24,
  },
  audioDetailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  audioDetailTitle: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  audioDetailScriptContainer: {
    maxHeight: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  audioDetailScriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
  },
  audioDetailNewsContainer: {
    gap: 8,
  },
  audioDetailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  audioDetailInfoLabel: {
    fontSize: 14,
    color: '#b3b3b3',
    fontWeight: '500',
  },
  audioDetailInfoValue: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
});
