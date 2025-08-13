import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Article } from '../types';

class PreloadService {
  private static instance: PreloadService;
  private isPreloading = false;
  private preloadedData: { [key: string]: any } = {};

  private constructor() {}

  static getInstance(): PreloadService {
    if (!PreloadService.instance) {
      PreloadService.instance = new PreloadService();
    }
    return PreloadService.instance;
  }

  // アプリ起動時にバックグラウンドで最新記事をプリロード
  async preloadLatestArticles(token: string) {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8003';
    const API = `${BACKEND_URL}/api`;

    try {
      // バックグラウンドで最新の記事をフェッチ
      const response = await axios.get(`${API}/articles`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000, // 5秒でタイムアウト
      });

      if (response.data && response.data.length > 0) {
        // 最新データをメモリとストレージに保存
        this.preloadedData['latest_articles'] = response.data;
        await AsyncStorage.setItem('preloaded_articles', JSON.stringify({
          data: response.data,
          timestamp: Date.now(),
          ttl: 10 * 60 * 1000, // 10分のTTL
        }));
      }
    } catch (error) {
      // プリロードは失敗してもアプリの動作に影響しない
    } finally {
      this.isPreloading = false;
    }
  }

  // 即座に利用可能なキャッシュデータを返す
  async getInstantArticles(): Promise<Article[] | null> {
    try {
      // メモリキャッシュを最初にチェック
      if (this.preloadedData['latest_articles']) {
        return this.preloadedData['latest_articles'];
      }

      // AsyncStorageからキャッシュを取得
      const cachedData = await AsyncStorage.getItem('preloaded_articles');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const now = Date.now();
        
        // TTLチェック
        if (now - parsed.timestamp < parsed.ttl) {
          this.preloadedData['latest_articles'] = parsed.data;
          return parsed.data;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // 画像URLの事前チェックと最適化
  async optimizeImageUrls(articles: Article[]): Promise<Article[]> {
    return articles.map(article => ({
      ...article,
      image_url: this.getOptimizedImageUrl(article.image_url)
    }));
  }

  private getOptimizedImageUrl(imageUrl?: string): string | undefined {
    if (!imageUrl) return undefined;
    
    // 低解像度版の画像URLを生成（存在する場合）
    // 例：YouTube thumbnail, Twitter card image等の最適化
    if (imageUrl.includes('youtube.com') || imageUrl.includes('youtu.be')) {
      return imageUrl.replace('/maxresdefault.jpg', '/mqdefault.jpg');
    }
    
    return imageUrl;
  }

  // アプリ起動時の初期化
  async initialize(token: string) {
    // 非同期でプリロード開始（UIをブロックしない）
    setTimeout(() => {
      this.preloadLatestArticles(token);
    }, 100);
  }
}

export default PreloadService;