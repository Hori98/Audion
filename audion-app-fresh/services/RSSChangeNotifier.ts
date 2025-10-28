/**
 * RSS変更通知サービス
 * RSS管理での変更をアプリ全体に通知するイベントシステム
 */

// React Native用の簡易EventEmitter実装
class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => listener(...args));
  }
}

export interface RSSChangeEvent {
  type: 'SOURCES_UPDATED' | 'SOURCE_ADDED' | 'SOURCE_DELETED' | 'SOURCE_TOGGLED';
  sourceId?: string;
  timestamp: number;
}

class RSSChangeNotifier extends SimpleEventEmitter {
  private static instance: RSSChangeNotifier;

  static getInstance(): RSSChangeNotifier {
    if (!this.instance) {
      this.instance = new RSSChangeNotifier();
    }
    return this.instance;
  }

  /**
   * RSS変更イベントを発火
   */
  notifyRSSChange(event: Omit<RSSChangeEvent, 'timestamp'>) {
    const fullEvent: RSSChangeEvent = {
      ...event,
      timestamp: Date.now()
    };

    console.log(`📡 [RSSChangeNotifier] Broadcasting event:`, fullEvent);
    this.emit('rss_change', fullEvent);
  }

  /**
   * RSS変更イベントをリッスン
   */
  subscribeToRSSChanges(callback: (event: RSSChangeEvent) => void) {
    this.on('rss_change', callback);

    // クリーンアップ関数を返す
    return () => {
      this.off('rss_change', callback);
    };
  }

  /**
   * ソース追加イベント
   */
  notifySourceAdded(sourceId?: string) {
    this.notifyRSSChange({ type: 'SOURCE_ADDED', sourceId });
  }

  /**
   * ソース削除イベント
   */
  notifySourceDeleted(sourceId: string) {
    this.notifyRSSChange({ type: 'SOURCE_DELETED', sourceId });
  }

  /**
   * ソース有効化切り替えイベント
   */
  notifySourceToggled(sourceId: string) {
    this.notifyRSSChange({ type: 'SOURCE_TOGGLED', sourceId });
  }

  /**
   * 一般的なソース更新イベント
   */
  notifySourcesUpdated() {
    this.notifyRSSChange({ type: 'SOURCES_UPDATED' });
  }
}

export default RSSChangeNotifier.getInstance();