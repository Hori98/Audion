/**
 * Help & Feedback Settings Screen
 * ヘルプとフィードバック設定画面
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
  Linking,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface HelpFeedbackScreenProps {
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

export default function HelpFeedbackScreen({ visible, onClose }: HelpFeedbackScreenProps) {
  // 設定状態
  const [betaTestingEnabled, setBetaTestingEnabled] = useState(false);

  const handleFAQPress = () => {
    Alert.alert('よくある質問', 'FAQ画面は実装予定です');
  };

  const handleUserGuidePress = () => {
    Alert.alert('使い方ガイド', '使い方ガイド画面は実装予定です');
  };

  const handleTutorialPress = () => {
    Alert.alert('チュートリアル', 'チュートリアル機能は実装予定です');
  };

  const handleHelpSearchPress = () => {
    Alert.alert('ヘルプ検索', 'ヘルプ内検索機能は実装予定です');
  };

  const handleContactPress = () => {
    Alert.alert('お問い合わせ', 'お問い合わせフォームは実装予定です');
  };

  const handleChatSupportPress = () => {
    Alert.alert('チャットサポート', 'チャットサポートは有料プラン限定機能です（実装予定）');
  };

  const handleAppReviewPress = () => {
    Alert.alert(
      'アプリ評価',
      'App Store/Google Playでアプリを評価していただけますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '評価する', onPress: () => {
          // 実際の実装ではストアのURLを開く
          Alert.alert('ありがとうございます', 'ストア画面を開きます（実装予定）');
        }}
      ]
    );
  };

  const handleBugReportPress = () => {
    Alert.alert('バグ報告', 'バグ報告フォームは実装予定です');
  };

  const handleFeatureRequestPress = () => {
    Alert.alert('機能要望', '機能要望投稿フォームは実装予定です');
  };

  const handleSurveyPress = () => {
    Alert.alert('使用体験アンケート', 'アンケート機能は実装予定です');
  };

  const handleForumPress = () => {
    Alert.alert('ユーザーフォーラム', 'コミュニティフォーラムは実装予定です');
  };

  const handleSocialMediaPress = (platform: string) => {
    Alert.alert(`公式${platform}`, `公式${platform}アカウントは実装予定です`);
  };

  const handleDeveloperBlogPress = () => {
    Alert.alert('開発ブログ', '開発ブログは実装予定です');
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
          <Text style={styles.headerTitle}>ヘルプとフィードバック</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ヘルプ・サポートセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ヘルプ・サポート</Text>
            
            <SettingItem
              title="よくある質問（FAQ）"
              description="基本的な使い方・トラブルシューティング"
              icon="question-circle"
              onPress={handleFAQPress}
            />
            
            <SettingItem
              title="使い方ガイド"
              description="初回セットアップ・機能別チュートリアル"
              icon="book"
              onPress={handleUserGuidePress}
            />
            
            <SettingItem
              title="チュートリアルを再開"
              description="アプリの使い方を最初から学習"
              icon="play-circle"
              onPress={handleTutorialPress}
            />
            
            <SettingItem
              title="ヘルプ内検索"
              description="困ったことを素早く検索"
              icon="search"
              onPress={handleHelpSearchPress}
            />
            
            <SettingItem
              title="お問い合わせ"
              description="サポートチームに直接連絡"
              icon="envelope"
              onPress={handleContactPress}
            />
            
            <SettingItem
              title="チャットサポート"
              description="リアルタイムサポート（有料プラン限定）"
              icon="comments"
              onPress={handleChatSupportPress}
            />
          </View>

          {/* フィードバック・改善要望セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>フィードバック・改善要望</Text>
            
            <SettingItem
              title="アプリ評価"
              description="App Store/Google Playで評価"
              icon="star"
              onPress={handleAppReviewPress}
            />
            
            <SettingItem
              title="バグ報告"
              description="不具合・問題の報告"
              icon="bug"
              onPress={handleBugReportPress}
            />
            
            <SettingItem
              title="機能要望"
              description="新機能のリクエスト・投票"
              icon="lightbulb-o"
              onPress={handleFeatureRequestPress}
            />
            
            <SettingItem
              title="使用体験アンケート"
              description="アプリの改善にご協力ください"
              icon="clipboard"
              onPress={handleSurveyPress}
            />
            
            <SettingItem
              title="A/Bテスト参加"
              description="新機能のテストに参加"
              icon="flask"
              toggle={true}
              toggleValue={betaTestingEnabled}
              onToggleChange={setBetaTestingEnabled}
            />
          </View>

          {/* コミュニティセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>コミュニティ</Text>
            
            <SettingItem
              title="ユーザーフォーラム"
              description="ユーザー同士の情報交換"
              icon="users"
              onPress={handleForumPress}
            />
            
            <SettingItem
              title="公式Twitter"
              description="最新情報をチェック"
              icon="twitter"
              onPress={() => handleSocialMediaPress('Twitter')}
            />
            
            <SettingItem
              title="開発ブログ"
              description="開発の舞台裏・アップデート情報"
              icon="rss"
              onPress={handleDeveloperBlogPress}
            />
          </View>

          {/* サポート状況表示 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>サポート状況</Text>
            
            <View style={styles.supportCard}>
              <View style={styles.supportItem}>
                <FontAwesome name="clock-o" size={16} color="#4CAF50" />
                <Text style={styles.supportLabel}>平均応答時間</Text>
                <Text style={styles.supportValue}>24時間</Text>
              </View>
              
              <View style={styles.supportItem}>
                <FontAwesome name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.supportLabel}>サポート状況</Text>
                <Text style={styles.supportValue}>稼働中</Text>
              </View>
              
              <View style={styles.supportItem}>
                <FontAwesome name="globe" size={16} color="#007bff" />
                <Text style={styles.supportLabel}>対応言語</Text>
                <Text style={styles.supportValue}>日本語</Text>
              </View>
            </View>
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
  supportCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  supportValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
});