import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AudioPromptMetadata {
  audioId: string;
  promptMode: 'manual' | 'autoPick' | 'schedule';
  promptStyle: 'standard' | 'strict' | 'gentle' | 'insightful' | 'custom';
  customPrompt?: string;
  createdAt: string;
  creationMethod: string; // 'selection', 'auto-pick', 'single-article', 'weekly', 'scheduled'
}

class AudioMetadataService {
  private static readonly METADATA_KEY = 'audio_prompt_metadata';

  /**
   * Save prompt metadata for an audio item
   */
  static async saveAudioMetadata(metadata: AudioPromptMetadata): Promise<void> {
    try {
      const existingData = await this.getAllMetadata();
      existingData[metadata.audioId] = metadata;
      
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(existingData));
      console.log('Audio metadata saved:', metadata);
    } catch (error) {
      console.error('Error saving audio metadata:', error);
    }
  }

  /**
   * Get prompt metadata for a specific audio item
   */
  static async getAudioMetadata(audioId: string): Promise<AudioPromptMetadata | null> {
    try {
      const allMetadata = await this.getAllMetadata();
      return allMetadata[audioId] || null;
    } catch (error) {
      console.error('Error getting audio metadata:', error);
      return null;
    }
  }

  /**
   * Get all audio metadata
   */
  static async getAllMetadata(): Promise<Record<string, AudioPromptMetadata>> {
    try {
      const data = await AsyncStorage.getItem(this.METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting all metadata:', error);
      return {};
    }
  }

  /**
   * Remove metadata for a specific audio item
   */
  static async removeAudioMetadata(audioId: string): Promise<void> {
    try {
      const existingData = await this.getAllMetadata();
      delete existingData[audioId];
      
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(existingData));
      console.log('Audio metadata removed for:', audioId);
    } catch (error) {
      console.error('Error removing audio metadata:', error);
    }
  }

  /**
   * Clean up metadata for deleted audio items
   */
  static async cleanupMetadata(activeAudioIds: string[]): Promise<void> {
    try {
      const existingData = await this.getAllMetadata();
      const activeSet = new Set(activeAudioIds);
      
      // Remove metadata for audio items that no longer exist
      const cleanedData: Record<string, AudioPromptMetadata> = {};
      for (const [audioId, metadata] of Object.entries(existingData)) {
        if (activeSet.has(audioId)) {
          cleanedData[audioId] = metadata;
        }
      }
      
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(cleanedData));
      console.log('Audio metadata cleaned up');
    } catch (error) {
      console.error('Error cleaning up metadata:', error);
    }
  }

  /**
   * Get display name for prompt mode
   */
  static getPromptModeDisplayName(mode: string, creationMethod?: string): string {
    switch (mode) {
      case 'manual':
        switch (creationMethod) {
          case 'selection': return '選択モード';
          case 'single-article': return '記事単体';
          case 'weekly': return '週間読了';
          default: return 'マニュアル';
        }
      case 'autoPick': return 'オートピック';
      case 'schedule': return 'スケジュール配信';
      default: return '不明';
    }
  }

  /**
   * Get display name for prompt style
   */
  static getPromptStyleDisplayName(style: string): string {
    switch (style) {
      // Backend uses 'recommended' but we display as 'standard'
      case 'recommended':
      case 'standard': 
        return 'スタンダード';
      case 'strict': 
        return 'ストリクト';
      // Backend uses 'friendly' but frontend expected 'gentle'  
      case 'friendly':
      case 'gentle': 
        return 'ジェントル';
      // Backend uses 'insight' but frontend expected 'insightful'
      case 'insight':
      case 'insightful': 
        return 'インサイトフル';
      case 'custom': 
        return 'カスタム';
      default: 
        console.warn(`Unknown prompt style: ${style}`);
        return '不明';
    }
  }
}

export default AudioMetadataService;