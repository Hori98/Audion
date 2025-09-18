/**
 * 開発用認証リセットボタン
 * 認証状態をクリアしてonboardingから始めるためのコンポーネント
 */
import React from 'react';
import { Alert, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface DevResetButtonProps {
  onReset?: () => void;
}

export default function DevResetButton({ onReset }: DevResetButtonProps) {
  const router = useRouter();

  const handleReset = () => {
    Alert.alert(
      '🧹 認証データリセット',
      'アプリの認証状態をリセットしてonboardingから始めますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            try {
              // AsyncStorageの認証関連データをクリア
              await AsyncStorage.multiRemove([
                '@audion_auth_token',
                '@audion_user',
                '@audion_auth_user',
                '@audion_settings',
              ]);

              console.log('✅ 認証データがクリアされました');
              
              // コールバック実行
              if (onReset) {
                onReset();
              }

              // 認証画面にリダイレクト
              router.replace('/auth/login');
              
              Alert.alert('✅ リセット完了', 'アプリがonboardingから開始されます');
            } catch (error) {
              console.error('❌ リセットエラー:', error);
              Alert.alert('❌ エラー', 'リセットに失敗しました');
            }
          },
        },
      ]
    );
  };

  // 開発環境でのみ表示
  if (!__DEV__) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
      <Text style={styles.resetButtonText}>🧹 認証リセット</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  resetButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});