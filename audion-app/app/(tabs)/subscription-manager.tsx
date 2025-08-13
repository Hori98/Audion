/**
 * Subscription Manager Screen
 * Beta feature for dynamically updating subscription limits in real-time
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import AudioLimitService, { SubscriptionInfo, LimitCheckResult } from '@/services/AudioLimitService';
import { TouchableOpacity } from 'react-native';

interface PlanOption {
  plan: string;
  display: string;
  articles: number;
  dailyLimit: number;
  description: string;
}

export default function SubscriptionManagerScreen() {
  const { user, token } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const planOptions: PlanOption[] = [
    {
      plan: 'free',
      display: 'Free Plan',
      articles: 3,
      dailyLimit: 3,
      description: 'Basic tier - 3 articles per audio, 3 audios per day'
    },
    {
      plan: 'premium',
      display: 'Premium Plan',
      articles: 15,
      dailyLimit: 10,
      description: 'Premium tier - 15 articles per audio, 10 audios per day'
    },
    {
      plan: 'test_3',
      display: 'Test: 3 Articles',
      articles: 3,
      dailyLimit: 999,
      description: 'Test plan - 3 articles per audio, unlimited daily'
    },
    {
      plan: 'test_5',
      display: 'Test: 5 Articles',
      articles: 5,
      dailyLimit: 999,
      description: 'Test plan - 5 articles per audio, unlimited daily'
    },
    {
      plan: 'test_10',
      display: 'Test: 10 Articles',
      articles: 10,
      dailyLimit: 999,
      description: 'Test plan - 10 articles per audio, unlimited daily'
    },
    {
      plan: 'test_15',
      display: 'Test: 15 Articles',
      articles: 15,
      dailyLimit: 999,
      description: 'Test plan - 15 articles per audio, unlimited daily'
    },
    {
      plan: 'test_30',
      display: 'Test: 30 Articles',
      articles: 30,
      dailyLimit: 999,
      description: 'Test plan - 30 articles per audio, unlimited daily'
    },
    {
      plan: 'test_60',
      display: 'Test: 60 Articles',
      articles: 60,
      dailyLimit: 999,
      description: 'Test plan - 60 articles per audio, unlimited daily'
    }
  ];

  const loadSubscriptionInfo = async () => {
    if (!token) return;
    
    try {
      const info = await AudioLimitService.getSubscriptionInfo(token);
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Failed to load subscription info:', error);
      Alert.alert('Error', 'Failed to load subscription information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updatePlan = async (planId: string) => {
    if (!token) return;
    
    setUpdating(true);
    try {
      await AudioLimitService.updatePlan(token, planId);
      
      // Reload subscription info to reflect changes
      await loadSubscriptionInfo();
      
      Alert.alert('Success', `Plan updated to ${planOptions.find(p => p.plan === planId)?.display} successfully!`);
    } catch (error) {
      console.error('Failed to update plan:', error);
      Alert.alert('Error', 'Failed to update subscription plan');
    } finally {
      setUpdating(false);
    }
  };

  const testLimits = async (articleCount: number) => {
    if (!token) return;
    
    try {
      const result: LimitCheckResult = await AudioLimitService.checkAudioLimits(token, articleCount);
      
      const status = result.can_create ? '✅ Allowed' : '❌ Blocked';
      const message = result.can_create 
        ? `You can create audio with ${articleCount} articles!`
        : `Cannot create audio: ${result.error_message}`;
      
      Alert.alert(
        `Limit Test: ${articleCount} Articles`,
        `${status}\n\n${message}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to test limits:', error);
      Alert.alert('Error', 'Failed to test limits');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptionInfo();
  };

  useEffect(() => {
    loadSubscriptionInfo();
  }, [token]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading subscription info...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>🧪 Subscription Manager</ThemedText>
          <ThemedText style={styles.subtitle}>Beta Feature - Dynamic Limit Testing</ThemedText>
        </ThemedView>

        {/* Current Subscription Info */}
        {subscriptionInfo && (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Current Subscription</ThemedText>
            <ThemedView style={styles.infoCard}>
              <ThemedText style={styles.planName}>
                {AudioLimitService.getPlanDisplayName(subscriptionInfo.subscription.plan)}
              </ThemedText>
              <ThemedText style={styles.planDetails}>
                📄 {subscriptionInfo.plan_config.max_audio_articles} articles per audio
              </ThemedText>
              <ThemedText style={styles.planDetails}>
                🎧 {subscriptionInfo.plan_config.max_daily_audio_count} audios per day
              </ThemedText>
              <ThemedText style={styles.planDetails}>
                📊 Used today: {subscriptionInfo.daily_usage.audio_count} / {subscriptionInfo.plan_config.max_daily_audio_count}
              </ThemedText>
              <ThemedText style={styles.planDetails}>
                ⏳ Remaining: {subscriptionInfo.remaining_daily_audio} audios
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        {/* Plan Selection */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Switch Plan</ThemedText>
          {planOptions.map((plan) => (
            <TouchableOpacity
              key={plan.plan}
              style={[
                styles.planOption,
                subscriptionInfo?.subscription.plan === plan.plan && styles.currentPlan
              ]}
              onPress={() => updatePlan(plan.plan)}
              disabled={updating || subscriptionInfo?.subscription.plan === plan.plan}
            >
              <ThemedView style={styles.planHeader}>
                <ThemedText style={styles.planDisplayName}>{plan.display}</ThemedText>
                {subscriptionInfo?.subscription.plan === plan.plan && (
                  <ThemedText style={styles.currentBadge}>Current</ThemedText>
                )}
              </ThemedView>
              <ThemedText style={styles.planDescription}>{plan.description}</ThemedText>
              <ThemedView style={styles.planLimits}>
                <ThemedText style={styles.limitText}>📄 {plan.articles} articles</ThemedText>
                <ThemedText style={styles.limitText}>
                  🎧 {plan.dailyLimit === 999 ? 'Unlimited' : plan.dailyLimit} daily
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Limit Testing */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Test Limits</ThemedText>
          <ThemedText style={styles.testDescription}>
            Test if you can create audio with different article counts
          </ThemedText>
          <ThemedView style={styles.testButtonsContainer}>
            {[3, 5, 10, 15, 20, 30].map((count) => (
              <TouchableOpacity
                key={count}
                style={styles.testButton}
                onPress={() => testLimits(count)}
              >
                <ThemedText style={styles.testButtonText}>{count} Articles</ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>

        {updating && (
          <ThemedView style={styles.updateOverlay}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <ThemedText style={styles.updatingText}>Updating plan...</ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  infoCard: {
    backgroundColor: Colors.light.cardBackground,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  planDetails: {
    fontSize: 14,
    color: Colors.light.text,
  },
  planOption: {
    backgroundColor: Colors.light.cardBackground,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  currentPlan: {
    borderColor: Colors.light.tint,
    backgroundColor: `${Colors.light.tint}10`,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  currentBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.light.tint,
    backgroundColor: `${Colors.light.tint}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planDescription: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  planLimits: {
    flexDirection: 'row',
    gap: 16,
  },
  limitText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  testDescription: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  testButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  testButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  updateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  updatingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});