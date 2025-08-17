import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionTier } from './SubscriptionService';

export interface DebugSettings {
  enableDebugMode: boolean;
  forcedSubscriptionTier?: SubscriptionTier;
  bypassSubscriptionLimits: boolean;
  showDebugInfo: boolean;
  enableBetaFeatures: boolean;
  mockPremiumUser: boolean;
  enableTestAlerts: boolean;
  // 🆕 MECE補完項目
  forcedAPIErrors: boolean;
  mockNetworkConditions: boolean; 
  enablePerformanceMetrics: boolean;
  mockDataGeneration: boolean;
}

class DebugService {
  private static readonly STORAGE_KEY = 'debug_settings';
  private static readonly DEBUG_PASSWORD = 'audion_dev_2025'; // Change this regularly // Change this regularly
  
  private static currentSettings: DebugSettings = {
    enableDebugMode: false,
    forcedSubscriptionTier: undefined,
    bypassSubscriptionLimits: false,
    showDebugInfo: false,
    enableBetaFeatures: false,
    mockPremiumUser: false,
    enableTestAlerts: false,
    // 🆕 MECE補完項目のデフォルト値
    forcedAPIErrors: false,
    mockNetworkConditions: false, 
    enablePerformanceMetrics: false,
    mockDataGeneration: false,
  };

  // Check if app is in development mode
  static isDevelopment(): boolean {
    return __DEV__ || process.env.NODE_ENV === 'development';
  }

  // Check if debug mode is enabled
  static isDebugModeEnabled(): boolean {
    return this.currentSettings.enableDebugMode || this.isDevelopment();
  }

  // Load debug settings from storage
  static async loadDebugSettings(): Promise<DebugSettings> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentSettings = { ...this.currentSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load debug settings:', error);
    }
    return this.currentSettings;
  }

  // Save debug settings to storage
  static async saveDebugSettings(settings: Partial<DebugSettings>): Promise<void> {
    try {
      
      this.currentSettings = { ...this.currentSettings, ...settings };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSettings));
      
    } catch (error) {
      console.error('❌ Failed to save debug settings:', error);
    }
  }

  // Enable debug mode with password
  static async enableDebugMode(password: string): Promise<boolean> {
    if (password === this.DEBUG_PASSWORD || this.isDevelopment()) {
      await this.saveDebugSettings({ enableDebugMode: true });
      return true;
    }
    return false;
  }

  // Disable debug mode
  static async disableDebugMode(): Promise<void> {
    await this.saveDebugSettings({ 
      enableDebugMode: false,
      forcedSubscriptionTier: undefined,
      bypassSubscriptionLimits: false,
      mockPremiumUser: false
    });
  }

  // Force specific subscription tier for testing
  static async setForcedSubscriptionTier(tier?: SubscriptionTier): Promise<void> {
    await this.saveDebugSettings({ forcedSubscriptionTier: tier });
  }

  static getForcedSubscriptionTier(): SubscriptionTier | undefined {
    return this.currentSettings.forcedSubscriptionTier;
  }

  // Bypass subscription limits for testing
  static shouldBypassSubscriptionLimits(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.bypassSubscriptionLimits;
  }

  static async toggleBypassSubscriptionLimits(): Promise<void> {
    const newValue = !this.currentSettings.bypassSubscriptionLimits;
    await this.saveDebugSettings({ bypassSubscriptionLimits: newValue });
  }

  // Show debug information
  static shouldShowDebugInfo(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.showDebugInfo;
  }

  static async toggleDebugInfo(): Promise<void> {
    const newValue = !this.currentSettings.showDebugInfo;
    await this.saveDebugSettings({ showDebugInfo: newValue });
  }

  // Beta features
  static areBetaFeaturesEnabled(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.enableBetaFeatures;
  }

  static async toggleBetaFeatures(): Promise<void> {
    const newValue = !this.currentSettings.enableBetaFeatures;
    await this.saveDebugSettings({ enableBetaFeatures: newValue });
  }

  // Mock premium user for testing
  static isMockPremiumUser(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.mockPremiumUser;
  }

  static async toggleMockPremiumUser(): Promise<void> {
    const newValue = !this.currentSettings.mockPremiumUser;
    await this.saveDebugSettings({ mockPremiumUser: newValue });
  }

  // Test alerts
  static areTestAlertsEnabled(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.enableTestAlerts;
  }

  static async toggleTestAlerts(): Promise<void> {
    const newValue = !this.currentSettings.enableTestAlerts;
    await this.saveDebugSettings({ enableTestAlerts: newValue });
  }

  // Get all current settings
  static getCurrentSettings(): DebugSettings {
    return { ...this.currentSettings };
  }

  // Reset all debug settings
  static async resetDebugSettings(): Promise<void> {
    // 🔐 現在のデバッグモード状態を保持
    const currentDebugMode = this.currentSettings.enableDebugMode;
    
    const defaultSettings: DebugSettings = {
      enableDebugMode: currentDebugMode, // 🎯 ログイン状態保持
      forcedSubscriptionTier: undefined,
      bypassSubscriptionLimits: false,
      showDebugInfo: false,
      enableBetaFeatures: false,
      mockPremiumUser: false,
      enableTestAlerts: false,
      // 🆕 MECE補完項目のデフォルト値
      forcedAPIErrors: false,
      mockNetworkConditions: false,
      enablePerformanceMetrics: false,
      mockDataGeneration: false,
    };
    
    this.currentSettings = defaultSettings;
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultSettings));
  }

  // Get environment info for debugging
  static getEnvironmentInfo(): object {
    return {
      isDevelopment: this.isDevelopment(),
      debugModeEnabled: this.isDebugModeEnabled(),
      nodeEnv: process.env.NODE_ENV,
      currentSettings: this.getCurrentSettings(),
    };
  }

  // Quick test for beta users (can be called from anywhere)
  static async quickBetaTest(): Promise<void> {
    if (this.isDebugModeEnabled()) {
    }
  }

  // 🆕 MECE補完: API エラーシミュレーション機能
  static shouldForceAPIErrors(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.forcedAPIErrors;
  }

  static async toggleForcedAPIErrors(): Promise<void> {
    const newValue = !this.currentSettings.forcedAPIErrors;
    await this.saveDebugSettings({ forcedAPIErrors: newValue });
  }

  // 🆕 MECE補完: ネットワーク状況テスト機能
  static shouldMockNetworkConditions(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.mockNetworkConditions;
  }

  static async toggleMockNetworkConditions(): Promise<void> {
    const newValue = !this.currentSettings.mockNetworkConditions;
    await this.saveDebugSettings({ mockNetworkConditions: newValue });
  }

  // 🆕 MECE補完: パフォーマンス計測機能  
  static shouldEnablePerformanceMetrics(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.enablePerformanceMetrics;
  }

  static async togglePerformanceMetrics(): Promise<void> {
    const newValue = !this.currentSettings.enablePerformanceMetrics;
    await this.saveDebugSettings({ enablePerformanceMetrics: newValue });
  }

  // 🆕 MECE補完: テストデータ自動生成機能
  static shouldMockDataGeneration(): boolean {
    return this.isDebugModeEnabled() && this.currentSettings.mockDataGeneration;
  }

  static async toggleMockDataGeneration(): Promise<void> {
    const newValue = !this.currentSettings.mockDataGeneration;
    await this.saveDebugSettings({ mockDataGeneration: newValue });
  }

  // 🆕 統合ヘルパー: 全MECE項目の確認
  static getMECEStatus(): { [key: string]: boolean } {
    return {
      // 既存機能
      bypassSubscriptionLimits: this.shouldBypassSubscriptionLimits(),
      showDebugInfo: this.shouldShowDebugInfo(),
      enableBetaFeatures: this.areBetaFeaturesEnabled(),
      mockPremiumUser: this.isMockPremiumUser(),
      enableTestAlerts: this.areTestAlertsEnabled(),
      // MECE補完機能
      forcedAPIErrors: this.shouldForceAPIErrors(),
      mockNetworkConditions: this.shouldMockNetworkConditions(),
      enablePerformanceMetrics: this.shouldEnablePerformanceMetrics(),
      mockDataGeneration: this.shouldMockDataGeneration(),
    };
  }
}

export default DebugService;