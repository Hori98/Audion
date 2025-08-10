import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import SiriShortcutsService from '../services/SiriShortcuts';

export function useSiriShortcuts() {
  const router = useRouter();

  useEffect(() => {
    // Navigation callback for Siri shortcuts
    const handleNavigation = (action: string) => {
      console.log('useSiriShortcuts: Handling navigation for action:', action);
      
      switch (action) {
        case 'create-audio':
          console.log('useSiriShortcuts: Navigating to feed for audio creation');
          router.push('/feed');
          break;
        case 'auto-pick':
          console.log('useSiriShortcuts: Navigating to auto-pick');
          router.push('/auto-pick');
          break;
        default:
          console.log('useSiriShortcuts: Unknown action:', action);
      }
    };

    // Initialize Siri shortcuts service with navigation callback
    const cleanup = SiriShortcutsService.initialize(handleNavigation);

    // Cleanup function
    return () => {
      cleanup?.();
    };
  }, [router]);

  // Function to donate a shortcut to Siri
  const donateShortcut = useCallback((shortcutType: 'create-audio' | 'auto-pick') => {
    SiriShortcutsService.donateShortcut(shortcutType);
  }, []);

  // Function to get all available shortcuts
  const getShortcuts = useCallback(() => {
    return SiriShortcutsService.getShortcuts();
  }, []);

  // Function to create test URL for development
  const createTestURL = useCallback((action: string) => {
    return SiriShortcutsService.createTestURL(action);
  }, []);

  return {
    donateShortcut,
    getShortcuts,
    createTestURL,
  };
}