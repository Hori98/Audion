/**
 * Preferred Genre Selector - 優先ジャンル選択コンポーネント
 * AutoPick用の優先ジャンル設定UI
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface GenreOption {
  id: string;
  name: string;
  description: string;
  available: boolean;
  icon: string;
  color: string;
}

interface PreferredGenreSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  maxSelection?: number;
}

// 現在対応済みの6ジャンル（バックエンド対応確認済み）
const AVAILABLE_GENRES: GenreOption[] = [
  {
    id: 'technology',
    name: 'テクノロジー',
    description: 'AI、ブロックチェーン、プログラミング、ガジェット',
    available: true,
    icon: 'microchip',
    color: '#007bff'
  },
  {
    id: 'business',
    name: 'ビジネス',
    description: '経済、金融、企業ニュース、市場動向',
    available: true,
    icon: 'briefcase',
    color: '#28a745'
  },
  {
    id: 'entertainment',
    name: 'エンタメ',
    description: '映画、音楽、ゲーム、セレブ、カルチャー',
    available: true,
    icon: 'film',
    color: '#fd7e14'
  },
  {
    id: 'health',
    name: '健康・医療',
    description: '医療、健康、ライフスタイル、メンタルヘルス',
    available: false, // バックエンド未対応
    icon: 'heartbeat',
    color: '#ffc107'
  },
  {
    id: 'politics',
    name: '政治',
    description: '国内政治、国際政治、選挙、政策',
    available: false, // バックエンド未対応
    icon: 'university',
    color: '#dc3545'
  },
  {
    id: 'sports',
    name: 'スポーツ',
    description: 'サッカー、野球、オリンピック、スポーツ全般',
    available: false, // バックエンド未対応
    icon: 'soccer-ball-o',
    color: '#6f42c1'
  }
];

export default function PreferredGenreSelector({
  visible,
  onClose,
  selectedGenres,
  onGenresChange,
  maxSelection = 3
}: PreferredGenreSelectorProps) {
  const [pendingSelection, setPendingSelection] = useState<string[]>(selectedGenres);

  const handleGenreToggle = (genreId: string) => {
    const genre = AVAILABLE_GENRES.find(g => g.id === genreId);
    
    if (!genre?.available) {
      Alert.alert(
        '対応予定',
        `${genre?.name}は今後対応予定です。現在はテクノロジー、ビジネス、エンタメのみ対応しています。`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (pendingSelection.includes(genreId)) {
      // 削除
      setPendingSelection(prev => prev.filter(id => id !== genreId));
    } else {
      // 追加（上限チェック）
      if (pendingSelection.length >= maxSelection) {
        Alert.alert(
          '選択上限',
          `優先ジャンルは最大${maxSelection}個まで選択できます`,
          [{ text: 'OK' }]
        );
        return;
      }
      setPendingSelection(prev => [...prev, genreId]);
    }
  };

  const handleSave = () => {
    onGenresChange(pendingSelection);
    Alert.alert(
      '設定保存',
      `優先ジャンルを${pendingSelection.length}個設定しました`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const handleReset = () => {
    Alert.alert(
      '設定リセット',
      '優先ジャンル設定をリセットして「すべて」に戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          onPress: () => {
            setPendingSelection([]);
            onGenresChange([]);
            Alert.alert(
              'リセット完了',
              '優先ジャンルを「すべて」に設定しました',
              [{ text: 'OK', onPress: onClose }]
            );
          }
        }
      ]
    );
  };

  const availableCount = AVAILABLE_GENRES.filter(g => g.available).length;
  const selectedCount = pendingSelection.length;

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
          <Text style={styles.headerTitle}>優先ジャンル設定</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>リセット</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 説明セクション */}
          <View style={styles.descriptionSection}>
            <View style={styles.heroIconContainer}>
              <FontAwesome name="tags" size={32} color="#007bff" />
            </View>
            <Text style={styles.descriptionTitle}>AutoPick優先ジャンル</Text>
            <Text style={styles.descriptionText}>
              自動記事選択で優先的に選ばれるニュースジャンルを設定できます。
              未選択の場合は「すべて」のジャンルから選択されます。
            </Text>
          </View>

          {/* 現在の設定状況 */}
          <View style={styles.statusSection}>
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <FontAwesome name="check-circle" size={16} color="#28a745" />
                <Text style={styles.statusLabel}>選択中</Text>
                <Text style={styles.statusValue}>{selectedCount}個</Text>
              </View>
              <View style={styles.statusItem}>
                <FontAwesome name="list" size={16} color="#007bff" />
                <Text style={styles.statusLabel}>利用可能</Text>
                <Text style={styles.statusValue}>{availableCount}個</Text>
              </View>
              <View style={styles.statusItem}>
                <FontAwesome name="clock-o" size={16} color="#ffc107" />
                <Text style={styles.statusLabel}>対応予定</Text>
                <Text style={styles.statusValue}>{AVAILABLE_GENRES.length - availableCount}個</Text>
              </View>
            </View>
          </View>

          {/* ジャンル選択 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ジャンル選択 (最大{maxSelection}個)</Text>
            
            <View style={styles.genreGrid}>
              {AVAILABLE_GENRES.map((genre) => {
                const isSelected = pendingSelection.includes(genre.id);
                const isDisabled = !genre.available;
                
                return (
                  <TouchableOpacity
                    key={genre.id}
                    style={[
                      styles.genreCard,
                      {
                        backgroundColor: isSelected ? genre.color + '20' : '#111111',
                        borderColor: isSelected ? genre.color : (isDisabled ? '#444444' : '#333333'),
                        opacity: isDisabled ? 0.6 : 1.0
                      }
                    ]}
                    onPress={() => handleGenreToggle(genre.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.genreCardHeader}>
                      <FontAwesome 
                        name={genre.icon as any} 
                        size={24} 
                        color={isSelected ? genre.color : (isDisabled ? '#666666' : genre.color)} 
                      />
                      {isSelected && (
                        <FontAwesome name="check-circle" size={20} color={genre.color} />
                      )}
                      {isDisabled && (
                        <FontAwesome name="clock-o" size={16} color="#ffc107" />
                      )}
                    </View>
                    
                    <Text style={[
                      styles.genreCardTitle,
                      { color: isSelected ? '#ffffff' : (isDisabled ? '#888888' : '#ffffff') }
                    ]}>
                      {genre.name}
                    </Text>
                    
                    <Text style={[
                      styles.genreCardDescription,
                      { color: isSelected ? '#cccccc' : (isDisabled ? '#666666' : '#888888') }
                    ]}>
                      {genre.description}
                    </Text>
                    
                    {isDisabled && (
                      <Text style={styles.comingSoonText}>対応予定</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 保存ボタン */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { opacity: selectedCount > 0 ? 1.0 : 0.7 }
              ]}
              onPress={handleSave}
            >
              <FontAwesome name="save" size={16} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                設定を保存 ({selectedCount}個選択中)
              </Text>
            </TouchableOpacity>
            
            {selectedCount === 0 && (
              <Text style={styles.helpText}>
                ジャンルを選択しない場合、すべてのジャンルから記事が選ばれます
              </Text>
            )}
          </View>

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
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#666666',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  descriptionSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,123,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  statusCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  genreGrid: {
    gap: 12,
  },
  genreCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  genreCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  genreCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  genreCardDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  saveButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  helpText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 32,
  },
});