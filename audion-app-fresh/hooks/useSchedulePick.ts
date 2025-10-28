import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import schedulePickService, {
  ScheduledPlaylistResponse as AudioGenerationResponse,
} from '../services/SchedulePickService';
import { ScheduleProfile } from '../context/SettingsContext';

type SchedulerStatus = {
  running: boolean;
  available: boolean;
  jobs_count: number;
  jobs: Array<{
    id: string;
    name: string;
    next_run_time: string | null;
    trigger: string;
  }>;
  reason?: string;
};

interface UseSchedulePickReturn {
  schedules: ScheduleProfile[];
  schedulerStatus: SchedulerStatus | null;
  loading: boolean;
  refreshing: boolean;
  loadData: () => Promise<void>;
  onRefresh: () => Promise<void>;
  handleManualTrigger: (schedule: ScheduleProfile) => Promise<void>;
  handleDeleteSchedule: (schedule: ScheduleProfile) => Promise<void>;
  handleToggleScheduleStatus: (schedule: ScheduleProfile) => Promise<void>;
}

export const useSchedulePick = (): UseSchedulePickReturn => {
  const [schedules, setSchedules] = useState<ScheduleProfile[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      const schedulesData = await schedulePickService.getUserSchedules();
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

  const handleManualTrigger = useCallback(async (schedule: ScheduleProfile) => {
    Alert.alert(
      '手動実行',
      `「${schedule.name}」を即座に実行しますか？\n音声生成には時間がかかる場合があります。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '実行',
          onPress: async () => {
            try {
              setLoading(true);
              await schedulePickService.triggerSchedule(schedule.id);

              Alert.alert(
                '音声生成開始',
                `「${schedule.name}」の音声生成を開始しました。\n\n完了まで時間がかかる場合があります。\n生成された音声はライブラリから確認できます。`,
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
                '音声生成の開始に失敗しました。\n\n' + (error as Error).message
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [loadSchedules]);

  const handleDeleteSchedule = useCallback(async (schedule: ScheduleProfile) => {
    Alert.alert(
      'スケジュール削除',
      `「${schedule.name}」を削除しますか？\nこの操作は取り消せません。`,
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

  const handleToggleScheduleStatus = useCallback(async (schedule: ScheduleProfile) => {
    const newEnabled = !schedule.enabled;
    const actionText = newEnabled ? '有効化' : '無効化';

    Alert.alert(
      `スケジュール${actionText}`,
      `「${schedule.name}」を${actionText}しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: actionText,
          onPress: async () => {
            try {
              await schedulePickService.updateSchedule(schedule.id, { enabled: newEnabled });
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
