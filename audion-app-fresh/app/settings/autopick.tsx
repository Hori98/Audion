/**
 * AutoPick Settings Screen
 * 自動記事選択機能の設定画面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AudioService } from '../../services/AudioService';

export default function AutoPickScreen() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [maxArticles, setMaxArticles] = useState(5);
  const [autoExecute, setAutoExecute] = useState(false);

  const handleGenerateAutoPick = async () => {
    try {
      setIsGenerating(true);

      Alert.alert(
        'AutoPick実行',
        `最大${maxArticles}記事から音声を自動生成します。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '実行',
            onPress: async () => {
              try {
                const response = await AudioService.generateAutoPickAudio({
                  max_articles: maxArticles,
                  preferred_genres: [], // TODO: ジャンル選択機能を後で追加
                  active_source_ids: [], // TODO: ソース選択機能を後で追加
                });

                Alert.alert(
                  '生成開始',
                  'AutoPick音声の生成を開始しました。完了までしばらくお待ちください。',
                  [{ text: 'OK' }]
                );

                // ライブラリ画面に遷移
                router.push('/(tabs)/library');
              } catch (error) {
                console.error('AutoPick generation error:', error);
                Alert.alert(
                  'エラー',
                  '音声生成に失敗しました。しばらく時間をおいて再度お試しください。',
                  [{ text: 'OK' }]
                );
              } finally {
                setIsGenerating(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AutoPick設定',
          headerBackTitle: '戻る'
        }}
      />

      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>自動記事選択</Text>
          <Text style={styles.subtitle}>
            AIがあなたの好みに基づいて記事を自動選択し、音声を生成します
          </Text>
        </View>

        {/* 記事数設定 */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>生成設定</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Text style={styles.settingItemTitle}>最大記事数</Text>
              <Text style={styles.settingItemSubtitle}>
                1回の生成で選択する記事の最大数
              </Text>
            </View>
            <TextInput
              style={styles.numberInput}
              value={maxArticles.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setMaxArticles(Math.min(Math.max(num, 1), 20));
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        {/* 自動実行設定（将来の機能） */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>自動実行設定</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Text style={styles.settingItemTitle}>定期自動実行</Text>
              <Text style={styles.settingItemSubtitle}>
                指定した時間に自動でAutoPickを実行（近日追加予定）
              </Text>
            </View>
            <Switch
              value={autoExecute}
              onValueChange={setAutoExecute}
              disabled={true}
              trackColor={{ false: '#767577', true: '#007AFF' }}
              thumbColor={autoExecute ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* 今すぐ生成ボタン */}
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerateAutoPick}
          disabled={isGenerating}
        >
          <FontAwesome
            name={isGenerating ? "spinner" : "magic"}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.generateButtonText}>
            {isGenerating ? '生成中...' : '今すぐ生成'}
          </Text>
        </TouchableOpacity>

        {/* 説明テキスト */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>AutoPickについて</Text>
          <Text style={styles.infoText}>
            • RSSフィードから最新の記事を取得
          </Text>
          <Text style={styles.infoText}>
            • あなたの過去の選択履歴を分析
          </Text>
          <Text style={styles.infoText}>
            • おすすめの記事を自動で選択
          </Text>
          <Text style={styles.infoText}>
            • 選択された記事から音声を生成
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6D6D80',
    lineHeight: 22,
  },
  settingSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItemLeft: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: '#6D6D80',
  },
  numberInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    color: '#000000',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6D6D80',
    marginBottom: 4,
    lineHeight: 20,
  },
});