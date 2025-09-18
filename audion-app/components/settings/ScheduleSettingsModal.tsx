/**
 * Schedule Settings Modal - スケジュール包括設定モーダル
 * ユーザーインサイト: 「好きなタイミングで、好きなソース、好きなジャンルを好きなまとめ方で」
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSchedulePickSettings, ScheduleProfile } from '../../context/SettingsContext';

interface ScheduleSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  scheduleId?: string; // undefined = 新規作成, string = 編集
}

// 曜日選択用のデータ
const DAYS_OF_WEEK = [
  { key: 0, label: '日', fullLabel: '日曜日' },
  { key: 1, label: '月', fullLabel: '月曜日' },
  { key: 2, label: '火', fullLabel: '火曜日' },
  { key: 3, label: '水', fullLabel: '水曜日' },
  { key: 4, label: '木', fullLabel: '木曜日' },
  { key: 5, label: '金', fullLabel: '金曜日' },
  { key: 6, label: '土', fullLabel: '土曜日' },
];

// プロンプトスタイル選択用
const PROMPT_STYLES = [
  { key: 'standard', label: '標準', description: 'バランスの取れた要約' },
  { key: 'friendly', label: 'フレンドリー', description: '親しみやすい口調' },
  { key: 'strict', label: '厳密', description: '正確性重視' },
  { key: 'insightful', label: '洞察的', description: '深い分析と考察' },
];

// ジャンル選択用（実際のプロジェクトのジャンルに合わせて調整）
const AVAILABLE_GENRES = [
  'テクノロジー', '政治', '経済', 'スポーツ', 'エンターテイメント', 
  '健康', '科学', '国際', '社会', 'ライフスタイル'
];

export default function ScheduleSettingsModal({ 
  visible, 
  onClose, 
  scheduleId 
}: ScheduleSettingsModalProps) {
  const { schedule, addScheduleProfile, updateScheduleProfile, deleteScheduleProfile } = useSchedulePickSettings();
  
  // フォーム状態
  const [formData, setFormData] = useState<Omit<ScheduleProfile, 'id'>>({
    enabled: true,
    name: '',
    frequency: 'daily',
    days: [1, 2, 3, 4, 5], // 平日デフォルト
    time: '08:00',
    genres: [],
    sources: [],
    maxArticles: 5,
    promptTemplate: 'standard',
  });

  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!scheduleId;

  // 編集モードの場合、既存データを読み込み
  useEffect(() => {
    if (isEditMode && schedule.profiles) {
      const existingSchedule = schedule.profiles.find(p => p.id === scheduleId);
      if (existingSchedule) {
        setFormData({
          enabled: existingSchedule.enabled,
          name: existingSchedule.name,
          frequency: existingSchedule.frequency,
          days: existingSchedule.days || [],
          time: existingSchedule.time,
          genres: existingSchedule.genres,
          sources: existingSchedule.sources,
          maxArticles: existingSchedule.maxArticles,
          promptTemplate: existingSchedule.promptTemplate || 'standard',
        });
      }
    } else {
      // 新規作成時のデフォルト値
      setFormData({
        enabled: true,
        name: `スケジュール ${(schedule.profiles?.length || 0) + 1}`,
        frequency: 'daily',
        days: [1, 2, 3, 4, 5],
        time: '08:00',
        genres: [],
        sources: [],
        maxArticles: 5,
        promptTemplate: 'standard',
      });
    }
  }, [visible, scheduleId, isEditMode, schedule.profiles]);

  const handleSave = async () => {
    // バリデーション
    if (!formData.name.trim()) {
      Alert.alert('エラー', 'スケジュール名を入力してください');
      return;
    }

    if (formData.days?.length === 0) {
      Alert.alert('エラー', '実行曜日を選択してください');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode) {
        updateScheduleProfile(scheduleId!, formData);
        Alert.alert('完了', 'スケジュール設定を更新しました');
      } else {
        addScheduleProfile(formData);
        Alert.alert('完了', 'スケジュールを作成しました');
      }
      onClose();
    } catch (error) {
      Alert.alert('エラー', 'スケジュールの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!isEditMode) return;

    Alert.alert(
      'スケジュール削除',
      `「${formData.name}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => {
            deleteScheduleProfile(scheduleId!);
            Alert.alert('完了', 'スケジュールを削除しました');
            onClose();
          }
        }
      ]
    );
  };

  const toggleDay = (dayKey: number) => {
    const newDays = formData.days?.includes(dayKey)
      ? formData.days.filter(d => d !== dayKey)
      : [...(formData.days || []), dayKey].sort();
    setFormData({ ...formData, days: newDays });
  };

  const toggleGenre = (genre: string) => {
    const newGenres = formData.genres.includes(genre)
      ? formData.genres.filter(g => g !== genre)
      : [...formData.genres, genre];
    setFormData({ ...formData, genres: newGenres });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {isEditMode ? 'スケジュール編集' : 'スケジュール作成'}
          </Text>
          
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.headerButton, { opacity: isLoading ? 0.5 : 1 }]}
            disabled={isLoading}
          >
            <Text style={styles.saveText}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 基本設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本設定</Text>
            
            <View style={styles.formRow}>
              <Text style={styles.label}>スケジュール名</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="例: 朝の通勤ニュース"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>有効状態</Text>
              <Switch
                value={formData.enabled}
                onValueChange={(enabled) => setFormData({ ...formData, enabled })}
                trackColor={{ false: '#333333', true: '#007bff' }}
                thumbColor={formData.enabled ? '#ffffff' : '#cccccc'}
              />
            </View>
          </View>

          {/* スケジュール設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>スケジュール</Text>
            
            <View style={styles.formRow}>
              <Text style={styles.label}>実行時刻</Text>
              <TextInput
                style={styles.timeInput}
                value={formData.time}
                onChangeText={(text) => setFormData({ ...formData, time: text })}
                placeholder="08:00"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>実行曜日</Text>
              <View style={styles.daysContainer}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayButton,
                      formData.days?.includes(day.key) && styles.dayButtonSelected
                    ]}
                    onPress={() => toggleDay(day.key)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      formData.days?.includes(day.key) && styles.dayButtonTextSelected
                    ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* コンテンツ設定 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>コンテンツ設定</Text>
            
            <View style={styles.formRow}>
              <Text style={styles.label}>記事数</Text>
              <View style={styles.articleCountContainer}>
                {[3, 5, 7, 10].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.countButton,
                      formData.maxArticles === count && styles.countButtonSelected
                    ]}
                    onPress={() => setFormData({ ...formData, maxArticles: count })}
                  >
                    <Text style={[
                      styles.countButtonText,
                      formData.maxArticles === count && styles.countButtonTextSelected
                    ]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>プロンプトスタイル</Text>
              <View style={styles.promptStyleContainer}>
                {PROMPT_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style.key}
                    style={[
                      styles.promptStyleButton,
                      formData.promptTemplate === style.key && styles.promptStyleButtonSelected
                    ]}
                    onPress={() => setFormData({ ...formData, promptTemplate: style.key })}
                  >
                    <Text style={[
                      styles.promptStyleText,
                      formData.promptTemplate === style.key && styles.promptStyleTextSelected
                    ]}>
                      {style.label}
                    </Text>
                    <Text style={[
                      styles.promptStyleDescription,
                      formData.promptTemplate === style.key && styles.promptStyleDescriptionSelected
                    ]}>
                      {style.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.label}>対象ジャンル</Text>
              <View style={styles.genreContainer}>
                {AVAILABLE_GENRES.map((genre) => (
                  <TouchableOpacity
                    key={genre}
                    style={[
                      styles.genreButton,
                      formData.genres.includes(genre) && styles.genreButtonSelected
                    ]}
                    onPress={() => toggleGenre(genre)}
                  >
                    <Text style={[
                      styles.genreButtonText,
                      formData.genres.includes(genre) && styles.genreButtonTextSelected
                    ]}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helperText}>
                {formData.genres.length === 0 ? '全てのジャンル' : `${formData.genres.length}件選択中`}
              </Text>
            </View>
          </View>

          {/* 削除ボタン（編集モード時のみ） */}
          {isEditMode && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <FontAwesome name="trash" size={16} color="#ff4757" />
                <Text style={styles.deleteButtonText}>スケジュールを削除</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelText: {
    fontSize: 16,
    color: '#666666',
  },
  saveText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  formRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeInput: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 100,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#cccccc',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  articleCountContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  countButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  countButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  countButtonText: {
    fontSize: 14,
    color: '#cccccc',
  },
  countButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  promptStyleContainer: {
    gap: 8,
  },
  promptStyleButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  promptStyleButtonSelected: {
    backgroundColor: 'rgba(0,123,255,0.1)',
    borderColor: '#007bff',
  },
  promptStyleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  promptStyleTextSelected: {
    color: '#007bff',
  },
  promptStyleDescription: {
    fontSize: 12,
    color: '#888888',
  },
  promptStyleDescriptionSelected: {
    color: '#66a3ff',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genreButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  genreButtonText: {
    fontSize: 12,
    color: '#cccccc',
  },
  genreButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,71,87,0.1)',
    borderWidth: 1,
    borderColor: '#ff4757',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#ff4757',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 32,
  },
});