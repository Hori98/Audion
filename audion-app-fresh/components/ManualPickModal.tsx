/**
 * Manual Pick Modal Component
 * 既読記事から複数記事を選択して音声生成する機能
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Article } from '../services/ArticleService';
import ArticleService from '../services/ArticleService';

interface ManualPickModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerateAudio: (selectedArticles: Article[]) => Promise<void>;
}

export default function ManualPickModal({
  visible,
  onClose,
  onGenerateAudio,
}: ManualPickModalProps) {
  const [readArticles, setReadArticles] = useState<Article[]>([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (visible) {
      loadReadArticles();
    }
  }, [visible]);

  const loadReadArticles = async () => {
    try {
      setLoading(true);
      const response = await ArticleService.getArticlesWithReadStatus({
        per_page: 100,
        read_filter: 'read'
      });
      setReadArticles(response.articles);
    } catch (error) {
      console.error('Failed to load read articles:', error);
      Alert.alert('エラー', '既読記事の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleArticleSelection = (articleId: string) => {
    const newSelected = new Set(selectedArticleIds);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      if (newSelected.size >= 10) {
        Alert.alert('制限', '最大10記事まで選択できます');
        return;
      }
      newSelected.add(articleId);
    }
    setSelectedArticleIds(newSelected);
  };

  const handleGenerate = async () => {
    if (selectedArticleIds.size === 0) {
      Alert.alert('選択エラー', '音声生成する記事を選択してください');
      return;
    }

    try {
      setGenerating(true);
      const selectedArticles = readArticles.filter(article => 
        selectedArticleIds.has(article.id)
      );
      
      await onGenerateAudio(selectedArticles);
      setSelectedArticleIds(new Set());
      onClose();
    } catch (error) {
      console.error('Manual pick generation failed:', error);
      Alert.alert('エラー', '音声生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const renderArticleItem = ({ item }: { item: Article }) => {
    const isSelected = selectedArticleIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.articleItem,
          isSelected && styles.selectedArticleItem
        ]}
        onPress={() => toggleArticleSelection(item.id)}
      >
        <View style={styles.checkboxContainer}>
          <View style={[
            styles.checkbox,
            isSelected && styles.checkedCheckbox
          ]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
        
        <View style={styles.articleContent}>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.articleMeta}>
            <Text style={styles.articleSource}>{item.source_name}</Text>
            <Text style={styles.articleDate}>
              {new Date(item.published_at).toLocaleDateString('ja-JP')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>キャンセル</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Manual Pick</Text>
          
          <TouchableOpacity 
            onPress={handleGenerate}
            disabled={selectedArticleIds.size === 0 || generating}
            style={[
              styles.generateButton,
              (selectedArticleIds.size === 0 || generating) && styles.disabledButton
            ]}
          >
            <Text style={[
              styles.generateButtonText,
              (selectedArticleIds.size === 0 || generating) && styles.disabledButtonText
            ]}>
              {generating ? '生成中...' : '音声生成'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          既読記事から選択 ({selectedArticleIds.size}/10)
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>既読記事を読み込み中...</Text>
          </View>
        ) : readArticles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>既読記事がありません</Text>
            <Text style={styles.emptySubtext}>記事を読んでからお試しください</Text>
          </View>
        ) : (
          <FlatList
            data={readArticles}
            renderItem={renderArticleItem}
            keyExtractor={(item) => item.id}
            style={styles.articlesList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#333333',
  },
  disabledButtonText: {
    color: '#888888',
  },
  subtitle: {
    fontSize: 14,
    color: '#cccccc',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#cccccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
  },
  articlesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedArticleItem: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleSource: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  articleDate: {
    fontSize: 12,
    color: '#888888',
  },
});