/**
 * Settings Context - アプリ全体の設定管理 (MECE Refactored)
 * 設定を階層化し、関心事を分離
 */

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// --- UTILITY FUNCTIONS ---

/**
 * オブジェクトのすべてのプロパティを再帰的にPartialにする型
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const isObject = (item: any): item is object => {
  return (item && typeof item === 'object' && !Array.isArray(item));
};

/**
 * 2つのオブジェクトをディープマージする。
 * 元のオブジェクトは変更せず、新しいオブジェクトを返す。
 */
const deepMerge = <T extends object>(target: T, source: DeepPartial<T>): T => {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const sourceKey = key as keyof typeof source;
      if (isObject(source[sourceKey])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[sourceKey] });
        } else {
          const targetKey = key as keyof T;
          (output[targetKey] as object) = deepMerge(target[targetKey] as object, source[sourceKey] as object);
        }
      } else {
        Object.assign(output, { [key]: source[sourceKey] });
      }
    });
  }

  return output;
};

// --- NEW MECE STRUCTURE ---

// 1. Schedule Profile
export interface ScheduleProfile {
  id: string;
  enabled: boolean;
  name: string;
  frequency: 'daily' | 'weekly' | 'custom';
  days?: number[]; // 0=Sun, 1=Mon... 6=Sat
  time: string; // "HH:MM" format
  genres: string[];
  sources: string[];
  maxArticles: number;
  promptTemplate?: string; // Optional: overrides content.promptTemplate
}

// 2. Main AppSettings Interface
export interface AppSettings {
  general: {
    language: string;
    backgroundSync: boolean;
  };
  appearance: {
    isDarkMode: boolean;
    fontSize: string;
  };
  content: {
    promptTemplate: string; // Default prompt for all modes
    voiceType: string;
    audioQuality: string;
  };
  pickModes: {
    auto: {
      enabled: boolean;
      maxArticles: number;
      preferredGenres: string[];
      overridePromptTemplate?: string;
    };
    manual: {
      enabled: boolean;
      previewEnabled: boolean;
      multiSelectEnabled: boolean;
      overridePromptTemplate?: string;
    };
    schedule: {
      enabled: boolean;
      profiles: ScheduleProfile[];
      freemium: {
        maxDailySchedules: number;
        maxWeeklySchedules: number;
      };
    };
  };
  playback: {
    playbackSpeed: number;
    autoPlay: boolean;
  };
  data: {
    wifiOnlyDownload: boolean;
    autoDeleteOldItems: boolean;
    lowDataMode: boolean;
  };
  notifications: {
    pushEnabled: boolean;
    onAutoPickComplete: boolean;
    onManualPickComplete: boolean;
    onSchedulePickComplete: boolean;
  };
  // 不足していたプロパティを追加
  isAutoPickEnabled?: boolean;
  isManualPickEnabled?: boolean;
  isSchedulePickEnabled?: boolean;
}

// 3. Default Settings
const defaultSettings: AppSettings = {
  general: {
    language: '日本語',
    backgroundSync: true,
  },
  appearance: {
    isDarkMode: true,
    fontSize: '標準',
  },
  content: {
    promptTemplate: '標準',
    voiceType: 'alloy',
    audioQuality: '標準',
  },
  pickModes: {
    auto: {
      enabled: true,
      maxArticles: 5,
      preferredGenres: [],
    },
    manual: {
      enabled: true,
      previewEnabled: true,
      multiSelectEnabled: true,
    },
    schedule: {
      enabled: false,
      profiles: [],
      freemium: {
        maxDailySchedules: 2,
        maxWeeklySchedules: 10,
      },
    },
  },
  playback: {
    playbackSpeed: 1.0,
    autoPlay: false,
  },
  data: {
    wifiOnlyDownload: true,
    autoDeleteOldItems: false,
    lowDataMode: false,
  },
  notifications: {
    pushEnabled: true,
    onAutoPickComplete: true,
    onManualPickComplete: true,
    onSchedulePickComplete: true,
  },
};

// --- CONTEXT AND PROVIDER ---

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (newSettings: DeepPartial<AppSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

// Contextの作成
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Providerコンポーネント
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // アプリ起動時にAsyncStorageから設定を読み込む
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('@app_settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Deep merge stored settings with defaults to include any new properties
        setSettings(deepMerge(defaultSettings, parsedSettings));
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSettings(defaultSettings); // Load defaults on error
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: DeepPartial<AppSettings>) => {
    try {
      // Perform a deep merge to update nested properties
      const updatedSettings = deepMerge(settings, newSettings);
      setSettings(updatedSettings);
      await AsyncStorage.setItem('@app_settings', JSON.stringify(updatedSettings));
      await handleSpecialSettingChanges(newSettings, updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleSpecialSettingChanges = async (
    newSettings: DeepPartial<AppSettings>,
    updatedSettings: AppSettings
  ) => {
    let additionalUpdates: DeepPartial<AppSettings> = {};
    let alertMessage = '';

    if (newSettings.pickModes?.schedule?.enabled === false) {
      console.log('Cancelling all schedule-related notifications');
      additionalUpdates = deepMerge(additionalUpdates, { notifications: { onSchedulePickComplete: false } });
      alertMessage = 'Scheduled delivery has been stopped and related notifications have been disabled.';
    }

    if (newSettings.pickModes?.auto?.enabled === false) {
        if (updatedSettings.notifications.onAutoPickComplete) {
            additionalUpdates = deepMerge(additionalUpdates, { notifications: { onAutoPickComplete: false } });
        }
        if (!alertMessage) {
            alertMessage = 'AutoPick has been disabled. Related notifications will also be stopped.';
        }
    }
    
    if (newSettings.pickModes?.manual?.enabled === false) {
        if (updatedSettings.notifications.onManualPickComplete) {
            additionalUpdates = deepMerge(additionalUpdates, { notifications: { onManualPickComplete: false } });
        }
        if (!alertMessage) {
            alertMessage = 'ManualPick has been disabled. Related notifications will also be stopped.';
        }
    }

    if (newSettings.notifications?.pushEnabled === false) {
      additionalUpdates = deepMerge(additionalUpdates, {
        notifications: {
          onAutoPickComplete: false,
          onManualPickComplete: false,
          onSchedulePickComplete: false,
        },
      });
      alertMessage = 'Push notifications have been disabled. All notifications will be stopped.';
    }

    if (Object.keys(additionalUpdates).length > 0) {
      const finalSettings = deepMerge(updatedSettings, additionalUpdates);
      setSettings(finalSettings);
      await AsyncStorage.setItem('@app_settings', JSON.stringify(finalSettings));
    }

    if (alertMessage) {
      Alert.alert('Settings Updated', alertMessage);
    }
  };

  // 設定をデフォルトに戻す
  const resetToDefaults = async () => {
    try {
      setSettings(defaultSettings);
      await AsyncStorage.setItem('@app_settings', JSON.stringify(defaultSettings));
      Alert.alert('Complete', 'Settings have been reset to default values.');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      Alert.alert('Error', 'Failed to reset settings.');
    }
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        settings, 
        isLoading, 
        updateSettings, 
        resetToDefaults 
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// --- REFACTORED CUSTOM HOOKS ---

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Hook for general app settings
export const useGeneralSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    general: settings.general,
    updateGeneral: (generalSettings: DeepPartial<AppSettings['general']>) =>
      updateSettings({ general: generalSettings }),
  };
};

// Hook for Appearance settings
export const useAppearanceSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    appearance: settings.appearance,
    updateAppearance: (appearanceSettings: DeepPartial<AppSettings['appearance']>) =>
      updateSettings({ appearance: appearanceSettings }),
  };
};

// Hook for Content & AI settings
export const useContentSettings = () => {
    const { settings, updateSettings } = useSettings();
    return {
        content: settings.content,
        updateContent: (contentSettings: DeepPartial<AppSettings['content']>) =>
            updateSettings({ content: contentSettings }),
    };
};

// Hook for Pick Mode settings
export const usePickModes = () => {
  const { settings, updateSettings } = useSettings();
  return {
    pickModes: settings.pickModes,
    updatePickModes: (pickSettings: DeepPartial<AppSettings['pickModes']>) => 
      updateSettings({ pickModes: pickSettings }),
  };
};

// Hook for Playback settings
export const usePlaybackSettings = () => {
    const { settings, updateSettings } = useSettings();
    return {
        playback: settings.playback,
        updatePlayback: (playbackSettings: DeepPartial<AppSettings['playback']>) =>
            updateSettings({ playback: playbackSettings }),
    };
};

// Hook for Data & Storage settings
export const useDataSettings = () => {
    const { settings, updateSettings } = useSettings();
    return {
        data: settings.data,
        updateData: (dataSettings: DeepPartial<AppSettings['data']>) =>
            updateSettings({ data: dataSettings }),
    };
};

// Hook for Notification settings
export const useNotificationSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    notifications: settings.notifications,
    updateNotifications: (notificationSettings: DeepPartial<AppSettings['notifications']>) =>
      updateSettings({ notifications: notificationSettings }),
  };
};

// Hook for SchedulePick settings
export const useSchedulePickSettings = () => {
  const { settings, updateSettings } = useSettings();
  
  // 安全なschedule取得（初期化チェック）
  const schedule = settings?.pickModes?.schedule || {
    enabled: false,
    profiles: [],
    freemium: {
      maxDailySchedules: 2,
      maxWeeklySchedules: 10,
    }
  };

  const addScheduleProfile = (profile: Omit<ScheduleProfile, 'id'>) => {
    const newProfile: ScheduleProfile = {
      ...profile,
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    const updatedProfiles = [...(schedule.profiles || []), newProfile];
    updateSettings({ pickModes: { schedule: { profiles: updatedProfiles } } });
    return newProfile.id;
  };

  const updateScheduleProfile = (id: string, updates: Partial<ScheduleProfile>) => {
    const updatedProfiles = (schedule.profiles || []).map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    updateSettings({ pickModes: { schedule: { profiles: updatedProfiles } } });
  };

  const deleteScheduleProfile = (id: string) => {
    const updatedProfiles = (schedule.profiles || []).filter(p => p.id !== id);
    updateSettings({ pickModes: { schedule: { profiles: updatedProfiles } } });
  };

  const canAddMoreSchedules = () => {
    const activeSchedules = (schedule.profiles || []).filter(p => p.enabled);
    return activeSchedules.length < (schedule.freemium?.maxWeeklySchedules || 10);
  };

  return {
    schedule,
    addScheduleProfile,
    updateScheduleProfile,
    deleteScheduleProfile,
    canAddMoreSchedules,
    updateScheduleSettings: (scheduleSettings: DeepPartial<AppSettings['pickModes']['schedule']>) =>
      updateSettings({ pickModes: { schedule: scheduleSettings } }),
  };
};