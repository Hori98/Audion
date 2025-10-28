/**
 * Advanced Search Service
 * Provides intelligent search functionality with fuzzy matching and relevance scoring
 */

import { Article } from './ArticleService';

export interface SearchResult {
  id: string;
  title: string;
  type: 'article' | 'genre' | 'source';
  description?: string;
  source?: string;
  publishedAt?: string;
  relevanceScore: number;
  matchHighlights?: string[];
}

class SearchService {
  /**
   * Calculates similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calculates relevance score for an article based on search query
   */
  private calculateRelevance(article: Article, query: string): { score: number; highlights: string[] } {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    let totalScore = 0;
    const highlights: string[] = [];
    
    // Title matching (highest weight)
    const titleScore = this.calculateFieldRelevance(article.title, searchTerms, 3.0, highlights);
    
    // Summary matching (medium weight)
    const summaryScore = this.calculateFieldRelevance(article.summary, searchTerms, 2.0, highlights);
    
    // Source matching (medium weight)
    const sourceScore = this.calculateFieldRelevance(article.source_name, searchTerms, 2.0, highlights);
    
    // Category matching (low weight)
    const categoryScore = article.category ? 
      this.calculateFieldRelevance(article.category, searchTerms, 1.5, highlights) : 0;
    
    // Content matching (if available, low weight)
    const contentScore = article.content ? 
      this.calculateFieldRelevance(article.content, searchTerms, 1.0, highlights) : 0;
    
    totalScore = titleScore + summaryScore + sourceScore + categoryScore + contentScore;
    
    // Boost recent articles slightly
    const publishedDate = new Date(article.published_at);
    const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, (7 - daysSincePublished) * 0.1); // Boost for articles within 7 days
    
    totalScore += recencyBoost;
    
    return { score: Math.max(0, totalScore), highlights };
  }

  /**
   * Calculates relevance score for a specific field
   */
  private calculateFieldRelevance(field: string, searchTerms: string[], weight: number, highlights: string[]): number {
    if (!field) return 0;
    
    const fieldLower = field.toLowerCase();
    let fieldScore = 0;
    
    for (const term of searchTerms) {
      // Exact match
      if (fieldLower === term) {
        fieldScore += 1.0 * weight;
        highlights.push(`Exact match: "${term}"`);
      }
      // Contains match
      else if (fieldLower.includes(term)) {
        fieldScore += 0.8 * weight;
        highlights.push(`Contains: "${term}"`);
      }
      // Word boundary match
      else if (new RegExp(`\\b${term}\\b`).test(fieldLower)) {
        fieldScore += 0.9 * weight;
        highlights.push(`Word match: "${term}"`);
      }
      // Fuzzy match (similarity > 0.7)
      else {
        const similarity = this.calculateSimilarity(fieldLower, term);
        if (similarity > 0.7) {
          fieldScore += similarity * 0.6 * weight;
          highlights.push(`Similar: "${term}" (${Math.round(similarity * 100)}%)`);
        }
      }
    }
    
    return fieldScore;
  }

  /**
   * Search articles with advanced matching and ranking
   */
  searchArticles(articles: Article[], query: string, limit: number = 10): SearchResult[] {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const results: SearchResult[] = [];
    
    for (const article of articles) {
      const { score, highlights } = this.calculateRelevance(article, query);
      
      if (score > 0.1) { // Minimum relevance threshold
        results.push({
          id: article.id,
          title: article.title,
          type: 'article',
          description: article.summary,
          source: article.source_name,
          publishedAt: article.published_at,
          relevanceScore: score,
          matchHighlights: highlights.slice(0, 3) // Top 3 highlights
        });
      }
    }
    
    // Sort by relevance score (descending)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results.slice(0, limit);
  }

  /**
   * Search genres with fuzzy matching
   */
  searchGenres(query: string): SearchResult[] {
    const genres = [
      'all', 'news', 'technology', 'business', 'sports', 'entertainment', 
      'science', 'politics', 'economics', 'international', 'health', 
      'lifestyle', 'education', 'environment', 'culture', 'food', 
      'travel', 'automotive', 'real-estate', 'finance'
    ];
    
    const genreLabels = {
      'all': 'すべて',
      'news': 'ニュース',
      'technology': 'テクノロジー',
      'business': 'ビジネス',
      'sports': 'スポーツ',
      'entertainment': 'エンタメ',
      'science': 'サイエンス',
      'politics': '政治',
      'economics': '経済',
      'international': '国際',
      'health': '健康',
      'lifestyle': 'ライフスタイル',
      'education': '教育',
      'environment': '環境',
      'culture': '文化',
      'food': '食・グルメ',
      'travel': '旅行',
      'automotive': '自動車',
      'real-estate': '不動産',
      'finance': '金融'
    };
    
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    for (const genre of genres) {
      const label = genreLabels[genre as keyof typeof genreLabels] || genre;
      const similarity = Math.max(
        this.calculateSimilarity(genre, queryLower),
        this.calculateSimilarity(label, queryLower)
      );
      
      if (similarity > 0.5) {
        results.push({
          id: `genre-${genre}`,
          title: label,
          type: 'genre',
          description: `${label}関連のすべての記事`,
          relevanceScore: similarity,
        });
      }
    }
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search sources with fuzzy matching
   */
  searchSources(sources: string[], query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    for (const source of sources) {
      const similarity = this.calculateSimilarity(source, queryLower);
      
      if (similarity > 0.5) {
        results.push({
          id: `source-${source}`,
          title: source,
          type: 'source',
          description: `${source}からのニュース`,
          relevanceScore: similarity,
        });
      }
    }
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Generate search suggestions based on query
   */
  generateSuggestions(articles: Article[], query: string): string[] {
    if (!query || query.length < 2) return [];
    
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();
    
    // Extract common words from article titles and summaries
    const wordCounts = new Map<string, number>();
    
    articles.forEach(article => {
      const text = `${article.title} ${article.summary}`.toLowerCase();
      const words = text.split(/\s+/).filter(word => 
        word.length > 2 && 
        word.startsWith(queryLower) &&
        !/[^\w\s]/.test(word) // No special characters
      );
      
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });
    
    // Sort by frequency and take top suggestions
    const sortedWords = Array.from(wordCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
    
    return sortedWords;
  }
}

export default new SearchService();