/**
 * Article WebView Screen - Display articles in web view
 * プレゼンテーショナルコンポーネントパターンで実装
 */

import React from 'react';
import { StyleSheet, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text } from '@/components/Themed';

// Platform-specific imports
let WebView: any = null;
let WebViewNavigation: any = null;

// Only import react-native-webview on native platforms
if (Platform.OS !== 'web') {
  try {
    const webViewModule = require('react-native-webview');
    WebView = webViewModule.WebView;
    WebViewNavigation = webViewModule.WebViewNavigation;
  } catch (error) {
    console.warn('react-native-webview not available:', error);
  }
}

interface ArticleWebViewProps {
  url: string;
  title?: string;
}

const ArticleWebViewUI: React.FC<ArticleWebViewProps> = ({ url, title }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleLoadStart = () => setLoading(true);
  const handleLoadEnd = () => setLoading(false);
  const handleError = () => {
    setError('記事の読み込みに失敗しました');
    setLoading(false);
  };

  const handleNavigationStateChange = (navState: any) => {
    // 外部リンクをブロックすることも可能
    return true;
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ エラー</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            ← 戻る
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Web platform: use iframe
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>記事を読み込み中...</Text>
          </View>
        )}
        <View style={styles.webContainer}>
          <iframe
            src={url}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('記事の読み込みに失敗しました');
              setLoading(false);
            }}
            title={title || '記事'}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Native platform: use WebView
  if (!WebView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ エラー</Text>
          <Text style={styles.errorMessage}>WebViewが利用できません</Text>
          <Text 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            ← 戻る
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>記事を読み込み中...</Text>
        </View>
      )}
      
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsLinkPreview={false}
      />
    </SafeAreaView>
  );
};

export default function ArticleWebView() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();

  if (!url) {
    Alert.alert('エラー', '記事のURLが指定されていません', [
      { text: 'OK', onPress: () => router.back() }
    ]);
    return null;
  }

  return <ArticleWebViewUI url={url} title={title} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 1000,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});