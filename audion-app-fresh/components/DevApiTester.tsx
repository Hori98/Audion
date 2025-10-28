/**
 * API 連携テスト用デバッグコンポーネント
 * フロントエンド-バックエンド連携の動作確認
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import UnifiedAudioV2Service from '../services/UnifiedAudioV2Service';
import ArticleService from '../services/ArticleService';
import { useAuth } from '../context/AuthContext';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export default function DevApiTester() {
  const { authToken } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (name: string, result: Partial<TestResult>) => {
    setTestResults(prev => {
      const index = prev.findIndex(r => r.name === name);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...result };
        return updated;
      } else {
        return [...prev, { name, status: 'pending', ...result }];
      }
    });
  };

  const runApiTests = async () => {
    if (!authToken) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    const tests = [
      { name: '記事取得API', test: testArticlesApi },
      { name: 'AutoPick音声生成API', test: testAutoPickApi },
      { name: 'ManualPick音声生成API', test: testManualPickApi },
      { name: 'スケジューラーAPI', test: testSchedulerApi },
    ];

    for (const { name, test } of tests) {
      updateTestResult(name, { status: 'running' });
      const startTime = Date.now();

      try {
        await test();
        const duration = Date.now() - startTime;
        updateTestResult(name, {
          status: 'success',
          message: '成功',
          duration
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        updateTestResult(name, {
          status: 'error',
          message: error instanceof Error ? error.message : '不明なエラー',
          duration
        });
      }

      // テスト間の小休止
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const testArticlesApi = async () => {
    const response = await ArticleService.getArticlesWithReadStatus({
      per_page: 5
    });

    if (!response.articles || response.articles.length === 0) {
      throw new Error('記事が取得できませんでした');
    }

    console.log('✅ Articles API test successful:', response.articles.length + ' articles');
  };

  const testAutoPickApi = async () => {
    const response = await UnifiedAudioV2Service.generateAutoPick({
      max_articles: 1
    });

    if (!response.id || !response.audio_url) {
      throw new Error('AutoPick音声生成の応答が不完全です');
    }

    console.log('✅ AutoPick API test successful:', response.id);
  };

  const testManualPickApi = async () => {
    // まず記事を取得
    const articlesResponse = await ArticleService.getArticlesWithReadStatus({
      per_page: 2
    });

    if (!articlesResponse.articles || articlesResponse.articles.length === 0) {
      throw new Error('テスト用の記事が見つかりません');
    }

    const articles = articlesResponse.articles.slice(0, 2);
    const response = await UnifiedAudioV2Service.generateManualPick({
      article_ids: articles.map(a => a.id),
      article_titles: articles.map(a => a.title),
      article_summaries: articles.map(a => a.summary || a.title)
    });

    if (!response.id || !response.audio_url) {
      throw new Error('ManualPick音声生成の応答が不完全です');
    }

    console.log('✅ ManualPick API test successful:', response.id);
  };

  const testSchedulerApi = async () => {
    const status = await UnifiedAudioV2Service.getSchedulerStatus();

    console.log('✅ Scheduler API test successful:', status);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'running': return '#FF9800';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '⏸️';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API 連携テスト</Text>
      <Text style={styles.subtitle}>
        フロントエンド ↔ バックエンド通信確認
      </Text>

      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={runApiTests}
        disabled={isRunning}
      >
        {isRunning ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>テスト実行</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>
                {getStatusIcon(result.status)}
              </Text>
              <Text style={styles.resultName}>{result.name}</Text>
              {result.duration && (
                <Text style={styles.resultDuration}>
                  {result.duration}ms
                </Text>
              )}
            </View>
            {result.message && (
              <Text
                style={[
                  styles.resultMessage,
                  { color: getStatusColor(result.status) }
                ]}
              >
                {result.message}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <Text style={styles.note}>
        注意: このテストは実際に音声生成を実行します。
        {'\n'}完了まで数分かかる場合があります。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultDuration: {
    fontSize: 12,
    color: '#999',
  },
  resultMessage: {
    fontSize: 14,
    marginLeft: 28,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});