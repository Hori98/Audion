/**
 * SchedulePick Manager Component
 * スケジュール音声生成の統合管理画面
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import schedulePickService from '../services/SchedulePickService';
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

type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
import { useSchedulePick } from '../hooks/useSchedulePick';
import { useRSSFeedContext } from '../context/RSSFeedContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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
  
  // RSSソース取得用Context
  const { userSources } = useRSSFeedContext();
  
  // 新規スケジュール作成用State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [generationTime, setGenerationTime] = useState('07:00');
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(new Set());
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [maxArticles, setMaxArticles] = useState(5);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleSchedulePress = (item: ScheduleProfile) => {
    Alert.alert(
      item.name,
      `時刻: ${item.time}\n曜日: ${item.days.map(day => schedulePickService.getDayDisplayName(day)).join(', ')}\n記事数: 最大${item.maxArticles}件\n状態: ${item.enabled ? '有効' : '無効'}`,
      [
        {
          text: '手動実行',
          onPress: () => handleManualTrigger(item)
        },
        {
          text: item.enabled ? '無効化' : '有効化',
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

  const renderScheduleItem = ({ item }: { item: ScheduleProfile }) => (
    <TouchableOpacity
      style={styles.scheduleCard}
      onPress={() => handleSchedulePress(item)}
      disabled={loading}
    >
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleName}>{item.name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.enabled ? '#4CAF50' : '#757575' }
        ]}>
          <Text style={styles.statusText}>
            {item.enabled ? '有効' : '無効'}
          </Text>
        </View>
      </View>

      <View style={styles.scheduleDetails}>
        <Text style={styles.scheduleTime}>
          {item.time}
        </Text>
        <Text style={styles.scheduleDays}>
          {item.days.map(day => schedulePickService.getDayDisplayName(day)).join(' ')}
        </Text>
        <Text style={styles.scheduleArticles}>
          最大{item.maxArticles}記事
        </Text>
        {item.sources && item.sources.length > 0 && (
          <Text style={styles.scheduleSources}>
            ソース: {item.sources.join(', ')}
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

  const weekDays: { key: DayOfWeek; label: string }[] = [
    { key: 'monday', label: '月' },
    { key: 'tuesday', label: '火' },
    { key: 'wednesday', label: '水' },
    { key: 'thursday', label: '木' },
    { key: 'friday', label: '金' },
    { key: 'saturday', label: '土' },
    { key: 'sunday', label: '日' },
  ];

  const handleCreateSchedule = async () => {
    if (!scheduleName.trim()) {
      Alert.alert('エラー', 'スケジュール名を入力してください');
      return;
    }
    if (selectedDays.size === 0) {
      Alert.alert('エラー', '実行曜日を選択してください');
      return;
    }

    const profile: Omit<ScheduleProfile, 'id'> = {
      name: scheduleName.trim(),
      time: generationTime,
      days: Array.from(selectedDays),
      enabled: true,
      maxArticles: maxArticles,
      sources: Array.from(selectedSources),
    };

    try {
      await schedulePickService.createSchedule(profile);
      Alert.alert('成功', 'スケジュールを作成しました');
      setShowCreateModal(false);
      // Reset form
      setScheduleName('');
      setGenerationTime('07:00');
      setSelectedDays(new Set());
      setSelectedSources(new Set());
      setMaxArticles(5);
      // Reload data
      loadData();
    } catch (error) {
      console.error('Schedule creation failed:', error);
      Alert.alert('エラー', 'スケジュール作成に失敗しました');
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    const newSelectedDays = new Set(selectedDays);
    if (newSelectedDays.has(day)) {
      newSelectedDays.delete(day);
    } else {
      newSelectedDays.add(day);
    }
    setSelectedDays(newSelectedDays);
  };

  const toggleSource = (sourceId: string) => {
    const newSelectedSources = new Set(selectedSources);
    if (newSelectedSources.has(sourceId)) {
      newSelectedSources.delete(sourceId);
    } else {
      newSelectedSources.add(sourceId);
    }
    setSelectedSources(newSelectedSources);
  };

  return (
    <>
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
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.addButtonText}>➕ 新規スケジュール</Text>
        </TouchableOpacity>
      </View>
    </Modal>

      {/* Create Schedule Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>新規スケジュール作成</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCreateModal(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            {/* Schedule Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>スケジュール名</Text>
              <TextInput
                style={styles.textInput}
                value={scheduleName}
                onChangeText={setScheduleName}
                placeholder="例: 朝のニュース"
                placeholderTextColor="#666"
              />
            </View>

            {/* Generation Time */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>実行時刻 (HH:MM)</Text>
              <TextInput
                style={styles.textInput}
                value={generationTime}
                onChangeText={setGenerationTime}
                placeholder="07:00"
                placeholderTextColor="#666"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            
            {/* Generation Days */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>実行曜日</Text>
              <View style={styles.weekDaySelector}>
                {weekDays.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.dayButton,
                      selectedDays.has(key) && styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleDay(key)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDays.has(key) && styles.dayButtonTextSelected
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max Articles */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>最大記事数: {maxArticles}</Text>
                <TextInput
                    style={styles.textInput}
                    value={String(maxArticles)}
                    onChangeText={(text) => setMaxArticles(Number(text) || 0)}
                    keyboardType="number-pad"
                />
            </View>

            {/* RSS Sources */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>RSSソース (任意)</Text>
              <View style={styles.sourceSelector}>
                {userSources.map((source) => (
                  <TouchableOpacity
                    key={source.id}
                    style={styles.sourceItem}
                    onPress={() => toggleSource(source.id)}
                  >
                    <FontAwesome 
                      name={selectedSources.has(source.id) ? 'check-square-o' : 'square-o'}
                      size={20} 
                      color={selectedSources.has(source.id) ? '#28a745' : '#ccc'}
                    />
                    <Text style={styles.sourceName}>
                      {source.custom_alias || source.custom_name || 'RSS Source'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <TouchableOpacity style={styles.createButton} onPress={handleCreateSchedule}>
            <Text style={styles.createButtonText}>作成</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
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
  scheduleSources: {
    color: '#999999',
    fontSize: 12,
    marginTop: 3,
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
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Create Schedule Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalScrollView: {
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  weekDaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  dayButtonSelected: {
    backgroundColor: '#007bff',
  },
  dayButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  sourceSelector: {
    // Styles for the container of source items
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sourceName: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  createButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    margin: 20,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});