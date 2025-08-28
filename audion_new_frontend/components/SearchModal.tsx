/**
 * Search Modal Component
 * Comprehensive search functionality for articles, content, and topics
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import SearchService, { SearchResult } from '../services/SearchService';
import { useRSSFeed } from '../hooks/useRSSFeed';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onResultPress: (result: SearchResult) => void;
}

export default function SearchModal({
  visible,
  onClose,
  onResultPress,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'AI技術動向',
    '経済ニュース',
    'テクノロジー'
  ]);
  
  // Get real RSS data
  const { articles, categories, userSources } = useRSSFeed();

  // Enhanced search function using SearchService and real data
  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const results: SearchResult[] = [];
      
      // Search real articles with advanced matching
      if (articles && articles.length > 0) {
        const articleResults = SearchService.searchArticles(articles, query, 8);
        results.push(...articleResults);
        console.log('🔍 [SEARCH DEBUG] Article results:', articleResults.length);
      }
      
      // Search genres with fuzzy matching
      const genreResults = SearchService.searchGenres(query);
      results.push(...genreResults.slice(0, 3)); // Limit genre results
      
      // Search sources with fuzzy matching
      if (userSources && userSources.length > 0) {
        const sourceNames = userSources.map(source => source.name || source.url);
        const sourceResults = SearchService.searchSources(sourceNames, query);
        results.push(...sourceResults.slice(0, 3)); // Limit source results
      }
      
      // Generate search suggestions
      if (articles && articles.length > 0) {
        const searchSuggestions = SearchService.generateSuggestions(articles, query);
        setSuggestions(searchSuggestions);
      }
      
      // Sort all results by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      console.log('🔍 [SEARCH DEBUG] Query:', query, 'Total results:', results.length);
      console.log('🔍 [SEARCH DEBUG] Top result score:', results[0]?.relevanceScore || 'N/A');
      
      setSearchResults(results.slice(0, 15)); // Limit total results
    } catch (error) {
      console.error('❌ [SEARCH ERROR] Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const addToRecentSearches = (query: string) => {
    if (query && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    addToRecentSearches(searchQuery);
    onResultPress(result);
    onClose();
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'article': return '📰';
      case 'genre': return '🏷️';
      case 'source': return '📡';
      default: return '🔍';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>検索</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="記事、ジャンル、ソースを検索..."
              placeholderTextColor="#888888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollContainer}>
          {/* Search Suggestions */}
          {searchQuery.length > 1 && suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>候補</Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => setSearchQuery(suggestion)}
                >
                  <Text style={styles.suggestionIcon}>💡</Text>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Recent Searches */}
          {searchQuery.length === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最近の検索</Text>
              {recentSearches.map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearchItem}
                  onPress={() => handleRecentSearchPress(query)}
                >
                  <Text style={styles.recentSearchIcon}>🕒</Text>
                  <Text style={styles.recentSearchText}>{query}</Text>
                </TouchableOpacity>
              ))}
              {articles && (
                <Text style={styles.articleCountText}>
                  検索可能な記事数: {articles.length}
                </Text>
              )}
            </View>
          )}

          {/* Search Results */}
          {searchQuery.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                検索結果 ({searchResults.length})
              </Text>
              
              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>検索中...</Text>
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    「{searchQuery}」に関する結果が見つかりませんでした
                  </Text>
                </View>
              ) : (
                searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    style={styles.resultItem}
                    onPress={() => handleResultPress(result)}
                  >
                    <Text style={styles.resultIcon}>{getResultIcon(result.type)}</Text>
                    <View style={styles.resultContent}>
                      <Text style={styles.resultTitle}>{result.title}</Text>
                      {result.description && (
                        <Text style={styles.resultDescription} numberOfLines={2}>
                          {result.description}
                        </Text>
                      )}
                      {result.source && (
                        <Text style={styles.resultMeta}>
                          {result.source} • Score: {result.relevanceScore.toFixed(2)}
                        </Text>
                      )}
                      {result.matchHighlights && result.matchHighlights.length > 0 && (
                        <Text style={styles.resultHighlights}>
                          {result.matchHighlights.slice(0, 2).join(' • ')}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    paddingVertical: 12,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#888888',
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 8,
    marginBottom: 8,
  },
  recentSearchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  recentSearchText: {
    fontSize: 16,
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 22,
  },
  resultDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 18,
    marginBottom: 4,
  },
  resultMeta: {
    fontSize: 12,
    color: '#888888',
  },
  resultHighlights: {
    fontSize: 11,
    color: '#007bff',
    fontStyle: 'italic',
    marginTop: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    marginBottom: 6,
  },
  suggestionIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#cccccc',
  },
  articleCountText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});