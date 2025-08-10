import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';

export interface SiriShortcut {
  activityType: string;
  title: string;
  userInfo: any;
  suggestedInvocationPhrase: string;
  isEligibleForSearch: boolean;
  isEligibleForPrediction: boolean;
}

type NavigationCallback = (action: string) => void;

class SiriShortcutsService {
  private navigationCallback: NavigationCallback | null = null;
  private shortcuts: SiriShortcut[] = [
    {
      activityType: 'com.audion.create-audio',
      title: 'Create Audio from Latest News',
      userInfo: { action: 'create-audio' },
      suggestedInvocationPhrase: 'Create my audio news',
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
    },
    {
      activityType: 'com.audion.auto-pick',
      title: 'Auto Pick and Create Audio',
      userInfo: { action: 'auto-pick' },
      suggestedInvocationPhrase: 'Pick my news',
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
    },
  ];

  /**
   * Initialize Siri shortcuts by setting up URL scheme handlers
   */
  initialize(navigationCallback: NavigationCallback) {
    this.navigationCallback = navigationCallback;
    
    // Set up deep link handling for Siri shortcuts
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
   * Handle incoming deep links from Siri shortcuts
   */
  private handleDeepLink = ({ url }: { url: string }) => {
    // Only log in development mode and exclude expo dev server URLs
    if (__DEV__ && !url.includes('192.0.0.2') && !url.startsWith('exp://')) {
      console.log('SiriShortcuts: Received deep link:', url);
    }
    
    const { path, queryParams } = Linking.parse(url);
    
    if (path === 'siri-shortcut') {
      const action = queryParams?.action as string;
      this.executeSiriAction(action, queryParams);
    }
  };

  /**
   * Execute the action requested by Siri shortcut
   */
  private async executeSiriAction(action: string, params: any) {
    console.log('SiriShortcuts: Executing action:', action, params);
    
    switch (action) {
      case 'create-audio':
        // Navigate to feed and trigger manual audio creation
        this.navigateToCreateAudio();
        break;
      
      case 'auto-pick':
        // Navigate to auto-pick and trigger auto audio creation
        this.navigateToAutoPick();
        break;
      
      default:
        console.log('SiriShortcuts: Unknown action:', action);
    }
  }

  /**
   * Navigate to feed page for manual audio creation
   */
  private navigateToCreateAudio() {
    console.log('SiriShortcuts: Navigating to create audio');
    if (this.navigationCallback) {
      this.navigationCallback('create-audio');
    }
  }

  /**
   * Navigate to auto-pick page for automatic audio creation
   */
  private navigateToAutoPick() {
    console.log('SiriShortcuts: Navigating to auto-pick');
    if (this.navigationCallback) {
      this.navigationCallback('auto-pick');
    }
  }

  /**
   * Register a shortcut with the system (for iOS)
   * This would be called after user performs an action
   */
  donateShortcut(shortcutType: 'create-audio' | 'auto-pick') {
    const shortcut = this.shortcuts.find(s => s.userInfo.action === shortcutType);
    if (!shortcut) return;

    // In a real implementation, this would use native iOS APIs
    // For now, we'll just log the donation
    console.log('SiriShortcuts: Donating shortcut:', shortcut.title);
    
    // The actual donation would happen in native code
    // This is a placeholder for the native implementation
    this.logShortcutDonation(shortcut);
  }

  /**
   * Log shortcut donation for development
   */
  private logShortcutDonation(shortcut: SiriShortcut) {
    console.log('SiriShortcuts: Shortcut donated to Siri:', {
      title: shortcut.title,
      phrase: shortcut.suggestedInvocationPhrase,
      activityType: shortcut.activityType,
    });
  }

  /**
   * Create deep link URL for testing
   */
  createTestURL(action: string): string {
    return Linking.createURL('siri-shortcut', { action });
  }

  /**
   * Get available shortcuts
   */
  getShortcuts(): SiriShortcut[] {
    return this.shortcuts;
  }
}

export default new SiriShortcutsService();