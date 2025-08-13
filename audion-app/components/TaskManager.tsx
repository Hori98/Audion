import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category: 'feature' | 'bug' | 'improvement' | 'research';
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_TASKS: Task[] = [
  {
    id: 'ai-discussion',
    title: 'AI談義機能（深掘り体験）',
    description: '音声コンテンツに対する深掘り質問機能。ユーザーが興味のあるトピックについてAIと対話形式で詳しく学べる機能',
    status: 'pending',
    priority: 'high',
    category: 'feature',
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  },
  {
    id: 'community-foundation',
    title: 'コミュニティ機能基盤実装',
    description: 'ユーザー間のコミュニケーション機能の基盤。プロフィール、フォロー機能、コメント機能など',
    status: 'pending',
    priority: 'high',
    category: 'feature',
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  },
  {
    id: 'follower-system',
    title: 'フォロワーシステム',
    description: 'ユーザー間のフォロー・フォロワー機能。お気に入りのクリエイターや専門家をフォローできる仕組み',
    status: 'pending',
    priority: 'medium',
    category: 'feature',
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  },
  {
    id: 'user-audio-sharing',
    title: '他ユーザー作成音声の視聴機能',
    description: 'コミュニティで共有された音声コンテンツの発見・視聴機能。おすすめアルゴリズムも含む',
    status: 'pending',
    priority: 'medium',
    category: 'feature',
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  },
  {
    id: 'celebrity-accounts',
    title: '有名人アカウント機能',
    description: '認証済み有名人アカウントの実装。特別なバッジ、プレミアムコンテンツ配信機能',
    status: 'pending',
    priority: 'low',
    category: 'feature',
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  },
  {
    id: 'ugc-marketplace',
    title: 'UGCニュース販売機能',
    description: 'ユーザー生成コンテンツの収益化機能。有料音声コンテンツの販売プラットフォーム',
    status: 'pending',
    priority: 'low',
    category: 'feature',
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  },
  {
    id: 'content-guidelines',
    title: 'ニュース取扱指針の策定',
    description: 'プラットフォームでのニュースコンテンツ取扱いに関するガイドライン策定。法的・倫理的観点も考慮',
    status: 'pending',
    priority: 'high',
    category: 'research',
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  },
];

interface TaskManagerProps {
  visible: boolean;
  onClose: () => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ visible, onClose }) => {
  const colorScheme = useColorScheme();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTaskVisible, setNewTaskVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const colors = Colors[colorScheme ?? 'light'];

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
          : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    Alert.alert(
      'タスクの削除',
      'このタスクを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId)),
        },
      ]
    );
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || task.category === filterCategory;
    return statusMatch && categoryMatch;
  });

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'in_progress':
        return 'hourglass-outline';
      case 'completed':
        return 'checkmark-circle';
      default:
        return 'help-outline';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'in_progress':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      default:
        return colors.text;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return colors.text;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            タスク管理
          </Text>
          <TouchableOpacity
            onPress={() => setNewTaskVisible(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={[styles.filtersContainer, { backgroundColor: colors.background }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Status Filters */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterStatus === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[
                styles.filterChipText,
                filterStatus === 'all' && styles.filterChipTextActive,
              ]}>
                全て
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterStatus === 'pending' && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus('pending')}
            >
              <Text style={[
                styles.filterChipText,
                filterStatus === 'pending' && styles.filterChipTextActive,
              ]}>
                未着手
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filterStatus === 'in_progress' && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus('in_progress')}
            >
              <Text style={[
                styles.filterChipText,
                filterStatus === 'in_progress' && styles.filterChipTextActive,
              ]}>
                進行中
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filterStatus === 'completed' && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus('completed')}
            >
              <Text style={[
                styles.filterChipText,
                filterStatus === 'completed' && styles.filterChipTextActive,
              ]}>
                完了
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Task List */}
        <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
          {filteredTasks.map((task) => (
            <View key={task.id} style={[styles.taskItem, { backgroundColor: colors.card }]}>
              {/* Task Header */}
              <View style={styles.taskHeader}>
                <View style={styles.taskHeaderLeft}>
                  <Ionicons
                    name={getStatusIcon(task.status)}
                    size={20}
                    color={getStatusColor(task.status)}
                  />
                  <View style={styles.taskTitleContainer}>
                    <Text style={[styles.taskTitle, { color: colors.text }]}>
                      {task.title}
                    </Text>
                    <View style={styles.taskMeta}>
                      <View style={[
                        styles.priorityIndicator,
                        { backgroundColor: getPriorityColor(task.priority) }
                      ]} />
                      <Text style={[styles.taskCategory, { color: colors.textSecondary }]}>
                        {task.category}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity
                  onPress={() => deleteTask(task.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>

              {/* Task Description */}
              <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                {task.description}
              </Text>

              {/* Task Actions */}
              <View style={styles.taskActions}>
                {task.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={() => updateTaskStatus(task.id, 'in_progress')}
                  >
                    <Text style={styles.actionButtonText}>開始</Text>
                  </TouchableOpacity>
                )}
                
                {task.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => updateTaskStatus(task.id, 'completed')}
                  >
                    <Text style={styles.actionButtonText}>完了</Text>
                  </TouchableOpacity>
                )}

                {task.status === 'completed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.restartButton]}
                    onPress={() => updateTaskStatus(task.id, 'pending')}
                  >
                    <Text style={styles.actionButtonText}>再開</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.updateTime, { color: colors.textSecondary }]}>
                  更新: {task.updatedAt}
                </Text>
              </View>
            </View>
          ))}

          {filteredTasks.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                該当するタスクがありません
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Stats */}
        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {tasks.filter(t => t.status === 'pending').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>未着手</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {tasks.filter(t => t.status === 'in_progress').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>進行中</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {tasks.filter(t => t.status === 'completed').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>完了</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  taskItem: {
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  taskCategory: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 4,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  restartButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  updateTime: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default TaskManager;