import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  published: string;
  source_name: string;
  content?: string;
  genre?: string;
  normalizedId?: string;
}

export const useArticleSelection = () => {
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [allArticlesMap, setAllArticlesMap] = useState<Map<string, Article>>(new Map());
  const [normalizedArticlesMap, setNormalizedArticlesMap] = useState<Map<string, Article>>(new Map());
  const [uiUpdateTrigger, setUiUpdateTrigger] = useState(0);

  // Load global selection state from AsyncStorage
  const loadGlobalSelection = useCallback(async () => {
    try {
      const savedSelection = await AsyncStorage.getItem('feed_selected_articles');
      if (savedSelection) {
        const parsedSelection = JSON.parse(savedSelection);
        setSelectedArticleIds(parsedSelection);
      }
    } catch (error) {
      console.error('Error loading global selection:', error);
    }
  }, []);

  // Save global selection state to AsyncStorage
  const saveGlobalSelection = useCallback(async (selection: string[]) => {
    try {
      await AsyncStorage.setItem('feed_selected_articles', JSON.stringify(selection));
    } catch (error) {
      console.error('Error saving global selection:', error);
    }
  }, []);

  // Toggle article selection
  const toggleArticleSelection = useCallback((articleId: string, articles: Article[]) => {
    // Find the article and get its normalized ID
    const article = articles.find(a => a.id === articleId);
    if (!article || !article.normalizedId) {
      console.error('Article not found or missing normalizedId:', articleId);
      return;
    }
    
    const normalizedId = article.normalizedId;
    
    setSelectedArticleIds(prevSelected => {
      const isCurrentlySelected = prevSelected.includes(normalizedId);
      let newSelection: string[];
      
      if (isCurrentlySelected) {
        // Remove from selection
        newSelection = prevSelected.filter(id => id !== normalizedId);
      } else {
        // Add to selection (limit to 10)
        if (prevSelected.length >= 10) {
          console.warn('Maximum 10 articles can be selected');
          return prevSelected;
        }
        newSelection = [...prevSelected, normalizedId];
      }
      
      // Save to AsyncStorage
      saveGlobalSelection(newSelection);
      
      // Force UI update
      setTimeout(() => {
        setUiUpdateTrigger(prev => prev + 1);
      }, 50);
      
      return newSelection;
    });
  }, [saveGlobalSelection]);

  // Clear all selections
  const clearAllSelections = useCallback(async () => {
    setSelectedArticleIds([]);
    await saveGlobalSelection([]);
    setUiUpdateTrigger(prev => prev + 1);
  }, [saveGlobalSelection]);

  // Remove specific article from selection
  const removeFromSelection = useCallback((normalizedId: string) => {
    setSelectedArticleIds(prevSelected => {
      const newSelection = prevSelected.filter(id => id !== normalizedId);
      saveGlobalSelection(newSelection);
      setUiUpdateTrigger(prev => prev + 1);
      return newSelection;
    });
  }, [saveGlobalSelection]);

  // Select all articles in current filter
  const selectAllInCurrentFilter = useCallback((articles: Article[]) => {
    const currentFilterIds = articles
      .filter(article => article.normalizedId)
      .map(article => article.normalizedId!)
      .slice(0, 10); // Limit to first 10

    setSelectedArticleIds(prevSelected => {
      // Merge with existing selections (keeping unique)
      const combinedSelection = [...new Set([...prevSelected, ...currentFilterIds])].slice(0, 10);
      saveGlobalSelection(combinedSelection);
      setUiUpdateTrigger(prev => prev + 1);
      return combinedSelection;
    });
  }, [saveGlobalSelection]);

  // Deselect all articles in current filter
  const deselectAllInCurrentFilter = useCallback((articles: Article[]) => {
    const currentFilterIds = articles
      .filter(article => article.normalizedId)
      .map(article => article.normalizedId!);

    setSelectedArticleIds(prevSelected => {
      const newSelection = prevSelected.filter(id => !currentFilterIds.includes(id));
      saveGlobalSelection(newSelection);
      setUiUpdateTrigger(prev => prev + 1);
      return newSelection;
    });
  }, [saveGlobalSelection]);

  // Memoized functions for better performance
  const areAllCurrentArticlesSelected = useCallback((articles: Article[]) => {
    const currentFilterIds = articles
      .filter(article => article.normalizedId)
      .map(article => article.normalizedId!);
    return currentFilterIds.length > 0 && currentFilterIds.every(id => selectedArticleIds.includes(id));
  }, [selectedArticleIds]);

  const getSelectedInCurrentFilterCount = useCallback((articles: Article[]) => {
    const currentFilterIds = articles
      .filter(article => article.normalizedId)
      .map(article => article.normalizedId!);
    return selectedArticleIds.filter(id => currentFilterIds.includes(id)).length;
  }, [selectedArticleIds]);

  // Memoize selected articles to prevent recalculation
  const selectedArticles = useMemo(() => {
    return selectedArticleIds
      .map(normalizedId => normalizedArticlesMap.get(normalizedId))
      .filter((article): article is Article => article !== undefined);
  }, [selectedArticleIds, normalizedArticlesMap]);

  const getSelectedArticles = useCallback(() => selectedArticles, [selectedArticles]);

  // Update articles maps
  const updateArticleMaps = useCallback((articles: Article[]) => {
    setAllArticlesMap(prevMap => {
      const newMap = new Map(prevMap);
      articles.forEach((article: Article) => {
        newMap.set(article.id, article);
      });
      return newMap;
    });
    
    setNormalizedArticlesMap(prevMap => {
      const newMap = new Map(prevMap);
      articles.forEach((article: Article) => {
        if (article.normalizedId) {
          newMap.set(article.normalizedId, article);
        }
      });
      return newMap;
    });
  }, []);

  return {
    selectedArticleIds,
    allArticlesMap,
    normalizedArticlesMap,
    uiUpdateTrigger,
    loadGlobalSelection,
    saveGlobalSelection,
    toggleArticleSelection,
    clearAllSelections,
    removeFromSelection,
    selectAllInCurrentFilter,
    deselectAllInCurrentFilter,
    areAllCurrentArticlesSelected,
    getSelectedInCurrentFilterCount,
    getSelectedArticles,
    updateArticleMaps,
  };
};