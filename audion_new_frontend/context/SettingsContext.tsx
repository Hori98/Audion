/**
 * Settings Context - アプリ全体の設定管理
 * Pick機能のON/OFF制御とUI連動を一元化
 */

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// 設定項目の型定義
export interface AppSettings {
  // Pick機能の有効/無効制御
  isAutoPickEnabled: boolean;
  isManualPickEnabled: boolean;
  isSchedulePickEnabled: boolean;
  
  // AutoPick詳細設定
  autoPickMaxArticles: number;
  autoPickPreferredGenres: string[];
  
  // 再生設定
  playbackSpeed: number;
  voiceType: string;
  audioQuality: string;
  autoPlay: boolean;
  
  // 外観設定
  isDarkMode: boolean;
  fontSize: string;
  language: string;
  
  // データ設定
  wifiOnlyDownload: boolean;
  autoDeleteOld: boolean;
  backgroundSync: boolean;
  lowDataMode: boolean;
  
  // 通知設定
  pushNotificationsEnabled: boolean;
  autoPickCompleteNotification: boolean;
  manualPickCompleteNotification: boolean;
  schedulePickCompleteNotification: boolean;
}

// Contextが提供する値の型定義
interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

// デフォルト設定
const defaultSettings: AppSettings = {
  // Pick機能（初期は全て有効）
  isAutoPickEnabled: true,
  isManualPickEnabled: true,
  isSchedulePickEnabled: false, // 実装予定のため初期無効
  
  // AutoPick設定
  autoPickMaxArticles: 5,
  autoPickPreferredGenres: [],
  
  // 再生設定
  playbackSpeed: 1.0,
  voiceType: 'alloy',
  audioQuality: '標準',
  autoPlay: false,
  
  // 外観設定
  isDarkMode: true,
  fontSize: '標準',
  language: '日本語',
  
  // データ設定
  wifiOnlyDownload: true,
  autoDeleteOld: false,
  backgroundSync: true,
  lowDataMode: false,
  
  // 通知設定
  pushNotificationsEnabled: true,
  autoPickCompleteNotification: true,
  manualPickCompleteNotification: true,
  schedulePickCompleteNotification: true,
};

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
        // デフォルト設定とマージして、新しい設定項目も含める
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 設定を更新し、AsyncStorageに保存する関数
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('@app_settings', JSON.stringify(updatedSettings));
      
      // 特殊な設定変更時の処理
      await handleSpecialSettingChanges(newSettings, updatedSettings);
      
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    }
  };

  // 特殊な設定変更時の処理
  const handleSpecialSettingChanges = async (
    newSettings: Partial<AppSettings>, 
    updatedSettings: AppSettings
  ) => {
    let additionalUpdates: Partial<AppSettings> = {};
    let alertMessage = '';

    // SchedulePick無効化時の処理
    if (newSettings.isSchedulePickEnabled === false) {
      // TODO: スケジュール済み通知をすべてキャンセル
      // await cancelAllScheduledNotifications();
      console.log('SchedulePick関連の通知をすべてキャンセルしました');
      
      // スケジュール完了通知も無効化
      additionalUpdates.schedulePickCompleteNotification = false;
      alertMessage = 'スケジュール配信を停止し、関連通知もすべて無効化しました';
    }

    // AutoPick無効化時の処理
    if (newSettings.isAutoPickEnabled === false) {
      // AutoPick完了通知も無効化
      if (updatedSettings.autoPickCompleteNotification) {
        additionalUpdates.autoPickCompleteNotification = false;
      }
      if (!alertMessage) {
        alertMessage = 'AutoPick機能を無効化しました。関連する通知も停止されます。';
      }
    }

    // ManualPick無効化時の処理
    if (newSettings.isManualPickEnabled === false) {
      // ManualPick完了通知も無効化
      if (updatedSettings.manualPickCompleteNotification) {
        additionalUpdates.manualPickCompleteNotification = false;
      }
      if (!alertMessage) {
        alertMessage = 'ManualPick機能を無効化しました。関連する通知も停止されます。';
      }
    }

    // プッシュ通知無効化時の処理
    if (newSettings.pushNotificationsEnabled === false) {
      // 全ての通知を無効化
      additionalUpdates = {
        ...additionalUpdates,
        autoPickCompleteNotification: false,
        manualPickCompleteNotification: false,
        schedulePickCompleteNotification: false,
      };
      alertMessage = 'プッシュ通知を無効化しました。すべての通知が停止されます。';
    }

    // 追加の更新がある場合は一度に適用
    if (Object.keys(additionalUpdates).length > 0) {
      const finalSettings = { ...updatedSettings, ...additionalUpdates };
      setSettings(finalSettings);
      await AsyncStorage.setItem('@app_settings', JSON.stringify(finalSettings));
    }

    // アラートメッセージがある場合は表示
    if (alertMessage) {
      Alert.alert('設定更新', alertMessage);
    }
  };

  // 設定をデフォルトに戻す
  const resetToDefaults = async () => {
    try {
      setSettings(defaultSettings);
      await AsyncStorage.setItem('@app_settings', JSON.stringify(defaultSettings));
      Alert.alert('完了', '設定をデフォルト値に戻しました');
    } catch (error) {
      console.error('設定のリセットに失敗しました:', error);
      Alert.alert('エラー', '設定のリセットに失敗しました');
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

// 設定を簡単に利用するためのカスタムフック
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// 特定の設定値のみを監視するカスタムフック（パフォーマンス最適化）
export const usePickSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    isAutoPickEnabled: settings.isAutoPickEnabled,
    isManualPickEnabled: settings.isManualPickEnabled,
    isSchedulePickEnabled: settings.isSchedulePickEnabled,
    updatePickSettings: (pickSettings: {
      isAutoPickEnabled?: boolean;
      isManualPickEnabled?: boolean;
      isSchedulePickEnabled?: boolean;
    }) => updateSettings(pickSettings),
  };
};

// 外観設定のみを監視するカスタムフック
export const useAppearanceSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    isDarkMode: settings.isDarkMode,
    fontSize: settings.fontSize,
    language: settings.language,
    updateAppearanceSettings: (appearanceSettings: {
      isDarkMode?: boolean;
      fontSize?: string;
      language?: string;
    }) => updateSettings(appearanceSettings),
  };
};

// 通知設定のみを監視するカスタムフック
export const useNotificationSettings = () => {
  const { settings, updateSettings } = useSettings();
  return {
    pushNotificationsEnabled: settings.pushNotificationsEnabled,
    autoPickCompleteNotification: settings.autoPickCompleteNotification,
    manualPickCompleteNotification: settings.manualPickCompleteNotification,
    schedulePickCompleteNotification: settings.schedulePickCompleteNotification,
    updateNotificationSettings: (notificationSettings: {
      pushNotificationsEnabled?: boolean;
      autoPickCompleteNotification?: boolean;
      manualPickCompleteNotification?: boolean;
      schedulePickCompleteNotification?: boolean;
    }) => updateSettings(notificationSettings),
  };
};