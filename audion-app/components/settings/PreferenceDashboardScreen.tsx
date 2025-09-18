/**
 * Preference Dashboard Screen - 選好アルゴリズム可視化・調整
 * ユーザーのコンテンツ選好を可視化し、推薦アルゴリズムを調整する機能
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSettings, usePickModes, useContentSettings } from '../../context/SettingsContext';

interface PreferenceDashboardScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface GenreWeightItem {
  id: string;
  name: string;
  weight: number;
  color: string;
}

interface PreferenceSliderProps {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  unit?: string;
}

// カスタムスライダーコンポーネント
const PreferenceSlider: React.FC<PreferenceSliderProps> = ({
  title,
  description,
  value,
  min,
  max,
  step,
  onValueChange,
  unit = ''
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderTitle}>{title}</Text>
        <Text style={styles.sliderValue}>{value}{unit}</Text>
      </View>
      <Text style={styles.sliderDescription}>{description}</Text>
      
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderProgress, { width: `${percentage}%` }]} />
        <TouchableOpacity
          style={[styles.sliderThumb, { left: `${percentage}%` }]}
          onPressIn={() => {
            // タップ位置での値変更機能（簡易実装）
            Alert.alert(
              title,
              `現在の値: ${value}${unit}`,
              Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => {
                const val = min + i * step;
                return {
                  text: `${val}${unit}`,
                  onPress: () => onValueChange(val),
                  style: val === value ? 'destructive' : 'default'
                };
              }).concat([{ text: 'キャンセル', style: 'cancel' }])
            );
          }}
        />
      </View>
      
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{min}{unit}</Text>
        <Text style={styles.sliderLabel}>{max}{unit}</Text>
      </View>
    </View>
  );
};

export default function PreferenceDashboardScreen({ visible, onClose }: PreferenceDashboardScreenProps) {
  const { settings } = useSettings();
  const { pickModes, updatePickModes } = usePickModes();
  const { content, updateContent } = useContentSettings();

  // ジャンル重み付けデータ（モック）
  const [genreWeights, setGenreWeights] = useState<GenreWeightItem[]>([
    { id: 'technology', name: 'テクノロジー', weight: 85, color: '#007bff' },
    { id: 'business', name: 'ビジネス', weight: 70, color: '#28a745' },
    { id: 'health', name: '健康・医療', weight: 60, color: '#ffc107' },
    { id: 'politics', name: '政治', weight: 45, color: '#dc3545' },
    { id: 'sports', name: 'スポーツ', weight: 30, color: '#6f42c1' },
    { id: 'entertainment', name: 'エンタメ', weight: 25, color: '#fd7e14' },
  ]);

  // 調整可能パラメータ
  const [freshnessBias, setFreshnessBias] = useState(60); // 0=品質重視, 100=新しさ重視
  const [articleLength, setArticleLength] = useState(7); // 分単位
  const [diversityLevel, setDiversityLevel] = useState(70); // 多様性レベル

  // ジャンル重み更新
  const updateGenreWeight = (genreId: string, newWeight: number) => {
    setGenreWeights(prev => prev.map(genre => 
      genre.id === genreId ? { ...genre, weight: newWeight } : genre
    ));
    
    // 実際の設定更新（将来実装）
    // await updatePickModes({ auto: { preferredGenres: updatedWeights } });
  };

  // 統計データ（モック）
  const engagementStats = {
    averageCompletion: 78,
    likeRatio: 85,
    skipRatio: 12,
    totalListened: 147,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome name="arrow-left" size={18} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>選好アルゴリズム設定</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* エンゲージメント統計 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>あなたの聴取傾向</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <FontAwesome name="play-circle" size={24} color="#007bff" />
                <Text style={styles.statNumber}>{engagementStats.totalListened}</Text>
                <Text style={styles.statLabel}>聴取記事</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome name="check-circle" size={24} color="#28a745" />
                <Text style={styles.statNumber}>{engagementStats.averageCompletion}%</Text>
                <Text style={styles.statLabel}>完了率</Text>
              </View>
              <View style={styles.statCard}>
                <FontAwesome name="heart" size={24} color="#dc3545" />
                <Text style={styles.statNumber}>{engagementStats.likeRatio}%</Text>
                <Text style={styles.statLabel}>高評価率</Text>
              </View>
            </View>
          </View>

          {/* ジャンル重み付け */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ジャンル別関心度</Text>
            <Text style={styles.sectionDescription}>
              各ジャンルの重み付けを調整して、推薦アルゴリズムをカスタマイズできます
            </Text>
            
            {genreWeights.map(genre => (
              <View key={genre.id} style={styles.genreItem}>
                <View style={styles.genreHeader}>
                  <View style={styles.genreInfo}>
                    <View style={[styles.genreColor, { backgroundColor: genre.color }]} />
                    <Text style={styles.genreName}>{genre.name}</Text>
                  </View>
                  <Text style={styles.genreWeight}>{genre.weight}%</Text>
                </View>
                
                {/* 簡易プログレスバー */}
                <View style={styles.genreProgressContainer}>
                  <TouchableOpacity
                    style={styles.genreProgressTrack}
                    onPress={() => {
                      Alert.alert(
                        `${genre.name}の関心度`,
                        '関心度を選択してください',
                        [
                          { text: 'キャンセル', style: 'cancel' },
                          { text: '低い (20%)', onPress: () => updateGenreWeight(genre.id, 20) },
                          { text: '普通 (50%)', onPress: () => updateGenreWeight(genre.id, 50) },
                          { text: '高い (75%)', onPress: () => updateGenreWeight(genre.id, 75) },
                          { text: '最高 (100%)', onPress: () => updateGenreWeight(genre.id, 100) },
                        ]
                      );
                    }}
                  >
                    <View 
                      style={[
                        styles.genreProgress, 
                        { 
                          width: `${genre.weight}%`,
                          backgroundColor: genre.color 
                        }
                      ]} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* アルゴリズム調整パラメータ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>推薦アルゴリズム調整</Text>
            
            <PreferenceSlider
              title="新しさ vs 品質"
              description="最新情報を重視するか、評価の高い記事を重視するか"
              value={freshnessBias}
              min={0}
              max={100}
              step={10}
              onValueChange={setFreshnessBias}
              unit="%"
            />
            
            <PreferenceSlider
              title="記事の長さ"
              description="推薦される記事の平均的な長さ（分単位）"
              value={articleLength}
              min={3}
              max={15}
              step={1}
              onValueChange={setArticleLength}
              unit="分"
            />
            
            <PreferenceSlider
              title="多様性レベル"
              description="似た記事の集中度 vs バラエティの豊富さ"
              value={diversityLevel}
              min={0}
              max={100}
              step={10}
              onValueChange={setDiversityLevel}
              unit="%"
            />
          </View>

          {/* アクションボタン */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                Alert.alert(
                  '設定をリセット',
                  'すべての選好設定をデフォルトに戻しますか？',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    { 
                      text: 'リセット', 
                      style: 'destructive',
                      onPress: () => {
                        setGenreWeights(prev => prev.map(g => ({ ...g, weight: 50 })));
                        setFreshnessBias(50);
                        setArticleLength(7);
                        setDiversityLevel(50);
                        Alert.alert('完了', '設定をデフォルトに戻しました');
                      }
                    }
                  ]
                );
              }}
            >
              <FontAwesome name="refresh" size={16} color="#ffffff" />
              <Text style={styles.resetButtonText}>デフォルトに戻す</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                // 設定保存処理（将来実装）
                Alert.alert('保存完了', '選好設定を保存しました。次回の推薦から反映されます。');
              }}
            >
              <FontAwesome name="save" size={16} color="#ffffff" />
              <Text style={styles.saveButtonText}>設定を保存</Text>
            </TouchableOpacity>
          </View>

          {/* 下部の余白 */}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  genreItem: {
    marginBottom: 20,
  },
  genreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  genreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  genreName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  genreWeight: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  genreProgressContainer: {
    marginTop: 4,
  },
  genreProgressTrack: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
  },
  genreProgress: {
    height: 6,
    borderRadius: 3,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007bff',
  },
  sliderDescription: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
    lineHeight: 18,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    position: 'relative',
    marginHorizontal: 8,
  },
  sliderProgress: {
    height: 8,
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#007bff',
    borderRadius: 10,
    position: 'absolute',
    top: -6,
    marginLeft: -10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666666',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});