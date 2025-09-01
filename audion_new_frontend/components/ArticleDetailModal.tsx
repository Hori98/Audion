/**
 * Article Detail Modal Component
 * タブ付きの記事詳細表示モーダル - RSS情報とWebViewの切り替え
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Article } from '../services/ArticleService';
import ArticleService from '../services/ArticleService';
import ArticleInfoTab from './ArticleInfoTab';
import ArticleWebViewTab from './ArticleWebViewTab';

interface ArticleDetailModalProps {
  article: Article | null;
  visible: boolean;
  onClose: () => void;
}

export default function ArticleDetailModal({
  article,
  visible,
  onClose,
}: ArticleDetailModalProps) {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'info', title: '要約' },
    { key: 'webview', title: 'WebView' },
  ]);

  // 記事を開いたときに自動で既読マーク
  useEffect(() => {
    if (visible && article) {
      const markArticleAsRead = async () => {
        try {
          await ArticleService.markAsRead(article.id);
        } catch (error) {
          console.error('Failed to mark article as read:', error);
        }
      };
      
      // 少し遅延させて、ユーザーが本当に記事を見た後にマーク
      const timer = setTimeout(markArticleAsRead, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, article]);

  if (!article) return null;


  const renderScene = SceneMap({
    info: () => <ArticleInfoTab article={article} />,
    webview: () => <ArticleWebViewTab url={article.link} title={article.title} />,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#ffffff"
      inactiveColor="#cccccc"
      renderLabel={({ route, focused }) => (
        <Text style={[styles.tabLabel, focused && styles.activeTabLabel]}>
          {route.title}
        </Text>
      )}
    />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* フローティングクローズボタン */}
        <TouchableOpacity 
          style={styles.floatingCloseButton} 
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.floatingCloseButtonText}>×</Text>
        </TouchableOpacity>

        
        {/* タブビュー */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          renderTabBar={renderTabBar}
          initialLayout={{ width: 0 }}
          lazy={true}
          swipeEnabled={true}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  floatingCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 30,
    right: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  floatingCloseButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
    textAlign: 'center',
  },
  tabBar: {
    backgroundColor: '#111111',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
  },
  tabIndicator: {
    backgroundColor: '#007AFF',
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888888',
    letterSpacing: 0.5,
  },
  activeTabLabel: {
    color: '#ffffff',
  },
});