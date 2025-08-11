import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import SubscriptionService, { SubscriptionTier } from '../services/SubscriptionService';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  tier: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  recommended?: boolean;
  current?: boolean;
}

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);

  const styles = createStyles(theme);

  useEffect(() => {
    setCurrentTier(SubscriptionService.getCurrentTier());
  }, []);

  const plans: Plan[] = [
    {
      tier: SubscriptionTier.FREE,
      name: 'Free',
      price: '¥0',
      period: '/月',
      description: 'お試し用の基本プラン',
      current: currentTier === SubscriptionTier.FREE,
      features: [
        { name: '1日3記事まで音声化', included: true },
        { name: '1音声あたり3記事まで', included: true },
        { name: '基本的な音声品質', included: true },
        { name: 'コミュニティ機能', included: false },
        { name: 'AI談義機能', included: false },
        { name: 'オフライン再生', included: false },
        { name: 'プレミアム音声品質', included: false },
        { name: '優先サポート', included: false },
      ],
    },
    {
      tier: SubscriptionTier.PREMIUM,
      name: 'Premium',
      price: '¥980',
      period: '/月',
      description: '本格的な利用に最適',
      recommended: true,
      current: currentTier === SubscriptionTier.PREMIUM,
      features: [
        { name: '1日15記事まで音声化', included: true },
        { name: '1音声あたり10記事まで', included: true },
        { name: 'プレミアム音声品質', included: true },
        { name: 'オフライン再生', included: true },
        { name: 'AI談義機能', included: true },
        { name: 'コミュニティ機能', included: false },
        { name: '優先サポート', included: false },
        { name: '高度な分析機能', included: false },
      ],
    },
    {
      tier: SubscriptionTier.PRO,
      name: 'Pro',
      price: '¥1,980',
      period: '/月',
      description: 'ビジネス・パワーユーザー向け',
      current: currentTier === SubscriptionTier.PRO,
      features: [
        { name: '1日50記事まで音声化', included: true },
        { name: '1音声あたり30記事まで', included: true },
        { name: 'プレミアム音声品質', included: true },
        { name: 'オフライン再生', included: true },
        { name: 'AI談義機能', included: true },
        { name: 'コミュニティ機能', included: true },
        { name: '優先サポート', included: true },
        { name: '高度な分析機能', included: true },
      ],
    },
  ];

  const handleUpgrade = async (plan: Plan) => {
    if (plan.current) {
      Alert.alert('現在のプラン', 'このプランは既にご利用中です。');
      return;
    }

    setLoading(true);
    try {
      // プラン変更のモック処理
      Alert.alert(
        'プラン変更',
        `${plan.name}プランへのアップグレードを開始しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'アップグレード',
            onPress: () => {
              // 実際の決済処理はここで実装
              Alert.alert('成功', `${plan.name}プランにアップグレードしました！`, [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('エラー', 'プランの変更に失敗しました。しばらく後にもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const renderPlan = (plan: Plan) => (
    <View
      key={plan.tier}
      style={[
        styles.planCard,
        plan.recommended && styles.recommendedCard,
        plan.current && styles.currentCard,
      ]}
    >
      {plan.recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>おすすめ</Text>
        </View>
      )}
      
      {plan.current && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentText}>現在のプラン</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <Text style={[styles.planName, { color: theme.text }]}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: theme.text }]}>{plan.price}</Text>
          <Text style={[styles.period, { color: theme.textSecondary }]}>{plan.period}</Text>
        </View>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {plan.description}
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons
              name={feature.included ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={feature.included ? theme.primary : theme.textMuted}
            />
            <Text
              style={[
                styles.featureText,
                {
                  color: feature.included ? theme.text : theme.textMuted,
                  opacity: feature.included ? 1 : 0.6,
                },
              ]}
            >
              {feature.name}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.upgradeButton,
          {
            backgroundColor: plan.current
              ? theme.accent
              : plan.recommended
              ? theme.primary
              : theme.card,
          },
          plan.current && { opacity: 0.7 },
        ]}
        onPress={() => handleUpgrade(plan)}
        disabled={loading || plan.current}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text
            style={[
              styles.upgradeButtonText,
              {
                color: plan.current ? theme.text : '#ffffff',
              },
            ]}
          >
            {plan.current
              ? '利用中'
              : plan.tier === SubscriptionTier.FREE
              ? '現在のプラン'
              : 'アップグレード'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          プラン選択
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerInfo}>
          <Text style={[styles.titleText, { color: theme.text }]}>
            あなたに最適なプランを選択
          </Text>
          <Text style={[styles.subtitleText, { color: theme.textSecondary }]}>
            いつでもキャンセル可能。プラン変更はいつでも行えます。
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {plans.map(renderPlan)}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            • 料金は税込み価格です{'\n'}
            • お支払いは月額制です{'\n'}
            • いつでもキャンセル可能です{'\n'}
            • プランは即座に変更されます
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  plansContainer: {
    gap: 16,
    marginTop: 8,
  },
  planCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.border,
    position: 'relative',
  },
  recommendedCard: {
    borderColor: theme.primary,
    elevation: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  currentCard: {
    borderColor: theme.accent,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: theme.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    marginTop: 8,
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
  },
  period: {
    fontSize: 16,
    marginLeft: 4,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  upgradeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});