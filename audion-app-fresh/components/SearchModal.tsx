/**
 * SearchModal Component
 * 統合検索モーダル - 記事・ジャンル・ソース検索機能
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import ArticleService from '../services/ArticleService';

interface SearchResult {
  id: string;
  type: 'article' | 'genre' | 'source';
  title: string;
  subtitle?: string;
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onResultPress: (result: SearchResult) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
  onResultPress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // デバウンス機能付きの検索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    if (!token || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // 記事データを取得して全文検索を実行
      const allArticles = await ArticleService.getArticles(token);
      
      const filteredArticles = allArticles.filter(article => {
        const searchText = query.toLowerCase();
        return (
          article.title.toLowerCase().includes(searchText) ||
          article.summary?.toLowerCase().includes(searchText) ||
          article.content?.toLowerCase().includes(searchText) ||
          article.source_name?.toLowerCase().includes(searchText)
        );
      });

      const results: SearchResult[] = filteredArticles.map(article => ({
        id: article.id,
        type: 'article' as const,
        title: article.title,
        subtitle: `${article.source_name} • ${new Date(article.published_at).toLocaleDateString('ja-JP')}`
      }));

      setSearchResults(results.slice(0, 20)); // 最大20件まで表示
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        onResultPress(item);
        onClose();
      }}
    >
      <Text style={styles.resultTitle}>{item.title}</Text>
      {item.subtitle && (
        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>検索</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="記事のタイトル・内容・ソース名で検索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              placeholderTextColor="#888888"
            />
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
            {loading ? (
              <ActivityIndicator size="small" color="#007bff" />
            ) : searchResults.length === 0 && searchQuery.trim().length > 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>該当する結果がありません</Text>
                <Text style={styles.emptyDescription}>
                  別のキーワードで検索するか、RSSソースを追加して記事を増やしてください。
                </Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    fontSize: 18,
    color: '#666666',
    padding: 4,
  },
  searchContainer: {
    padding: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
});

export default SearchModal;
