/**
 * Schedule Management Screen
 * スケジュール管理画面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Schedule types (バックエンドモデルに対応)
interface SchedulePreferences {
  max_articles: number;
  preferred_genres: string[];
  active_source_ids: string[];
}

interface Schedule {
  id: string;
  name: string;
  is_active: boolean;
  schedule_type: 'cron' | 'interval';
  cron_expression?: string;
  interval_minutes?: number;
  next_run_time?: string;
  preferences: SchedulePreferences;
  created_at: string;
  updated_at: string;
}

interface ScheduleCreateRequest {
  name: string;
  is_active: boolean;
  schedule_type: 'cron' | 'interval';
  cron_expression?: string;
  interval_minutes?: number;
  preferences: SchedulePreferences;
}

// 曜日の定数
const DAYS_OF_WEEK = [
  { label: '日', value: 0 },
  { label: '月', value: 1 },
  { label: '火', value: 2 },
  { label: '水', value: 3 },
  { label: '木', value: 4 },
  { label: '金', value: 5 },
  { label: '土', value: 6 },
];

// 時間のオプション
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${i.toString().padStart(2, '0')}:00`,
  value: i
}));

export default function ScheduleScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // 新規作成/編集用の状態
  const [formData, setFormData] = useState<ScheduleCreateRequest>({
    name: '',
    is_active: true,
    schedule_type: 'cron',
    cron_expression: '0 8 * * *', // デフォルト: 毎日8時
    preferences: {
      max_articles: 5,
      preferred_genres: [],
      active_source_ids: [],
    }
  });

  // スケジュール一覧の取得
  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      // TODO: 実際のAPI呼び出しを実装
      // const response = await fetch('/api/schedules');
      // const data = await response.json();

      // モックデータ（開発用）
      const mockSchedules: Schedule[] = [
        {
          id: '1',
          name: '毎朝8時のニュース',
          is_active: true,
          schedule_type: 'cron',
          cron_expression: '0 8 * * *',
          next_run_time: '2024-01-24T08:00:00Z',
          preferences: {
            max_articles: 5,
            preferred_genres: ['テクノロジー', '経済・ビジネス'],
            active_source_ids: [],
          },
          created_at: '2024-01-20T10:00:00Z',
          updated_at: '2024-01-20T10:00:00Z',
        }
      ];

      setSchedules(mockSchedules);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      Alert.alert('エラー', 'スケジュールの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    setFormData({
      name: '',
      is_active: true,
      schedule_type: 'cron',
      cron_expression: '0 8 * * *',
      preferences: {
        max_articles: 5,
        preferred_genres: [],
        active_source_ids: [],
      }
    });
    setShowCreateModal(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      is_active: schedule.is_active,
      schedule_type: schedule.schedule_type,
      cron_expression: schedule.cron_expression,
      interval_minutes: schedule.interval_minutes,
      preferences: schedule.preferences,
    });
    setShowCreateModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!formData.name.trim()) {
      Alert.alert('エラー', 'スケジュール名を入力してください。');
      return;
    }

    try {
      // TODO: 実際のAPI呼び出しを実装
      if (editingSchedule) {
        // 更新
        // await fetch(`/api/schedules/${editingSchedule.id}`, {
        //   method: 'PUT',
        //   body: JSON.stringify(formData)
        // });
        console.log('Update schedule:', editingSchedule.id, formData);
      } else {
        // 新規作成
        // await fetch('/api/schedules', {
        //   method: 'POST',
        //   body: JSON.stringify(formData)
        // });
        console.log('Create schedule:', formData);
      }

      setShowCreateModal(false);
      fetchSchedules();
      Alert.alert('成功',
        editingSchedule ? 'スケジュールを更新しました。' : 'スケジュールを作成しました。'
      );
    } catch (error) {
      console.error('Failed to save schedule:', error);
      Alert.alert('エラー', 'スケジュールの保存に失敗しました。');
    }
  };

  const handleDeleteSchedule = (scheduleId: string, scheduleName: string) => {
    Alert.alert(
      '削除確認',
      `「${scheduleName}」を削除してもよろしいですか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: 実際のAPI呼び出しを実装
              // await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
              console.log('Delete schedule:', scheduleId);
              fetchSchedules();
              Alert.alert('成功', 'スケジュールを削除しました。');
            } catch (error) {
              console.error('Failed to delete schedule:', error);
              Alert.alert('エラー', 'スケジュールの削除に失敗しました。');
            }
          }
        }
      ]
    );
  };

  const handleToggleSchedule = async (schedule: Schedule) => {
    try {
      const updatedSchedule = { ...schedule, is_active: !schedule.is_active };
      // TODO: 実際のAPI呼び出しを実装
      // await fetch(`/api/schedules/${schedule.id}`, {
      //   method: 'PUT',
      //   body: JSON.stringify(updatedSchedule)
      // });
      console.log('Toggle schedule:', schedule.id, updatedSchedule.is_active);
      fetchSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      Alert.alert('エラー', 'スケジュールの切り替えに失敗しました。');
    }
  };

  const formatNextRunTime = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getCronDisplayText = (cronExpression: string) => {
    // 簡単なcron表示（実際にはより複雑な解析が必要）
    if (cronExpression === '0 8 * * *') return '毎日 8:00';
    if (cronExpression === '0 20 * * *') return '毎日 20:00';
    return cronExpression;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'スケジュール管理',
          headerBackTitle: '戻る'
        }}
      />

      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>自動生成スケジュール</Text>
          <Text style={styles.subtitle}>
            指定した時間に自動的にコンテンツを生成します
          </Text>
        </View>

        {/* 新規作成ボタン */}
        <TouchableOpacity style={styles.createButton} onPress={handleCreateSchedule}>
          <FontAwesome name="plus" size={20} color="#007AFF" />
          <Text style={styles.createButtonText}>新しいスケジュール</Text>
        </TouchableOpacity>

        {/* スケジュール一覧 */}
        <View style={styles.scheduleList}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>読み込み中...</Text>
            </View>
          ) : schedules.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="calendar-o" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateTitle}>スケジュールがありません</Text>
              <Text style={styles.emptyStateText}>
                「新しいスケジュール」ボタンから追加してください
              </Text>
            </View>
          ) : (
            schedules.map((schedule) => (
              <View key={schedule.id} style={styles.scheduleItem}>
                <View style={styles.scheduleHeader}>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleName}>{schedule.name}</Text>
                    <Text style={styles.scheduleDetails}>
                      {getCronDisplayText(schedule.cron_expression || '')}
                      {schedule.next_run_time &&
                        ` • 次回: ${formatNextRunTime(schedule.next_run_time)}`
                      }
                    </Text>
                    <Text style={styles.schedulePrefs}>
                      最大{schedule.preferences.max_articles}記事
                    </Text>
                  </View>
                  <Switch
                    value={schedule.is_active}
                    onValueChange={() => handleToggleSchedule(schedule)}
                    trackColor={{ false: '#767577', true: '#007AFF' }}
                    thumbColor={schedule.is_active ? '#ffffff' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditSchedule(schedule)}
                  >
                    <FontAwesome name="edit" size={16} color="#007AFF" />
                    <Text style={styles.actionButtonText}>編集</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteSchedule(schedule.id, schedule.name)}
                  >
                    <FontAwesome name="trash" size={16} color="#FF3B30" />
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                      削除
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 作成/編集モーダル */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingSchedule ? 'スケジュール編集' : 'スケジュール作成'}
            </Text>
            <TouchableOpacity
              onPress={handleSaveSchedule}
              style={styles.modalSaveButton}
            >
              <Text style={styles.modalSaveText}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* 名前入力 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>スケジュール名</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="例: 朝のニュース"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            {/* 記事数設定 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>最大記事数</Text>
              <TextInput
                style={styles.formInput}
                value={formData.preferences.max_articles.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 1;
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      max_articles: Math.min(Math.max(num, 1), 20)
                    }
                  });
                }}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            {/* 時刻設定（簡易版） */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>実行時刻</Text>
              <View style={styles.timePickerContainer}>
                <Text style={styles.timePickerNote}>
                  現在は毎日8時に設定されています。
                  詳細な時刻設定は今後のアップデートで対応予定です。
                </Text>
              </View>
            </View>

            {/* アクティブ設定 */}
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.formLabel}>スケジュールを有効にする</Text>
                  <Text style={styles.formNote}>
                    無効にすると自動実行されません
                  </Text>
                </View>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                  trackColor={{ false: '#767577', true: '#007AFF' }}
                  thumbColor={formData.is_active ? '#ffffff' : '#f4f3f4'}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6D6D80',
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 12,
  },
  scheduleList: {
    gap: 16,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 22,
  },
  scheduleItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  scheduleDetails: {
    fontSize: 14,
    color: '#6D6D80',
    marginBottom: 2,
  },
  schedulePrefs: {
    fontSize: 12,
    color: '#8E8E93',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  modalCancelButton: {
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalSaveButton: {
    paddingVertical: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  formNote: {
    fontSize: 14,
    color: '#6D6D80',
    marginTop: 4,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  timePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 16,
  },
  timePickerNote: {
    fontSize: 14,
    color: '#6D6D80',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});