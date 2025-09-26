/**
 * Feed UI Component - プレゼンテーショナル層
 * ロジックを一切持たず、propsで渡されたデータの表示のみ担当
 * bolt.new/Figma刷新時はこのファイルを差し替えるだけ
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  FlatList,
  View,
  Text,
  Alert,
} from 'react-native';
import { RSSFeedState, RSSFeedActions } from '../hooks/useRSSFeed';
import { Article } from '../services/ArticleService';
import { useSettings } from '../context/SettingsContext';
import { useRSSFeedContext } from '../context/RSSFeedContext';
import { UserRSSSource } from '../services/RSSSourceService';
import HorizontalTabs from './HorizontalTabs';
import UnifiedHeader from './UnifiedHeader';
import SearchModal from './SearchModal';
import ArticleCard from './ArticleCard';
import ArticleDetailModal from './ArticleDetailModal';
import ManualPickModal from './ManualPickModal';
import FloatingAutoPickButton from './FloatingAutoPickButton';
import InfoBanner from './InfoBanner';
import AudioService, { ManualPickRequest, AutoPickRequest } from '../services/AudioService';
import AutoPickProgressBar from './AutoPickProgressBar';
import { AutoPickProgressService, AutoPickProgressData } from '../services/AutoPickProgressService';
import { AuthService } from '../services/AuthService';
import { router } from 'expo-router';
import { AVAILABLE_GENRES } from '../types/rss';

interface FeedUIProps {
  // Core data properties
  user: any; // From auth context
  articles: Article[];
  loading: boolean;
  refreshing: boolean;
  
  // Filter state
  selectedGenre: string;
  selectedSource: string;
  selectedReadStatus?: string;
  
  // Actions
  onRefresh: () => void;
  setSelectedGenre: (genre: string) => void;
  setSelectedSource: (source: string) => void;
  setSelectedReadStatus?: (status: string) => void;
  onSearchPress?: () => void;
}

// ミニマムなUIスタイル（将来のUI刷新で差し替え対象）
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60, // Account for status bar and dynamic island
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
  },
  subText: {
    fontSize: 16,
    opacity: 0.7,
    color: '#ffffff',
  },
  filterSection: {
    paddingVertical: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#111111',
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeFilterChip: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#cccccc',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#ffffff',
  },
  articlesList: {
    flex: 1,
  },
  articleItem: {
    backgroundColor: '#111111',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff',
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  articleDate: {
    fontSize: 12,
    color: '#888888',
  },
  audioButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  audioButtonGenerating: {
    backgroundColor: '#FF9500',
  },
  audioButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  addSourceButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 16,
  },
  addSourceButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sourceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sourceDetails: {
    flex: 1,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sourceDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  addSourceSmallButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addSourceSmallButtonText: {
    color: 'white',
    fontSize: 12,
  },
  customRssInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  actionButtonsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  audioGenerationButton: {
    flex: 1,
    backgroundColor: '#9F2B9F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  audioGenerationButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  manualPickButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualPickButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  readStatusModalContent: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: 100,
  },
  readStatusOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedReadStatusOption: {
    backgroundColor: '#007AFF',
  },
  readStatusOptionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  selectedReadStatusOptionText: {
    fontWeight: '600',
  },
  selectionToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0f0f0f',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  selectionToggleText: {
    color: '#cccccc',
    fontSize: 13,
  },
  selectionToggleButton: {
    backgroundColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444'
  },
  selectionToggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectionToggleButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  floatingPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingPanelText: {
    color: '#fff',
    fontSize: 14,
  },
  floatingPanelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  panelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  panelCancel: {
    backgroundColor: '#333',
  },
  panelPrimary: {
    backgroundColor: '#007AFF',
  },
  panelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});


const GENRES = [
  { id: 'all', name: 'すべて' },
  { id: 'news', name: 'ニュース' },
  { id: 'technology', name: 'テクノロジー' },
  { id: 'business', name: 'ビジネス' },
  { id: 'sports', name: 'スポーツ' },
  { id: 'entertainment', name: 'エンタメ' }
];

const READ_STATUS_FILTERS = [
  { id: 'all', name: 'すべて' },
  { id: 'unread', name: '未読' },
  { id: 'read', name: '既読' },
  { id: 'saved', name: '保存済み' }
];

export const FeedUI: React.FC<FeedUIProps> = ({
  // State
  user,
  articles,
  loading,
  refreshing,
  selectedSource,
  selectedGenre,
  selectedReadStatus,
  
  // Actions
  onRefresh,
  setSelectedSource,
  setSelectedGenre,
  setSelectedReadStatus,
  onSearchPress,
}) => {
  // RSS状態管理をContextから取得
  const {
    userSources,
    categories,
    preConfiguredSources,
    sourcesLoading,
    importing,
    showSourceModal,
    rssUrl,
    audioGenerating,
    audioProgress,
    generateAudio,
    addPreConfiguredSource,
    setShowSourceModal,
    setRssUrl,
  } = useRSSFeedContext();
  // 設定Context
  const { settings } = useSettings();
  
  // 記事詳細モーダル用のステート
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  
  // Manual Pickモーダル用のステート
  const [showManualPickModal, setShowManualPickModal] = useState(false);
  
  // 既読ステータス選択モーダル用のステート
  const [showReadStatusModal, setShowReadStatusModal] = useState(false);
  
  // ManualPickモード用のステート
  const [isManualPickMode, setIsManualPickMode] = useState(false);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  
  // AutoPick progress monitoring state
  const [autoPickVisible, setAutoPickVisible] = useState(false);
  const [autoPickProgress, setAutoPickProgress] = useState(0);
  const [autoPickStatus, setAutoPickStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed'>('pending');
  const [autoPickMessage, setAutoPickMessage] = useState('準備中...');
  const autoPickSvcRef = React.useRef<AutoPickProgressService | null>(null);

  const handleArticlePress = (article: Article) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
  };

  const handleCloseArticleModal = () => {
    setShowArticleModal(false);
    setSelectedArticle(null);
  };

  // 既読タブ表示時のManualPickモード自動開始（設定で有効時のみ）
  React.useEffect(() => {
    if (settings.isManualPickEnabled && selectedReadStatus === 'read') {
      setIsManualPickMode(true);
    } else {
      setIsManualPickMode(false);
      setSelectedArticleIds(new Set());
    }
  }, [selectedReadStatus, settings.isManualPickEnabled]);

  // 記事選択/解除のハンドラー
  const toggleArticleSelection = (articleId: string) => {
    const newSelected = new Set(selectedArticleIds);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      if (newSelected.size >= 10) {
        Alert.alert('制限', '最大10記事まで選択できます');
        return;
      }
      newSelected.add(articleId);
    }
    setSelectedArticleIds(newSelected);
  };

  const handleManualPickGenerate = async (selectedArticles: Article[]) => {
    try {
      const request: ManualPickRequest = {
        article_ids: selectedArticles.map(a => a.id),
        article_titles: selectedArticles.map(a => a.title),
        article_summaries: selectedArticles.map(a => a.summary),
        voice_language: 'ja-JP',
        voice_name: 'alloy',
        prompt_style: 'standard'
      };

      await AudioService.generateManualPickAudio(request);
      // 生成完了後の誘導とリセット
      Alert.alert('音声生成開始', `${selectedArticles.length}件の音声生成を開始しました。完了後はライブラリで再生できます。`);
      setSelectedArticleIds(new Set());
      setIsManualPickMode(false);

    } catch (error) {
      console.error('Manual pick generation failed:', error);
      throw error;
    }
  };

  // FloatingButtonからのManualPick実行
  const handleFloatingManualPick = async () => {
    if (selectedArticleIds.size === 0) return;
    
    try {
      const selectedArticles = articles.filter(article => 
        selectedArticleIds.has(article.id)
      );
      
      await handleManualPickGenerate(selectedArticles);
      
      // 成功時の処理はhandleManualPickGenerate側で実施（Alert/リセット）

    } catch (error) {
      console.error('Floating Manual pick generation failed:', error);
      Alert.alert('エラー', '音声生成に失敗しました');
    }
  };

  // ManualPick フローティングパネル（簡易版）：選択モード時に生成/クリア
  const renderManualPickPanel = () => {
    if (!isManualPickMode || selectedArticleIds.size === 0) return null;
    return (
      <View style={styles.floatingPanel}>
        <Text style={styles.floatingPanelText}>選択中: {selectedArticleIds.size} 件 ／ 目安 {Math.floor((selectedArticleIds.size*60)/60)}分{(selectedArticleIds.size*60)%60}秒</Text>
        <View style={styles.floatingPanelButtons}>
          <TouchableOpacity 
            style={[styles.panelButton, styles.panelCancel]}
            onPress={() => setSelectedArticleIds(new Set())}
          >
            <Text style={styles.panelButtonText}>クリア</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.panelButton, styles.panelPrimary]}
            onPress={handleFloatingManualPick}
          >
            <Text style={styles.panelButtonText}>生成</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };


  const handleAutoPickGenerate = async () => {
    Alert.alert(
      'Auto-Pick生成',
      'AIが自動的に記事を選択して音声を生成しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '生成開始', onPress: async () => {
          try {
            // Start AutoPick task with progress monitoring
            const req: AutoPickRequest = {
              max_articles: 5,
              voice_language: 'ja-JP',
              voice_name: 'alloy',
              prompt_style: 'standard',
              preferred_genres: selectedGenre && selectedGenre !== 'all' ? [selectedGenre] : undefined,
              source_scope: 'user'
            };

            const token = await AuthService.getStoredToken();
            const start = await AudioService.startAutoPickTask(req, token || undefined);

            if (!start?.task_id) {
              Alert.alert('エラー', 'タスク開始に失敗しました');
              return;
            }

            // Initialize monitoring
            setAutoPickVisible(true);
            setAutoPickStatus('pending');
            setAutoPickProgress(0);
            setAutoPickMessage('Auto-Pickを開始しました');

            // Ensure a single service instance
            if (!autoPickSvcRef.current) {
              autoPickSvcRef.current = new AutoPickProgressService();
            }
            autoPickSvcRef.current.startMonitoring(start.task_id, token || '', {
              onProgress: (data: AutoPickProgressData) => {
                setAutoPickStatus(data.status);
                setAutoPickProgress(Math.max(0, Math.min(100, data.progress ?? 0)));
                setAutoPickMessage(data.message || '進行中...');
              },
              onComplete: (data: AutoPickProgressData) => {
                setAutoPickStatus(data.status);
                setAutoPickProgress(data.progress ?? 100);
                setAutoPickMessage(data.message || (data.status === 'completed' ? '完了しました' : '失敗しました'));
                setTimeout(() => setAutoPickVisible(false), 2000);
                if (data.status === 'completed') {
                  // ライブラリキャッシュを無効化
                  try { (AudioService as any).invalidateLibraryCache?.(); } catch {}
                  Alert.alert('生成完了', 'Auto-Pick音声の生成が完了しました。ライブラリをご確認ください。');
                  // 自動でライブラリタブへ移動
                  router.push('/(tabs)/two');
                } else if (data.status === 'failed') {
                  Alert.alert('エラー', data.error || 'Auto-Pick生成に失敗しました');
                }
              },
              onError: (error: string) => {
                setAutoPickMessage(error);
                setAutoPickStatus('failed');
                setTimeout(() => setAutoPickVisible(false), 2000);
              }
            });
          } catch (error) {
            Alert.alert('エラー', 'Auto-Pick生成に失敗しました');
          }
        }}
      ]
    );
  };

  // Cleanup monitoring on unmount
  React.useEffect(() => {
    return () => {
      if (autoPickSvcRef.current) {
        autoPickSvcRef.current.stopMonitoring();
      }
    };
  }, []);

  // 有効なRSSソースが存在するか
  const hasActiveSources = userSources.some(s => s.is_active);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>記事を読み込み中...</Text>
      </View>
    );
  }

  const renderArticle = ({ item }: { item: Article }) => {
    const isSelected = selectedArticleIds.has(item.id);
    
    return (
      <ArticleCard
        article={item}
        onPress={handleArticlePress}
        isManualPickMode={isManualPickMode}
        isSelected={isSelected}
        onSelect={toggleArticleSelection}
        showAudioPlayer={!isManualPickMode}
      />
    );
  };

  return (
    <View style={styles.container}>
      <UnifiedHeader 
        onSearchPress={onSearchPress}
        onReadStatusPress={() => setShowReadStatusModal(true)}
      />
      {/* ManualPick トグル（既読フィルタ時のみ表示） */}
      {selectedReadStatus === 'read' && (
        <View style={styles.selectionToggleBar}>
          <Text style={styles.selectionToggleText}>
            {isManualPickMode ? '選択モード: ON' : '選択モード: OFF'}
          </Text>
          <TouchableOpacity 
            style={[styles.selectionToggleButton, isManualPickMode && styles.selectionToggleButtonActive]}
            onPress={() => setIsManualPickMode(!isManualPickMode)}
          >
            <Text style={styles.selectionToggleButtonText}>
              {isManualPickMode ? '終了' : '選択モード'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 全ソースOFF時のインフォバナー */}
      {!hasActiveSources && (
        <InfoBanner
          type="warn"
          message="すべてのRSSソースがオフになっています。フィードに表示できる記事がありません。RSSを有効化・追加してください。"
          ctaText="RSSを追加/有効化"
          onPressCTA={() => setShowSourceModal(true)}
          storageKey="@audion_hide_all_off_hint"
        />
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Source Filter - アクティブなRSSソースのみ表示 */}
        <HorizontalTabs
          tabs={[
            { id: 'all', name: 'すべて' },
            ...userSources
              .filter(source => source.is_active) // アクティブなもののみ
              .map(source => {
                const label = (source as any).display_name || (source as any).name || 'RSS';
                return { id: label, name: label };
              })
          ]}
          selectedTab={selectedSource}
          onTabSelect={setSelectedSource}
          style={styles.filterSection}
        />

        {/* Genre Filter */}
        <HorizontalTabs
          tabs={[
            { id: 'すべて', name: 'すべて' },
            ...AVAILABLE_GENRES.filter(g => g !== 'すべて').map(g => ({ id: g, name: g }))
          ]}
          selectedTab={selectedGenre}
          onTabSelect={setSelectedGenre}
          style={styles.filterSection}
        />

        {/* Empty state when no active sources or no articles */}
        {articles.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 16, marginBottom: 8 }}>
              表示できる記事がありません
            </Text>
            <Text style={{ color: '#cccccc', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              すべてのRSSソースがオフになっている可能性があります。設定の「RSS管理」でソースをオンにするか、新しく追加してください。
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
              onPress={() => setShowSourceModal(true)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>RSSを追加/有効化</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.articlesList}>
            <FlatList
              data={articles}
              renderItem={renderArticle}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* RSS Source Modal */}
      <Modal visible={showSourceModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSourceModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>RSSソースを追加</Text>
            
            <ScrollView>
              {/* Pre-configured Sources */}
              <View style={styles.sourceSection}>
                <Text style={styles.sectionTitle}>おすすめソース</Text>
                {sourcesLoading ? (
                  <ActivityIndicator />
                ) : (
                  preConfiguredSources.map((source) => (
                    <View key={source.id} style={styles.sourceItem}>
                      <View style={styles.sourceInfo}>
                        <Text style={styles.sourceIcon}>📰</Text>
                        <View style={styles.sourceDetails}>
                          <Text style={styles.sourceName}>{source.name}</Text>
                          <Text style={styles.sourceDescription}>{source.description}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.addSourceSmallButton}
                        onPress={() => addPreConfiguredSource(source.id, source.name)}
                      >
                        <Text style={styles.addSourceSmallButtonText}>+ 追加</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Custom RSS */}
              <View style={styles.sourceSection}>
                <Text style={styles.sectionTitle}>カスタムRSS</Text>
                <TextInput
                  style={styles.customRssInput}
                  placeholder="RSS URLを入力"
                  value={rssUrl}
                  onChangeText={setRssUrl}
                />
                <TouchableOpacity
                  style={[styles.addSourceSmallButton, { alignSelf: 'stretch' }]}
                  disabled={!rssUrl}
                >
                  <Text style={styles.addSourceSmallButtonText}>URLを追加</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        visible={showArticleModal}
        onClose={handleCloseArticleModal}
      />

      {/* Manual Pick Modal - 設定で有効時のみ表示 */}
      {settings.isManualPickEnabled && (
        <ManualPickModal
          visible={showManualPickModal}
          onClose={() => setShowManualPickModal(false)}
          onGenerateAudio={handleManualPickGenerate}
        />
      )}

      {/* AutoPick Progress Bar */}
      <AutoPickProgressBar
        visible={autoPickVisible}
        progress={autoPickProgress}
        message={autoPickMessage}
        status={autoPickStatus}
        onCancelPress={() => {
          if (autoPickSvcRef.current) {
            autoPickSvcRef.current.stopMonitoring();
          }
          setAutoPickVisible(false);
          setAutoPickStatus('failed');
          setAutoPickMessage('キャンセルしました');
        }}
      />

      {/* Read Status Selection Modal */}
      <Modal visible={showReadStatusModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.readStatusModalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowReadStatusModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>既読ステータスでフィルター</Text>
            
            {READ_STATUS_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.readStatusOption,
                  selectedReadStatus === filter.id && styles.selectedReadStatusOption
                ]}
                onPress={() => {
                  setSelectedReadStatus && setSelectedReadStatus(filter.id);
                  setShowReadStatusModal(false);
                }}
              >
                <Text style={[
                  styles.readStatusOptionText,
                  selectedReadStatus === filter.id && styles.selectedReadStatusOptionText
                ]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Floating AutoPick Button - 設定で有効時のみ表示 */}
      {settings.isAutoPickEnabled && (
        <FloatingAutoPickButton
          onPress={handleAutoPickGenerate}
          selectedGenre={selectedGenre}
          genreName={GENRES.find(g => g.id === selectedGenre)?.name || 'すべて'}
          tabBarHeight={10}
          miniPlayerHeight={0}
          isMiniPlayerVisible={false}
          isManualPickMode={isManualPickMode}
          selectedCount={selectedArticleIds.size}
          onManualPickPress={handleFloatingManualPick}
          disabled={!hasActiveSources}
          disabledReason="RSSソースがすべてオフのため、AutoPickを実行できません。設定のRSS管理でソースを有効化してください。"
        />
      )}

      {renderManualPickPanel()}
    </View>
  );
};
