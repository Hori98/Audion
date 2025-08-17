import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
const API = `${BACKEND_URL}/api`;

export interface Bookmark {
  id: string;
  user_id: string;
  article_id: string;
  article_title: string;
  article_summary: string;
  article_link: string;
  article_source: string;
  article_image_url?: string;
  bookmarked_at: string;
  tags: string[];
  notes?: string;
  read_later?: boolean; // Flag for "Read Later" functionality
}

export interface BookmarkCreate {
  article_id: string;
  article_title: string;
  article_summary: string;
  article_link: string;
  article_source: string;
  article_image_url?: string;
  tags?: string[];
  notes?: string;
  read_later?: boolean; // Flag for "Read Later" functionality
}

class BookmarkService {
  private static instance: BookmarkService;
  private bookmarksCache: Bookmark[] = [];
  private bookmarkStatusCache: Map<string, boolean> = new Map();
  private readLaterStatusCache: Map<string, boolean> = new Map();

  private constructor() {}

  static getInstance(): BookmarkService {
    if (!BookmarkService.instance) {
      BookmarkService.instance = new BookmarkService();
    }
    return BookmarkService.instance;
  }

  async createBookmark(token: string, bookmarkData: BookmarkCreate): Promise<Bookmark> {
    try {
      const response = await axios.post(
        `${API}/bookmarks`,
        bookmarkData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const bookmark = response.data;
      
      // Update caches
      this.bookmarksCache.unshift(bookmark);
      this.bookmarkStatusCache.set(bookmarkData.article_id, true);
      
      // Update read later cache if flag is set
      if (bookmarkData.read_later) {
        this.readLaterStatusCache.set(bookmarkData.article_id, true);
      }
      
      // Update local storage cache
      await this.updateLocalCache();
      
      return bookmark;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('Article already bookmarked');
      }
      throw new Error('Failed to create bookmark');
    }
  }

  async getBookmarks(token: string, forceRefresh = false): Promise<Bookmark[]> {
    try {
      // Return cache if available and not forcing refresh
      if (!forceRefresh && this.bookmarksCache.length > 0) {
        return this.bookmarksCache;
      }

      // Try to load from local storage first
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem('bookmarks_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > 5 * 60 * 1000; // 5 minutes
          
          if (!isExpired && data.length > 0) {
            this.bookmarksCache = data;
            this.updateBookmarkStatusCache();
            this.updateReadLaterStatusCache();
            return data;
          }
        }
      }

      // Fetch from API
      const response = await axios.get(`${API}/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      this.bookmarksCache = response.data;
      this.updateBookmarkStatusCache();
      this.updateReadLaterStatusCache();
      await this.updateLocalCache();
      
      return response.data;
    } catch (error) {
      // Return cached data if API fails
      if (this.bookmarksCache.length > 0) {
        return this.bookmarksCache;
      }
      throw new Error('Failed to get bookmarks');
    }
  }

  async deleteBookmark(token: string, articleId: string): Promise<void> {
    try {
      await axios.delete(`${API}/bookmarks/article/${articleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update caches
      this.bookmarksCache = this.bookmarksCache.filter(
        bookmark => bookmark.article_id !== articleId
      );
      this.bookmarkStatusCache.set(articleId, false);
      this.readLaterStatusCache.delete(articleId);
      
      await this.updateLocalCache();
    } catch (error) {
      throw new Error('Failed to delete bookmark');
    }
  }

  async isBookmarked(token: string, articleId: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.bookmarkStatusCache.has(articleId)) {
        return this.bookmarkStatusCache.get(articleId)!;
      }

      // Check API
      const response = await axios.get(`${API}/bookmarks/check/${articleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const isBookmarked = response.data.is_bookmarked;
      this.bookmarkStatusCache.set(articleId, isBookmarked);
      return isBookmarked;
    } catch (error) {
      return false;
    }
  }

  async toggleBookmark(token: string, article: any): Promise<boolean> {
    const isCurrentlyBookmarked = await this.isBookmarked(token, article.id);
    
    if (isCurrentlyBookmarked) {
      await this.deleteBookmark(token, article.id);
      return false;
    } else {
      const bookmarkData: BookmarkCreate = {
        article_id: article.id,
        article_title: article.title,
        article_summary: article.summary,
        article_link: article.link,
        article_source: article.source_name,
        article_image_url: article.image_url,
        tags: article.genre ? [article.genre] : [],
      };
      
      await this.createBookmark(token, bookmarkData);
      return true;
    }
  }

  // ============ READ LATER FUNCTIONALITY ============

  async addToReadLater(token: string, article: any): Promise<void> {
    try {
      const bookmarkData: BookmarkCreate = {
        article_id: article.id,
        article_title: article.title,
        article_summary: article.summary,
        article_link: article.link,
        article_source: article.source_name,
        article_image_url: article.image_url,
        tags: article.genre ? [article.genre] : [],
        read_later: true,
      };
      
      await this.createBookmark(token, bookmarkData);
      this.readLaterStatusCache.set(article.id, true);
    } catch (error) {
      throw new Error('Failed to add to read later');
    }
  }

  async removeFromReadLater(token: string, articleId: string): Promise<void> {
    try {
      // Update the bookmark to remove read_later flag
      const bookmark = this.bookmarksCache.find(b => b.article_id === articleId);
      if (bookmark) {
        await axios.put(
          `${API}/bookmarks/${bookmark.id}`,
          { ...bookmark, read_later: false },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        // Update local cache
        const index = this.bookmarksCache.findIndex(b => b.id === bookmark.id);
        if (index !== -1) {
          this.bookmarksCache[index] = { ...bookmark, read_later: false };
        }
        
        this.readLaterStatusCache.set(articleId, false);
        await this.updateLocalCache();
      }
    } catch (error) {
      throw new Error('Failed to remove from read later');
    }
  }

  async isReadLater(token: string, articleId: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.readLaterStatusCache.has(articleId)) {
        return this.readLaterStatusCache.get(articleId)!;
      }

      // Check if bookmark exists and has read_later flag
      await this.getBookmarks(token); // This will populate the cache
      return this.readLaterStatusCache.get(articleId) || false;
    } catch (error) {
      return false;
    }
  }

  async toggleReadLater(token: string, article: any): Promise<boolean> {
    const isCurrentlyReadLater = await this.isReadLater(token, article.id);
    
    if (isCurrentlyReadLater) {
      await this.removeFromReadLater(token, article.id);
      return false;
    } else {
      await this.addToReadLater(token, article);
      return true;
    }
  }

  async getReadLaterArticles(token: string): Promise<Bookmark[]> {
    try {
      const allBookmarks = await this.getBookmarks(token);
      return allBookmarks.filter(bookmark => bookmark.read_later === true);
    } catch (error) {
      throw new Error('Failed to get read later articles');
    }
  }

  getReadLaterStatusFromCache(articleId: string): boolean | null {
    return this.readLaterStatusCache.get(articleId) ?? null;
  }

  // ============ PRIVATE HELPER METHODS ============

  private updateBookmarkStatusCache(): void {
    this.bookmarkStatusCache.clear();
    this.bookmarksCache.forEach(bookmark => {
      this.bookmarkStatusCache.set(bookmark.article_id, true);
    });
  }

  private updateReadLaterStatusCache(): void {
    this.readLaterStatusCache.clear();
    this.bookmarksCache.forEach(bookmark => {
      if (bookmark.read_later) {
        this.readLaterStatusCache.set(bookmark.article_id, true);
      }
    });
  }

  private async updateLocalCache(): Promise<void> {
    try {
      await AsyncStorage.setItem('bookmarks_cache', JSON.stringify({
        data: this.bookmarksCache,
        timestamp: Date.now(),
      }));
    } catch (error) {
      // Ignore cache update errors
    }
  }

  // Clear cache (useful for logout)
  clearCache(): void {
    this.bookmarksCache = [];
    this.bookmarkStatusCache.clear();
    this.readLaterStatusCache.clear();
    AsyncStorage.removeItem('bookmarks_cache');
  }

  // Get bookmark status from cache (synchronous)
  getBookmarkStatusFromCache(articleId: string): boolean | null {
    return this.bookmarkStatusCache.get(articleId) ?? null;
  }
}

export default BookmarkService;