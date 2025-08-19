// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  private listeners: { [key: string]: Array<() => void> } = {};

  public emit(event: string): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback());
    }
  }

  public on(event: string, callback: () => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: () => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(listener => listener !== callback);
    }
  }

  public removeAllListeners(): void {
    this.listeners = {};
  }
}

class GlobalEventService extends SimpleEventEmitter {
  private static instance: GlobalEventService;

  public static getInstance(): GlobalEventService {
    if (!GlobalEventService.instance) {
      GlobalEventService.instance = new GlobalEventService();
    }
    return GlobalEventService.instance;
  }

  // Search modal events
  public triggerHomeSearch() {
    this.emit('home:search:open');
  }

  public triggerFeedSearch() {
    this.emit('feed:search:open');
  }

  public triggerDiscoverSearch() {
    this.emit('discover:search:open');
  }

  // Feed filter menu events
  public triggerFeedFilter() {
    this.emit('feed:filter:open');
  }

  // Helper methods to add/remove listeners
  public onHomeSearchTrigger(callback: () => void) {
    this.on('home:search:open', callback);
    return () => this.off('home:search:open', callback);
  }

  public onFeedSearchTrigger(callback: () => void) {
    this.on('feed:search:open', callback);
    return () => this.off('feed:search:open', callback);
  }

  public onDiscoverSearchTrigger(callback: () => void) {
    this.on('discover:search:open', callback);
    return () => this.off('discover:search:open', callback);
  }

  public onFeedFilterTrigger(callback: () => void) {
    this.on('feed:filter:open', callback);
    return () => this.off('feed:filter:open', callback);
  }

  public cleanup() {
    this.removeAllListeners();
  }
}

export default GlobalEventService;