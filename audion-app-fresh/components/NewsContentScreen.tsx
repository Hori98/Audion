/**
 * News & Content Settings Screen
 * ニュース・コンテンツ設定画面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface NewsContentScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  disabled?: boolean;
}

function SettingItem({ 
  title, 
  description, 
  icon, 
  onPress, 
  showArrow = true, 
  toggle = false,
  toggleValue = false,
  onToggleChange,
  disabled = false
}: SettingItemProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.settingItem, disabled && styles.settingItemDisabled]} 
      onPress={handlePress} 
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <FontAwesome 
            name={icon as any} 
            size={20} 
            color={disabled ? "#666666" : "#007bff"} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          disabled={disabled}
          trackColor={{ false: '#333333', true: '#007bff' }}
          thumbColor={toggleValue ? '#ffffff' : '#cccccc'}
        />
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function NewsContentScreen({ visible, onClose }: NewsContentScreenProps) {
  // 設定状態
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showReadArticles, setShowReadArticles] = useState(false);
  const [enablePersonalization, setEnablePersonalization] = useState(true);
  const [backgroundUpdate, setBackgroundUpdate] = useState(true);
  const [wifiOnlyUpdate, setWifiOnlyUpdate] = useState(false);

  const handleRSSManagementPress = () => {
    Alert.alert('RSSフィード管理', 'RSS管理画面への遷移は実装予定です');
  };

  const handleCategoryManagementPress = () => {
    Alert.alert('カテゴリ管理', 'カテゴリ管理機能は実装予定です');
  };

  const handleInterestKeywordsPress = () => {
    Alert.alert('興味・関心キーワード', 'キーワード管理機能は実装予定です');
  };

  const handleAlgorithmVisualizationPress = () => {
    Alert.alert('選好アルゴリズム視覚化', 'アルゴリズム視覚化機能は実装予定です');
  };

  const handleRecommendationAdjustmentPress = () => {
    Alert.alert('おすすめ度調整', 'おすすめ度調整機能は実装予定です');
  };

  const handleLearningDataPress = () => {
    Alert.alert('学習データ管理', '学習データ管理機能は実装予定です');
  };

  const handleLanguageFilterPress = () => {
    Alert.alert('言語フィルター', '言語フィルター機能は実装予定です');
  };

  const handleRefreshSettingsPress = () => {
    Alert.alert('更新設定', '更新頻度設定機能は実装予定です');
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
          <Text style={styles.headerTitle}>ニュース・コンテンツ設定</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* RSSフィード管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>RSSフィード管理</Text>
            
            <SettingItem
              title="登録済みフィード一覧"
              description="現在のRSSフィードを管理"
              icon="list"
              onPress={handleRSSManagementPress}
            />
            
            <SettingItem
              title="新規フィード追加"
              description="RSSフィードを追加"
              icon="plus"
              onPress={handleRSSManagementPress}
            />
            
            <SettingItem
              title="カテゴリ管理"
              description="フィードのグループ分け"
              icon="folder"
              onPress={handleCategoryManagementPress}
            />
          </View>

          {/* パーソナライズ設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>パーソナライズ設定</Text>
            
            <SettingItem
              title="興味・関心キーワード"
              description="AIの選好をコントロール"
              icon="tags"
              onPress={handleInterestKeywordsPress}
            />
            
            <SettingItem
              title="選好アルゴリズム視覚化"
              description="AIが学習した興味を表示"
              icon="bar-chart"
              onPress={handleAlgorithmVisualizationPress}
            />
            
            <SettingItem
              title="おすすめ度調整"
              description="登録フィード優先 ⟷ 新発見優先"
              icon="sliders"
              onPress={handleRecommendationAdjustmentPress}
            />
            
            <SettingItem
              title="パーソナライズ機能"
              description="閲覧履歴に基づく最適化"
              icon="user-circle"
              toggle={true}
              toggleValue={enablePersonalization}
              onToggleChange={setEnablePersonalization}
            />
            
            <SettingItem
              title="学習データ管理"
              description="学習データの確認・初期化"
              icon="database"
              onPress={handleLearningDataPress}
            />
          </View>

          {/* コンテンツ表示設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>コンテンツ表示設定</Text>
            
            <SettingItem
              title="言語フィルター"
              description="日本語/英語/全言語"
              icon="globe"
              onPress={handleLanguageFilterPress}
            />
            
            <SettingItem
              title="既読記事の表示"
              description="既読記事を表示するか"
              icon="eye"
              toggle={true}
              toggleValue={showReadArticles}
              onToggleChange={setShowReadArticles}
            />
            
            <SettingItem
              title="自動更新"
              description="フィードの自動更新"
              icon="refresh"
              toggle={true}
              toggleValue={autoRefresh}
              onToggleChange={setAutoRefresh}
            />
            
            <SettingItem
              title="更新設定"
              description="更新頻度と詳細設定"
              icon="clock-o"
              onPress={handleRefreshSettingsPress}
            />
          </View>

          {/* データ通信設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>データ通信設定</Text>
            
            <SettingItem
              title="バックグラウンド更新"
              description="アプリ未起動時も更新"
              icon="cloud-download"
              toggle={true}
              toggleValue={backgroundUpdate}
              onToggleChange={setBackgroundUpdate}
            />
            
            <SettingItem
              title="Wi-Fi接続時のみ更新"
              description="モバイルデータ使用量を節約"
              icon="wifi"
              toggle={true}
              toggleValue={wifiOnlyUpdate}
              onToggleChange={setWifiOnlyUpdate}
            />
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
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#888888',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingTitleDisabled: {
    color: '#666666',
  },
  settingDescriptionDisabled: {
    color: '#444444',
  },
  bottomSpacer: {
    height: 32,
  },
});