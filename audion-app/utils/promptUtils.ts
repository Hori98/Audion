import AsyncStorage from '@react-native-async-storage/async-storage';

export type CreationMode = 'manual' | 'autoPick' | 'schedule';

export interface PromptSettings {
  manual: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
    enabled: boolean;
  };
  autoPick: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
    enabled: boolean;
  };
  schedule: {
    style: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
    customPrompt: string;
    enabled: boolean;
  };
}

const defaultPromptSettings: PromptSettings = {
  manual: {
    style: 'standard',
    customPrompt: '',
    enabled: true,
  },
  autoPick: {
    style: 'standard',
    customPrompt: '',
    enabled: true,
  },
  schedule: {
    style: 'standard',
    customPrompt: '',
    enabled: true,
  },
};

/**
 * Get prompt settings for a specific creation mode
 */
export const getPromptSettingsForMode = async (mode: CreationMode): Promise<{ style: string; customPrompt: string }> => {
  try {
    // Load unified prompt settings
    const savedSettings = await AsyncStorage.getItem('unified_prompt_settings');
    let promptSettings: PromptSettings = defaultPromptSettings;
    
    if (savedSettings) {
      promptSettings = { ...defaultPromptSettings, ...JSON.parse(savedSettings) };
    }
    
    const modeSettings = promptSettings[mode];
    
    // If mode is disabled, fallback to manual mode settings
    if (!modeSettings.enabled && mode !== 'manual') {
      const manualSettings = promptSettings.manual;
      return {
        style: manualSettings.style,
        customPrompt: manualSettings.customPrompt
      };
    }
    
    return {
      style: modeSettings.style,
      customPrompt: modeSettings.customPrompt
    };
  } catch (error) {
    console.error('Error loading prompt settings for mode:', mode, error);
    
    // Fallback to legacy settings for backward compatibility
    const legacyStyle = await AsyncStorage.getItem('unified_prompt_style') || 'standard';
    const legacyCustomPrompt = await AsyncStorage.getItem('unified_custom_prompt') || '';
    
    return {
      style: legacyStyle,
      customPrompt: legacyCustomPrompt
    };
  }
};

/**
 * Save prompt settings for all modes
 */
export const saveUnifiedPromptSettings = async (settings: PromptSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem('unified_prompt_settings', JSON.stringify(settings));
    
    // Also save to individual keys for backward compatibility
    await AsyncStorage.setItem('unified_prompt_style', settings.manual.style);
    await AsyncStorage.setItem('unified_custom_prompt', settings.manual.customPrompt);
  } catch (error) {
    console.error('Error saving unified prompt settings:', error);
    throw error;
  }
};

/**
 * Get prompt settings for API request
 */
export const getAPIPromptData = async (mode: CreationMode) => {
  const { style, customPrompt } = await getPromptSettingsForMode(mode);
  
  return {
    prompt_style: style,
    custom_prompt: customPrompt
  };
};