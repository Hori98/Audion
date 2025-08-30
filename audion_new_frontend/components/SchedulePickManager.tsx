/**
 * SchedulePick Manager Component
 * スケジュール音声生成の統合管理画面
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  schedulePickService,
  Schedule,
  SchedulerStatus,
} from '../services/SchedulePickService';
import { useSchedulePick } from '../hooks/useSchedulePick';

interface SchedulePickManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function SchedulePickManager({ visible, onClose }: SchedulePickManagerProps) {
  const {
    schedules,
    schedulerStatus,
    loading,
    refreshing,
    loadData,
    onRefresh,
    handleManualTrigger,
    handleDeleteSchedule,
    handleToggleScheduleStatus,
  } = useSchedulePick();

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleSchedulePress = (item: Schedule) => {
    Alert.alert(
      item.schedule_name,
      `時刻: ${item.generation_time}\n曜日: ${item.generation_days.map(day => schedulePickService.getDayDisplayName(day)).join(', ')}\n記事数: 最大${item.preferences.max_articles}件\n状態: ${schedulePickService.getStatusDisplayName(item.status)}`,
      [
        {
          text: '手動実行',
          onPress: () => handleManualTrigger(item)
        },
        {
          text: item.status === 'active' ? '無効化' : '有効化',
          onPress: () => handleToggleScheduleStatus(item)
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => handleDeleteSchedule(item)
        },
        {
          text: 'キャンセル',
          style: 'cancel'
        }
      ]
    );
  };

  const renderScheduleItem = ({ item }: { item: Schedule }) => (
    <TouchableOpacity 
      style={styles.scheduleCard}
      onPress={() => handleSchedulePress(item)}
      disabled={loading}
    >
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleName}>{item.schedule_name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'active' ? '#4CAF50' : '#757575' }
        ]}>
          <Text style={styles.statusText}>
            {schedulePickService.getStatusDisplayName(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.scheduleDetails}>
        <Text style={styles.scheduleTime}>
          {item.generation_time} ({item.timezone})
        </Text>
        <Text style={styles.scheduleDays}>
          {item.generation_days.map(day => schedulePickService.getDayDisplayName(day)).join(' ')}
        </Text>
        <Text style={styles.scheduleArticles}>
          最大{item.preferences.max_articles}記事
        </Text>
        {item.last_generated_at && (
          <Text style={styles.lastGenerated}>
            最終生成: {new Date(item.last_generated_at).toLocaleDateString('ja-JP')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSchedulerStatus = () => {
    if (!schedulerStatus) return null;

    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>📅 スケジューラー状況</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>状態:</Text>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: schedulerStatus.running ? '#4CAF50' : '#F44336' }
          ]}>
            <Text style={styles.statusIndicatorText}>
              {schedulerStatus.running ? '動作中' : '停止中'}
            </Text>
          </View>
        </View>
        
        {schedulerStatus.jobs_count !== undefined && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>実行中ジョブ:</Text>
            <Text style={styles.statusValue}>{schedulerStatus.jobs_count}件</Text>
          </View>
        )}

        {!schedulerStatus.available && schedulerStatus.reason && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>理由:</Text>
            <Text style={styles.statusError}>{schedulerStatus.reason}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📅 SchedulePick 管理</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Scheduler Status */}
        {renderSchedulerStatus()}

        {/* Schedules List */}
        <FlatList
          data={schedules}
          renderItem={renderScheduleItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007bff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                📅 スケジュールが設定されていません
              </Text>
              <Text style={styles.emptyStateSubtext}>
                新しいスケジュールを作成して自動音声生成を開始しましょう
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />

        {/* Add Schedule Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => {
          // TODO: Navigate to schedule creation screen
          Alert.alert('開発中', 'スケジュール作成画面は開発中です');
        }}>
          <Text style={styles.addButtonText}>➕ 新規スケジュール</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Scheduler Status
  statusCard: {
    backgroundColor: '#111111',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusLabel: {
    color: '#cccccc',
    fontSize: 14,
    marginRight: 10,
    minWidth: 80,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusValue: {
    color: '#ffffff',
    fontSize: 14,
  },
  statusError: {
    color: '#F44336',
    fontSize: 14,
    flex: 1,
  },

  // Schedule List
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  scheduleCard: {
    backgroundColor: '#111111',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scheduleDetails: {
    marginBottom: 15,
  },
  scheduleTime: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 3,
  },
  scheduleDays: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 3,
  },
  scheduleArticles: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 3,
  },
  lastGenerated: {
    color: '#888888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  scheduleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  triggerButton: {
    backgroundColor: '#007bff',
  },
  toggleButton: {
    backgroundColor: '#6c757d',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Add Button
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});