/**
 * Notifications Settings Screen
 * 通知設定画面
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
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import NotificationService from '../services/NotificationService';
import { useAuth } from '../context/AuthContext';

interface NotificationsScreenProps {
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

export default function NotificationsScreen({ visible, onClose }: NotificationsScreenProps) {
  const { user, token } = useAuth();
  
  // 設定状態
  const [pushNotifications, setPushNotifications] = useState(true);
  const [audioComplete, setAudioComplete] = useState(true);
  const [autoPickComplete, setAutoPickComplete] = useState(true);
  const [manualPickComplete, setManualPickComplete] = useState(true);
  const [schedulePickComplete, setSchedulePickComplete] = useState(true);
  const [newArticles, setNewArticles] = useState(false);
  const [recommendedArticles, setRecommendedArticles] = useState(true);
  const [breakingNews, setBreakingNews] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  const [maintenance, setMaintenance] = useState(true);
  const [importantNews, setImportantNews] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(false);
  const [emailSecurity, setEmailSecurity] = useState(true);
  
  // 通知システム状態
  const [permissionStatus, setPermissionStatus] = useState<any>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);

  const handleNotificationTimePress = () => {
    Alert.alert('通知許可時間', '通知時間帯設定は実装予定です');
  };

  const handleSilentTimePress = () => {
    Alert.alert('サイレント時間', 'サイレント時間設定は実装予定です');
  };

  const handleNotificationSoundPress = () => {
    Alert.alert('通知方法設定', '音・バイブレーション設定は実装予定です');
  };

  const handleEmailSettingsPress = () => {
    Alert.alert('メール設定', 'メール配信設定は実装予定です');
  };

  const handleWeeklyDigestPress = () => {
    Alert.alert('週刊ダイジェスト', '週刊ダイジェスト設定は実装予定です');
  };

  // 通知許可状況を初期化時に取得
  useEffect(() => {
    const checkPermissionStatus = async () => {
      const status = NotificationService.getPermissionStatus();
      setPermissionStatus(status);
    };
    
    if (visible) {
      checkPermissionStatus();
    }
  }, [visible]);

  // テスト通知送信
  const handleSendTestNotification = async () => {
    if (!user || !token) {
      Alert.alert('エラー', '認証が必要です');
      return;
    }

    setIsLoadingTest(true);
    try {
      // ローカル通知をテスト送信
      await NotificationService.scheduleLocalNotification(
        'テスト通知',
        'プッシュ通知が正常に動作しています！',
        3,
        { type: 'test' }
      );
      
      Alert.alert('成功', '3秒後にテスト通知が表示されます');
    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert('エラー', 'テスト通知の送信に失敗しました');
    } finally {
      setIsLoadingTest(false);
    }
  };

  // 通知許可を再取得
  const handleRefreshPermissions = async () => {
    try {
      const newStatus = await NotificationService.refreshPermissionStatus();
      setPermissionStatus(newStatus);
      
      if (newStatus.granted) {
        Alert.alert('成功', '通知許可が確認されました');
      } else {
        Alert.alert('通知許可', '通知を有効にするには設定から許可してください');
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('エラー', '通知許可の確認に失敗しました');
    }
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
          <Text style={styles.headerTitle}>通知</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* プッシュ通知セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>プッシュ通知</Text>
            
            <SettingItem
              title="プッシュ通知"
              description={permissionStatus 
                ? `許可状況: ${permissionStatus.granted ? '許可済み' : '未許可'}`
                : "アプリからのプッシュ通知を許可"
              }
              icon="bell"
              toggle={true}
              toggleValue={pushNotifications}
              onToggleChange={setPushNotifications}
            />
          </View>

          {/* システム情報セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>システム情報</Text>
            
            <SettingItem
              title="通知許可を確認"
              description="デバイスの通知許可状況を再確認"
              icon="refresh"
              onPress={handleRefreshPermissions}
              showArrow={true}
            />
            
            <SettingItem
              title="テスト通知送信"
              description="通知機能のテストを実行"
              icon="paper-plane"
              onPress={handleSendTestNotification}
              showArrow={true}
              disabled={isLoadingTest}
            />

            {permissionStatus && (
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>プッシュトークン: </Text>
                <Text style={styles.statusValue}>
                  {NotificationService.getCurrentPushToken() 
                    ? '登録済み' 
                    : '未登録'
                  }
                </Text>
              </View>
            )}

            {isLoadingTest && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>テスト通知を送信中...</Text>
              </View>
            )}
          </View>

          {/* 音声生成通知セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>音声生成通知</Text>
            
            <SettingItem
              title="Auto-Pick完了通知"
              description="自動音声生成の完了をお知らせ"
              icon="magic"
              toggle={true}
              toggleValue={autoPickComplete}
              onToggleChange={setAutoPickComplete}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="Manual-Pick完了通知"
              description="手動音声生成の完了をお知らせ"
              icon="hand-paper-o"
              toggle={true}
              toggleValue={manualPickComplete}
              onToggleChange={setManualPickComplete}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="Schedule-Pick完了通知"
              description="スケジュール音声生成の完了をお知らせ"
              icon="calendar"
              toggle={true}
              toggleValue={schedulePickComplete}
              onToggleChange={setSchedulePickComplete}
              disabled={!pushNotifications}
            />
          </View>

          {/* コンテンツ通知セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>コンテンツ通知</Text>
            
            <SettingItem
              title="新着記事通知"
              description="購読中のフィードの新着記事"
              icon="newspaper-o"
              toggle={true}
              toggleValue={newArticles}
              onToggleChange={setNewArticles}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="おすすめ記事通知"
              description="AIが選んだおすすめ記事"
              icon="star"
              toggle={true}
              toggleValue={recommendedArticles}
              onToggleChange={setRecommendedArticles}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="ブレイキングニュース通知"
              description="重要な速報ニュース"
              icon="exclamation-triangle"
              toggle={true}
              toggleValue={breakingNews}
              onToggleChange={setBreakingNews}
              disabled={!pushNotifications}
            />
          </View>

          {/* システム通知セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>システム通知</Text>
            
            <SettingItem
              title="アプリアップデート通知"
              description="新バージョンのお知らせ"
              icon="refresh"
              toggle={true}
              toggleValue={appUpdates}
              onToggleChange={setAppUpdates}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="メンテナンス通知"
              description="サービス停止・メンテナンス情報"
              icon="wrench"
              toggle={true}
              toggleValue={maintenance}
              onToggleChange={setMaintenance}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="重要なお知らせ"
              description="サービスからの重要な連絡"
              icon="info-circle"
              toggle={true}
              toggleValue={importantNews}
              onToggleChange={setImportantNews}
              disabled={!pushNotifications}
            />
          </View>

          {/* 通知スケジュールセクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>通知スケジュール</Text>
            
            <SettingItem
              title="通知許可時間帯"
              description="7:00 - 22:00"
              icon="clock-o"
              onPress={handleNotificationTimePress}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="サイレント時間設定"
              description="就寝時間・会議時間の設定"
              icon="moon-o"
              onPress={handleSilentTimePress}
              disabled={!pushNotifications}
            />
            
            <SettingItem
              title="通知方法設定"
              description="音・バイブレーション・LED設定"
              icon="volume-up"
              onPress={handleNotificationSoundPress}
              disabled={!pushNotifications}
            />
          </View>

          {/* メール通知セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>メール通知</Text>
            
            <SettingItem
              title="週刊ダイジェスト"
              description="週1回のまとめメール配信"
              icon="envelope"
              toggle={true}
              toggleValue={emailWeeklyDigest}
              onToggleChange={setEmailWeeklyDigest}
            />
            
            <SettingItem
              title="週刊ダイジェスト設定"
              description="配信曜日・時刻・内容カスタマイズ"
              icon="calendar"
              onPress={handleWeeklyDigestPress}
              disabled={!emailWeeklyDigest}
            />
            
            <SettingItem
              title="セキュリティアラート"
              description="ログイン・設定変更の通知"
              icon="shield"
              toggle={true}
              toggleValue={emailSecurity}
              onToggleChange={setEmailSecurity}
            />
            
            <SettingItem
              title="メール設定"
              description="配信先・形式設定"
              icon="cog"
              onPress={handleEmailSettingsPress}
            />
          </View>

          {/* 通知統計表示 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>通知統計</Text>
            
            <View style={styles.statsCard}>
              <View style={styles.statsItem}>
                <FontAwesome name="bell" size={16} color="#4CAF50" />
                <Text style={styles.statsLabel}>今日の通知</Text>
                <Text style={styles.statsValue}>3件</Text>
              </View>
              
              <View style={styles.statsItem}>
                <FontAwesome name="calendar" size={16} color="#007bff" />
                <Text style={styles.statsLabel}>今週の通知</Text>
                <Text style={styles.statsValue}>15件</Text>
              </View>
              
              <View style={styles.statsItem}>
                <FontAwesome name="volume-up" size={16} color="#FF9800" />
                <Text style={styles.statsLabel}>音声完了通知</Text>
                <Text style={styles.statsValue}>8件</Text>
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
  statsCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
  statusInfo: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#888888',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
    marginLeft: 8,
  },
});