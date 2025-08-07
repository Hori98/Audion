import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export interface AppIconShortcut {
  type: string;
  title: string;
  subtitle: string;
  iconType: string;
}

type NavigationCallback = (action: string) => void;

class AppIconShortcutsService {
  private navigationCallback: NavigationCallback | null = null;
  private shortcuts: AppIconShortcut[] = [
    {
      type: 'com.audion.auto-pick',
      title: 'Auto Pick',
      subtitle: 'Create audio from recommended articles',
      iconType: 'play',
    },
    {
      type: 'com.audion.feed',
      title: 'Browse Feed',
      subtitle: 'Select articles manually',
      iconType: 'search',
    },
    {
      type: 'com.audion.library',
      title: 'My Library',
      subtitle: 'Access saved audio',
      iconType: 'bookmark',
    },
  ];

  /**
   * Initialize app icon shortcuts handling
   */
  initialize(navigationCallback: NavigationCallback) {
    this.navigationCallback = navigationCallback;
    
    // Set up deep link handling for app icon shortcuts
    const subscription = Linking.addEventListener('url', this.handleDeepLink);
    
    // Check if app was opened by a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleDeepLink({ url });
      }
    });

    return () => {
      this.navigationCallback = null;
      subscription?.remove();
    };
  }

  /**
   * Handle incoming deep links from app icon shortcuts
   */
  private handleDeepLink = ({ url }: { url: string }) => {
    // Only log in development mode and exclude expo dev server URLs
    if (__DEV__ && !url.includes('192.0.0.2') && !url.startsWith('exp://')) {
      console.log('AppIconShortcuts: Received deep link:', url);
    }
    
    const { path, queryParams } = Linking.parse(url);
    
    if (path === 'app-shortcut') {
      const action = queryParams?.action as string;
      this.executeShortcutAction(action);
    }
  };

  /**
   * Execute the action requested by app icon shortcut
   */
  private async executeShortcutAction(action: string) {
    console.log('AppIconShortcuts: Executing action:', action);
    
    switch (action) {
      case 'auto-pick':
        this.navigateToAutoPick();
        break;
      
      case 'feed':
        this.navigateToFeed();
        break;
      
      case 'library':
        this.navigateToLibrary();
        break;
      
      default:
        console.log('AppIconShortcuts: Unknown action:', action);
    }
  }

  /**
   * Navigate to auto-pick page
   */
  private navigateToAutoPick() {
    console.log('AppIconShortcuts: Navigating to auto-pick');
    if (this.navigationCallback) {
      this.navigationCallback('auto-pick');
    }
  }

  /**
   * Navigate to feed page
   */
  private navigateToFeed() {
    console.log('AppIconShortcuts: Navigating to feed');
    if (this.navigationCallback) {
      this.navigationCallback('feed');
    }
  }

  /**
   * Navigate to library page
   */
  private navigateToLibrary() {
    console.log('AppIconShortcuts: Navigating to library');
    if (this.navigationCallback) {
      this.navigationCallback('library');
    }
  }

  /**
   * Create deep link URL for testing
   */
  createTestURL(action: string): string {
    return Linking.createURL('app-shortcut', { action });
  }

  /**
   * Get available shortcuts
   */
  getShortcuts(): AppIconShortcut[] {
    return this.shortcuts;
  }

  /**
   * Check if platform supports app icon shortcuts
   */
  isSupported(): boolean {
    return Platform.OS === 'ios';
  }

  /**
   * Create dynamic shortcut (programmatically)
   * This would require native implementation
   */
  createDynamicShortcut(shortcut: Partial<AppIconShortcut>) {
    if (!this.isSupported()) {
      console.log('AppIconShortcuts: Dynamic shortcuts not supported on this platform');
      return;
    }

    // This would require native iOS implementation
    console.log('AppIconShortcuts: Creating dynamic shortcut:', shortcut);
    
    // Placeholder for native implementation
    this.logDynamicShortcutCreation(shortcut);
  }

  /**
   * Log dynamic shortcut creation for development
   */
  private logDynamicShortcutCreation(shortcut: Partial<AppIconShortcut>) {
    console.log('AppIconShortcuts: Dynamic shortcut created:', {
      type: shortcut.type,
      title: shortcut.title,
      subtitle: shortcut.subtitle,
    });
  }
}

export default new AppIconShortcutsService();