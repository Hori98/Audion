// Subscription Service for managing freemium plan features
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic', 
  PREMIUM = 'premium'
}

// Import DebugService (lazy import to avoid circular dependency)
let DebugService: any = null;
const getDebugService = async () => {
  if (!DebugService) {
    DebugService = (await import('./DebugService')).default;
  }
  return DebugService;
};

export interface SubscriptionFeatures {
  maxArticlesPerEpisode: number;
  availableArticleCounts: number[];
  maxScheduledContent: number;
  maxRSSSources: number;
  customPrompts: boolean;
  premiumAIStyles: boolean;
}

class SubscriptionService {
  private static currentTier: SubscriptionTier = SubscriptionTier.FREE;

  // Plan features configuration
  private static readonly PLAN_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
    [SubscriptionTier.FREE]: {
      maxArticlesPerEpisode: 3,
      availableArticleCounts: [1, 3],
      maxScheduledContent: 1,
      maxRSSSources: 5,
      customPrompts: false,
      premiumAIStyles: false
    },
    [SubscriptionTier.BASIC]: {
      maxArticlesPerEpisode: 7,
      availableArticleCounts: [1, 3, 5, 7],
      maxScheduledContent: 3,
      maxRSSSources: 15,
      customPrompts: true,
      premiumAIStyles: false
    },
    [SubscriptionTier.PREMIUM]: {
      maxArticlesPerEpisode: 15,
      availableArticleCounts: [1, 3, 5, 7, 10, 15],
      maxScheduledContent: 5,
      maxRSSSources: -1, // Unlimited
      customPrompts: true,
      premiumAIStyles: true
    }
  };

  static getCurrentTier(): SubscriptionTier {
    return this.currentTier;
  }

  // Get effective tier (considering debug overrides)
  static async getEffectiveTier(): Promise<SubscriptionTier> {
    try {
      const debugService = await getDebugService();
      const forcedTier = debugService.getForcedSubscriptionTier();
      
      if (forcedTier && debugService.isDebugModeEnabled()) {
        return forcedTier;
      }
      
      if (debugService.isMockPremiumUser()) {
        return SubscriptionTier.PREMIUM;
      }
    } catch (error) {
      console.error('Error getting debug service:', error);
    }
    
    return this.currentTier;
  }

  static setCurrentTier(tier: SubscriptionTier): void {
    this.currentTier = tier;
  }

  static getCurrentFeatures(): SubscriptionFeatures {
    return this.PLAN_FEATURES[this.currentTier];
  }

  // Get effective features (considering debug overrides)
  static async getEffectiveFeatures(): Promise<SubscriptionFeatures> {
    try {
      const debugService = await getDebugService();
      
      if (debugService.shouldBypassSubscriptionLimits()) {
        return {
          maxArticlesPerEpisode: 99,
          availableArticleCounts: [1, 3, 5, 7, 10, 15, 20, 30, 50],
          maxScheduledContent: 99,
          maxRSSSources: -1,
          customPrompts: true,
          premiumAIStyles: true
        };
      }
      
      const effectiveTier = await this.getEffectiveTier();
      return this.PLAN_FEATURES[effectiveTier];
    } catch (error) {
      console.error('Error getting effective features:', error);
      return this.getCurrentFeatures();
    }
  }

  static getAvailableArticleCounts(): number[] {
    return this.getCurrentFeatures().availableArticleCounts;
  }

  static getMaxArticlesPerEpisode(): number {
    return this.getCurrentFeatures().maxArticlesPerEpisode;
  }

  static canSelectArticleCount(count: number): boolean {
    const features = this.getCurrentFeatures();
    return features.availableArticleCounts.includes(count) && count <= features.maxArticlesPerEpisode;
  }

  static getMaxScheduledContent(): number {
    return this.getCurrentFeatures().maxScheduledContent;
  }

  static canCreateScheduledContent(currentCount: number): boolean {
    const max = this.getMaxScheduledContent();
    return currentCount < max;
  }

  static canUseCustomPrompts(): boolean {
    return this.getCurrentFeatures().customPrompts;
  }

  static getPlanName(tier: SubscriptionTier): string {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'Free Plan';
      case SubscriptionTier.BASIC:
        return 'Basic Plan (¥980/month)';
      case SubscriptionTier.PREMIUM:
        return 'Premium Plan (¥1,980/month)';
      default:
        return 'Unknown Plan';
    }
  }

  static getPlanPrice(tier: SubscriptionTier): string {
    switch (tier) {
      case SubscriptionTier.FREE:
        return '¥0';
      case SubscriptionTier.BASIC:
        return '¥980/month';
      case SubscriptionTier.PREMIUM:
        return '¥1,980/month';
      default:
        return 'Unknown';
    }
  }

  // Get upgrade message for restricted features
  static getUpgradeMessage(feature: string): string {
    const currentPlan = this.getPlanName(this.currentTier);
    
    if (this.currentTier === SubscriptionTier.FREE) {
      return `${feature} is available with Basic Plan (¥980/month) or higher. Upgrade to unlock this feature.`;
    } else if (this.currentTier === SubscriptionTier.BASIC) {
      return `${feature} is available with Premium Plan (¥1,980/month). Upgrade to unlock this feature.`;
    }
    
    return `This feature is not available in your current plan (${currentPlan}).`;
  }

  // For development/testing purposes
  static async loadUserSubscription(): Promise<SubscriptionTier> {
    try {
      // In real implementation, this would fetch from backend
      // For now, return FREE as default
      const tier = SubscriptionTier.FREE;
      this.setCurrentTier(tier);
      return tier;
    } catch (error) {
      console.error('Failed to load user subscription:', error);
      this.setCurrentTier(SubscriptionTier.FREE);
      return SubscriptionTier.FREE;
    }
  }
}

export default SubscriptionService;