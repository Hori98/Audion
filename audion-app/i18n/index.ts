import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import translations
import en from './locales/en/common.json';
import ja from './locales/ja/common.json';

const LANGUAGE_KEY = 'user_language';

// Language detector for AsyncStorage
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Check if user has previously set a language
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      
      // Fall back to device locale
      const deviceLocale = Localization.locale;
      const languageCode = deviceLocale.split('-')[0];
      
      // Use Japanese if device is set to Japanese, otherwise English
      const detectedLang = languageCode === 'ja' ? 'ja' : 'en';
      callback(detectedLang);
    } catch (error) {
      console.error('Error detecting language:', error);
      callback('en'); // Default to English on error
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  },
};

const resources = {
  en: {
    common: en,
  },
  ja: {
    common: ja,
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    react: {
      useSuspense: false, // Important for React Native
    },
  });

export default i18n;