/**
 * Article Info Tab Component
 * RSS情報表示タブ - 記事のメタデータと要約を表示
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Article } from '../services/ArticleService';

interface ArticleInfoTabProps {
  article: Article;
}

export default function ArticleInfoTab({ article }: ArticleInfoTabProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleOpenOriginalLink = () => {
    if (article.link) {
      Linking.openURL(article.link);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* タイトルとメタ情報をシンプルにまとめて表示 */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.metaText}>
            {article.source_name || 'Unknown Source'} • {formatDate(article.published_at)}
            {article.category && ` • ${article.category}`}
          </Text>
        </View>

        {/* サマリー表示（サマリーと詳細内容を統合） */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryText}>
            {article.content || article.summary || '記事内容がありません'}
          </Text>
        </View>

        {/* 外部リンクで開く */}
        <TouchableOpacity 
          style={styles.linkButton} 
          onPress={handleOpenOriginalLink}
        >
          <Text style={styles.linkButtonText}>↗ 外部リンクで開く</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 32,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 20,
  },
  summarySection: {
    marginVertical: 20,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#cccccc',
  },
  linkButton: {
    backgroundColor: 'transparent',
    borderColor: '#ffffff',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  linkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});