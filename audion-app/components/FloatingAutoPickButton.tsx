/**
 * Floating AutoPick Button Component
 * 画面右下に常に表示され、実際の下部要素の高さを測定して動的に位置調整
 */

import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const { height: screenHeight } = Dimensions.get('window');

interface FloatingAutoPickButtonProps {
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
}

export default function FloatingAutoPickButton({
  onPress,
  selectedGenre = 'all',
  genreName = 'トップ',
  tabBarHeight = 80, // フォールバック値
  miniPlayerHeight = 0,
  isMiniPlayerVisible = false,
  isManualPickMode = false,
  selectedCount = 0,
  onManualPickPress
}: FloatingAutoPickButtonProps) {
  const { token } = useAuth();
  const [animation] = useState(new Animated.Value(1));
  const insets = useSafeAreaInsets();

  // 動的位置調整の計算: セーフエリア + タブバー + ミニプレイヤー（表示時のみ） + マージン
  const actualMiniPlayerHeight = isMiniPlayerVisible ? miniPlayerHeight : 0;
  const dynamicBottom = insets.bottom + tabBarHeight + actualMiniPlayerHeight + 4;

  const handleButtonPress = async () => {
    if (!token) {
      Alert.alert('エラー', '認証が必要です。ログインしてください。');
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

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: dynamicBottom,
          transform: [{ scale: animation }]
        }
      ]}
    >
      <TouchableOpacity 
        style={[
          styles.button,
          isManualPickMode && styles.manualPickButton,
          isManualPickMode && selectedCount === 0 && styles.disabledButton
        ]}
        onPress={handleButtonPress}
        activeOpacity={0.8}
        disabled={isManualPickMode && selectedCount === 0}
      >
        <View style={styles.iconContainer}>
          {isManualPickMode ? (
            <Text style={styles.handIcon}>✋</Text>
          ) : (
            <Ionicons name="sparkles" size={20} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2', // 落ち着いた青色
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // キラキラ効果のための微細なグラデーション風
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  handIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
});