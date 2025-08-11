import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const LANGUAGE_KEY = 'user_language';

export type SupportedLanguage = 'en' | 'ja';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  supportedLanguages: { code: SupportedLanguage; name: string; nativeName: string }[];
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);

  const supportedLanguages = [
    { code: 'en' as SupportedLanguage, name: 'English', nativeName: 'English' },
    { code: 'ja' as SupportedLanguage, name: 'Japanese', nativeName: '日本語' },
  ];

  useEffect(() => {
    loadInitialLanguage();
  }, []);

  const loadInitialLanguage = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has previously set a language
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ja')) {
        await changeLanguage(savedLanguage as SupportedLanguage);
        return;
      }
      
      // Fall back to device locale
      const deviceLocale = Localization.locale || 'en-US';
      const languageCode = deviceLocale.split('-')[0] || 'en';
      
      // Use Japanese if device is set to Japanese, otherwise English
      const detectedLang: SupportedLanguage = languageCode === 'ja' ? 'ja' : 'en';
      await changeLanguage(detectedLang);
      
    } catch (error) {
      console.error('Error loading initial language:', error);
      await changeLanguage('en'); // Default to English on error
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (language: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const setLanguage = async (language: SupportedLanguage) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      await changeLanguage(language);
      console.log('Language changed to:', language);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    supportedLanguages,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};