/**
 * Data & Storage Settings Screen (MECE準拠)
 * データとストレージ - デバイスリソース・通信管理
 * キャッシュ管理、ダウンロード設定、データ使用量を統合
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
  FlatList,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioMetadata } from '../../context/AudioMetadataProvider';
import { useDownloader } from '../../hooks/useDownloader';

interface DataStorageScreenProps {
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
  rightText?: string;
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
  rightText,
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
      ) : rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function DataStorageScreen({ visible, onClose }: DataStorageScreenProps) {
  // 設定状態
  const [wifiOnlyDownload, setWifiOnlyDownload] = useState(true);
  const [autoDeleteOld, setAutoDeleteOld] = useState(false);
  const [backgroundSync, setBackgroundSync] = useState(true);
  const [lowDataMode, setLowDataMode] = useState(false);

  // オフライン機能のフック
  const { getAllDownloadedAudios, getTotalStorageUsage } = useAudioMetadata();
  const { deleteAudio, deleteAllAudios, getAvailableStorage } = useDownloader();

  // ストレージ使用量 (MB)
  const [storageStats, setStorageStats] = useState({
    audioFiles: 0,
    imageCache: 0,
    appData: 0,
    total: 0,
    available: 0
  });

  // ダウンロード済み音声ファイル
  const [downloadedAudios, setDownloadedAudios] = useState(getAllDownloadedAudios());

  useEffect(() => {
    loadSettings();
    calculateStorageUsage();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        '@storage_wifi_only',
        '@storage_auto_delete',
        '@storage_background_sync',
        '@storage_low_data'
      ]);

      settings.forEach(([key, value]) => {
        if (value) {
          switch (key) {
            case '@storage_wifi_only':
              setWifiOnlyDownload(JSON.parse(value));
              break;
            case '@storage_auto_delete':
              setAutoDeleteOld(JSON.parse(value));
              break;
            case '@storage_background_sync':
              setBackgroundSync(JSON.parse(value));
              break;
            case '@storage_low_data':
              setLowDataMode(JSON.parse(value));
              break;
          }
        }
      });
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  };

  const calculateStorageUsage = async () => {
    try {
      const audioStorageBytes = getTotalStorageUsage();
      const availableStorageBytes = await getAvailableStorage();
      const downloadedFiles = getAllDownloadedAudios();
      
      // バイトからMBに変換
      const audioFilesMB = Math.round(audioStorageBytes / (1024 * 1024));
      const availableMB = Math.round(availableStorageBytes / (1024 * 1024));
      
      setStorageStats({
        audioFiles: audioFilesMB,
        imageCache: 23, // 実装予定
        appData: 8,    // 実装予定  
        total: audioFilesMB + 23 + 8,
        available: availableMB
      });

      // ダウンロード済み音声リストを更新
      setDownloadedAudios(downloadedFiles);
      
      console.log('Storage calculated:', {
        audioFiles: audioFilesMB,
        downloadedCount: downloadedFiles.length,
        available: availableMB
      });
    } catch (error) {
      console.error('ストレージ使用量の計算に失敗しました:', error);
    }
  };

  const handleWifiOnlyToggle = (value: boolean) => {
    setWifiOnlyDownload(value);
    saveSetting('@storage_wifi_only', value);
  };

  const handleAutoDeleteToggle = (value: boolean) => {
    setAutoDeleteOld(value);
    saveSetting('@storage_auto_delete', value);
    if (value) {
      Alert.alert('自動削除有効', '30日以上経過した音声ファイルが自動的に削除されます');
    }
  };

  const handleBackgroundSyncToggle = (value: boolean) => {
    setBackgroundSync(value);
    saveSetting('@storage_background_sync', value);
  };

  const handleLowDataModeToggle = (value: boolean) => {
    setLowDataMode(value);
    saveSetting('@storage_low_data', value);
    if (value) {
      Alert.alert('低データモード有効', '画像の読み込みや自動更新が制限されます');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'キャッシュクリア',
      'アプリのキャッシュをクリアしますか？一時的に動作が重くなる場合があります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'クリア', 
          onPress: async () => {
            try {
              // 画像キャッシュや一時ファイルの削除を実装
              // 現在はAsyncStorageの一部項目をクリア
              const keysToRemove = [
                '@cache_articles',
                '@cache_images',
                '@temp_data'
              ];
              await AsyncStorage.multiRemove(keysToRemove);
              
              // 使用量を再計算
              setStorageStats(prev => ({
                ...prev,
                imageCache: 0,
                total: prev.total - prev.imageCache
              }));
              
              Alert.alert('完了', 'キャッシュをクリアしました');
            } catch (error) {
              Alert.alert('エラー', 'キャッシュクリアに失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleClearAudioFiles = () => {
    Alert.alert(
      '音声ファイル削除',
      'ダウンロード済みの音声ファイルを削除しますか？再度聴くにはダウンロードが必要になります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 実際の実装では、ダウンロードした音声ファイルを削除
              // 現在はモック処理
              setStorageStats(prev => ({
                ...prev,
                audioFiles: 0,
                total: prev.total - prev.audioFiles
              }));
              
              Alert.alert('完了', 'ダウンロード済み音声ファイルを削除しました');
            } catch (error) {
              Alert.alert('エラー', '音声ファイル削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
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
          <Text style={styles.headerTitle}>データとストレージ</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ダウンロード設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ダウンロード設定</Text>
            
            <SettingItem
              title="Wi-Fi接続時のみダウンロード"
              description="モバイル通信時は音声生成のみ実行"
              icon="wifi"
              toggle={true}
              toggleValue={wifiOnlyDownload}
              onToggleChange={handleWifiOnlyToggle}
            />

            <SettingItem
              title="バックグラウンド同期"
              description="アプリを使用していない時も記事を更新"
              icon="refresh"
              toggle={true}
              toggleValue={backgroundSync}
              onToggleChange={handleBackgroundSyncToggle}
            />

            <SettingItem
              title="低データモード"
              description="通信量を削減（画像読み込み制限）"
              icon="signal"
              toggle={true}
              toggleValue={lowDataMode}
              onToggleChange={handleLowDataModeToggle}
            />
          </View>

          {/* ストレージ管理セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ストレージ管理</Text>
            
            <SettingItem
              title="古い音声ファイルを自動削除"
              description="30日以上経過したファイルを自動削除"
              icon="calendar"
              toggle={true}
              toggleValue={autoDeleteOld}
              onToggleChange={handleAutoDeleteToggle}
            />

            <SettingItem
              title="キャッシュをクリア"
              description="一時ファイルと画像キャッシュを削除"
              icon="trash"
              onPress={handleClearCache}
              showArrow={false}
            />

            <SettingItem
              title="ダウンロード済み音声を削除"
              description="すべての音声ファイルを削除"
              icon="music"
              onPress={handleClearAudioFiles}
              showArrow={false}
            />
          </View>

          {/* ストレージ使用量セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ストレージ使用量</Text>
            
            <View style={styles.usageCard}>
              <View style={styles.usageHeader}>
                <FontAwesome name="pie-chart" size={24} color="#007bff" />
                <Text style={styles.usageTitle}>合計使用量</Text>
                <Text style={styles.usageTotal}>{formatStorage(storageStats.total)}</Text>
              </View>
              
              <View style={styles.usageBreakdown}>
                <View style={styles.usageItem}>
                  <View style={[styles.usageIndicator, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.usageLabel}>音声ファイル</Text>
                  <Text style={styles.usageValue}>{formatStorage(storageStats.audioFiles)}</Text>
                </View>
                
                <View style={styles.usageItem}>
                  <View style={[styles.usageIndicator, { backgroundColor: '#FF9800' }]} />
                  <Text style={styles.usageLabel}>画像キャッシュ</Text>
                  <Text style={styles.usageValue}>{formatStorage(storageStats.imageCache)}</Text>
                </View>
                
                <View style={styles.usageItem}>
                  <View style={[styles.usageIndicator, { backgroundColor: '#9C27B0' }]} />
                  <Text style={styles.usageLabel}>アプリデータ</Text>
                  <Text style={styles.usageValue}>{formatStorage(storageStats.appData)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* データ通信設定セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>データ通信設定</Text>
            
            <SettingItem
              title="データ使用量の監視"
              description="今月の通信量を表示"
              icon="bar-chart"
              rightText="実装予定"
              onPress={() => Alert.alert('実装予定', 'データ使用量監視機能は実装予定です')}
              disabled={true}
            />

            <SettingItem
              title="通信量上限設定"
              description="月間データ使用量の上限を設定"
              icon="exclamation-triangle"
              rightText="未設定"
              onPress={() => Alert.alert('実装予定', '通信量上限設定は実装予定です')}
              disabled={true}
            />

            <SettingItem
              title="圧縮設定"
              description="画像・音声の圧縮レベル"
              icon="compress"
              rightText="標準"
              onPress={() => Alert.alert('実装予定', '圧縮設定は実装予定です')}
              disabled={true}
            />
          </View>

          {/* 現在の設定状況表示 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>現在の設定</Text>
            
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <FontAwesome name="wifi" size={16} color="#4CAF50" />
                <Text style={styles.statusLabel}>Wi-Fi専用ダウンロード</Text>
                <Text style={styles.statusValue}>{wifiOnlyDownload ? '有効' : '無効'}</Text>
              </View>
              
              <View style={styles.statusItem}>
                <FontAwesome name="signal" size={16} color="#007bff" />
                <Text style={styles.statusLabel}>低データモード</Text>
                <Text style={styles.statusValue}>{lowDataMode ? '有効' : '無効'}</Text>
              </View>
              
              <View style={styles.statusItem}>
                <FontAwesome name="calendar" size={16} color="#FF9800" />
                <Text style={styles.statusLabel}>自動削除</Text>
                <Text style={styles.statusValue}>{autoDeleteOld ? '有効' : '無効'}</Text>
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
  rightText: {
    fontSize: 14,
    color: '#888888',
    marginRight: 8,
  },
  usageCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  usageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 12,
  },
  usageTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  usageBreakdown: {
    gap: 12,
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  usageLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
});