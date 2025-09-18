import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  schedulePickService,
  Schedule,
  SchedulerStatus,
  AudioGenerationResponse,
} from '../services/SchedulePickService';

interface UseSchedulePickReturn {
  schedules: Schedule[];
  schedulerStatus: SchedulerStatus | null;
  loading: boolean;
  refreshing: boolean;
  loadData: () => Promise<void>;
  onRefresh: () => Promise<void>;
  handleManualTrigger: (schedule: Schedule) => Promise<void>;
  handleDeleteSchedule: (schedule: Schedule) => Promise<void>;
  handleToggleScheduleStatus: (schedule: Schedule) => Promise<void>;
}

export const useSchedulePick = (): UseSchedulePickReturn => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      const schedulesData = await schedulePickService.getSchedules();
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  }, []);

  const loadSchedulerStatus = useCallback(async () => {
    try {
      const status = await schedulePickService.getSchedulerStatus();
      setSchedulerStatus(status);
    } catch (error) {
      console.error('Failed to load scheduler status:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSchedules(),
        loadSchedulerStatus(),
      ]);
    } catch (error) {
      console.error('Failed to load SchedulePick data:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [loadSchedules, loadSchedulerStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleManualTrigger = useCallback(async (schedule: Schedule) => {
    Alert.alert(
      '手動実行',
      `「${schedule.schedule_name}」を即座に実行しますか？\n音声生成には時間がかかる場合があります。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '実行',
          onPress: async () => {
            try {
              setLoading(true);
              const result: AudioGenerationResponse = await schedulePickService.manuallyTriggerSchedule(schedule.id);
              
              Alert.alert(
                '音声生成完了',
                `「${result.title}」の音声が生成されました！\n\n記事数: ${result.articles_count}件\n再生時間: ${Math.floor(result.duration / 60)}分${result.duration % 60}秒`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      loadSchedules();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Manual trigger failed:', error);
              Alert.alert(
                'エラー',
                '音声生成に失敗しました。\n\n' + (error as Error).message
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [loadSchedules]);

  const handleDeleteSchedule = useCallback(async (schedule: Schedule) => {
    Alert.alert(
      'スケジュール削除',
      `「${schedule.schedule_name}」を削除しますか？\nこの操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await schedulePickService.deleteSchedule(schedule.id);
              Alert.alert('完了', 'スケジュールを削除しました');
              loadSchedules();
            } catch (error) {
              console.error('Delete schedule failed:', error);
              Alert.alert('エラー', 'スケジュールの削除に失敗しました');
            }
          }
        }
      ]
    );
  }, [loadSchedules]);

  const handleToggleScheduleStatus = useCallback(async (schedule: Schedule) => {
    const newStatus = schedule.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? '有効化' : '無効化';
    
    Alert.alert(
      `スケジュール${actionText}`,
      `「${schedule.schedule_name}」を${actionText}しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: actionText,
          onPress: async () => {
            try {
              await schedulePickService.updateSchedule(schedule.id, { status: newStatus });
              Alert.alert('完了', `スケジュールを${actionText}しました`);
              loadSchedules();
            } catch (error) {
              console.error('Toggle schedule status failed:', error);
              Alert.alert('エラー', `スケジュールの${actionText}に失敗しました`);
            }
          }
        }
      ]
    );
  }, [loadSchedules]);

  return {
    schedules,
    schedulerStatus,
    loading,
    refreshing,
    loadData,
    onRefresh,
    handleManualTrigger,
    handleDeleteSchedule,
    handleToggleScheduleStatus,
  };
};