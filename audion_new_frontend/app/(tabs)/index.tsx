/**
 * Home Screen - ニュースアプリ風UI
 * 既存ニュースアプリ（SmartNews/Yahoo!ニュース）のUI/UX完全コピー
 * スイッチングコスト最小化でユーザー獲得を目指す
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
import { useRSSFeedContext } from '../../context/RSSFeedContext';
import { useSettings } from '../../context/SettingsContext';
import { useAutoPick } from '../../context/AutoPickContext';
import { autoPickProgressService } from '../../services/AutoPickProgressService';
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

const { width: screenWidth } = Dimensions.get('window');

// ニュースアプリ風カテゴリ設定
const NEWS_CATEGORIES = [
  { id: 'all', name: 'トップ' },
  { id: 'technology', name: 'テック' },
  { id: 'business', name: 'ビジネス' },
  { id: 'sports', name: 'スポーツ' },
  { id: 'entertainment', name: 'エンタメ' },
  { id: 'international', name: '国際' },
  { id: 'lifestyle', name: 'ライフ' },
];

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const { startTask, updateTask, completeTask, failTask, clearTask } = useAutoPick();
  const { playSound } = useGlobalAudio();
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

  // クリーンアップ用のuseEffect
  useEffect(() => {
    return () => {
      // コンポーネント終了時にSSE接続を閉じる
      autoPickProgressService.stopMonitoring();
    };
  }, []);
  
  // RSS Feed データを取得（共通化されたContext経由）
  const { 
    articles, 
    loading, 
    selectedGenre,
    setSelectedGenre,
    onRefresh: rssRefresh 
  } = useRSSFeedContext();

  const onRefresh = () => {
    setRefreshing(true);
    rssRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleArticlePress = (article: Article) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
  };

  const handleCloseArticleModal = () => {
    setShowArticleModal(false);
    setSelectedArticle(null);
  };

  const handleAutoPick = async () => {
    if (!token) {
      Alert.alert('エラー', '認証が必要です。ログインしてください。');
      return;
    }

    const genreName = NEWS_CATEGORIES.find(c => c.id === selectedGenre)?.name || 'トップ';
    
    Alert.alert(
      'AutoPick音声生成', 
      `選択中のジャンル「${genreName}」で自動音声生成を開始しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
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
      // AutoPick APIの呼び出し - 新しいタスクベースシステム
      const response = await fetch(`${API_CONFIG.BASE_URL}/auto-pick/create-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          max_articles: 3,
          preferred_genres: genre !== 'all' ? [genre] : undefined,
          source_priority: "balanced",
          time_based_filtering: true,
          language: "ja", // 日本語音声を明示的に指定
          voice_language: "ja",
        }),
      });

      if (!response.ok) {
        throw new Error(`AutoPick API error: ${response.status}`);
      }

      const taskResponse = await response.json();
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
      failTask(error.toString());
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
        { text: 'OK', style: 'default' },
        ...__DEV__ && result?.audio_url ? [{
          text: '再生テスト',
          style: 'default',
          onPress: () => {
            handlePlayFromCompletionPopup(result.id, result.audio_url);
          }
        }] : []
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


  // データを階層別に分割
  const heroArticles = articles.slice(0, 5); // ヒーロー用の最初の5記事
  const largeCardArticles = articles.slice(5, 8); // 大きいカード用
  const smallCardArticles = articles.slice(8); // 小さいカード用

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
        
        {/* ジャンルラベル */}
        <View style={styles.genreLabel}>
          <Text style={styles.genreLabelText}>
            {item.category || ''}
          </Text>
        </View>
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
            />

            {/* カテゴリータブ */}
            <HorizontalTabs
              tabs={NEWS_CATEGORIES}
              selectedTab={selectedGenre}
              onTabSelect={setSelectedGenre}
              style={styles.categoryTabs}
            />

            {/* ゾーン1: ヒーローカルーセル（トップのみ表示） */}
            {selectedGenre === 'all' && heroArticles.length > 0 && (
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
          </View>
        }
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        // パフォーマンス最適化
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* AutoPick フローティングボタン - 設定で有効時のみ表示 */}
      {settings.isAutoPickEnabled && (
        <FloatingAutoPickButton
          onPress={handleAutoPick}
          selectedGenre={selectedGenre}
          genreName={NEWS_CATEGORIES.find(c => c.id === selectedGenre)?.name || 'トップ'}
          tabBarHeight={10}
          miniPlayerHeight={0}
          isMiniPlayerVisible={false}
        />
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

  // ジャンルラベル
  genreLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreLabelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
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

});