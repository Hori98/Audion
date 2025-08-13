import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AudioLimitService from '../services/AudioLimitService';

interface SubscriptionData {
  subscription: {
    plan: string;
    max_daily_audio_count: number;
    max_audio_articles: number;
  };
  daily_usage: {
    audio_count: number;
    total_articles_processed: number;
  };
  plan_config: {
    plan: string;
    max_daily_audio_count: number;
    max_audio_articles: number;
    description: string;
  };
  remaining_daily_audio: number;
}

export default function SubscriptionLimitsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await AudioLimitService.getSubscriptionInfo(token);
      setSubscriptionData(data);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptionData();
    setRefreshing(false);
  };

  const getContentLimitForPlan = (plan: string): number => {
    const limits: { [key: string]: number } = {
      "free": 1500,
      "basic": 2500, 
      "premium": 4000,
      "test_3": 2000,
      "test_5": 2500,
      "test_10": 3000,
      "test_15": 3500,
      "test_30": 4000,
      "test_60": 5000
    };
    return limits[plan] || 1500;
  };

  const getPlanDisplayName = (plan: string): string => {
    const names: { [key: string]: string } = {
      'free': 'Free',
      'basic': 'Basic',
      'premium': 'Premium',
      'test_3': 'Test (3 articles)',
      'test_5': 'Test (5 articles)', 
      'test_10': 'Test (10 articles)',
      'test_15': 'Test (15 articles)',
      'test_30': 'Test (30 articles)',
      'test_60': 'Test (60 articles)'
    };
    return names[plan] || plan;
  };

  const LimitCard = ({ 
    title, 
    current, 
    max, 
    unit, 
    description, 
    progress 
  }: {
    title: string;
    current: number;
    max: number;
    unit: string;
    description: string;
    progress?: number;
  }) => {
    const progressPercentage = progress || (max > 0 ? (current / max) * 100 : 0);
    const isAtLimit = progressPercentage >= 100;
    
    return (
      <View style={[styles.limitCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.limitHeader}>
          <Text style={[styles.limitTitle, { color: theme.text }]}>{title}</Text>
          <View style={[
            styles.limitBadge, 
            { 
              backgroundColor: isAtLimit ? theme.error + '20' : theme.accent + '20',
            }
          ]}>
            <Text style={[
              styles.limitBadgeText, 
              { color: isAtLimit ? theme.error : theme.accent }
            ]}>
              {current}/{max} {unit}
            </Text>
          </View>
        </View>
        
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(progressPercentage, 100)}%`,
                backgroundColor: isAtLimit ? theme.error : theme.accent 
              }
            ]} 
          />
        </View>
        
        <Text style={[styles.limitDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
        
        {isAtLimit && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color={theme.error} />
            <Text style={[styles.warningText, { color: theme.error }]}>
              Limit reached
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Subscription Limits</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading limits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!subscriptionData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Subscription Limits</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Failed to load subscription data</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: theme.accent }]} onPress={loadSubscriptionData}>
            <Text style={[styles.retryButtonText, { color: theme.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const contentLimit = getContentLimitForPlan(subscriptionData.subscription.plan);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Subscription Limits</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan */}
        <View style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.planHeader}>
            <Ionicons name="diamond" size={24} color={theme.accent} />
            <Text style={[styles.planTitle, { color: theme.text }]}>Current Plan</Text>
          </View>
          <Text style={[styles.planName, { color: theme.accent }]}>
            {getPlanDisplayName(subscriptionData.subscription.plan)}
          </Text>
          <Text style={[styles.planDescription, { color: theme.textSecondary }]}>
            {subscriptionData.plan_config.description}
          </Text>
        </View>

        {/* Daily Audio Limits */}
        <LimitCard
          title="Daily Audio Creation"
          current={subscriptionData.daily_usage.audio_count}
          max={subscriptionData.subscription.max_daily_audio_count}
          unit="audios"
          description="Number of audio files you can create per day"
        />

        {/* Article Limits */}
        <LimitCard
          title="Articles per Audio"
          current={0} // This is a max limit, not current usage
          max={subscriptionData.subscription.max_audio_articles}
          unit="articles"
          description="Maximum articles you can select for a single audio creation"
          progress={0} // Always show as available
        />

        {/* Content Length */}
        <LimitCard
          title="Article Content Length"
          current={0} // This is a max limit
          max={contentLimit}
          unit="chars"
          description="Maximum characters per article content for optimal processing"
          progress={0} // Always show as available
        />

        {/* Daily Article Processing */}
        <LimitCard
          title="Daily Articles Processed"
          current={subscriptionData.daily_usage.total_articles_processed}
          max={subscriptionData.subscription.max_daily_audio_count * subscriptionData.subscription.max_audio_articles}
          unit="articles"
          description="Total articles processed across all audio creations today"
        />

        {/* Additional Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={theme.accent} />
            <Text style={[styles.infoTitle, { color: theme.text }]}>Usage Information</Text>
          </View>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            • Limits reset daily at midnight UTC{'\n'}
            • Content length limits are applied per article for optimal AI processing{'\n'}
            • Article limits are per audio creation, not cumulative{'\n'}
            • Upgrade your plan for higher limits and more features
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  planCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  limitCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  limitTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  limitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  limitBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  limitDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});