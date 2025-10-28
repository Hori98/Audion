import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import SubscriptionService, { SubscriptionInfo } from '../../services/SubscriptionService';

interface PlanManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function PlanManagementScreen({ visible, onClose }: PlanManagementScreenProps) {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        setLoading(true);
        const res = await SubscriptionService.getLimits();
        setInfo(res);
      } catch (e) {
        setInfo({ current_plan: 'free', max_audio_articles: 3, max_daily_audio_count: 3, remaining_daily_audio: 3 });
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const onUpgrade = async (target: 'basic' | 'premium') => {
    try {
      await SubscriptionService.updatePlan(target);
      const res = await SubscriptionService.getLimits();
      setInfo(res);
      Alert.alert('完了', `プランを ${target} に更新しました。`);
    } catch (e) {
      Alert.alert('エラー', 'プラン更新に失敗しました');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>プラン管理</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>現在のプラン</Text>
            <Text style={styles.value}>{info?.current_plan || 'free'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>1回あたり記事上限</Text>
            <Text style={styles.value}>{info?.max_audio_articles ?? '—'} 件</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>1日あたり作成上限</Text>
            <Text style={styles.value}>{info?.max_daily_audio_count ?? '—'} 件</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>本日の残り作成枠</Text>
            <Text style={styles.value}>{info?.remaining_daily_audio ?? '—'} 件</Text>
          </View>

          {/* 開発用プラン切替（常時表示に一時変更） */}
          <Text style={styles.label}>開発用プラン切替</Text>
          <View style={styles.planRow}>
            <TouchableOpacity style={styles.planButton} onPress={() => onUpgrade('basic')} disabled={loading}>
              <Text style={styles.planText}>basic に変更</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.planButton} onPress={() => onUpgrade('premium')} disabled={loading}>
              <Text style={styles.planText}>premium に変更</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { marginTop: 8 }]}>freeに戻す</Text>
          <TouchableOpacity style={styles.planButton} onPress={() => onUpgrade('free')} disabled={loading}>
            <Text style={styles.planText}>free に変更</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 22 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  card: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  label: { color: '#888', fontSize: 12, marginBottom: 6 },
  value: { color: '#fff', fontSize: 16, fontWeight: '600' },
  upgradeButton: { backgroundColor: '#007bff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  upgradeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  planRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  planButton: { backgroundColor: '#222', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', marginRight: 8 },
  planText: { color: '#fff' },
});
