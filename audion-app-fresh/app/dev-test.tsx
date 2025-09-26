/**
 * 開発者向けAPIテストページ
 * フロントエンド-バックエンド連携の動作確認用
 */

import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import DevApiTester from '../components/DevApiTester';

export default function DevTestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'API連携テスト',
          headerShown: true,
        }}
      />
      <DevApiTester />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});