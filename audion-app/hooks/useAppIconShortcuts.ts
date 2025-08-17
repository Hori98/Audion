import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import AppIconShortcutsService from '../services/AppIconShortcuts';

export function useAppIconShortcuts() {
  const router = useRouter();

  useEffect(() => {
    // Navigation callback for app icon shortcuts
    const handleNavigation = (action: string) => {
      
      switch (action) {
        case 'auto-pick':
          router.push('/auto-pick');
          break;
        case 'feed':
          router.push('/feed');
          break;
        case 'library':
          router.push('/library');
          break;
        default:
      }
    };

    // Initialize app icon shortcuts service with navigation callback
    const cleanup = AppIconShortcutsService.initialize(handleNavigation);

    // Cleanup function
    return () => {
      cleanup?.();
    };
  }, [router]);

  // Function to create dynamic shortcut
  const createDynamicShortcut = useCallback((shortcut: Partial<any>) => {
    AppIconShortcutsService.createDynamicShortcut(shortcut);
  }, []);

  // Function to get all available shortcuts
  const getShortcuts = useCallback(() => {
    return AppIconShortcutsService.getShortcuts();
  }, []);

  // Function to create test URL for development
  const createTestURL = useCallback((action: string) => {
    return AppIconShortcutsService.createTestURL(action);
  }, []);

  // Function to check if shortcuts are supported
  const isSupported = useCallback(() => {
    return AppIconShortcutsService.isSupported();
  }, []);

  return {
    createDynamicShortcut,
    getShortcuts,
    createTestURL,
    isSupported,
  };
}