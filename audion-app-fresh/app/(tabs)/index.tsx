/**
 * Home Screen (index.tsx)
 * ホームタブ - キュレーション記事とAuto-Pick機能
 *
 * 機能: 厳選記事表示、Auto-Pick音声生成、ニュースアプリ風UI
 * Note: 既存ニュースアプリとの差別化を図るプレミアムコンテンツ
 */

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  Alert, 
  View, 
  Text,
  Image,
  StatusBar,
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useCuratedFeed } from '../../hooks/useCuratedFeed';
import { useSettings } from '../../context/SettingsContext';
import { useAutoPick } from '../../context/AutoPickContext';
import { useArticle } from '../../context/ArticleContext';
import { autoPickProgressService } from '../../services/AutoPickProgressService';
import AudioService from '../../services/AudioService';
import HorizontalTabs from '../../components/HorizontalTabs';
import HeroCarousel from '../../components/HeroCarousel';
import ArticleCard from '../../components/ArticleCard';
import UnifiedHeader from '../../components/UnifiedHeader';
import SearchModal from '../../components/SearchModal';
import FloatingAutoPickButton from '../../components/FloatingAutoPickButton';
import ArticleDetailModal from '../../components/ArticleDetailModal';
import { Article } from '../../services/ArticleService';
import { API_CONFIG } from '../../config/api';
import { useGlobalAudio } from '../../context/GlobalAudioContext';
import { generateGenreTabs } from '../../utils/genreUtils';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const { startTask, updateTask, completeTask, failTask, clearTask, currentTask } = useAutoPick();
  const { playSound } = useGlobalAudio();
  const { isReadMode, toggleReadMode, readArticleIds, isArticleRead, toggleReadStatus } = useArticle();
  const router = useRouter();
  
  // デバッグ: 設定状態をログ出力（初期化時のみ）
  const [loggedSettings, setLoggedSettings] = useState(false);
  useEffect(() => {
    if (!loggedSettings && settings.isAutoPickEnabled !== undefined) {
      console.log('HomeScreen - AutoPick設定:', settings.isAutoPickEnabled);
      setLoggedSettings(true);
    }
  }, [settings.isAutoPickEnabled, loggedSettings]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);

  // HomeタブではManualPickは利用しない（仕様に沿って無効化）
  const isManualPickMode = false;
  const selectedArticleIds = new Set<string>(); // 空のSetで初期化

  // クリーンアップ用のuseEffect
  useEffect(() => {
    return () => {
      // コンポーネント終了時にSSE接続を閉じる
      autoPickProgressService.stopMonitoring();
    };
  }, []);
  
  // HOMEタブ専用：システム固定RSSからのキュレーション記事取得
  const {
    filteredArticles: articles,
    loading,
    selectedGenre,
    availableGenres,
    setSelectedGenre,
    refreshArticles
  } = useCuratedFeed();

  const onRefresh = () => {
    setRefreshing(true);
    refreshArticles();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleArticlePress = (article: Article) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
    // 記事をタップしたら既読にマーク
    if (!isArticleRead(article.id)) {
      toggleReadStatus(article.id);
    }
  };

  const handleCloseArticleModal = () => {
    setShowArticleModal(false);
    setSelectedArticle(null);
  };

  const handleSelectArticle = (_articleId: string) => {};

  const toggleManualPickMode = () => {};

  // ManualPickは無効

  const handleGenerateManualAudio = async () => {};

  const performManualAudioGeneration = async () => {};

  const handleAutoPick = async () => {
    if (!token) {
      Alert.alert('エラー', '認証が必要です。ログインしてください。');
      return;
    }

    const genreName = selectedGenre === 'すべて' ? 'トップ' : selectedGenre;
    
    Alert.alert(
      'AutoPick音声生成', 
      `選択中のジャンル「${genreName}」で自動音声生成を開始しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' as const },
        { text: '生成開始', onPress: async () => {
          try {
            // 実際のAutoPickAPI呼び出しを実装
            await callAutoPickAPI(selectedGenre, genreName);
            
          } catch (error) {
            console.error('AutoPick error:', error);
            Alert.alert('エラー', 'AutoPick機能でエラーが発生しました。');
          }
        }}
      ]
    );
  };

  const callAutoPickAPI = async (genre: string, genreName: string) => {
    try {
      // AutoPick APIの呼び出し（サービス経由、正しいエンドポイントに統一）
      const taskResponse = await AudioService.startAutoPickTask(
        {
          max_articles: 3,
          // サーバ側モデルに合わせ、必要項目のみ送信
          preferred_genres: genre !== 'すべて' ? [genre] : undefined,
          source_scope: 'fixed',
        },
        token || undefined
      );
      console.log('🎯 [AUTOPICK] Task started:', taskResponse);
      
      // タスク監視を開始
      startTask(taskResponse.task_id);
      
      // SSE監視を開始
      autoPickProgressService.startMonitoring(
        taskResponse.task_id,
        token!,
        {
          onProgress: (data) => {
            console.log('📊 [PROGRESS]', data);
            updateTask({
              status: data.status,
              progress: data.progress,
              message: data.message,
            });
          },
          onComplete: (data) => {
            console.log('✅ [COMPLETE]', data);
            
            if (data.status === 'completed') {
              completeTask(data.result, data.debug_info);
              showCompletionAlert(data.result, data.debug_info, genreName);
            } else if (data.status === 'failed') {
              failTask(data.error || 'Unknown error', data.debug_info);
              Alert.alert('エラー', `AutoPick生成に失敗しました: ${data.error}`);
            }
            
            // 3秒後にタスク表示をクリア
            setTimeout(() => clearTask(), 3000);
          },
          onError: (error) => {
            console.error('📊 [SSE_ERROR]', error);
            failTask(error);
            Alert.alert('接続エラー', 'リアルタイム監視に失敗しました');
          }
        }
      );

    } catch (error) {
      console.error('AutoPick API call failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      failTask(errorMessage);
      Alert.alert('エラー', 'AutoPick APIの呼び出しに失敗しました');
      throw error;
    }
  };

  const showCompletionAlert = (result: any, debugInfo: any, genreName: string) => {
    const duration = result?.duration;
    const durationText = duration 
      ? `${Math.floor(duration / 60)}分${duration % 60}秒`
      : '不明';
    
    const baseMessage = `ジャンル「${genreName}」の音声が生成されました！\n\nタイトル: ${result?.title || '不明'}\n記事数: ${result?.article_ids?.length || '不明'}件\n再生時間: ${durationText}`;
    
    // 開発環境でのみデバッグ情報を追加
    let fullMessage = baseMessage;
    if (__DEV__ && debugInfo) {
      const debugText = `\n\n--- DEBUG INFO ---\n処理時間: ${debugInfo.processing_time_ms}ms\n取得記事数: ${debugInfo.total_articles_fetched}件\nスクリプト長: ${debugInfo.script_length}文字\nプラン: ${debugInfo.user_plan}`;
      fullMessage = baseMessage + debugText;
    }
    
    Alert.alert(
      '音声生成完了',
      fullMessage,
      [
        { text: 'OK', style: 'default' as const },
        ...(__DEV__ && result?.audio_url
          ? [
              {
                text: '再生テスト',
                style: 'default' as const,
                onPress: () => {
                  handlePlayFromCompletionPopup(result.id, result.audio_url);
                },
              },
            ]
          : [])
      ]
    );
  };

  const handlePlayFromCompletionPopup = async (audioId: string, audioUrl: string) => {
    try {
      console.log('🎵 [PLAY] Attempting to play audio:', { audioId, audioUrl });
      
      if (!audioUrl) {
        Alert.alert('エラー', '音声ファイルのURLが見つかりません');
        return;
      }

      // グローバル音声管理システムを使用
      await playSound({
        id: audioId,
        uri: audioUrl,
        title: 'AUTOPICK生成音声'
      });

      // 成功メッセージ
      Alert.alert('再生開始', '音声の再生を開始しました');
      
    } catch (error) {
      console.error('🎵 [PLAY] Play error:', error);
      Alert.alert('再生エラー', '音声の再生に失敗しました');
    }
  };

  // 音声再生機能（ヒーローカルーセル用）
  const handlePlayPress = (article: any) => {
    Alert.alert('音声生成', `「${article.title}」の音声を生成しますか？`);
  };


  // HomeではManualPickを利用しないため、記事はそのまま
  const filteredArticles = articles;

  // データを階層別に分割（フィルタリング後の記事を使用）
  const heroArticles = filteredArticles.slice(0, 5); // ヒーロー用の最初の5記事
  const largeCardArticles = filteredArticles.slice(5, 8); // 大きいカード用
  const smallCardArticles = filteredArticles.slice(8); // 小さいカード用

  // 大きいカード用のレンダリング関数
  const renderLargeCard = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity 
      style={styles.largeCard}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.8}
    >
      {/* 画像エリア */}
      <View style={styles.largeImageContainer}>
        {item.thumbnail_url ? (
          <Image 
            source={{ uri: item.thumbnail_url }}
            style={styles.largeImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.largeImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📰</Text>
          </View>
        )}
      </View>

      {/* テキスト情報 */}
      <View style={styles.textContent}>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={styles.articleSummary} numberOfLines={2}>
          {item.summary || '記事の詳細内容をお読みいただけます。'}
        </Text>

        {/* メタ情報 */}
        <View style={styles.metaInfo}>
          <Text style={styles.sourceName}>
            {item.source_name || 'News Source'}
          </Text>
          <Text style={styles.publishTime}>
            {item.published_at ? 
              new Date(item.published_at).toLocaleDateString('ja-JP', {
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 
              '配信時刻不明'
            }
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* FlatListで全体を管理し、ヘッダーコンポーネントでヒーローを表示 */}
      <FlatList
        data={smallCardArticles}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={handleArticlePress}
            showAudioPlayer={true}
            isManualPickMode={isManualPickMode}
            isSelected={selectedArticleIds.has(item.id)}
            onSelect={() => handleSelectArticle(item.id)}
            isRead={isArticleRead(item.id)}
            isReadMode={isReadMode}
            onToggleRead={() => toggleReadStatus(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || loading} 
            onRefresh={onRefresh}
            tintColor="#007bff"
            colors={['#007bff']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* 元のヘッダー */}
            <UnifiedHeader
              onSearchPress={() => setShowSearchModal(true)}
              onReadStatusPress={() => {
                toggleReadMode();
                Alert.alert(
                  '既読モード',
                  isReadMode ? '未読モードに切り替えました' : '既読モードに切り替えました。記事を既読としてマークできます。',
                  [{ text: 'OK' }]
                );
              }}
            />

            {/* ManualPick エントリーボタン（既読モード時のみ表示） */}
            {isReadMode && !isManualPickMode && (
              <View style={styles.manualPickEntryContainer}>
                <TouchableOpacity
                  style={styles.manualPickEntryButton}
                  onPress={toggleManualPickMode}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manualPickEntryText}>
                    📝 既読記事から手動選択
                  </Text>
                  <Text style={styles.manualPickEntrySubText}>
                    ({readArticleIds.length}件の既読記事)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ManualPick情報パネル（ManualPickモード時のみ表示） */}
            {isManualPickMode && (
              <View style={styles.manualPickInfoContainer}>
                <View style={styles.manualPickInfoContent}>
                  <Text style={styles.manualPickInfoTitle}>
                    📝 既読記事から選択
                  </Text>
                  <Text style={styles.manualPickInfoText}>
                    既読記事({filteredArticles.length}件)から選択して音声を生成します
                  </Text>
                  <TouchableOpacity
                    style={styles.manualPickExitButton}
                    onPress={toggleManualPickMode}
                  >
                    <Text style={styles.manualPickExitText}>終了</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* カテゴリータブ */}
            <HorizontalTabs
              tabs={generateGenreTabs(availableGenres)}
              selectedTab={selectedGenre}
              onTabSelect={setSelectedGenre}
              style={styles.categoryTabs}
            />

            {/* ゾーン1: ヒーローカルーセル（トップのみ表示） */}
            {selectedGenre === 'すべて' && heroArticles.length > 0 && (
              <HeroCarousel
                articles={heroArticles}
                onArticlePress={handleArticlePress}
                onPlayPress={handlePlayPress}
              />
            )}

            {/* ゾーン2: 大きいカード */}
            {largeCardArticles.length > 0 && (
              <View style={styles.largeCardSection}>
                <Text style={styles.sectionTitle}>注目記事</Text>
                <FlatList
                  data={largeCardArticles}
                  renderItem={renderLargeCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* ゾーン3: 小さいカードセクションのタイトル */}
            {smallCardArticles.length > 0 && (
              <Text style={styles.sectionTitle}>その他のニュース</Text>
            )}

            {/* ManualPick時の既読記事がない場合のメッセージ */}
            {isManualPickMode && filteredArticles.length === 0 && (
              <View style={styles.emptyReadArticlesContainer}>
                <Text style={styles.emptyReadArticlesTitle}>📚 既読記事なし</Text>
                <Text style={styles.emptyReadArticlesText}>
                  記事を読んでから既読マークを付けると、ここに表示されます。{'\n'}
                  記事をタップして読み、ManualPickで音声生成をお楽しみください。
                </Text>
                <TouchableOpacity
                  style={styles.exitManualPickButton}
                  onPress={() => setIsManualPickMode(false)}
                >
                  <Text style={styles.exitManualPickText}>通常モードに戻る</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        // パフォーマンス最適化
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* AutoPick進捗表示 */}
      {currentTask && (
        <View style={styles.autoPickProgressContainer}>
          <Text style={styles.autoPickProgressTitle}>🎧 音声生成中</Text>
          <Text style={styles.autoPickProgressMessage}>
            {currentTask.message || '処理中...'}
          </Text>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarForeground,
                { width: `${currentTask.progress || 0}%` }
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {Math.round(currentTask.progress || 0)}%
          </Text>
        </View>
      )}

      {/* AutoPick フローティングボタン - Homeタブでは常に表示 */}
      {!isManualPickMode && (
        <TouchableOpacity
          style={[
            styles.autoPickFloatingButton,
            !!currentTask && styles.autoPickFloatingButtonDisabled
          ]}
          onPress={handleAutoPick}
          disabled={!!currentTask}
          activeOpacity={0.8}
        >
          <Text style={styles.autoPickFloatingButtonText}>✨</Text>
        </TouchableOpacity>
      )}


      {/* ManualPick フローティングアクションパネル */}
      {isManualPickMode && selectedArticleIds.size > 0 && (
        <View style={styles.floatingActionPanel}>
          <View style={styles.panelContent}>
            <View style={styles.panelLeft}>
              <Text style={styles.selectionText}>
                {selectedArticleIds.size}件の記事を選択中
              </Text>
            </View>
            <View style={styles.panelRight}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  // Homeタブではmanual pickは無効化されているため何もしない
                }}
              >
                <Text style={styles.cancelButtonText}>×</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  isGeneratingManualAudio && styles.generateButtonDisabled
                ]}
                onPress={handleGenerateManualAudio}
                disabled={isGeneratingManualAudio}
              >
                {isGeneratingManualAudio ? (
                  <Text style={styles.generateButtonText}>生成中...</Text>
                ) : (
                  <Text style={styles.generateButtonText}>音声生成</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* SearchModal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onResultPress={(result) => {
          console.log('Search result:', result);
          setShowSearchModal(false);
        }}
      />

      {/* ArticleDetailModal */}
      <ArticleDetailModal
        article={selectedArticle}
        visible={showArticleModal}
        onClose={handleCloseArticleModal}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  categoryTabs: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  contentContainer: {
    paddingBottom: 100, // Space for floating button
  },

  // セクション用スタイル
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  largeCardSection: {
    marginBottom: 20,
  },

  // 大きいカード用スタイル  
  largeCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222222',
  },

  // 大きいカード画像エリア
  largeImageContainer: {
    position: 'relative',
    height: 200,
  },
  largeImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  placeholderText: {
    fontSize: 32,
    opacity: 0.5,
  },


  // 大きいカードのテキストコンテンツ
  textContent: {
    padding: 16,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 8,
  },
  articleSummary: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 12,
  },

  // メタ情報
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceName: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  publishTime: {
    fontSize: 12,
    color: '#888888',
  },

  // ManualPick フローティングアクションパネル
  floatingActionPanel: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  panelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  panelLeft: {
    flex: 1,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  panelRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#444444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  generateButtonDisabled: {
    backgroundColor: '#666666',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // AutoPick進捗表示
  autoPickProgressContainer: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  autoPickProgressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  autoPickProgressMessage: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarForeground: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#4A90E2',
    textAlign: 'center',
    fontWeight: '600',
  },

  // AutoPickフローティングボタン
  autoPickFloatingButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 1000,
  },
  autoPickFloatingButtonDisabled: {
    backgroundColor: '#666666',
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  autoPickFloatingButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },

  // ManualPick エントリーボタン
  manualPickEntryContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  manualPickEntryButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  manualPickEntryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  manualPickEntrySubText: {
    fontSize: 12,
    color: '#888888',
  },

  // ManualPick 情報パネル
  manualPickInfoContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 123, 255, 0.3)',
  },
  manualPickInfoContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualPickInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 2,
  },
  manualPickInfoText: {
    fontSize: 12,
    color: '#cccccc',
    flex: 1,
    marginRight: 12,
  },
  manualPickExitButton: {
    backgroundColor: '#444444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  manualPickExitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  // 空の既読記事メッセージ
  emptyReadArticlesContainer: {
    marginHorizontal: 16,
    marginVertical: 32,
    padding: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  emptyReadArticlesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyReadArticlesText: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  exitManualPickButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exitManualPickText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

});
