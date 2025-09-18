/**
 * Article WebView Tab Component
 * WebView表示タブ - 記事の元URLをWebViewで表示
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface ArticleWebViewTabProps {
  url: string;
  title: string;
}

export default function ArticleWebViewTab({ url, title }: ArticleWebViewTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const webViewRef = useRef<WebView>(null);

  if (!url) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>📰</Text>
          <Text style={styles.errorTitle}>記事のURLが取得できませんでした</Text>
          <Text style={styles.errorText}>
            この記事にはWebView表示用のURLが設定されていません。
            「記事情報」タブで内容をご確認ください。
          </Text>
        </View>
      </View>
    );
  }

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback((errorEvent: any) => {
    setLoading(false);
    setError('ページの読み込みに失敗しました');
    console.error('WebView error:', errorEvent.nativeEvent);
  }, []);

  const handleNavigationStateChange = useCallback((navState: any) => {
    // 一時的に無効化してテスト
    // if (navState.canGoBack !== canGoBack) {
    //   setCanGoBack(navState.canGoBack);
    // }
    // if (navState.canGoForward !== canGoForward) {
    //   setCanGoForward(navState.canGoForward);
    // }
  }, []);

  const goBack = useCallback(() => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  }, [canGoBack]);

  const goForward = useCallback(() => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  }, [canGoForward]);

  const reload = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.reload();
      setError(null);
    }
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>読み込みエラー</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reload}>
            <Text style={styles.retryButtonText}>再読み込み</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* WebView */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          allowsBackForwardNavigationGestures={true}
          style={styles.webView}
        />
        
        {/* ローディングオーバーレイ */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>記事を読み込んでいます...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
    maxWidth: 300,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});