import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const LANGUAGE_KEY = 'user_language';
const VOICE_LANGUAGE_KEY = 'user_voice_language';

export type SupportedLanguage = 'en' | 'ja';
export type SupportedVoiceLanguage = 'en-US' | 'ja-JP';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  supportedLanguages: { code: SupportedLanguage; name: string; nativeName: string }[];
  
  // Voice language settings
  currentVoiceLanguage: SupportedVoiceLanguage;
  setVoiceLanguage: (voiceLanguage: SupportedVoiceLanguage) => Promise<void>;
  supportedVoiceLanguages: { code: SupportedVoiceLanguage; name: string; nativeName: string; voices: string[] }[];
  
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
  const [currentVoiceLanguage, setCurrentVoiceLanguage] = useState<SupportedVoiceLanguage>('en-US');
  const [isLoading, setIsLoading] = useState(true);

  const supportedLanguages = [
    { code: 'en' as SupportedLanguage, name: 'English', nativeName: 'English' },
    { code: 'ja' as SupportedLanguage, name: 'Japanese', nativeName: '日本語' },
  ];

  const supportedVoiceLanguages = [
    { 
      code: 'en-US' as SupportedVoiceLanguage, 
      name: 'English (US)', 
      nativeName: 'English (US)',
      voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    },
    { 
      code: 'ja-JP' as SupportedVoiceLanguage, 
      name: 'Japanese', 
      nativeName: '日本語',
      voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] // OpenAI voices work with Japanese text
    },
  ];

  useEffect(() => {
    loadInitialLanguage();
  }, []);

  const loadInitialLanguage = async () => {
    try {
      setIsLoading(true);
      
      // Load UI language
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ja')) {
        await changeLanguage(savedLanguage as SupportedLanguage);
      } else {
        // Fall back to device locale for UI
        const deviceLocale = Localization.locale || 'en-US';
        const languageCode = deviceLocale.split('-')[0] || 'en';
        const detectedLang: SupportedLanguage = languageCode === 'ja' ? 'ja' : 'en';
        await changeLanguage(detectedLang);
      }
      
      // Load voice language
      const savedVoiceLanguage = await AsyncStorage.getItem(VOICE_LANGUAGE_KEY);
      if (savedVoiceLanguage && (savedVoiceLanguage === 'en-US' || savedVoiceLanguage === 'ja-JP')) {
        setCurrentVoiceLanguage(savedVoiceLanguage as SupportedVoiceLanguage);
      } else {
        // Default voice language based on UI language
        const deviceLocale = Localization.locale || 'en-US';
        const defaultVoiceLanguage: SupportedVoiceLanguage = 
          deviceLocale.startsWith('ja') ? 'ja-JP' : 'en-US';
        setCurrentVoiceLanguage(defaultVoiceLanguage);
        await AsyncStorage.setItem(VOICE_LANGUAGE_KEY, defaultVoiceLanguage);
      }
      
    } catch (error) {
      console.error('Error loading initial language:', error);
      await changeLanguage('en');
      setCurrentVoiceLanguage('en-US');
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
      console.log('UI language changed to:', language);
    } catch (error) {
      console.error('Error setting UI language:', error);
    }
  };

  const setVoiceLanguage = async (voiceLanguage: SupportedVoiceLanguage) => {
    try {
      await AsyncStorage.setItem(VOICE_LANGUAGE_KEY, voiceLanguage);
      setCurrentVoiceLanguage(voiceLanguage);
      console.log('Voice language changed to:', voiceLanguage);
    } catch (error) {
      console.error('Error setting voice language:', error);
    }
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    supportedLanguages,
    currentVoiceLanguage,
    setVoiceLanguage,
    supportedVoiceLanguages,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};