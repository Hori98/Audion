/**
 * Home Screen (index.tsx)
 * ホームタブ - キュレーション記事とAuto-Pick機能
 *
 * 機能: 厳選記事表示、Auto-Pick音声生成、ニュースアプリ風UI
 * Note: 既存ニュースアプリとの差別化を図るプレミアムコンテンツ
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  Alert, 
  View, 
  Text,
  Image,
  StatusBar,
  Dimensions,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useCuratedFeed } from '../../hooks/useCuratedFeed';
import { useSettings } from '../../context/SettingsContext';
import ArticleService from '../../services/ArticleService';
import { useAutoPick } from '../../context/AutoPickContext';
import { useArticle } from '../../context/ArticleContext';
import { autoPickProgressService } from '../../services/AutoPickProgressService';
import AudioService from '../../services/AudioService';
import { AudioMetadataService } from '../../services/AudioMetadataService';
import SubscriptionService from '../../services/SubscriptionService';
import SettingsSyncService from '../../services/SettingsSyncService';
import HorizontalTabs from '../../components/HorizontalTabs';
import HeroCarousel from '../../components/HeroCarousel';
import ArticleCard from '../../components/ArticleCard';
import UnifiedHeader from '../../components/UnifiedHeader';
import SearchModal from '../../components/SearchModal';
import FloatingAutoPickButton from '../../components/FloatingAutoPickButton';
import Icon from '../../components/common/Icon';
import ArticleDetailModal from '../../components/ArticleDetailModal';
import SectionHeader from '../../components/SectionHeader';
import CompactCard from '../../components/CompactCard';
import BreakingNewsCard from '../../components/BreakingNewsCard';
import PersonalizedGrid from '../../components/PersonalizedGrid';
import TrendingCarousel from '../../components/TrendingCarousel';
import LoadMoreButton from '../../components/LoadMoreButton';
import AudioRecommendationCarousel from '../../components/AudioRecommendationCarousel';
import { AudioRecommendation } from '../../components/AudioRecommendationCard';
import { getTopAudioRecommendations } from '../../data/mock-audio-recommendations';
import { Article } from '../../services/ArticleService';
import { API_CONFIG } from '../../config/api';
import NotificationService from '../../services/NotificationService';
import { AppState } from 'react-native';
import { useGlobalAudio } from '../../context/GlobalAudioContext';
import { generateGenreTabs, applyGenreFilterForHome, lightweightRandomSort } from '../../utils/genreUtils';
import { Genre } from '../../types/rss';
import { commonStyles, SPACING } from '../../styles/commonStyles';
import UnifiedArticleList from '../../components/common/UnifiedArticleList';
import SectionDivider from '../../components/common/SectionDivider';
import SectionPlaceholder from '../../components/common/SectionPlaceholder';
import { UI_FLAGS } from '../../config/uiFlags';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const { startTask, updateTask, completeTask, failTask, clearTask, currentTask } = useAutoPick();
  const { playSound, currentTrack } = useGlobalAudio();
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
  const [breakingExpanded, setBreakingExpanded] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  
  // 最新セクション段階的表示用状態
  const [latestVisibleCount, setLatestVisibleCount] = useState(10); // デフォルト10件表示
  
  // Trending and Personalized articles state
  const [trendingArticlesData, setTrendingArticlesData] = useState<Article[]>([]);
  const [personalizedArticlesData, setPersonalizedArticlesData] = useState<Article[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  // 可視領域・最新セクションの可視判定用
  const scrollRef = useRef<import('react').MutableRefObject<any> | any>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const latestSectionLayout = useRef<{ y: number; height: number }>({ y: 0, height: 0 });
  const [isLatestVisible, setIsLatestVisible] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  // 可視判定: 境界クロス方式（ピクセル閾値のヒステリシス）
  // 要望: 表示と非表示の高さを一致（上端側）。下端側は従来どおり少し余裕を持たせる。
  const ON_EPS_TOP = 12;        // 画面下端がセクション上端+εを超えたら表示
  const OFF_EPS_TOP = ON_EPS_TOP; // 上方向へ戻るときも同じ位置で非表示
  const OFF_EPS_BOTTOM = 8;     // 下方向へ通過時は少し遅めに非表示
  const TAB_BAR_H = 56;         // 参照用（描画位置にのみ使用）
  const MINI_H = 64;            // 参照用（描画位置にのみ使用）

  // Audio Recommendations state
  const [audioRecommendations, setAudioRecommendations] = useState<AudioRecommendation[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);


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

  // Load trending and personalized articles
  const loadSectionArticles = async () => {
    try {
      setSectionsLoading(true);
      
      // Load trending articles (30 articles, use first 10 for home)
      const trending = await ArticleService.getTrendingArticles(30);
      setTrendingArticlesData(trending.slice(0, 10));
      
      // Load personalized articles (30 articles, use first 4 for home)
      if (user?.id) {
        const personalized = await ArticleService.getPersonalizedArticles(user.id, 30);
        setPersonalizedArticlesData(personalized.slice(0, 4));
      } else {
        // Fallback to curated articles for non-authenticated users
        const curated = await ArticleService.getCuratedArticles();
        setPersonalizedArticlesData(curated.slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to load section articles:', error);
      console.log('🔗 Current API Base URL:', API_CONFIG.BASE_URL);
    } finally {
      setSectionsLoading(false);
    }
  };

  // Load audio recommendations (mock data for now)
  const loadAudioRecommendations = async () => {
    try {
      setAudioLoading(true);
      
      // Simulate API delay for realistic experience
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load mock data (top 5 by engagement score)
      const recommendations = getTopAudioRecommendations(5);
      setAudioRecommendations(recommendations);
      
      // Audio recommendations loaded
    } catch (error) {
      console.error('Failed to load audio recommendations:', error);
    } finally {
      setAudioLoading(false);
    }
  };

  // Load section articles on mount and user change
  useEffect(() => {
    loadSectionArticles();
    loadAudioRecommendations();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      handleRefresh(), // 新しいカスタムリフレッシュハンドラーを使用
      loadSectionArticles(), // Trending and Personalized sections refresh
      loadAudioRecommendations() // Audio recommendations refresh
    ]);
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

  // ManualPick機能はHomeタブでは無効化されているため、空の関数を提供
  const handleSelectArticle = (_articleId: string) => {};


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
      // Collect visible articles as candidates for home tab (from currently displayed latest section)
      console.log('🔍 [AUTOPICK_DEBUG] Article sources:', {
        selectedGenre,
        latestArticles_count: latestArticles.length,
        allArticles_count: articles.length,
        firstLatestArticle: latestArticles[0]?.title || 'None',
        firstAllArticle: articles[0]?.title || 'None'
      });
      
      const candidates = latestArticles.slice(0, 50).map(article => ({
        id: article.id,
        title: article.title || 'No Title',
        summary: (article.summary || '').substring(0, 200),
        link: article.link || '',
        source_name: article.source_name || 'Curated Source',
        published_at: article.published_at || new Date().toISOString()
      }));

      // Create AutoPick request using settings synchronization
      const request = SettingsSyncService.createAutoPickRequest(
        settings,
        {
          preferred_genres: genre !== 'すべて' ? [genre] : settings.pickModes.auto.preferredGenres,
          source_scope: 'fixed', // Home tab uses curated sources
          candidates: candidates,
          selected_source_ids: undefined, // Home tab doesn't filter by source IDs
        },
        'home' // This is the Home tab
      );
      // Structured START log
      console.log(JSON.stringify({
        tag: 'AP_CLIENT',
        event: 'START',
        scope: request.tab_scope,
        genre,
        candidates_count: candidates.length,
        voice_name: request.voice_name,
        voice_language: request.voice_language,
        prompt_style: request.prompt_style,
        custom_prompt_present: !!request.custom_prompt,
        max_articles: request.max_articles,
      }));

      // AutoPick APIの呼び出し（サービス経由、正しいエンドポイントに統一）
      const taskResponse = await AudioService.startAutoPickTask(
        request,
        token || undefined
      );
      console.log(JSON.stringify({ tag: 'AP_CLIENT', event: 'TASK_STARTED', task_id: taskResponse.task_id }));
      
      // タスク監視を開始
      startTask(taskResponse.task_id);
      
      // SSE監視を開始
      autoPickProgressService.startMonitoring(
        taskResponse.task_id,
        token!,
        {
          onProgress: (data) => {
            console.log(JSON.stringify({ tag: 'AP_CLIENT', event: 'PROGRESS', task_id: taskResponse.task_id, status: data.status, progress: data.progress }));
            updateTask({
              status: data.status,
              progress: data.progress,
              message: data.message,
            });
          },
          onComplete: (data) => {
            console.log(JSON.stringify({ tag: 'AP_CLIENT', event: 'COMPLETE', task_id: taskResponse.task_id, status: data.status, result_id: (data as any)?.result?.id, duration: (data as any)?.result?.duration }));
            // If server returned debug_info, echo one-line summary for easy analysis
            try {
              const dbg = (data as any)?.debug_info;
              if (dbg) {
                console.log(JSON.stringify({ tag: 'AP_CLIENT', event: 'RESULT', task_id: taskResponse.task_id, debug_info: dbg }));
              }
            } catch {}
            
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
            console.log(JSON.stringify({ tag: 'AP_CLIENT', event: 'ERROR', message: String(error) }));
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
    
    // タブスコープ情報の取得
    const tabScope = debugInfo?.tab_scope || '不明';
    const tabDisplayName = tabScope === 'home' ? 'ホーム' : tabScope === 'feed' ? 'フィード' : tabScope;
    
    const scriptPreview = (result?.script || '').replace(/<[^>]+>/g, '').slice(0, 200);
    const baseMessage = `${tabDisplayName}タブ・ジャンル「${genreName}」の音声が生成されました！\n\nタイトル: ${result?.title || '不明'}\n採用記事数: ${result?.article_ids?.length || '不明'}件\n再生時間: ${durationText}\n\n--- 原稿プレビュー ---\n${scriptPreview}`;
    
    // ★ 通知スケジュール（foreground/backgroundに応じて分岐）
    const shouldSendNotification = settings?.notifications?.onAutoPickComplete;
    const currentAppState = AppState.currentState;
    
    if (shouldSendNotification) {
      // フォアグラウンド/バックグラウンド問わずローカル通知を送信（Expo Pushが未設定の環境でも確実に通知）
      console.log('🔔 [AUTOPICK-NOTIFICATION] Scheduling notification');
      NotificationService.scheduleLocalNotification(
        "🎵 音声生成完了",
        `${genreName}の音声が完成しました！タップして再生`,
        0, // 即時
        {
          audioId: result.id,
          audioUrl: result.audio_url,
          title: result.title || 'AutoPick生成音声',
          mode: 'autopick',
          genre: genreName
        }
      ).catch(error => {
        console.error('🔔 [AUTOPICK-NOTIFICATION] Failed to schedule notification:', error);
      });
    }
    
    // 開発環境でのみデバッグ情報を追加
    let fullMessage = baseMessage;
    if (__DEV__ && debugInfo) {
      // processing time prefers V2 stage_timings.total_ms, falls back to legacy processing_time_ms
      const totalMs = debugInfo?.stage_timings?.total_ms ?? debugInfo?.processing_time_ms;
      const processingTime = (typeof totalMs === 'number') ? `${totalMs}ms` : '計測失敗';

      // total fetched prefers pool_sizes.total, falls back to legacy total_articles_fetched
      const fetchedCount = debugInfo?.pool_sizes?.total ?? debugInfo?.total_articles_fetched ?? 0;
      const candidatesCount = debugInfo?.candidates_count ?? 0;

      const appliedGenres = Array.isArray(debugInfo?.applied_genres) && debugInfo.applied_genres.length > 0
        ? debugInfo.applied_genres.join(', ')
        : '指定なし';

      const scriptLen = (typeof debugInfo?.script_length === 'number') ? debugInfo.script_length : (result?.script ? String(result.script).replace(/<[^>]+>/g, '').length : 0);

      const debugText = `\n\n--- DEBUG INFO ---\n処理時間: ${processingTime}\n候補記事数: ${fetchedCount}件\nフロント候補: ${candidatesCount}件\nスクリプト長: ${scriptLen}文字\nプラン: ${debugInfo.user_plan || '不明'}\nタブ: ${tabScope}\n適用ジャンル: ${appliedGenres}`;
      fullMessage = baseMessage + debugText;
    }
    
    // 自動再生が有効な場合
    const shouldAutoPlay = settings?.playback?.autoPlay && result?.audio_url;

    // Foregroundでの重複ポップアップ回避のため、Alertは既定で無効化
    if (UI_FLAGS.SHOW_AUTOPICK_COMPLETION_ALERT) {
      Alert.alert(
        '🎵 音声生成完了！',
        fullMessage + (shouldAutoPlay ? '\n\n🎶 自動再生を開始します...' : ''),
        [
          { 
            text: shouldAutoPlay ? '再生中' : 'OK', 
            style: 'default' as const 
          },
          ...(result?.audio_url
            ? [
                {
                  text: '▶️ 再生',
                  style: 'default' as const,
                  onPress: () => {
                    handlePlayFromCompletionPopup(result.id, result.audio_url, result.duration);
                  },
                },
              ]
            : [])
        ]
      );
    }

    // 自動再生実行（ユーザー体験最適化）
    if (shouldAutoPlay) {
      console.log('🎵 [AUTO_PLAY] Auto-play enabled, scheduling playback in 1 second', {
        audioId: result.id,
        audioUrl: result.audio_url,
        appState: currentAppState,
        notificationSent: shouldSendNotification && (currentAppState === 'background' || currentAppState === 'inactive')
      });
      
      setTimeout(() => {
        try {
          console.log('🎵 [AUTO_PLAY] Starting auto-play for completed AutoPick');
          playSound({
            id: result.id,
            uri: result.audio_url,
            title: result.title || 'AutoPick生成音声',
            duration: result.duration ? result.duration * 1000 : undefined, // Convert seconds to milliseconds
            // データ欠け防止: script/chapters を即時注入
            script: result.script,
            chapters: result.chapters,
            sourceName: result.source_name || 'AutoPick',
            publishedAt: result.created_at,
          });

          // メタデータのウォームアップ（全画面遷移時の即時表示用）
          AudioMetadataService.getById(result.id, token).catch(() => {
            // エラーは握りつぶし（既にデータは渡されている）
            console.log('🎵 [AUTO_PLAY] Metadata warmup completed or failed (non-critical)');
          });

          // サブスク残回数の同期
          SubscriptionService.getLimits().then(() => {
            console.log('🎵 [AUTO_PLAY] Subscription limits refreshed');
          }).catch(() => {
            console.log('🎵 [AUTO_PLAY] Subscription limits refresh failed (non-critical)');
          });
        } catch (error) {
          console.error('🎵 [AUTO_PLAY] Auto-play failed:', error);
        }
      }, 1000); // 1秒後に自動再生（通知表示後）
    } else {
      console.log('🎵 [AUTO_PLAY] Auto-play disabled or no audio URL available', {
        autoPlaySetting: settings?.playback?.autoPlay,
        hasAudioUrl: !!result?.audio_url,
        appState: currentAppState
      });
    }
  };

  const handlePlayFromCompletionPopup = async (audioId: string, audioUrl: string, duration?: number) => {
    try {
      console.log('🎵 [PLAY] Attempting to play audio:', { audioId, audioUrl, duration });

      if (!audioUrl) {
        Alert.alert('エラー', '音声ファイルのURLが見つかりません');
        return;
      }

      // グローバル音声管理システムを使用
      await playSound({
        id: audioId,
        uri: audioUrl,
        title: 'AUTOPICK生成音声',
        duration: duration ? duration * 1000 : undefined // Convert seconds to milliseconds
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

  // 音声おすすめコンテンツのハンドラー
  const handleAudioPress = (audio: AudioRecommendation) => {
    console.log('[Home] Audio recommendation pressed:', audio.title);
    // TODO: Discover Tab統合後にDiscoverタブへ遷移
    Alert.alert(
      '音声コンテンツ',
      `「${audio.title}」\n\n作成者: ${audio.creator}\n再生時間: ${Math.floor(audio.duration / 60)}:${(audio.duration % 60).toString().padStart(2, '0')}\n\nDiscover Tab統合後に再生機能が利用可能になります。`,
      [{ text: 'OK' }]
    );
  };

  const handleAudioPlay = (audio: AudioRecommendation) => {
    console.log('[Home] Audio play pressed:', audio.title);
    // TODO: Discover Tab統合後に直接再生
    Alert.alert(
      '音声再生',
      `「${audio.title}」の再生機能は準備中です。\nDiscover Tab統合後に利用可能になります。`,
      [{ text: 'OK' }]
    );
  };

  const handleAudioSeeMore = () => {
    console.log('[Home] Audio see more pressed - navigating to Discover tab');
    // Discover Tabへ遷移
    router.push('/(tabs)/discover');
  };

  // 最新セクション「さらに見る」ハンドラー
  const handleLoadMoreLatest = () => {
    setLatestVisibleCount(prev => prev + 5); // 5件ずつ追加
  };

  // ジャンル変更時に表示件数をリセット
  useEffect(() => {
    setLatestVisibleCount(10); // デフォルト10件に戻す
  }, [selectedGenre]);

  // プルツーリフレッシュ対応のカスタムリフレッシュハンドラー
  const handleRefresh = async () => {
    await refreshArticles(); // 記事データを更新
    setLatestVisibleCount(10); // 表示件数をデフォルトにリセット
  };


  // 5セクション構造用のデータ分割 - 各セクション用の記事を準備
  // Hero, Breaking, Trending, Personalized は全記事から取得（ジャンルフィルタなし）
  // Latest のみジャンルフィルタリングを適用
  
  const allArticles = articles; // 全記事（フィルタリングなし）
  
  
  // Hero セクション: 全記事から最新5件
  const heroArticles = allArticles.slice(0, 5);
  
  // 速報重要度スコア計算
  const calculateBreakingScore = (article: Article): number => {
    let score = 0;
    
    // 1. 時間重要度 (0-30点)
    const publishedTime = new Date(article.published_at || 0).getTime();
    const hoursAgo = (Date.now() - publishedTime) / (1000 * 60 * 60);
    if (hoursAgo <= 6) {
      score += Math.max(0, 30 - hoursAgo * 5);
    }
    
    // 2. エンゲージメント重要度 (0-25点)
    const engagementScore = (article as any).engagement_score || 0;
    score += Math.min(25, engagementScore / 4);
    
    // 3. カテゴリ重要度 (0-25点)
    const categoryWeights: Record<string, number> = {
      '災害': 25, '緊急': 25, '政治': 20, '経済': 15,
      '国際': 15, 'スポーツ': 10, 'エンタメ': 5,
      'disaster': 25, 'emergency': 25, 'politics': 20, 'economy': 15,
      'international': 15, 'sports': 10, 'entertainment': 5
    };
    const category = article.category?.toLowerCase() || '';
    for (const [key, weight] of Object.entries(categoryWeights)) {
      if (category.includes(key.toLowerCase())) {
        score += weight;
        break;
      }
    }
    
    // 4. キーワード重要度 (0-20点)
    const urgentKeywords = /(速報|緊急|重要|地震|台風|警報|避難|breaking|urgent|emergency)/gi;
    const titleMatches = (article.title.match(urgentKeywords) || []).length;
    const summaryMatches = ((article.summary || '').match(urgentKeywords) || []).length;
    score += Math.min(20, (titleMatches + summaryMatches) * 10);
    
    return Math.round(score);
  };
  
  // Breaking セクション: 全記事から速報スコアの高い記事を選出
  const breakingArticles = React.useMemo(() => {
    return allArticles
      .map(article => ({
        ...article,
        breakingScore: calculateBreakingScore(article)
      }))
      .filter(article => 
        article.breakingScore >= 40 && // 閾値: 40点以上
        article.published_at &&
        new Date(article.published_at) > new Date(Date.now() - 6 * 60 * 60 * 1000)
      )
      .sort((a, b) => b.breakingScore - a.breakingScore) // 高スコア順
      .slice(0, 6); // 最大6件
  }, [allArticles]);
  
  // Trending セクション: APIから取得した上位10件
  const trendingArticles = React.useMemo(() => {
    return trendingArticlesData.length > 0 ? trendingArticlesData : allArticles.slice(6, 16);
  }, [trendingArticlesData, allArticles]);
  
  // Personalized セクション: APIから取得した上位4件
  const personalizedArticles = React.useMemo(() => {
    return personalizedArticlesData.length > 0 ? personalizedArticlesData : allArticles.slice(16, 20);
  }, [personalizedArticlesData, allArticles]);
  
  // Latest セクション: ジャンルフィルタリング + 軽量ランダムソート適用
  const latestArticles = React.useMemo(() => {
    const latestAllArticles = allArticles.slice(24); // 24件目以降の記事
    const filteredArticles = applyGenreFilterForHome(latestAllArticles, selectedGenre);
    const sortedArticles = lightweightRandomSort(filteredArticles); // ソース名ベースの軽量ランダムソート
    
    
    return sortedArticles;
  }, [allArticles, selectedGenre]);

  // 段階的表示用の計算（パフォーマンス最適化）
  const visibleLatestArticles = React.useMemo(() => {
    const visible = latestArticles.slice(0, latestVisibleCount);
    
    
    return visible;
  }, [latestArticles, latestVisibleCount]);

  const hasMoreLatestArticles = React.useMemo(() => {
    return latestArticles.length > latestVisibleCount;
  }, [latestArticles.length, latestVisibleCount]);

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
      
      {/* 固定ヘッダー - ScrollViewの外に配置 */}
      <UnifiedHeader
        onSearchPress={() => setShowSearchModal(true)}
      />
      
      {/* ScrollViewベースのセクション構造 */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        onScroll={(e) => {
          if (!hasScrolled) setHasScrolled(true);
          const offsetY = e.nativeEvent.contentOffset.y;
          const viewH = e.nativeEvent.layoutMeasurement?.height || viewportHeight || 0;
          const { y, height } = latestSectionLayout.current;
          // ガード: レイアウトが未確定の間は判定しない
          if (!height || viewH === 0) return;

          // 可視領域（オーバーレイ控除なし）：最新が下端に“覗いた瞬間”から可視扱い
          const top = offsetY;
          const bottom = offsetY + viewH;

          const sectionTop = y;
          const sectionBottom = y + height;

          // ヒステリシスを持つ可視制御（境界クロス方式, スクロール開始後のみ評価）
          if (hasScrolled) {
            let nextVisible = isLatestVisible;
            // ON: 画面下端が最新セクションの上端+εを超えたら表示
            if (!isLatestVisible && bottom >= sectionTop + ON_EPS_TOP) {
              nextVisible = true;
            }
            // OFF(下方向へ通過): 画面上端が最新セクションの下端-εを超えたら非表示
            else if (isLatestVisible && top >= sectionBottom - OFF_EPS_BOTTOM) {
              nextVisible = false;
            }
            // OFF(上方向へ戻る): 画面下端が最新セクションの上端+εを下回ったら非表示（表示と同じ高さ）
            else if (isLatestVisible && bottom <= sectionTop + OFF_EPS_TOP) {
              nextVisible = false;
            }
            if (nextVisible !== isLatestVisible) setIsLatestVisible(nextVisible);
          }
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || loading} 
            onRefresh={onRefresh}
            tintColor="#007bff"
            colors={['#007bff']}
          />
        }
      >
        <View>



            {/* Unified 5-Section Structure */}
            
            {/* Hero セクション */}
            <View style={[styles.sectionContainer, styles.heroSectionContainer]}>
              {loading ? (
                <SectionPlaceholder message="読み込み中…" lines={2} />
              ) : heroArticles.length > 0 ? (
                <HeroCarousel
                  articles={heroArticles}
                  onArticlePress={handleArticlePress}
                  onPlayPress={handlePlayPress}
                />
              ) : null}
            </View>

            {/* Breaking セクション（枠は常時表示） */}
            <View style={styles.sectionContainer}>
              <SectionHeader
                type="emergency"
                title="速報"
                articleCount={breakingArticles.length}
                divider="none"
              />
              {(sectionsLoading || loading) ? (
                <SectionPlaceholder message="読み込み中…" lines={1} />
              ) : breakingArticles.length > 0 ? (
                <View style={[styles.breakingContainer, { paddingHorizontal: SPACING.SCREEN_HORIZONTAL }]}>
                  {breakingArticles.slice(0, 3).map((article, index) => (
                    <View key={article.id} style={styles.breakingItem}>
                      <BreakingNewsCard
                        article={article}
                        breakingScore={calculateBreakingScore(article)}
                        onPress={handleArticlePress}
                      />
                    </View>
                  ))}
                  {breakingExpanded && breakingArticles.slice(3).map((article, index) => (
                    <View key={article.id} style={styles.breakingItem}>
                      <BreakingNewsCard
                        article={article}
                        breakingScore={calculateBreakingScore(article)}
                        onPress={handleArticlePress}
                      />
                    </View>
                  ))}
                  {breakingArticles.length > 3 && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => setBreakingExpanded(!breakingExpanded)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.expandButtonText}>
                          {breakingExpanded ? '閉じる' : `さらに${breakingArticles.length - 3}件を表示`}
                        </Text>
                        {breakingExpanded ? (
                          <Icon name="chevron-up" size={16} color="#FFFFFF" />
                        ) : (
                          <Icon name="chevron-down" size={16} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <SectionPlaceholder message="現在表示できる速報はありません" lines={0} />
              )}
              {UI_FLAGS.USE_SECTION_FOOTER_DIVIDERS && (
                <SectionDivider inset={8} topMargin={6} />
              )}
            </View>

            {/* Trending セクション（枠は常時表示） */}
            <View style={styles.sectionContainer}>
              <SectionHeader
                type="trending"
                title="トレンド"
                articleCount={trendingArticles.length}
                showSeeMore={trendingArticles.length > 0}
                onSeeMorePress={() => router.push('/trending')}
                divider="none"
              />
              {sectionsLoading ? (
                <SectionPlaceholder message="読み込み中…" lines={1} />
              ) : trendingArticles.length > 0 ? (
                <TrendingCarousel
                  articles={trendingArticles}
                  onArticlePress={handleArticlePress}
                  onSeeMore={() => router.push('/trending')}
                  maxItems={10}
                />
              ) : (
                <SectionPlaceholder message="現在表示できるトレンドはありません" lines={0} />
              )}
              {UI_FLAGS.USE_SECTION_FOOTER_DIVIDERS && (
                <SectionDivider inset={8} topMargin={6} />
              )}
            </View>

            {/* Audio Recommendations セクション - NEW */}
            <View
              style={styles.sectionContainer}
            >
              <SectionHeader
                type="audio"
                title="おすすめ音声"
                articleCount={audioRecommendations.length}
                showSeeMore={audioRecommendations.length > 0}
                onSeeMorePress={handleAudioSeeMore}
                divider="none"
              />
              <AudioRecommendationCarousel
                recommendations={audioRecommendations}
                onAudioPress={handleAudioPress}
                onAudioPlay={handleAudioPlay}
                onSeeMore={handleAudioSeeMore}
                maxItems={5}
                loading={audioLoading}
                showSeeMore={true}
              />
              {UI_FLAGS.USE_SECTION_FOOTER_DIVIDERS && (
                <SectionDivider inset={8} topMargin={6} />
              )}
            </View>

            {/* Personalized セクション（枠は常時表示） */}
            <View style={styles.sectionContainer}>
              <SectionHeader
                type="personalized"
                title="おすすめ"
                articleCount={personalizedArticles.length}
                showSeeMore={personalizedArticles.length > 0}
                onSeeMorePress={() => router.push('/personalized')}
                divider="none"
              />
              {sectionsLoading ? (
                <SectionPlaceholder message="読み込み中…" lines={1} />
              ) : personalizedArticles.length > 0 ? (
                <PersonalizedGrid
                  articles={personalizedArticles}
                  onArticlePress={handleArticlePress}
                  onSeeMore={() => router.push('/personalized')}
                  maxItems={4}
                />
              ) : (
                <SectionPlaceholder message="現在表示できるおすすめはありません" lines={0} />
              )}
              {UI_FLAGS.USE_SECTION_FOOTER_DIVIDERS && (
                <SectionDivider inset={8} topMargin={6} />
              )}
            </View>

            {/* Latest セクション with Genre Filtering */}
            <View
              style={styles.sectionContainer}
              onLayout={(e) => {
                latestSectionLayout.current = {
                  y: e.nativeEvent.layout.y,
                  height: e.nativeEvent.layout.height,
                };
              }}
            >
              <SectionHeader
                type="latest"
                title="最新"
                articleCount={visibleLatestArticles.length}
                divider="none"
              />
              
              {/* Genre tabs - 共通スタイル使用 */}
              <HorizontalTabs
                tabs={generateGenreTabs(availableGenres)}
                selectedTab={selectedGenre}
                onTabSelect={(tabId: string) => setSelectedGenre(tabId as Genre)}
                style={[commonStyles.filterSection, { paddingVertical: 0 }]}
              />
              
              {/* 記事リストまたは空の状態表示 */}
              {latestArticles.length > 0 ? (
                <>
                  {/* 記事リスト - UnifiedArticleListを使用 */}
                  {/** 旧スタイル（カード基調） - いつでも戻せるように残しています
                  <UnifiedArticleList
                    articles={visibleLatestArticles}
                    onArticlePress={handleArticlePress}
                    mode="scrollview"
                    isManualPickMode={false}
                    selectedArticleIds={new Set<string>()}
                    readArticleIds={new Set(readArticleIds)}
                    onSelect={handleSelectArticle}
                    onToggleRead={toggleReadStatus}
                  />
                  */}
                  {/* 新スタイル（セル＝行基調） */}
                  <UnifiedArticleList
                    articles={visibleLatestArticles}
                    onArticlePress={handleArticlePress}
                    mode="scrollview"
                    variant={UI_FLAGS.USE_CELL_HOME_LATEST ? 'cell' : 'card'}
                    isManualPickMode={false}
                    selectedArticleIds={new Set<string>()}
                    readArticleIds={new Set(readArticleIds)}
                    onSelect={handleSelectArticle}
                    onToggleRead={toggleReadStatus}
                  />
                  
                  {/* さらに見るボタン - 記事リストの最下部に配置 */}
                  <LoadMoreButton
                    visible={hasMoreLatestArticles}
                    onPress={handleLoadMoreLatest}
                  />
                </>
              ) : (
                /* 空の状態表示 */
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    選択されたジャンル「{selectedGenre}」の記事が見つかりません
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    「すべて」タブまたは他のジャンルをお試しください
                  </Text>
                </View>
              )}
              {UI_FLAGS.USE_SECTION_FOOTER_DIVIDERS && (
                <SectionDivider inset={8} topMargin={6} />
              )}
            </View>

          </View>
        </ScrollView>

      {/**
       * AutoPick進捗表示（旧UI）
       * 体験を阻害するため一旦コメントアウト。リング進捗へ置換済み。
       * 復帰したい場合はこのブロックを戻す。
       */}
      {false && currentTask && (
        <View style={styles.autoPickProgressContainer}>
          <Text style={styles.autoPickProgressTitle}>🎧 音声生成中</Text>
          <Text style={styles.autoPickProgressMessage}>
            {currentTask?.message || '処理中...'}
          </Text>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarForeground,
                { width: `${currentTask?.progress || 0}%` }
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {Math.round(currentTask?.progress || 0)}%
          </Text>
        </View>
      )}

      {/* AutoPick フローティングボタン（新：リング進捗対応） */}
      {/* 最新セクションが可視のときだけAutoPick CTAを表示 */}
      {(
        // スクロール開始後かつ、viewport/section計測済みのときのみ判定
        hasScrolled && viewportHeight > 0 && latestSectionLayout.current.height > 0 && isLatestVisible
      ) && (
        <FloatingAutoPickButton
          variant="docked" // ← 試験中。戻す場合はこの行を削除
          onPress={handleAutoPick}
          disabled={!!currentTask}
          progress={currentTask?.progress}
          status={currentTask?.status as any}
          tabBarHeight={TAB_BAR_H}
          miniPlayerHeight={MINI_H}
          isMiniPlayerVisible={!!currentTrack}
          visible={isLatestVisible}
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
  scrollContainer: {
    flex: 1,
  },
  categoryTabs: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  contentContainer: {
    paddingBottom: 80, // Space for floating button
  },

  // 新しいセクション用スタイル
  sectionContainer: {
    marginBottom: 12,
  },
  heroSectionContainer: {
    marginBottom: 6,
  },
  breakingContainer: {
    // 余白はJSX側で管理
  },
  breakingItem: {
    width: '100%',
    marginBottom: 0,
  },
  latestContainer: {
    paddingVertical: 8,
  },
  latestItem: {
    width: '100%',
  },
  expandButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  expandButtonText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Empty state styles
  emptyStateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  
  // 旧スタイル（互換性のため残す）
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
    marginHorizontal: 8,
    marginBottom: 8,
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
    padding: 12,
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


});
