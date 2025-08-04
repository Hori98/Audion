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

export class ArticleNormalizationService {
  /**
   * Generate a normalized ID for an article to prevent duplicates
   * Uses title and source name to create a consistent identifier
   */
  static generateNormalizedId(article: Article): string {
    const titleNormalized = article.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    const sourceNormalized = article.source_name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
    
    return `${sourceNormalized}_${titleNormalized}`.substring(0, 100); // Limit length
  }

  /**
   * Add normalized IDs to articles and remove duplicates
   */
  static normalizeArticles(articles: Article[]): Article[] {
    const seenNormalizedIds = new Set<string>();
    const normalizedArticles: Article[] = [];

    for (const article of articles) {
      const normalizedId = this.generateNormalizedId(article);
      
      if (!seenNormalizedIds.has(normalizedId)) {
        seenNormalizedIds.add(normalizedId);
        normalizedArticles.push({
          ...article,
          normalizedId
        });
      }
    }

    return normalizedArticles;
  }

  /**
   * Check if two articles are duplicates based on their content
   */
  static areDuplicates(article1: Article, article2: Article): boolean {
    const id1 = this.generateNormalizedId(article1);
    const id2 = this.generateNormalizedId(article2);
    return id1 === id2;
  }

  /**
   * Merge duplicate articles, keeping the most recent one
   */
  static mergeDuplicates(articles: Article[]): Article[] {
    const articleMap = new Map<string, Article>();

    for (const article of articles) {
      const normalizedId = this.generateNormalizedId(article);
      const existing = articleMap.get(normalizedId);

      if (!existing) {
        articleMap.set(normalizedId, { ...article, normalizedId });
      } else {
        // Keep the article with the more recent published date
        const currentDate = new Date(article.published);
        const existingDate = new Date(existing.published);
        
        if (currentDate > existingDate) {
          articleMap.set(normalizedId, { ...article, normalizedId });
        }
      }
    }

    return Array.from(articleMap.values());
  }
}