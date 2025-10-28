/**
 * Floating AutoPick Button Component
 * 画面右下に常に表示され、実際の下部要素の高さを測定して動的に位置調整
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Animated,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import SubscriptionService from '../services/SubscriptionService';

interface FloatingAutoPickButtonProps {
  // レイアウトバリアント（試験実装）
  // 'fab': 従来の右下丸ボタン（デフォルト）
  // 'docked': 下部中央のピル型（実験用・現状未使用）
  variant?: 'fab' | 'docked';
  // 表示/非表示の制御（アニメ付き）
  visible?: boolean;
  onPress?: () => void;
  selectedGenre?: string;
  genreName?: string;
  // 実際の要素高さを動的に取得
  tabBarHeight?: number;
  miniPlayerHeight?: number;
  isMiniPlayerVisible?: boolean;
  // ManualPickモード対応
  isManualPickMode?: boolean;
  selectedCount?: number;
  onManualPickPress?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  remainingDaily?: number;
  onOpenPlanManagement?: () => void;
  // Progress ring props (optional)
  progress?: number; // 0-100
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export default function FloatingAutoPickButton({
  // 試験実装: コメントアウトで一時停止しやすいようにデフォルトは従来の'fab'
  variant = 'fab',
  visible = true,
  onPress,
  genreName = 'トップ',
  tabBarHeight = 80, // フォールバック値
  miniPlayerHeight = 0,
  isMiniPlayerVisible = false,
  isManualPickMode = false,
  selectedCount = 0,
  onManualPickPress,
  disabled = false,
  disabledReason,
  remainingDaily,
  onOpenPlanManagement,
  progress,
  status,
}: FloatingAutoPickButtonProps) {
  const { token } = useAuth();
  const [animation] = useState(new Animated.Value(1));
  const [visibilityAnim] = useState(new Animated.Value(visible ? 1 : 0));
  const insets = useSafeAreaInsets();
  const [internalRemaining, setInternalRemaining] = useState<number | null>(null);

  useEffect(() => {
    // 表示/非表示のアニメーション（フェード + 下から16px）
    Animated.timing(visibilityAnim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (typeof remainingDaily === 'undefined') {
      (async () => {
        try {
          const limits = await SubscriptionService.getLimits();
          setInternalRemaining(limits.remaining_daily_audio);
        } catch (e) {
          setInternalRemaining(null);
        }
      })();
    }
  }, [remainingDaily]);

  // AutoPickの状態変化に応じて残回数をリフレッシュ
  useEffect(() => {
    const shouldRefresh = status === 'completed' || status === 'failed';
    if (shouldRefresh && typeof remainingDaily === 'undefined') {
      // 完了時は少し遅延してからリフレッシュ（バックエンドの更新を待つ）
      const delay = status === 'completed' ? 1000 : 0;
      const timer = setTimeout(async () => {
        try {
          const limits = await SubscriptionService.getLimits();
          setInternalRemaining(limits.remaining_daily_audio);
          if (__DEV__) {
            console.log(`[FloatingAutoPickButton] Remaining count refreshed: ${limits.remaining_daily_audio}`);
          }
        } catch (e) {
          if (__DEV__) {
            console.error('[FloatingAutoPickButton] Failed to refresh remaining count:', e);
          }
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [status, remainingDaily]);

  // 動的位置調整の計算: セーフエリア + タブバー + ミニプレイヤー（表示時のみ） + マージン
  const actualMiniPlayerHeight = isMiniPlayerVisible ? miniPlayerHeight : 0;
  const dynamicBottom = insets.bottom + tabBarHeight + actualMiniPlayerHeight + 4;
  // ドック配置時: タブバー（またはミニプレイヤ）上端からボタン高さの約半分(=24px)だけ上に配置
  const dockedBottom = insets.bottom + (isMiniPlayerVisible ? (miniPlayerHeight) : (tabBarHeight)) + 24;

  const handleButtonPress = async () => {
    if (!token) {
      Alert.alert('エラー', '認証が必要です。ログインしてください。');
      return;
    }

    const rem = typeof remainingDaily === 'number' ? remainingDaily : (internalRemaining ?? undefined);
    if (typeof rem === 'number' && rem <= 0) {
      Alert.alert(
        '上限に達しました',
        '本日のAutoPick作成上限に達しています。プラン管理で上限を拡大できます。',
        [
          { text: '閉じる', style: 'cancel' },
          ...(onOpenPlanManagement ? [{ text: 'プラン管理', onPress: onOpenPlanManagement }] : [])
        ]
      );
      return;
    }

    if (disabled) {
      if (disabledReason) {
        Alert.alert('実行できません', disabledReason);
      }
      return;
    }

    // ボタンアニメーション
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (isManualPickMode) {
      // ManualPickモード時の処理
      if (selectedCount === 0) {
        Alert.alert('記事を選択してください', '音声生成する記事を選択してから実行してください。');
        return;
      }
      if (onManualPickPress) {
        onManualPickPress();
      }
    } else {
      // 通常のAutoPickモード時の処理
      if (onPress) {
        onPress();
      } else {
        Alert.alert(
          'AutoPick音声生成', 
          `選択中のジャンル「${genreName}」で自動音声生成を開始しますか？`,
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '生成開始', onPress: async () => {
              try {
                Alert.alert(
                  '音声生成開始', 
                  `ジャンル「${genreName}」の記事を分析して音声を生成します。\n※AutoPick機能は今後さらに拡張予定です。`
                );
              } catch (error) {
                console.error('AutoPick error:', error);
                Alert.alert('エラー', 'AutoPick機能でエラーが発生しました。');
              }
            }}
          ]
        );
      }
    }
  };

  // ---- Gradient Progress Indicator (下から上へのグラデーション) ----
  // Progress値を正規化 (0-100)
  const actualProgress = status === 'pending' ? 0 : (typeof progress === 'number' ? progress : 0);
  const pct = Math.max(0, Math.min(100, actualProgress));

  // Animated.Valueで滑らかな進捗アニメーション
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 500,
      useNativeDriver: false, // backgroundColorはnative driver非対応
    }).start();
  }, [pct]);

  // 進捗に応じた色の計算
  // 0%: 灰色 #666666
  // 1-99%: 薄めの青色 #5A9FDB (進行中を示す)
  // 100%: 元の青色 #007bff
  const getButtonColors = () => {
    if (pct === 0) {
      // 押下直後 (灰色)
      return { top: '#666666', bottom: '#666666' };
    } else if (pct === 100) {
      // 完了 (元の青色)
      return { top: '#007bff', bottom: '#007bff' };
    } else {
      // 進行中 (下から薄い青色が徐々に上がる)
      // 薄い青色: #5A9FDB (約80%の明るさ)
      const lightBlue = '#5A9FDB';
      const gray = '#666666';

      // 進捗に応じて下から上へグラデーション
      // pct = 50% → 下半分が薄い青、上半分が灰色
      return { top: gray, middle: lightBlue, bottom: lightBlue, progress: pct / 100 };
    }
  };

  const buttonColors = getButtonColors();

  // 既定: 従来の右下FAB
  if (variant === 'fab') {
    return (
      <Animated.View
        style={[
          styles.containerFab,
          {
            bottom: dynamicBottom,
            opacity: visibilityAnim,
            transform: [
              { translateY: visibilityAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              { scale: animation }
            ]
          }
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.buttonWrapper}
        >
          {/* Gradient Progress Background (下から上への進捗表示) */}
          {typeof progress === 'number' && 'progress' in buttonColors && (
            <View style={styles.gradientContainer}>
              <LinearGradient
                colors={[buttonColors.bottom!, buttonColors.middle!, buttonColors.top!]}
                locations={[0, buttonColors.progress!, 1]}
                style={styles.gradientBackground}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.buttonFab,
              isManualPickMode && styles.manualPickButton,
              (isManualPickMode && selectedCount === 0 || disabled) && styles.disabledButton,
              (typeof progress === 'number' && 'progress' in buttonColors) && {
                backgroundColor: 'transparent'
              }
            ]}
            onPress={handleButtonPress}
            activeOpacity={0.8}
            disabled={isManualPickMode && selectedCount === 0 || disabled}
          >
            <View style={styles.iconContainer}>
              {isManualPickMode ? (
                <Ionicons name="hand-left-outline" size={20} color="#ffffff" />
              ) : (
                (() => {
                  const rem = Math.max(0, (typeof remainingDaily === 'number' ? remainingDaily : (internalRemaining || 0)));
                  if (Number.isFinite(rem)) {
                    return (
                      <View style={styles.squareTextWrapper}>
                        <Text style={styles.squareText} numberOfLines={1}>
                          {rem}
                        </Text>
                      </View>
                    );
                  }
                  return <Ionicons name="sparkles" size={20} color="#ffffff" />;
                })()
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // 実験版: 下部中央のピルCTA（未使用）。
  // コメントアウトで封印する場合は、上のreturnを残して下記ブロックをコメントアウトしてください。
  return (
    <Animated.View
      style={[
        styles.containerDocked,
        {
          bottom: dockedBottom,
          opacity: visibilityAnim,
          transform: [
            { translateY: visibilityAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: animation }
          ]
        }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={[
          styles.buttonDocked,
          isManualPickMode && styles.buttonDockedManual,
          (isManualPickMode && selectedCount === 0 || disabled) && styles.buttonDockedDisabled,
        ]}
        onPress={handleButtonPress}
        activeOpacity={0.9}
        disabled={isManualPickMode && selectedCount === 0 || disabled}
      >
        <Ionicons name={isManualPickMode ? 'hand-left-outline' : 'sparkles'} size={18} color="#ffffff" />
        <Text style={styles.dockedLabel}>
          {isManualPickMode ? 'ManualPick' : 'AutoPick'}
        </Text>
        {(() => {
          const rem = Math.max(0, (typeof remainingDaily === 'number' ? remainingDaily : (internalRemaining || 0)));
          if (Number.isFinite(rem)) {
            return <Text style={styles.dockedBadge}>{rem}</Text>;
          }
          return null;
        })()}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 右下FABレイアウト
  containerFab: {
    position: 'absolute',
    right: 20,
    zIndex: 3000, // ミニプレイヤー(2001)とタブバー(1000)より上に配置
    elevation: 3000, // Android対応
  },
  buttonWrapper: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  buttonFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff', // デフォルトの青色
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareTextWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  manualPickButton: {
    backgroundColor: '#FF9500', // オレンジ色
    borderColor: 'rgba(255,149,0,0.3)',
  },
  disabledButton: {
    backgroundColor: '#666666',
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },

  // 下部中央ドック・ピルCTAレイアウト（実験）
  containerDocked: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3000,
    elevation: 3000,
  },
  buttonDocked: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  buttonDockedManual: {
    backgroundColor: 'rgba(255,149,0,0.65)',
    borderColor: 'rgba(255,149,0,0.35)',
  },
  buttonDockedDisabled: {
    opacity: 0.6,
  },
  dockedLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dockedBadge: {
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#007bff',
    borderRadius: 10,
    overflow: 'hidden',
  },
});
