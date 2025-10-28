/**
 * Settings Synchronization Service
 * フロントエンドの設定とAutoPick API パラメータの同期サービス
 * 
 * Core Features:
 * - AutoPick API パラメータの設定同期
 * - フロントエンド設定の変更をAPI呼び出しに反映
 * - デフォルト値のフォールバック処理
 */

import { AppSettings } from '../context/SettingsContext';
import { AutoPickRequest, ManualPickRequest, ArticleCandidate } from './AudioService';

export interface SyncedAutoPickRequest extends AutoPickRequest {
  // All fields from AutoPickRequest are included
  // This interface serves as a type-safe wrapper
}

export class SettingsSyncService {
  /**
   * フロントエンド設定からAutoPickリクエストパラメータを生成
   * 
   * @param settings AppSettings from SettingsContext
   * @param overrides Optional parameter overrides for specific calls
   * @param tabScope Which tab is making the request ('home' | 'feed')
   * @returns Synced AutoPickRequest parameters
   */
  static createAutoPickRequest(
    settings: AppSettings,
    overrides: Partial<SyncedAutoPickRequest> = {},
    tabScope: 'home' | 'feed' = 'home'
  ): SyncedAutoPickRequest {
    const baseRequest: SyncedAutoPickRequest = {
      // From content settings
      voice_language: this.mapLanguageToVoiceLanguage(settings.general.language),
      voice_name: this.mapVoiceTypeToVoiceName(settings.content.voiceType),
      
      // From auto pick mode settings
      max_articles: settings.pickModes.auto.maxArticles || 5,
      // Map FE genre IDs to backend expected labels if provided
      preferred_genres: this.mapPreferredGenres(settings.pickModes.auto.preferredGenres || []),
      
      // Prompt settings - map template name to style; custom promptはオーバーライドのみ
      prompt_style: this.mapPromptTemplateToStyle(settings.content.promptTemplate),
      custom_prompt: settings.pickModes.auto.overridePromptTemplate || undefined,
      
      // Tab scope and source management
      tab_scope: tabScope,
      source_scope: 'user', // Default to user-managed sources
      
      // Selected source IDs - will be populated by RSS source selection
      selected_source_ids: undefined,
    };

    // Apply any overrides
    return { ...baseRequest, ...overrides };
  }

  /**
   * フロントエンド設定からManualPickリクエストパラメータを生成
   */
  static createManualPickRequest(
    settings: AppSettings,
    articleIds: string[],
    articleTitles: string[],
    overrides: Partial<ManualPickRequest> = {}
  ): ManualPickRequest {
    const baseRequest: ManualPickRequest = {
      article_ids: articleIds,
      article_titles: articleTitles,
      
      // From content settings
      voice_language: this.mapLanguageToVoiceLanguage(settings.general.language),
      voice_name: this.mapVoiceTypeToVoiceName(settings.content.voiceType),
      
      // Prompt settings - map to backend-recognized style
      prompt_style: this.mapPromptTemplateToStyle(settings.content.promptTemplate),
      custom_prompt: settings.pickModes.manual.overridePromptTemplate || settings.content.promptTemplate || undefined,
    };

    return { ...baseRequest, ...overrides };
  }

  /**
   * 設定の変更をリアルタイムで検証
   */
  static validateSettings(settings: AppSettings): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate auto pick settings
    if (settings.pickModes.auto.maxArticles < 1 || settings.pickModes.auto.maxArticles > 20) {
      errors.push('自動選択の記事数は1-20の範囲で設定してください');
    }

    // Validate voice settings
    if (!settings.content.voiceType) {
      warnings.push('音声タイプが設定されていません');
    }

    // Validate language settings
    if (!settings.general.language) {
      warnings.push('言語設定が指定されていません');
    }

    // Validate preferred genres
    if (settings.pickModes.auto.preferredGenres.length === 0) {
      warnings.push('自動選択で優先ジャンルが設定されていません');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 設定変更時の影響分析
   */
  static analyzeSettingsImpact(
    oldSettings: AppSettings,
    newSettings: AppSettings
  ): {
    affectedFeatures: string[];
    requiresRestart: boolean;
    recommendations: string[];
  } {
    const affectedFeatures: string[] = [];
    const recommendations: string[] = [];
    let requiresRestart = false;

    // Check language changes
    if (oldSettings.general.language !== newSettings.general.language) {
      affectedFeatures.push('音声言語');
      recommendations.push('言語変更により、次回の音声生成から新しい言語が適用されます');
    }

    // Check voice type changes
    if (oldSettings.content.voiceType !== newSettings.content.voiceType) {
      affectedFeatures.push('音声タイプ');
      recommendations.push('音声タイプの変更は次回の音声生成から適用されます');
    }

    // Check auto pick settings changes
    if (oldSettings.pickModes.auto.maxArticles !== newSettings.pickModes.auto.maxArticles) {
      affectedFeatures.push('自動選択記事数');
    }

    if (JSON.stringify(oldSettings.pickModes.auto.preferredGenres) !== JSON.stringify(newSettings.pickModes.auto.preferredGenres)) {
      affectedFeatures.push('優先ジャンル');
      recommendations.push('ジャンル設定の変更により、おすすめの記事選択が改善されます');
    }

    // Check prompt template changes
    if (oldSettings.content.promptTemplate !== newSettings.content.promptTemplate) {
      affectedFeatures.push('プロンプトテンプレート');
      recommendations.push('プロンプトの変更により、音声の内容スタイルが変わります');
    }

    return {
      affectedFeatures,
      requiresRestart,
      recommendations
    };
  }

  /**
   * 言語設定から音声言語コードにマッピング
   */
  private static mapLanguageToVoiceLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      'ja': 'ja-JP',
      'ja-JP': 'ja-JP',
      'japanese': 'ja-JP',
      'en': 'en-US', 
      'en-US': 'en-US',
      'english': 'en-US',
    };

    return languageMap[language] || 'ja-JP'; // Default to Japanese
  }

  /**
   * 音声タイプ設定から音声名にマッピング
   */
  private static mapVoiceTypeToVoiceName(voiceType: string): string {
    const voiceMap: Record<string, string> = {
      'alloy': 'alloy',
      'echo': 'echo', 
      'fable': 'fable',
      'onyx': 'onyx',
      'nova': 'nova',
      'shimmer': 'shimmer',
      // Add more voice mappings as needed
    };

    return voiceMap[voiceType] || 'alloy'; // Default to alloy
  }

  /**
   * プロンプトテンプレート名をスタイル文字列にマッピング
   * 未定義/未知の値は 'standard' にフォールバック
   */
  private static mapPromptTemplateToStyle(template?: string): string {
    // New unified styles (backend native, Japanese)
    const validStyles = ['ニュース', '学習', 'エンタメ', 'レポート', '意見'];
    if (!template) return '学習';

    // If already a valid new style, pass through
    if (validStyles.includes(template)) return template;

    // Normalize for legacy english keys
    const t = (template || '').toLowerCase();
    const legacyMap: Record<string, string> = {
      // Legacy english → backend Japanese
      'standard': '学習',
      'recommended': '学習',
      'friendly': 'エンタメ',
      'insightful': '学習',
      'insight': '学習',
      'strict': 'レポート',
      // Japanese synonyms
      '標準': '学習',
      'スタンダード': '学習',
    };
    return legacyMap[t] || '学習';
  }

  /**
   * フロントエンドのジャンルIDをバックエンド側の日本語ラベルへ変換
   * 未知のIDは除外して安全側に倒す（挙動の予測可能性を優先）
   * 
   * 更新: backend/services/genre_mapping_service.pyと整合性を保つ
   */
  private static mapPreferredGenres(frontendGenres: string[]): string[] {
    if (!frontendGenres || frontendGenres.length === 0) return [];
    
    // GenreMappingServiceと同じマッピング定義
    const map: Record<string, string> = {
      // 対応済みジャンル（バックエンドGENRE_KEYWORDSに存在）
      technology: 'テクノロジー',
      business: 'ビジネス',
      entertainment: 'エンタメ',
      
      // 未対応ジャンル → 安全な代替マッピング
      health: 'ビジネス',        // 健康・医療 → ビジネス（医療業界など）
      politics: 'テクノロジー',   // 政治 → テクノロジー（政策・デジタル政府など）
      sports: 'エンタメ',        // スポーツ → エンタメ（スポーツエンタメ）
    };
    
    const mapped = frontendGenres
      .map((g) => {
        const mappedGenre = map[g];
        if (mappedGenre) {
          console.log(`🔄 Genre mapping: ${g} → ${mappedGenre}`);
        } else {
          console.warn(`⚠️ Unknown frontend genre: ${g}`);
        }
        return mappedGenre || '';
      })
      .filter((g): g is string => !!g);
    
    // 重複排除
    const result = Array.from(new Set(mapped));
    
    console.log(`📊 Genre mapping result: [${frontendGenres.join(', ')}] → [${result.join(', ')}]`);
    return result;
  }

  /**
   * タブスコープに基づく設定の調整
   */
  static adjustSettingsForTabScope(
    baseRequest: SyncedAutoPickRequest,
    tabScope: 'home' | 'feed',
    selectedSourceIds?: string[]
  ): SyncedAutoPickRequest {
    const adjusted = { ...baseRequest };

    if (tabScope === 'home') {
      // Home tab: Use curated sources or all user sources
      adjusted.tab_scope = 'home';
      adjusted.source_scope = 'user'; // or 'fixed' for curated sources
      adjusted.selected_source_ids = undefined; // Don't filter sources on home
    } else if (tabScope === 'feed') {
      // Feed tab: Use filtered sources based on user selection
      adjusted.tab_scope = 'feed';
      adjusted.source_scope = 'user';
      adjusted.selected_source_ids = selectedSourceIds || undefined;
    }

    return adjusted;
  }

  /**
   * 設定のリアルタイム同期状態を管理
   */
  static createSyncManager() {
    let currentSettings: AppSettings | null = null;
    let syncCallbacks: Array<(settings: AppSettings) => void> = [];

    return {
      // 設定の更新を監視
      updateSettings: (newSettings: AppSettings) => {
        const oldSettings = currentSettings;
        currentSettings = newSettings;

        // 変更があった場合のみコールバックを実行
        if (oldSettings && JSON.stringify(oldSettings) !== JSON.stringify(newSettings)) {
          const impact = this.analyzeSettingsImpact(oldSettings, newSettings);
          
          // ログ出力
          console.log('[Settings Sync] Settings updated:', {
            affectedFeatures: impact.affectedFeatures,
            recommendations: impact.recommendations
          });

          // 登録されたコールバックを実行
          syncCallbacks.forEach(callback => {
            try {
              callback(newSettings);
            } catch (error) {
              console.error('[Settings Sync] Callback error:', error);
            }
          });
        }
      },

      // 同期コールバックを登録
      onSettingsChange: (callback: (settings: AppSettings) => void) => {
        syncCallbacks.push(callback);
        
        // 現在の設定で即座にコールバックを実行
        if (currentSettings) {
          callback(currentSettings);
        }

        // アンサブスクライブ関数を返す
        return () => {
          syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
        };
      },

      // 現在の設定を取得
      getCurrentSettings: () => currentSettings,
    };
  }
}

export default SettingsSyncService;
