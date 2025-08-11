import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface PlanUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  errorMessage?: string;
  usageInfo?: {
    plan: string;
    max_daily_audio_count: number;
    daily_audio_count: number;
    remaining_daily_audio: number;
    max_audio_articles: number;
  };
}

export default function PlanUpgradeModal({
  visible,
  onClose,
  errorMessage,
  usageInfo,
}: PlanUpgradeModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const styles = createStyles(theme);

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription-plans');
  };

  const getUpgradeRecommendation = () => {
    if (!usageInfo) return { plan: 'Premium', benefits: ['More audio creation', 'Premium features'] };

    if (usageInfo.plan === 'free') {
      return {
        plan: 'Premium',
        benefits: [
          `1日${usageInfo.max_daily_audio_count}回 → 15回の音声作成`,
          `${usageInfo.max_audio_articles}記事 → 10記事まで同時処理`,
          'プレミアム音声品質',
          'AI談義機能',
        ],
      };
    } else if (usageInfo.plan === 'premium') {
      return {
        plan: 'Pro',
        benefits: [
          '1日50回まで音声作成',
          '30記事まで同時処理',
          'コミュニティ機能',
          '優先サポート',
        ],
      };
    }
    
    return { plan: 'Pro', benefits: ['Unlimited features', 'Priority support'] };
  };

  const recommendation = getUpgradeRecommendation();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.card }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="diamond-outline" size={48} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            制限に達しました
          </Text>

          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {errorMessage || '音声作成の制限に達しました。'}
          </Text>

          {usageInfo && (
            <View style={styles.usageInfo}>
              <View style={styles.usageRow}>
                <Text style={[styles.usageLabel, { color: theme.textSecondary }]}>
                  現在のプラン:
                </Text>
                <Text style={[styles.usageValue, { color: theme.text }]}>
                  {usageInfo.plan.toUpperCase()}
                </Text>
              </View>
              <View style={styles.usageRow}>
                <Text style={[styles.usageLabel, { color: theme.textSecondary }]}>
                  本日の利用状況:
                </Text>
                <Text style={[styles.usageValue, { color: theme.text }]}>
                  {usageInfo.daily_audio_count}/{usageInfo.max_daily_audio_count}回
                </Text>
              </View>
            </View>
          )}

          <View style={styles.recommendationContainer}>
            <Text style={[styles.recommendationTitle, { color: theme.text }]}>
              🎉 {recommendation.plan}にアップグレード
            </Text>
            <View style={styles.benefitsList}>
              {recommendation.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                  <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>プランを見る</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={[styles.laterButtonText, { color: theme.textSecondary }]}>
                後で
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  usageInfo: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 14,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationContainer: {
    backgroundColor: theme.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  benefitsList: {
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
  },
  upgradeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});