/**
 * AutoPickService - Unified AutoPick functionality for Home and Feed tabs
 * Eliminates code duplication while maintaining tab-specific logging
 */

import axios from 'axios';
import { Alert } from 'react-native';
import { AudioTrack, InstantAudioRequest, SimpleAudioResponse } from '../types/audio';
import PersonalizationService from './PersonalizationService';

interface AutoPickOptions {
  token: string;
  selectedGenre?: string;
  context: 'home' | 'feed'; // For logging differentiation
  playInstantAudio: (audioTrack: AudioTrack) => Promise<void>; // Updated for unified system
  onProgress?: (progress: number, stage: 'articles' | 'script' | 'audio' | 'complete', articlesCount?: number) => void;
  voiceLanguage?: string; // Dynamic voice language setting
  maxArticles?: number; // User's plan-based limit
}

interface AutoPickRequest {
  max_articles: number;
  diversity_enabled?: boolean;
  max_per_genre?: number;
  preferred_genres?: string[];
  excluded_genres?: string[];
  min_reading_time?: number;
  max_reading_time?: number;
  require_images?: boolean;
  source_priority?: string;
  recency_weight?: number;
  popularity_weight?: number;
  personalization_weight?: number;
}

class AutoPickService {
  private static instance: AutoPickService;
  private readonly API: string;

  constructor() {
    this.API = process.env.EXPO_PUBLIC_BACKEND_URL 
      ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` 
      : 'http://localhost:8003/api';
  }

  static getInstance(): AutoPickService {
    if (!AutoPickService.instance) {
      AutoPickService.instance = new AutoPickService();
    }
    return AutoPickService.instance;
  }

  /**
   * Get comprehensive user settings from multiple sources
   */
  private async getUserAutoPickSettings(token: string): Promise<any> {
    try {
      // Get backend settings (voice, max_articles, etc.)
      const backendResponse = await axios.get(
        `${this.API}/user/settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Get frontend prompt settings
      const { getPromptSettingsForMode } = require('../utils/promptUtils');
      const promptSettings = await getPromptSettingsForMode('autoPick');
      
      // Merge settings
      const backendSettings = backendResponse.data?.auto_pick_settings || {};
      return {
        // Backend settings (voice, articles, etc.)
        voice_language: backendSettings.voice_language || 'en-US',
        voice_name: backendSettings.voice_name || 'alloy',
        max_articles: backendSettings.max_articles || 5,
        preferred_genres: backendSettings.preferred_genres || [],
        excluded_genres: backendSettings.excluded_genres || [],
        source_priority: backendSettings.source_priority || 'balanced',
        time_based_filtering: backendSettings.time_based_filtering !== false,
        
        // Frontend prompt settings
        prompt_style: promptSettings.style,
        custom_prompt: promptSettings.customPrompt
      };
    } catch (error) {
      console.warn('Failed to fetch comprehensive user settings, using defaults:', error);
      return {
        voice_language: 'en-US',
        voice_name: 'alloy',
        max_articles: 5,
        preferred_genres: [],
        excluded_genres: [],
        source_priority: 'balanced',
        time_based_filtering: true,
        prompt_style: 'standard',
        custom_prompt: ''
      };
    }
  }

  /**
   * Execute AutoPick functionality with unified logic
   */
  async executeAutoPick(options: AutoPickOptions): Promise<void> {
    const { token, selectedGenre, context, playInstantAudio, onProgress, voiceLanguage, maxArticles } = options;
    const contextEmoji = context === 'home' ? '🏠' : '📰';
    const contextName = context.toUpperCase();

    try {
      console.log(`${contextEmoji} ${contextName} AUTOPICK: Starting instant autopick`);
      onProgress?.(10, 'articles');
      
      // DEBUG: Check DebugService status
      const DebugService = require('./DebugService').default;
      console.log(`🐛 DEBUG STATUS: DebugMode enabled: ${DebugService.isDebugModeEnabled()}`);
      console.log(`🐛 DEBUG STATUS: Forced tier: ${DebugService.getForcedSubscriptionTier()}`);
      console.log(`🐛 DEBUG STATUS: Plan limit received: ${maxArticles}`);
      
      // Get user's auto_pick_settings for voice configuration
      const userSettings = await this.getUserAutoPickSettings(token);
      console.log(`${contextEmoji} ${contextName} AUTOPICK: Using voice settings:`, {
        voice_language: userSettings.voice_language,
        voice_name: userSettings.voice_name
      });
      
      // Create auto-pick request with user settings and genre filtering
      // Use user's setting but enforce plan limit as maximum
      const userDesiredArticles = userSettings.max_articles || 5;
      const planMaxArticles = maxArticles || 3;
      const requestedMaxArticles = Math.min(userDesiredArticles, planMaxArticles);
      const autoPickRequest: AutoPickRequest = {
        max_articles: requestedMaxArticles,
        preferred_genres: selectedGenre && selectedGenre !== 'All' ? [selectedGenre] : [], // Empty for 'All' selection
        excluded_genres: userSettings.excluded_genres,
        source_priority: userSettings.source_priority,
        time_based_filtering: userSettings.time_based_filtering
      };
      
      console.log(`${contextEmoji} ${contextName} AUTOPICK: User desired: ${userDesiredArticles}, Plan limit: ${planMaxArticles}, Using: ${requestedMaxArticles}`);
      console.log(`${contextEmoji} ${contextName} AUTOPICK: Requesting articles with genre:`, selectedGenre);
      console.log(`${contextEmoji} ${contextName} AUTOPICK: Full request payload:`, JSON.stringify(autoPickRequest, null, 2));
      onProgress?.(25, 'articles');
      
      // Prepare headers with debug info if needed
      const headers: any = { Authorization: `Bearer ${token}` };
      if (DebugService.shouldBypassSubscriptionLimits()) {
        headers['X-Debug-Bypass-Limits'] = 'true';
        headers['X-Debug-Mode'] = 'true';
        console.log(`🐛 DEBUG: Adding debug headers to auto-pick request`);
      }
      
      // Fetch auto-picked articles
      const autoPickResponse = await axios.post(
        `${this.API}/auto-pick`,
        autoPickRequest,
        { 
          headers,
          timeout: 15000
        }
      );
      
      console.log(`${contextEmoji} ${contextName} AUTOPICK: Got articles:`, autoPickResponse.data?.length);
      onProgress?.(45, 'script', autoPickResponse.data?.length);
      
      if (autoPickResponse.data && autoPickResponse.data.length > 0) {
        // Use prompt settings already retrieved from getUserAutoPickSettings
        // 🔥 FIX: Only send custom_prompt if there's actually content, otherwise null
        const hasCustomPrompt = userSettings.custom_prompt && userSettings.custom_prompt.trim() !== '';
        const promptData = {
          prompt_style: hasCustomPrompt ? 'custom' : userSettings.prompt_style,
          custom_prompt: hasCustomPrompt ? userSettings.custom_prompt : null
        };
        console.log(`${contextEmoji} ${contextName} AUTOPICK: Using unified prompt settings:`, promptData);
        
        // Create clean audio request using new API with user's voice settings and prompt data
        const autoPickArticles = autoPickResponse.data;
        const finalVoiceLanguage = voiceLanguage || userSettings.voice_language || 'en-US';
        const finalVoiceName = userSettings.voice_name || 'alloy';
        const requestData: InstantAudioRequest = {
          article_ids: autoPickArticles.map((a: any) => a.id),
          article_titles: autoPickArticles.map((a: any) => a.title),
          article_urls: autoPickArticles.map((a: any) => a.link || ''),
          // 🔥 FIX: Send rich content for better script generation
          article_summaries: autoPickArticles.map((a: any) => a.summary || ''),
          article_contents: autoPickArticles.map((a: any) => a.content || ''),
          voice_language: finalVoiceLanguage,
          voice_name: finalVoiceName,
          // Add prompt settings
          ...promptData
        };

        console.log(`${contextEmoji} ${contextName} AUTOPICK: Creating clean audio via new API`);
        console.log(`${contextEmoji} ${contextName} AUTOPICK: Final voice settings:`, {
          voiceLanguage_param: voiceLanguage,
          userSettings_voice: userSettings.voice_language,
          finalVoiceLanguage,
          finalVoiceName
        });
        onProgress?.(70, 'audio', autoPickArticles.length);
        
        // Prepare audio headers with debug info if needed
        const audioHeaders: any = { Authorization: `Bearer ${token}` };
        if (DebugService.shouldBypassSubscriptionLimits()) {
          audioHeaders['X-Debug-Bypass-Limits'] = 'true';
          audioHeaders['X-Debug-Mode'] = 'true';
        }
        
        // Create instant audio using new clean endpoint
        const audioResponse = await axios.post<SimpleAudioResponse>(
          `${this.API}/v1/generate-simple-audio`,
          requestData,
          { 
            headers: audioHeaders,
            timeout: 60000  // Extended timeout for 20-article processing (backend takes ~35s)
          }
        );
        
        onProgress?.(95, 'audio');
        
        if (audioResponse.data?.audio_url) {
          // Create audio track for unified player system
          const audioTrack: AudioTrack = {
            id: audioResponse.data.id,
            title: audioResponse.data.title,
            url: audioResponse.data.audio_url,
            duration: audioResponse.data.duration || 0,
            created_at: new Date().toISOString(),
            script: audioResponse.data.script || '',
            voice_language: audioResponse.data.voice_language,
            voice_name: audioResponse.data.voice_name,
            context: context, // Add context information for UI
            audioType: 'instant', // Mark as instant audio
            isInstantAudio: true, // Backward compatibility
            chapters: audioResponse.data.chapters?.map(chapter => ({
              id: `chapter_${chapter.title}`,
              title: chapter.title,
              startTime: chapter.startTime,
              endTime: chapter.endTime,
              original_url: chapter.original_url,
              // Add backward compatibility fields
              start_time: chapter.startTime,
              end_time: chapter.endTime,
              originalUrl: chapter.original_url
            }))
          };
          
          // Start instant audio playback immediately
          console.log(`${contextEmoji} ${contextName} AUTOPICK: Starting instant audio playback`);
          await playInstantAudio(audioTrack);
          
          onProgress?.(100, 'complete');
          
          // Record interaction for personalization
          await PersonalizationService.recordInteraction({
            action: 'complete',
            contentId: audioResponse.data.id,
            contentType: 'audio',
            category: 'Auto-Pick Podcast',
            timestamp: Date.now(),
            engagementLevel: 'high',
          });
          
          console.log(`${contextEmoji} ${contextName} AUTOPICK: Success - ${audioTrack.title}`);
        } else {
          throw new Error('No audio URL received from server');
        }
      } else {
        Alert.alert('No Selection', 'AI could not find suitable articles for podcast creation. Try again later.');
      }
    } catch (error: any) {
      console.error(`${contextEmoji} ${contextName} AUTOPICK: Error:`, error);
      
      let errorMessage = 'Failed to auto-pick articles';
      if (error.response?.status === 422) {
        errorMessage = 'Invalid article data. Please try refreshing articles.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Server is busy. Please wait a moment and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      Alert.alert('Error', errorMessage);
      throw error; // Re-throw for calling function to handle loading states
    }
  }

  /**
   * Validate if AutoPick can be executed
   */
  canExecuteAutoPick(articlesCount: number): { canExecute: boolean; reason?: string } {
    if (articlesCount === 0) {
      return {
        canExecute: false,
        reason: 'No articles available. Please add some RSS sources and refresh.'
      };
    }
    
    return { canExecute: true };
  }
}

export default AutoPickService;